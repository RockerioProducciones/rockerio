/* Mezclador de pistas (mini DAW): una canción de ~20 s en pistas sueltas, en tres etapas (en bruto, mezcla y master).
   El visitante silencia o solea instrumentos y alterna la etapa; todo suena sincronizado con Web Audio. */
(function () {
  'use strict';
  var RK = window.RK, $ = function (id) { return document.getElementById(id); }, el = RK.el, API = RK.api;
  var INST = ['Batería', 'Bajo', 'Guitarras', 'Voces', 'Otros'];
  var ICO = { 'Batería': '🥁', 'Bajo': '🎸', 'Guitarras': '🎸', 'Voces': '🎤', 'Otros': '🎹' };
  var ETAPAS = [
    ['En bruto', '01 · RAW', 'Sin procesar: tal como entra al micrófono.'],
    ['Mezcla', '02 · MIX', 'Cada pista con su EQ, compresión, panning y efectos.'],
    ['Master', '03 · MASTER', 'Con la cadena de master: pegada, brillo y volumen comercial.']
  ];
  var activo = null; // mezclador que está sonando (solo uno a la vez)

  function parsear(g) {
    var pistas = {}, etapas = {};
    g.items.forEach(function (it) {
      var p = String(it.etiqueta || '').split(/\s*·\s*/); if (p.length < 2) return;
      var i = INST.indexOf(p[0]), e = ETAPAS.map(function (x) { return x[0]; }).indexOf(p[1]); if (i < 0 || e < 0) return;
      (pistas[p[0]] = pistas[p[0]] || {})[p[1]] = it.enlace; etapas[p[1]] = true;
    });
    return { pistas: pistas, etapas: ETAPAS.filter(function (e) { return etapas[e[0]]; }), inst: INST.filter(function (i) { return pistas[i]; }) };
  }
  function b64ab(b64) { var bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function bajar(url) {
    var m = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/.exec(url);
    if (m) return RK.pedir(API + '?accion=audiomix&id=' + m[1]).then(function (d) { if (!d || !d.ok) throw new Error((d && d.error) || 'No se pudo cargar el audio.'); return b64ab(d.b64); });
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('No se pudo cargar el audio.'); return r.arrayBuffer(); });
  }
  function decodificar(ctx, ab) {
    return new Promise(function (ok, mal) { var r = ctx.decodeAudioData(ab, ok, mal); if (r && r.then) r.then(ok, mal); });
  }

  function montar(cont, g) {
    var P = parsear(g); if (P.inst.length < 1 || !P.etapas.length) return;
    cont.textContent = '';
    if (g.descripcion) cont.appendChild(el('p', 'nota', g.descripcion));
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var cargar = el('button', 'btn', '▶ Cargar mezclador'); cargar.type = 'button';
    var estado = el('p', 'nota mz-estado', 'Carga unos 20 segundos de audio en pistas. Con datos móviles, mejor con Wi‑Fi.');
    cont.appendChild(cargar); cont.appendChild(estado);
    if (!Ctx) { cargar.disabled = true; estado.textContent = 'Tu navegador no admite el mezclador. Prueba con Chrome, Safari o Firefox actualizados.'; return; }
    var ctx, buffers = {}, bus = {}, analisis = {}, gains = {}, fuentes = [], etapa = P.etapas[P.etapas.length - 1][0] === 'Master' ? P.etapas[0][0] : P.etapas[0][0];
    var mute = {}, solo = {}, dur = 0, t0 = 0, desde = 0, sonando = false, raf = 0, ui = {};
    etapa = P.etapas[0][0];

    function audible(i) { var haySolo = P.inst.some(function (x) { return solo[x]; }); return !mute[i] && (haySolo ? !!solo[i] : true); }
    function aplicar() {
      P.inst.forEach(function (i) { P.etapas.forEach(function (e) {
        var gn = gains[i + '|' + e[0]]; if (!gn) return;
        gn.gain.setTargetAtTime(e[0] === etapa && audible(i) ? 1 : 0, ctx.currentTime, 0.012);
      }); });
      P.inst.forEach(function (i) { var f = ui.filas[i]; f.m.setAttribute('aria-pressed', mute[i] ? 'true' : 'false'); f.s.setAttribute('aria-pressed', solo[i] ? 'true' : 'false'); f.row.classList.toggle('apagada', !audible(i)); });
      [].forEach.call(ui.et.children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-e') === etapa ? 'true' : 'false'); });
    }
    function pos() { return sonando ? ((ctx.currentTime - t0) % dur) : desde; }
    function detener() { fuentes.forEach(function (s) { try { s.stop(); } catch (x) { /* ya detenida */ } try { s.disconnect(); } catch (x) { /* sin conexión */ } }); fuentes = []; }
    function iniciar(off) {
      detener(); desde = off; t0 = ctx.currentTime - off;
      Object.keys(buffers).forEach(function (k) { var s = ctx.createBufferSource(); s.buffer = buffers[k]; s.loop = true; s.loopStart = 0; s.loopEnd = dur; s.connect(gains[k]); s.start(0, off); fuentes.push(s); });
    }
    function reproducir() { if (activo && activo !== api) activo.pausar(); ctx.resume(); iniciar(desde); sonando = true; activo = api; ui.play.textContent = '⏸ Pausa'; ui.play.setAttribute('aria-pressed', 'true'); bucle(); }
    function pausar() { if (!sonando) return; desde = pos(); sonando = false; detener(); ui.play.textContent = '▶ Reproducir'; ui.play.setAttribute('aria-pressed', 'false'); cancelAnimationFrame(raf); medidores(true); }
    function medidores(cero) {
      P.inst.forEach(function (i) {
        var a = analisis[i], v = 0; if (a && !cero) { var d = new Uint8Array(a.fftSize); a.getByteTimeDomainData(d); for (var n = 0; n < d.length; n++) { var x = Math.abs(d[n] - 128) / 128; if (x > v) v = x; } }
        ui.filas[i].med.style.transform = 'scaleX(' + Math.min(1, v * 1.4).toFixed(3) + ')';
      });
    }
    function bucle() {
      var p = pos(); ui.seek.value = String(Math.round(p / dur * 1000)); ui.tiempo.textContent = p.toFixed(1) + ' / ' + dur.toFixed(1) + ' s';
      medidores(false); if (sonando) raf = requestAnimationFrame(bucle);
    }
    var api = { pausar: pausar };

    function construir() {
      cont.textContent = '';
      if (g.descripcion) cont.appendChild(el('p', 'nota', g.descripcion));
      ui.et = el('div', 'mz-etapas'); ui.et.setAttribute('role', 'group'); ui.et.setAttribute('aria-label', 'Etapa del sonido');
      P.etapas.forEach(function (e) {
        var b = el('button', 'mz-et'); b.type = 'button'; b.setAttribute('data-e', e[0]); b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('b', '', e[1])); b.appendChild(el('small', '', e[2]));
        b.addEventListener('click', function () { etapa = e[0]; aplicar(); }); ui.et.appendChild(b);
      });
      cont.appendChild(ui.et);
      var tr = el('div', 'mz-trans');
      ui.play = el('button', 'btn', '▶ Reproducir'); ui.play.type = 'button'; ui.play.setAttribute('aria-pressed', 'false');
      ui.play.addEventListener('click', function () { if (sonando) pausar(); else reproducir(); });
      ui.seek = el('input', 'mz-seek'); ui.seek.type = 'range'; ui.seek.min = '0'; ui.seek.max = '1000'; ui.seek.value = '0'; ui.seek.setAttribute('aria-label', 'Posición');
      ui.seek.addEventListener('input', function () { var off = Number(ui.seek.value) / 1000 * dur; desde = off; if (sonando) iniciar(off); ui.tiempo.textContent = off.toFixed(1) + ' / ' + dur.toFixed(1) + ' s'; });
      ui.tiempo = el('span', 'mz-tiempo', '0.0 / ' + dur.toFixed(1) + ' s');
      tr.appendChild(ui.play); tr.appendChild(ui.seek); tr.appendChild(ui.tiempo); cont.appendChild(tr);
      var pistas = el('div', 'mz-pistas'); ui.filas = {};
      P.inst.forEach(function (i) {
        var row = el('div', 'mz-pista'), nom = el('div', 'mz-nom'); nom.appendChild(el('span', 'mz-ico', ICO[i])); nom.appendChild(el('b', '', i));
        var m = el('button', 'mz-b', 'M'), s = el('button', 'mz-b', 'S'); m.type = s.type = 'button';
        m.title = 'Silenciar ' + i; s.title = 'Solo ' + i; m.setAttribute('aria-label', 'Silenciar ' + i); s.setAttribute('aria-label', 'Solo ' + i);
        m.setAttribute('aria-pressed', 'false'); s.setAttribute('aria-pressed', 'false');
        m.addEventListener('click', function () { mute[i] = !mute[i]; aplicar(); });
        s.addEventListener('click', function () { solo[i] = !solo[i]; aplicar(); });
        var medw = el('div', 'mz-medw'), med = el('div', 'mz-med'); medw.appendChild(med);
        row.appendChild(nom); row.appendChild(m); row.appendChild(s); row.appendChild(medw); pistas.appendChild(row); ui.filas[i] = { row: row, m: m, s: s, med: med };
      });
      cont.appendChild(pistas);
      var pie = el('div', 'mz-pie'); var rs = el('button', 'btn chico sec-b', 'Reiniciar pistas'); rs.type = 'button';
      rs.addEventListener('click', function () { mute = {}; solo = {}; aplicar(); }); pie.appendChild(rs);
      pie.appendChild(el('small', 'nota', 'M = silenciar · S = solo. Cambia de etapa mientras suena para comparar. El volumen sube en el master, como en un disco real.'));
      cont.appendChild(pie);
      aplicar();
    }

    cargar.addEventListener('click', function () {
      cargar.disabled = true; ctx = new Ctx(); try { ctx.resume(); } catch (x) { /* se reanuda al reproducir */ }
      var lista = []; P.inst.forEach(function (i) { P.etapas.forEach(function (e) { var u = P.pistas[i][e[0]]; if (u) lista.push([i, e[0], u]); }); });
      var hechos = 0, sig = 0, fallo = null;
      estado.textContent = 'Cargando pistas 0/' + lista.length + '…';
      function uno() {
        if (fallo || sig >= lista.length) return Promise.resolve();
        var it = lista[sig++];
        return bajar(it[2]).then(function (ab) { return decodificar(ctx, ab); }).then(function (b) { buffers[it[0] + '|' + it[1]] = b; estado.textContent = 'Cargando pistas ' + (++hechos) + '/' + lista.length + '…'; }).then(uno);
      }
      Promise.all([uno(), uno(), uno()]).then(function () {
        dur = Math.min.apply(null, Object.keys(buffers).map(function (k) { return buffers[k].duration; }));
        P.inst.forEach(function (i) {
          var b = ctx.createGain(), a = ctx.createAnalyser(); a.fftSize = 512; b.connect(a); a.connect(ctx.destination); bus[i] = b; analisis[i] = a;
          P.etapas.forEach(function (e) { if (!buffers[i + '|' + e[0]]) return; var gn = ctx.createGain(); gn.gain.value = 0; gn.connect(b); gains[i + '|' + e[0]] = gn; });
        });
        construir();
      }).catch(function (er) {
        try { ctx.close(); } catch (x) { /* ya cerrado */ }
        estado.textContent = 'No se pudo cargar el mezclador' + (er && er.message ? ' (' + er.message + ')' : '') + '. Intenta de nuevo.'; cargar.disabled = false;
      });
    });
  }

  function mezclador(grupos) {
    var cont = $('mezclador'), vac = $('mezclador-vacio'); if (!cont) return;
    var validos = grupos.filter(function (g) { var p = parsear(g); return p.inst.length && p.etapas.length; });
    cont.textContent = ''; cont.hidden = !validos.length; if (vac) vac.hidden = !!validos.length; if (!validos.length) return;
    cont.appendChild(el('div', 'comp-kick', 'Mini DAW · Prueba tú mismo'));
    cont.appendChild(el('h3', 'comp-tit', 'Mezclador de pistas'));
    cont.appendChild(el('p', 'comp-sub', 'Un tramo de una canción grabada aquí, pista por pista. Silencia o solea batería, bajo, guitarras y voces, y alterna entre en bruto, mezcla y master para escuchar qué aporta cada etapa.'));
    var sel = el('div', 'comp-canciones'), cuerpo = el('div', 'mz-cuerpo'); cont.appendChild(sel); cont.appendChild(cuerpo);
    function ver(g, b) {
      if (activo) activo.pausar();
      [].forEach.call(sel.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      montar(cuerpo, g);
    }
    if (validos.length > 1) validos.forEach(function (g) { var b = el('button', 'btn chico sec-b', g.grupo); b.type = 'button'; b.addEventListener('click', function () { ver(g, b); }); sel.appendChild(b); });
    else cont.insertBefore(el('div', 'comp-cancion', '🎵 ' + validos[0].grupo), sel);
    ver(validos[0], validos.length > 1 ? sel.firstChild : null);
  }
  RK.mezclador = mezclador;
  RK.mezPausar = function () { if (activo) activo.pausar(); };
  document.addEventListener('visibilitychange', function () { if (document.hidden && activo) activo.pausar(); });
})();
