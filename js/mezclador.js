/* Mezclador de pistas (mini DAW): una canción de ~20 s en pistas sueltas, en tres etapas (en bruto, mezcla y master).
   El visitante silencia o solea instrumentos y alterna la etapa; todo suena sincronizado con Web Audio. */
(function () {
  'use strict';
  var RK = window.RK, $ = function (id) { return document.getElementById(id); }, el = RK.el, API = RK.api;
  var INST = ['Batería', 'Bajo', 'Guitarras', 'Voces', 'Otros'];
  var ICO = { 'Batería': '🥁', 'Bajo': '🎸', 'Guitarras': '🎸', 'Voces': '🎤', 'Otros': '🎹' };
  var ETAPAS = [
    ['En bruto', 'RAW', 'Sin procesar: tal como entra al micrófono.'],
    ['Mezcla', 'MIX', 'Cada pista con su EQ, compresión, panning y efectos.'],
    ['Master', 'MASTER', 'Con la cadena de master: pegada, brillo y volumen comercial.']
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

  var TXT_ETAPA = {
    'En bruto': 'RAW · Así entra al micrófono: sin EQ, sin compresión, sin efectos. Es la materia prima.',
    'Mezcla': 'MIX · La mezcla da forma: el EQ limpia, la compresión controla la dinámica, el panning ubica cada pista y los efectos dan espacio.',
    'Master': 'MASTER · El pulido final: cohesión, brillo y volumen comercial para que suene bien en cualquier parlante o plataforma.'
  };
  var TXT_INST = {
    'Batería': 'revisa la pegada del bombo y la caja, y cómo respiran los platillos.',
    'Bajo': 'es la base: mira cómo se acopla al bombo y sostiene la armonía.',
    'Guitarras': 'llenan el espectro; el panning las abre a los lados para dejar espacio.',
    'Voces': 'van al frente: compresión para que se entienda cada palabra y espacio para que respire.',
    'Otros': 'escúchala aislada para notar qué aporta al conjunto.'
  };
  var TXT_ETAPA_CORTA = { 'En bruto': 'Sin procesar', 'Mezcla': 'Con mezcla', 'Master': 'Con master' };
  var COLOR = { 'Batería': '#ff8a3d', 'Bajo': '#a78bfa', 'Guitarras': '#4ea8ff', 'Voces': '#ff5fa2', 'Otros': '#3ddc84' };
  function picos(buf, n) {
    var out = new Float32Array(n), canales = [], c, k, i;
    for (c = 0; c < buf.numberOfChannels; c++) canales.push(buf.getChannelData(c));
    var paso = Math.max(1, Math.floor(buf.length / n));
    for (i = 0; i < n; i++) { var m = 0, ini = i * paso, fin = Math.min(buf.length, ini + paso); for (c = 0; c < canales.length; c++) { var d = canales[c]; for (k = ini; k < fin; k += 8) { var v = d[k] < 0 ? -d[k] : d[k]; if (v > m) m = v; } } out[i] = m; }
    return out;
  }
  function dibujar(cv, pk, color) {
    var dpr = window.devicePixelRatio || 1, w = Math.max(10, Math.round(cv.clientWidth * dpr)), h = Math.max(10, Math.round(cv.clientHeight * dpr));
    cv.width = w; cv.height = h; var g = cv.getContext('2d'); g.clearRect(0, 0, w, h); g.fillStyle = color;
    var mid = h / 2, ancho = Math.max(1, Math.round(2 * dpr)), paso = ancho + Math.max(1, Math.round(dpr));
    if (!pk) { g.globalAlpha = .25; g.fillRect(0, mid - 0.5 * dpr, w, Math.max(1, dpr)); g.globalAlpha = 1; return; }
    var max = 0.001; for (var a = 0; a < pk.length; a++) if (pk[a] > max) max = pk[a];
    for (var x = 0; x < w; x += paso) { var v = pk[Math.min(pk.length - 1, Math.floor(x / w * pk.length))] / max, alto = Math.max(dpr, v * (h - 6 * dpr)); g.fillRect(x, mid - alto / 2, ancho, alto); }
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
    var ctx, buffers = {}, pk = {}, gains = {}, fuentes = [], etapa = P.etapas[0][0];
    var mute = {}, solo = {}, dur = 0, t0 = 0, desde = 0, sonando = false, raf = 0, ui = {};

    function audible(i) { var haySolo = P.inst.some(function (x) { return solo[x]; }); return !mute[i] && (haySolo ? !!solo[i] : true); }
    function pintarOndas() {
      P.inst.forEach(function (i) { dibujar(ui.filas[i].cv, pk[i + '|' + etapa], COLOR[i]); });
    }
    function aplicar(redibujar) {
      P.inst.forEach(function (i) { P.etapas.forEach(function (e) {
        var gn = gains[i + '|' + e[0]]; if (!gn) return;
        gn.gain.setTargetAtTime(e[0] === etapa && audible(i) ? 1 : 0, ctx.currentTime, 0.012);
      }); });
      var faltan = [];
      P.inst.forEach(function (i) {
        var f = ui.filas[i], hay = !!buffers[i + '|' + etapa];
        f.m.setAttribute('aria-pressed', mute[i] ? 'true' : 'false'); f.s.setAttribute('aria-pressed', solo[i] ? 'true' : 'false');
        f.row.classList.toggle('apagada', !hay || !audible(i)); f.row.classList.toggle('sin-pista', !hay); if (!hay) faltan.push(i);
      });
      [].forEach.call(ui.et.children, function (b) { var on = b.getAttribute('data-e') === etapa; b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      aplicar.faltan = faltan;
      if (redibujar !== false) pintarOndas();
    }
    var tglobo = 0;
    function globo(t) { if (!ui.globo) return; ui.globo.textContent = t; ui.globo.classList.add('ver'); clearTimeout(tglobo); tglobo = setTimeout(function () { ui.globo.classList.remove('ver'); }, 7000); }
    function pos() { return sonando ? ((ctx.currentTime - t0) % dur) : desde; }
    function detener() { fuentes.forEach(function (s) { try { s.stop(); } catch (x) { /* ya detenida */ } try { s.disconnect(); } catch (x) { /* sin conexión */ } }); fuentes = []; }
    function iniciar(off) {
      detener(); desde = off; t0 = ctx.currentTime - off;
      Object.keys(buffers).forEach(function (k) { var s = ctx.createBufferSource(); s.buffer = buffers[k]; s.loop = true; s.loopStart = 0; s.loopEnd = dur; s.connect(gains[k]); s.start(0, off); fuentes.push(s); });
    }
    function hora(t) { var m = Math.floor(t / 60), s = t - m * 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
    function mostrarPos() { var p = pos(), f = dur ? p / dur : 0; ui.tiempo.textContent = hora(p); ui.lanes.setAttribute('aria-valuenow', String(Math.round(f * 100))); P.inst.forEach(function (i) { ui.filas[i].prog.style.transform = 'scaleX(' + f.toFixed(4) + ')'; }); }
    function bucle() { mostrarPos(); if (sonando) raf = requestAnimationFrame(bucle); }
    function reproducir() { if (activo && activo !== api) activo.pausar(); ctx.resume(); iniciar(desde); sonando = true; activo = api; ui.play.textContent = '⏸'; ui.play.setAttribute('aria-label', 'Pausa'); ui.play.setAttribute('aria-pressed', 'true'); bucle(); }
    function pausar() { if (!sonando) return; desde = pos(); sonando = false; detener(); ui.play.textContent = '▶'; ui.play.setAttribute('aria-label', 'Reproducir'); ui.play.setAttribute('aria-pressed', 'false'); cancelAnimationFrame(raf); mostrarPos(); }
    function ir(frac) { frac = Math.max(0, Math.min(0.999, frac)); desde = frac * dur; if (sonando) iniciar(desde); mostrarPos(); }
    var api = { pausar: pausar };

    function construir() {
      cont.textContent = '';
      if (g.descripcion) cont.appendChild(el('p', 'nota', g.descripcion));
      var daw = el('div', 'mz-daw');
      // barra superior (transporte y etapa)
      var top = el('div', 'mz-top');
      ui.play = el('button', 'mz-play', '▶'); ui.play.type = 'button'; ui.play.setAttribute('aria-label', 'Reproducir'); ui.play.setAttribute('aria-pressed', 'false');
      ui.play.addEventListener('click', function () { if (sonando) pausar(); else reproducir(); });
      var rel = el('div', 'mz-reloj'); ui.tiempo = el('b', '', hora(0)); rel.appendChild(ui.tiempo); rel.appendChild(el('small', '', '/ ' + hora(dur)));
      var tit = el('div', 'mz-sesion'); tit.appendChild(el('small', '', 'SESIÓN')); tit.appendChild(el('b', '', g.grupo));
      ui.et = el('div', 'mz-etapas'); ui.et.setAttribute('role', 'group'); ui.et.setAttribute('aria-label', 'Etapa del sonido');
      P.etapas.forEach(function (e) {
        var b = el('button', 'mz-et'); b.type = 'button'; b.setAttribute('data-e', e[0]); b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('i', 'mz-led')); b.appendChild(el('span', '', e[1])); b.title = TXT_ETAPA_CORTA[e[0]]; b.addEventListener('click', function () { etapa = e[0]; aplicar(); var f = aplicar.faltan || []; globo(TXT_ETAPA[e[0]] + (f.length ? ' (Sin pista separada de: ' + f.join(', ') + '; viene como conjunto.)' : '')); }); ui.et.appendChild(b);
      });
      top.appendChild(ui.play); top.appendChild(rel); top.appendChild(tit); top.appendChild(ui.et); daw.appendChild(top);
      // pistas con forma de onda
      ui.lanes = el('div', 'mz-pistas'); ui.lanes.tabIndex = 0; ui.lanes.setAttribute('role', 'slider'); ui.lanes.setAttribute('aria-label', 'Posición de la canción'); ui.lanes.setAttribute('aria-valuemin', '0'); ui.lanes.setAttribute('aria-valuemax', '100'); ui.lanes.setAttribute('aria-valuenow', '0');
      ui.lanes.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowRight') { ir((pos() + 1) / dur); ev.preventDefault(); } else if (ev.key === 'ArrowLeft') { ir((pos() - 1) / dur); ev.preventDefault(); } else if (ev.key === ' ') { if (sonando) pausar(); else reproducir(); ev.preventDefault(); }
      });
      ui.filas = {};
      P.inst.forEach(function (i) {
        var row = el('div', 'mz-pista'); row.style.setProperty('--c', COLOR[i]);
        var cab = el('div', 'mz-cab'); cab.appendChild(el('span', 'mz-ico', ICO[i])); cab.appendChild(el('b', 'mz-nom', i));
        var bt = el('div', 'mz-bts'), m = el('button', 'mz-b', 'M'), s = el('button', 'mz-b', 'S'); m.type = s.type = 'button';
        m.title = 'Silenciar ' + i; s.title = 'Solo ' + i; m.setAttribute('aria-label', 'Silenciar ' + i); s.setAttribute('aria-label', 'Solo ' + i); m.setAttribute('aria-pressed', 'false'); s.setAttribute('aria-pressed', 'false');
        m.addEventListener('click', function () { mute[i] = !mute[i]; aplicar(false); globo(mute[i] ? 'Silenciaste ' + i + ': escucha cómo suena el resto sin ella; así se nota lo que aporta.' : i + ' vuelve a sonar.'); }); s.addEventListener('click', function () { solo[i] = !solo[i]; aplicar(false); globo(solo[i] ? 'SOLO · ' + i + ': ' + TXT_INST[i] : 'Salió del solo.'); });
        bt.appendChild(s); bt.appendChild(m); cab.appendChild(bt);
        var onda = el('div', 'mz-onda'), cv = document.createElement('canvas'), prog = el('div', 'mz-prog'); cv.setAttribute('aria-hidden', 'true');
        onda.appendChild(cv); onda.appendChild(prog); onda.appendChild(el('span', 'mz-nopista', 'sin pista en esta etapa'));
        var arrastra = false;
        function desdeEvento(ev) { var r = onda.getBoundingClientRect(); ir((ev.clientX - r.left) / r.width); }
        onda.addEventListener('pointerdown', function (ev) { arrastra = true; try { onda.setPointerCapture(ev.pointerId); } catch (x) { /* sin captura */ } desdeEvento(ev); });
        onda.addEventListener('pointermove', function (ev) { if (arrastra) desdeEvento(ev); });
        onda.addEventListener('pointerup', function () { arrastra = false; }); onda.addEventListener('pointercancel', function () { arrastra = false; });
        row.appendChild(cab); row.appendChild(onda); ui.lanes.appendChild(row); ui.filas[i] = { row: row, m: m, s: s, cv: cv, prog: prog };
      });
      ui.globo = el('div', 'mz-globo'); ui.globo.setAttribute('role', 'status'); ui.globo.setAttribute('aria-live', 'polite');
      var cuerpoPistas = el('div', 'mz-cuerpo-p'); cuerpoPistas.appendChild(ui.lanes); cuerpoPistas.appendChild(ui.globo); daw.appendChild(cuerpoPistas);
      var pie = el('div', 'mz-pie'); var rs = el('button', 'btn chico sec-b', 'Reiniciar pistas'); rs.type = 'button';
      rs.addEventListener('click', function () { mute = {}; solo = {}; aplicar(false); globo('Todas las pistas activas: así suena el conjunto.'); }); pie.appendChild(rs);
      pie.appendChild(el('small', 'nota', 'S = solo · M = silenciar · toca la onda para saltar.'));
      daw.appendChild(pie); cont.appendChild(daw);
      aplicar(); mostrarPos(); globo('Toca ▶ y cambia entre RAW, MIX y MASTER mientras suena. Con S escuchas una pista sola.');
      var tmr = 0; window.addEventListener('resize', function () { clearTimeout(tmr); tmr = setTimeout(pintarOndas, 150); });
    }

    cargar.addEventListener('click', function () {
      cargar.disabled = true; ctx = new Ctx(); try { ctx.resume(); } catch (x) { /* se reanuda al reproducir */ }
      var lista = []; P.inst.forEach(function (i) { P.etapas.forEach(function (e) { var u = P.pistas[i][e[0]]; if (u) lista.push([i, e[0], u]); }); });
      var hechos = 0, sig = 0;
      estado.textContent = 'Cargando pistas 0/' + lista.length + '…';
      function uno() {
        if (sig >= lista.length) return Promise.resolve();
        var it = lista[sig++];
        return bajar(it[2]).then(function (ab) { return decodificar(ctx, ab); }).then(function (b) { buffers[it[0] + '|' + it[1]] = b; pk[it[0] + '|' + it[1]] = picos(b, 480); estado.textContent = 'Cargando pistas ' + (++hechos) + '/' + lista.length + '…'; }).then(uno);
      }
      Promise.all([uno(), uno(), uno()]).then(function () {
        dur = Math.min.apply(null, Object.keys(buffers).map(function (k) { return buffers[k].duration; }));
        Object.keys(buffers).forEach(function (k) { var gn = ctx.createGain(); gn.gain.value = 0; gn.connect(ctx.destination); gains[k] = gn; });
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
    cont.appendChild(el('p', 'comp-sub', 'Un tramo de una canción grabada aquí, pista por pista. Escucha cada instrumento solo o sin él, y alterna entre el sonido en bruto, la mezcla y el master para notar qué aporta cada etapa.'));
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
