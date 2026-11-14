/* Secciones que se alimentan solas: muestras de audio, cuadro de honor, opiniones y formularios. */
(function () {
  'use strict';
  var RK = window.RK, $ = function (id) { return document.getElementById(id); };
  var el = RK.el, API = RK.api;

  /* ---------- reproductor (se crea al tocar "Escuchar", para no cargar decenas de incrustados) ---------- */
  function reproductor(url) {
    var m;
    if ((m = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/.exec(url))) return marco('https://drive.google.com/file/d/' + m[1] + '/preview', '');
    if ((m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:\S*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url))) return marco('https://www.youtube-nocookie.com/embed/' + m[1], 'yt');
    if (/^https:\/\/soundcloud\.com\/\S+$/.test(url)) return marco('https://w.soundcloud.com/player/?url=' + encodeURIComponent(url), '');
    if (/^https:\/\/\S+\.(mp3|wav|m4a|ogg)(\?\S*)?$/i.test(url) || /^audio\/[\w\-. \/]+$/.test(url)) {
      var a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = url; return a;
    }
    var l = el('a', '', 'Abrir audio'); l.href = /^https:\/\//.test(url) ? url : '#'; l.target = '_blank'; l.rel = 'noopener'; return l;
  }
  function marco(src, cls) {
    var f = document.createElement('iframe'); f.src = src; f.className = cls; f.loading = 'lazy'; f.allow = 'autoplay; encrypted-media';
    f.setAttribute('referrerpolicy', 'no-referrer'); return f;
  }
  function muestra(item) {
    var d = el('div', 'muestra'); if (item.etiqueta) d.appendChild(el('div', 'et', item.etiqueta));
    var b = el('button', 'btn chico', '▶ Escuchar'); b.type = 'button';
    b.addEventListener('click', function () { d.replaceChild(reproductor(item.enlace), b); });
    d.appendChild(b); return d;
  }
  function tarjeta(g, abierta) {
    var c = el('details', 'card'); var s = el('summary', '', g.grupo);
    if (g.descripcion) s.appendChild(el('small', '', g.descripcion));
    c.appendChild(s); g.items.forEach(function (i) { c.appendChild(muestra(i)); }); if (abierta) c.open = true; return c;
  }

  /* ---------- comparador A/B/C: la misma canción en bruto, mezclada y masterizada ---------- */
  var ETAPAS = [
    ['01. RAW', 'Toma directa sin procesar', 'Dinámica seca, frecuencias sin ecualizar, balance plano de microfonía.', 'En bruto'],
    ['02. MIX', 'Mezcla y panning pro', 'Apertura estéreo, EQ correctiva, gating de batería y saturación cálida.', 'Mezclada'],
    ['03. MASTER (-14 LUFS)', 'Master comercial para streaming', 'Compresión de bus analógica SSL, pegada, brillo analógico y volumen estándar comercial.', 'Masterizada']
  ];
  function comparador(grupos) {
    var cont = $('comparador'); if (!cont) return;
    cont.textContent = ''; cont.hidden = !grupos.length; if (!grupos.length) return;
    cont.appendChild(el('div', 'comp-kick', 'Experiencia interactiva en tiempo real'));
    cont.appendChild(el('h3', 'comp-tit', 'Comparador A/B/C: Raw → Mix → Master'));
    cont.appendChild(el('p', 'comp-sub', 'Toca cualquiera de las 3 etapas para escuchar la evolución sonora de una misma canción en Rockerío Producciones: desde la captura en bruto de sala, la apertura estéreo y el balance de mezcla, hasta el punch comercial con compresión de bus analógica SSL.'));
    var sel = el('div', 'comp-canciones'), cuerpo = el('div'); cont.appendChild(sel); cont.appendChild(cuerpo);
    var parar = null; // detiene el motor de la canción anterior
    function mostrar(g, btnSel) {
      if (parar) { parar(); parar = null; }
      [].forEach.call(sel.children, function (b) { b.setAttribute('aria-pressed', b === btnSel ? 'true' : 'false'); });
      cuerpo.textContent = '';
      if (g.descripcion) cuerpo.appendChild(el('p', 'nota', g.descripcion));
      var fila = el('div', 'comp-etapas'), play = el('div', 'comp-play'), tiempo = 0;
      var items = ETAPAS.map(function (e) { return g.items.filter(function (x) { return x.etiqueta === e[3]; })[0] || null; });
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var drive = function (u) { var m = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/.exec(u || ''); return m ? m[1] : ''; };
      var sincro = !!Ctx && items.every(function (it) { return it && drive(it.enlace); }); // las 3 versiones deben ser audios de Drive
      var M = null, cargando = false, pendiente = -1, botones = [];
      function marcar(i) { botones.forEach(function (x, k) { if (x) x.setAttribute('aria-pressed', k === i ? 'true' : 'false'); }); }
      /* Respaldo: reproductor incrustado (no sincroniza, pero sigue la posición aproximada) */
      function viejo(i) {
        var it = items[i], a0 = play.querySelector('audio'); if (a0) tiempo = a0.currentTime;
        play.textContent = ''; var p = reproductor(it.enlace); play.appendChild(p);
        if (p.tagName === 'AUDIO') { p.addEventListener('loadedmetadata', function () { try { p.currentTime = tiempo; } catch (x) { /* sin posición */ } p.play().catch(function () {}); }); p.preload = 'metadata'; }
      }
      /* Motor sincronizado: las 3 versiones suenan a la vez y solo se sube el volumen de la elegida */
      function bajar(id) {
        return RK.pedir(API + '?accion=audiomix&id=' + id).then(function (d) {
          if (!d || !d.ok) throw new Error('audio'); var bin = atob(d.b64), n = bin.length, u = new Uint8Array(n); for (var k = 0; k < n; k++) u[k] = bin.charCodeAt(k); return u.buffer;
        });
      }
      function decodificar(ctx, ab) { return new Promise(function (ok, mal) { var r = ctx.decodeAudioData(ab, ok, mal); if (r && r.then) r.then(ok, mal); }); }
      function armar(ctx, bufs) {
        var dur = Math.min.apply(null, bufs.map(function (b) { return b.duration; })), gains = bufs.map(function () { var gn = ctx.createGain(); gn.gain.value = 0; gn.connect(ctx.destination); return gn; });
        var m = { ctx: ctx, dur: dur, gains: gains, fuentes: [], etapa: 0, sonando: false, desde: 0, t0: 0, raf: 0 };
        var ui = el('div', 'comp-ctl');
        var bp = el('button', 'mz-play', '▶'); bp.type = 'button'; bp.setAttribute('aria-label', 'Reproducir');
        var rg = document.createElement('input'); rg.type = 'range'; rg.min = '0'; rg.max = '1000'; rg.value = '0'; rg.setAttribute('aria-label', 'Posición de la canción'); rg.className = 'comp-rg';
        var tx = el('span', 'comp-tm', '0:00 / 0:00');
        function fmt(t) { var mm = Math.floor(t / 60), ss = Math.floor(t % 60); return mm + ':' + (ss < 10 ? '0' : '') + ss; }
        m.pos = function () { return m.sonando ? ((ctx.currentTime - m.t0) % dur) : m.desde; };
        function pintar() { var p = m.pos(); tx.textContent = fmt(p) + ' / ' + fmt(dur); if (!m.arrastra) rg.value = String(Math.round(p / dur * 1000)); if (m.sonando) m.raf = requestAnimationFrame(pintar); }
        m.detener = function () { m.fuentes.forEach(function (s) { try { s.stop(); } catch (x) { /* ya detenida */ } try { s.disconnect(); } catch (x) { /* sin conexión */ } }); m.fuentes = []; };
        m.iniciar = function (off) { m.detener(); m.desde = off; m.t0 = ctx.currentTime - off; bufs.forEach(function (b, k) { var src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.loopStart = 0; src.loopEnd = dur; src.connect(gains[k]); src.start(0, off); m.fuentes.push(src); }); };
        m.reproducir = function () { ctx.resume(); m.iniciar(m.desde); m.sonando = true; bp.textContent = '⏸'; bp.setAttribute('aria-label', 'Pausa'); cancelAnimationFrame(m.raf); pintar(); };
        m.pausar = function () { if (!m.sonando) return; m.desde = m.pos(); m.sonando = false; m.detener(); bp.textContent = '▶'; bp.setAttribute('aria-label', 'Reproducir'); cancelAnimationFrame(m.raf); pintar(); };
        m.elegir = function (i) { m.etapa = i; gains.forEach(function (gn, k) { gn.gain.setTargetAtTime(k === i ? 1 : 0, ctx.currentTime, 0.01); }); };
        bp.addEventListener('click', function () { if (m.sonando) m.pausar(); else m.reproducir(); });
        rg.addEventListener('input', function () { m.arrastra = true; var off = Number(rg.value) / 1000 * dur; tx.textContent = fmt(off) + ' / ' + fmt(dur); });
        rg.addEventListener('change', function () { m.arrastra = false; var off = Math.min(dur - 0.05, Number(rg.value) / 1000 * dur); m.desde = off; if (m.sonando) m.iniciar(off); pintar(); });
        ui.appendChild(bp); ui.appendChild(rg); ui.appendChild(tx); play.textContent = ''; play.appendChild(ui); pintar();
        m.cerrar = function () { m.pausar(); try { ctx.close(); } catch (x) { /* ya cerrado */ } };
        return m;
      }
      function cargar() {
        cargando = true; var ctx = new Ctx(); try { ctx.resume(); } catch (x) { /* se reanuda al tocar */ }
        play.textContent = ''; play.appendChild(el('p', 'nota', 'Cargando las 3 versiones para que suenen sincronizadas…'));
        Promise.all(items.map(function (it) { return bajar(drive(it.enlace)).then(function (ab) { return decodificar(ctx, ab); }); })).then(function (bufs) {
          M = armar(ctx, bufs); cargando = false; parar = M.cerrar; var i = pendiente >= 0 ? pendiente : 0; M.elegir(i); M.reproducir();
        }).catch(function (e) {
          if (window.console) console.warn('Comparador: no se pudo sincronizar, uso el reproductor simple.', e && e.message ? e.message : e);
          cargando = false; sincro = false; try { ctx.close(); } catch (x) { /* sin contexto */ } if (pendiente >= 0) viejo(pendiente);
        });
      }
      ETAPAS.forEach(function (e, i) {
        var it = items[i]; if (!it) { botones.push(null); return; }
        var b = el('button', 'comp-et'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('span', 'comp-n', e[0])); b.appendChild(el('span', 'comp-pl', '▶'));
        b.appendChild(el('b', '', e[1])); b.appendChild(el('small', '', e[2]));
        b.addEventListener('click', function () {
          marcar(i); pendiente = i;
          if (!sincro) { viejo(i); return; }
          if (M) { M.elegir(i); if (!M.sonando) M.reproducir(); return; }
          if (!cargando) cargar();
        });
        botones.push(b); fila.appendChild(b);
      });
      cuerpo.appendChild(fila); cuerpo.appendChild(play);
    }
    grupos.forEach(function (g, i) {
      if (grupos.length > 1) { var b = el('button', 'btn chico sec-b', g.grupo); b.type = 'button'; b.addEventListener('click', function () { mostrar(g, b); }); sel.appendChild(b); }
      else cont.insertBefore(el('div', 'comp-cancion', '🎵 ' + g.grupo), sel);
    });
    if (grupos.length > 1) mostrar(grupos[0], sel.firstChild); else mostrar(grupos[0], null);
  }

  /** Catálogo de micrófonos: foto, marca/modelo, uso, descripción y sus muestras de audio, todo en una tarjeta. */
  function pintarMics(cat, grupos) {
    var norm = function (t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }, porNombre = {}, usados = {};
    grupos.forEach(function (g) { porNombre[norm(g.grupo)] = g; });
    var lista = cat.map(function (m) { var g = porNombre[norm(m.nombre)]; if (g) usados[norm(m.nombre)] = 1; return { nombre: m.nombre, foto: m.foto, foto2: m.foto2, foto3: m.foto3, uso: m.uso, descripcion: m.descripcion || (g && g.descripcion) || '', items: (Array.isArray(m.audios) ? m.audios.filter(function (a) { return a && a.enlace; }) : []).concat(g ? g.items : []) }; });
    grupos.forEach(function (g) { if (!usados[norm(g.grupo)]) lista.push({ nombre: g.grupo, foto: '', uso: '', descripcion: g.descripcion || '', items: g.items }); });
    var cont = $('mics'); cont.textContent = ''; $('mics-box').hidden = !lista.length;
    var etiquetas = [], vistas = {};
    lista.forEach(function (m) { m.tags = String(m.uso || '').split(/\s*[\/,]\s*/).filter(Boolean).map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }); m.tags.forEach(function (t) { var k = t.toLowerCase(); if (!vistas[k]) { vistas[k] = 1; etiquetas.push(t); } }); });
    var filtro = document.getElementById('mics-filtro'); if (filtro) filtro.remove();
    var tarjetas = [];
    if (etiquetas.length > 1) {
      filtro = el('div', 'mic-filtro'); filtro.id = 'mics-filtro'; filtro.setAttribute('role', 'group'); filtro.setAttribute('aria-label', 'Filtrar micrófonos por uso');
      var activo = '';
      var botones = [''].concat(etiquetas).map(function (t) { var b = el('button', 'mic-chip', t || 'Todos'); b.type = 'button'; b.setAttribute('aria-pressed', t ? 'false' : 'true'); b.addEventListener('click', function () { activo = t.toLowerCase(); botones.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); tarjetas.forEach(function (c) { c.el.hidden = !!activo && c.tags.indexOf(activo) < 0; }); }); filtro.appendChild(b); return b; });
      cont.parentNode.insertBefore(filtro, cont);
    }
    lista.forEach(function (m) {
      var fotos = [m.foto, m.foto2, m.foto3].filter(function (u) { return /^(https:\/\/|assets\/)/.test(u || ''); }).slice(0, 3);
      var it = el('div', 'mic-it'); tarjetas.push({ el: it, tags: m.tags.map(function (t) { return t.toLowerCase(); }) });
      var lf = fotos.map(function (u) { return { src: u, alt: m.nombre }; }), pos = 0;
      var gal = el('div', 'mic-gal'), mb = el('div', 'mic-main');
      var mi = el('img'); mi.alt = m.nombre; mi.loading = 'lazy';
      if (fotos.length) { mi.src = fotos[0]; mb.appendChild(mi); } else { mb.appendChild(el('span', 'mic-ico', '🎙️')); }
      gal.appendChild(mb);
      if (fotos.length > 1) {
        var pts = el('div', 'mic-pts');
        var ir = function (k) { pos = (k + fotos.length) % fotos.length; mi.src = fotos[pos]; [].forEach.call(pts.children, function (x, j) { x.classList.toggle('on', j === pos); }); };
        fotos.forEach(function (u, k) { var t = el('button', 'mic-pt' + (k === 0 ? ' on' : '')); t.type = 'button'; t.setAttribute('aria-label', 'Foto ' + (k + 1)); t.addEventListener('click', function () { ir(k); }); pts.appendChild(t); });
        [['‹', -1, 'mic-fl mic-fl-i', 'Foto anterior'], ['›', 1, 'mic-fl mic-fl-d', 'Foto siguiente']].forEach(function (f) { var bt = el('button', f[2], f[0]); bt.type = 'button'; bt.setAttribute('aria-label', f[3]); bt.addEventListener('click', function () { ir(pos + f[1]); }); mb.appendChild(bt); });
        var x0 = null; mb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
        mb.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 30) ir(pos + (dx < 0 ? 1 : -1)); }, { passive: true });
        gal.appendChild(pts);
      }
      it.appendChild(gal);
      var tx = el('div', 'mic-tx'); tx.appendChild(el('b', 'mic-nom', m.nombre)); if (m.uso) tx.appendChild(el('span', 'mic-uso-c', m.uso));
      if (m.descripcion) { var d = el('p', 'mic-desc', m.descripcion); d.title = 'Toca para ver más'; d.addEventListener('click', function () { d.classList.toggle('abierta'); }); tx.appendChild(d); }
      it.appendChild(tx);
      var pl = el('div', 'mic-player'), activo = null;
      if (m.items.length) {
        var bs = el('div', 'mic-btns');
        m.items.forEach(function (i, n) {
          var bt = el('button', 'mic-play', '▶ ' + (i.etiqueta || 'Audio ' + (n + 1))); bt.type = 'button';
          bt.addEventListener('click', function () {
            [].forEach.call(document.querySelectorAll('#mics-box audio'), function (a) { try { a.pause(); } catch (e) { /* sin audio */ } });
            if (activo === bt) { pl.textContent = ''; bt.classList.remove('on'); activo = null; return; }
            [].forEach.call(bs.children, function (x) { x.classList.remove('on'); }); bt.classList.add('on'); activo = bt; pl.textContent = '';
            var r = reproductor(i.enlace); pl.appendChild(r); if (r.tagName === 'AUDIO') { try { r.play(); } catch (e) { /* el usuario puede pulsar play */ } }
          });
          bs.appendChild(bt);
        });
        it.appendChild(bs); it.appendChild(pl);
      } else it.appendChild(el('small', 'mic-sinaudio', 'Audio próximamente'));
      cont.appendChild(it);
    });
  }

  /* ---------- pestañas de Producción (mismo esquema que la ficha técnica) ---------- */
  function pestanasProd(tabsId, seccion) {
    var tabs = $(tabsId); if (!tabs) return;
    var paneles = [].slice.call(document.querySelectorAll('#' + seccion + ' .prod-panel'));
    function ir(id) {
      if (RK.mezPausar) RK.mezPausar();
      [].forEach.call(tabs.querySelectorAll('.ficha-tab'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-p') === id ? 'true' : 'false'); });
      paneles.forEach(function (p) { p.hidden = p.getAttribute('data-p') !== id; });
    }
    [].forEach.call(tabs.querySelectorAll('.ficha-tab'), function (b) { b.addEventListener('click', function () { ir(b.getAttribute('data-p')); }); });
  }
  pestanasProd('prod-tabs', 'nosotros');
  window.addEventListener('hashchange', function () { if (RK.mezPausar) RK.mezPausar(); });

  /* ---------- pintado ---------- */
  function pintar(c) {
    var mics = c.muestras.filter(function (g) { return g.tipo === 'Micrófono'; });
    var otros = c.muestras.filter(function (g) { return g.tipo !== 'Micrófono' && g.tipo !== 'Comparador' && g.tipo !== 'Mezclador'; });
    comparador(c.muestras.filter(function (g) { return g.tipo === 'Comparador'; }));
    if (RK.mezclador) RK.mezclador(c.muestras.filter(function (g) { return g.tipo === 'Mezclador'; }));
    $('escucha-box').hidden = !otros.length;
    /* El catálogo guardado desde el portal se respeta tal cual (sin rellenar fotos ni textos que se hayan quitado a propósito). */
    RK.micsCatalogo().then(function (cat) { pintarMics(cat || [], mics); });
    otros.forEach(function (g) { $('escucha').appendChild(tarjeta(g)); });

    var K = window.RK.cfg(); $('bandas').hidden = !K.verHonor; $('nav-bandas').hidden = !K.verHonor; var ch = $('cta-honor'); if (ch) ch.hidden = !K.verHonor; var cr = $('cta-resena'); if (cr) cr.hidden = !K.verEvaluaciones;
    var host = function (u) { var m = /^https:\/\/(?:www\.)?([^\/]+)/.exec(u || ''); return m ? m[1] : ''; };
    var etiq = function (u) { var h = host(u); return /spotify/.test(h) ? 'Spotify' : /bandcamp/.test(h) ? 'Bandcamp' : /youtu/.test(h) ? 'YouTube' : /instagram/.test(h) ? 'Instagram' : /soundcloud/.test(h) ? 'SoundCloud' : 'Enlace'; };
    var vac = document.querySelector('.honor-vacio'); if (vac && c.honor.length) vac.remove();
    c.honor.forEach(function (h) {
      var k = el('div', 'card honor-card');
      var cab = el('div', 'honor-cab2');
      if (/^https:\/\//.test(h.logo)) { var i = el('img', 'logo'); i.src = h.logo; i.alt = 'Logo de ' + h.banda; i.loading = 'lazy'; i.referrerPolicy = 'no-referrer'; cab.appendChild(i); }
      var t = el('div'); t.appendChild(el('h3', '', h.banda)); if (h.genero) t.appendChild(el('span', 'chip-genero', h.genero)); cab.appendChild(t); k.appendChild(cab);
      if (h.formacion) { var fo = el('p', 'nota'); fo.appendChild(document.createTextNode('Formación: ')); fo.appendChild(el('strong', '', h.formacion)); k.appendChild(fo); }
      k.appendChild(el('p', '', h.resena));
      var r = el('p', 'redes'), redes = (h.redes && h.redes.length) ? h.redes : [['Instagram', h.instagram], [etiq(h.enlace), h.enlace], ['YouTube', /^https:\/\/(?:www\.)?youtube\.com\/channel|\/@/.test(h.youtube || '') ? h.youtube : '']].map(function (x) { return { r: x[0], u: x[1] }; });
      redes.forEach(function (x) { if (/^https:\/\//.test(x.u)) { var a = el('a', 'chip-red', x.r); a.href = x.u; a.target = '_blank'; a.rel = 'noopener nofollow'; r.appendChild(a); } });
      if (r.firstChild) k.appendChild(r);
      var vid = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?(?:\S*&)?v=|youtu\.be\/)([\w-]{11})/.exec(h.ultimo || '') || /v=([\w-]{11})$/.exec(h.youtube || '');
      if (h.ultimo || vid) { var d = el('div', 'muestra'), b;
        if (vid) { b = el('button', 'btn chico', '▶ Último trabajo'); b.type = 'button'; b.addEventListener('click', function () { d.replaceChild(marco('https://www.youtube-nocookie.com/embed/' + vid[1], 'yt'), b); }); }
        else if (/^https:\/\//.test(h.ultimo)) { b = el('a', 'btn chico', '▶ Último trabajo'); b.href = h.ultimo; b.target = '_blank'; b.rel = 'noopener nofollow'; }
        if (b) { d.appendChild(b); k.appendChild(d); } }
      $('honor').appendChild(k);
    });
    

    $('opiniones').hidden = !K.verEvaluaciones;
    if (c.totalResenas) { $('eva-n').textContent = String(c.promedio).replace('.', ','); $('eva-st').textContent = '★'.repeat(Math.round(c.promedio)) + '☆'.repeat(5 - Math.round(c.promedio)); }
    $('promedio').textContent = c.totalResenas ? 'Promedio ' + String(c.promedio).replace('.', ',') + ' de 5 · ' + c.totalResenas + (c.totalResenas === 1 ? ' opinión' : ' opiniones') : 'Sé el primero en opinar.';
    c.resenas.forEach(function (r) {
      var k = el('div', 'card'); k.appendChild(el('div', 'estrellas', '★'.repeat(r.estrellas) + '☆'.repeat(5 - r.estrellas)));
      if (r.comentario) k.appendChild(el('p', '', r.comentario)); k.appendChild(el('small', 'nota', r.nombre + ' · ' + r.banda)); $('resenas').appendChild(k);
    });
  }

  /* ---------- formularios ---------- */
  /** Reduce el logo a un máximo de 400 px (PNG si tiene transparencia, si no JPG) para que pese poco. */
  function logoB64(file) {
    return new Promise(function (ok, mal) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { mal(new Error('El logo debe ser PNG, JPG o WebP.')); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var e = Math.min(1, 400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * e)); c.height = Math.max(1, Math.round(img.height * e));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var png = c.toDataURL('image/png'); ok(png.length < 380000 ? png : c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { mal(new Error('No pudimos leer esa imagen.')); };
      img.src = url;
    });
  }

  function enviar(formId, accion, extra) {
    var f = $(formId); if (!f) return;
    var err = f.querySelector('.error'), ok = f.querySelector('.ok'), btn = f.querySelector('button[type=submit]');
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); err.hidden = ok.hidden = true;
      var datos = { accion: accion }, archivo = null; new FormData(f).forEach(function (v, k) { if (v instanceof File) { if (v.size) archivo = v; } else datos[k] = v; });
      if (formId === 'f-honor') { datos.redes = JSON.stringify(leerRedes()); delete datos.rIg; delete datos.rYt; delete datos.rOtra; }
      btn.disabled = true;
      (archivo ? logoB64(archivo) : Promise.resolve('')).then(function (b64) {
        if (b64) datos.logoB64 = b64;
        return RK.pedir(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) });
      })
        .then(function (d) { if (d.ok) { ok.textContent = d.mensaje; ok.hidden = false; f.reset(); if (formId === 'f-honor') { var g = document.createElement('div'); g.className = 'honor-gracias'; var gb = document.createElement('b'); gb.textContent = '¡Gracias! Recibimos tu banda 🤘'; g.appendChild(gb); g.appendChild(document.createTextNode(d.mensaje || 'La revisaremos y pronto aparecerá en el cuadro de honor.')); f.hidden = true; f.parentNode.appendChild(g); } } else { err.textContent = d.error || 'No se pudo enviar.'; err.hidden = false; } })
        .catch(function (e) { err.textContent = e && e.message && /logo|imagen|PNG/.test(e.message) ? e.message : 'No pudimos enviar el formulario. Escríbenos por WhatsApp.'; err.hidden = false; })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ---------- formulario del cuadro de honor: hasta 3 redes a elección ---------- */
  var REDES = ['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Spotify', 'Bandcamp', 'SoundCloud', 'X', 'Sitio web'];
  function https(u) { return /^https:\/\//i.test(u) ? u : /^http:\/\//i.test(u) ? u.replace(/^http:/i, 'https:') : 'https://' + u; }
  function leerRedes() {
    var f = $('f-honor'), v = function (n) { var i = f.querySelector('[name=' + n + ']'); return i ? i.value.trim() : ''; }, out = [];
    if (v('rIg')) out.push({ r: 'Instagram', u: v('rIg') });
    if (v('rYt')) out.push({ r: 'YouTube', u: https(v('rYt')) });
    var o = v('rOtra');
    if (o) { var h = /^(?:https?:\/\/)?(?:www\.|m\.|open\.)?([^\/?#]+)/i.exec(o), host = h ? h[1].toLowerCase() : '', mapa = [['spotify', 'Spotify'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['fb.com', 'Facebook'], ['bandcamp', 'Bandcamp'], ['soundcloud', 'SoundCloud'], ['instagram', 'Instagram'], ['youtu', 'YouTube'], ['twitter', 'X'], ['x.com', 'X']], r = 'Sitio web';
      mapa.forEach(function (m) { if (r === 'Sitio web' && host.indexOf(m[0]) >= 0) r = m[1]; }); if (r !== 'Instagram') o = https(o); out.push({ r: r, u: o }); }
    return out;
  }
  function honorUI() {
    if (!$('honor-ir')) return;
    $('honor-ir').addEventListener('click', function (e) { e.preventDefault(); var f = $('honor-form'); f.hidden = false; f.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    var h = $('honor'); if (!h.children.length) h.appendChild(el('p', 'nota honor-vacio', 'Pronto verás aquí a las bandas que han pasado por el estudio. ¡Sé la primera en postular!'));
  }

  /* ---------- arranque ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var cot = $('f-cot'); honorUI();
    /* evaluación: estrellas tocables (el desplegable sigue siendo el valor real) y código de reserva que llega en el enlace de WhatsApp */
    (function () {
      var fr = $('f-resena'); if (!fr) return;
      var sel = fr.querySelector('select[name=estrellas]'), lab = sel && sel.closest('label');
      if (sel && lab) { lab.classList.add('sel-oculto'); var fila = el('div', 'eva-estrellas'); fila.setAttribute('role', 'radiogroup'); fila.setAttribute('aria-label', 'Tu evaluación');
        var bs = [1, 2, 3, 4, 5].map(function (n) { var b = el('button', 'eva-e', '★'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', n + (n === 1 ? ' estrella' : ' estrellas')); b.addEventListener('click', function () { sel.value = String(n); pintar(n); }); fila.appendChild(b); return b; });
        var pintar = function (n) { bs.forEach(function (b, i) { b.classList.toggle('on', i < n); b.setAttribute('aria-checked', i + 1 === n ? 'true' : 'false'); }); };
        var fl = lab.closest('.fila') || lab; fl.parentNode.insertBefore(fila, fl); pintar(Number(sel.value) || 5); }
      var cod = new URLSearchParams(location.search).get('resena'), ci = fr.querySelector('input[name=codigo]');
      if (cod && ci && /^[A-Za-z0-9-]{3,20}$/.test(cod)) ci.value = cod;
    })();
    if (!API) { // sin servidor: la cotización va por WhatsApp y las secciones dinámicas no se muestran
      cot.addEventListener('submit', function (ev) {
        ev.preventDefault(); var d = new FormData(cot), t = cot.querySelector('select').selectedOptions[0].textContent;
        var u = RK.wsp('Hola, quiero cotizar: ' + t + '.\nNombre: ' + d.get('nombre') + '\n' + d.get('mensaje')); window.open(u, '_blank', 'noopener');
      });
      var fh = $('f-honor'); if (fh) fh.addEventListener('submit', function (ev) {
        ev.preventDefault(); var d = new FormData(fh), rd = leerRedes().map(function (x) { return x.r + ': ' + x.u; }).join(' | ');
        if (!String(d.get('banda')).trim() || String(d.get('resena')).trim().length < 10) { var er = fh.querySelector('.error'); er.textContent = 'Escribe el nombre de tu banda y una mini reseña.'; er.hidden = false; return; }
        window.open(RK.wsp('Hola, quiero postular mi banda al cuadro de honor.\nBanda: ' + d.get('banda') + '\nEstilo: ' + (d.get('genero') || '-') + '\nRedes: ' + (rd || '-') + '\nÚltimo trabajo: ' + (d.get('ultimo') || '-') + '\nReseña: ' + d.get('resena') + '\nContacto: ' + d.get('telefono')), '_blank', 'noopener');
      });
      return;
    }
    var rs = document.querySelector('#f-honor textarea[name=resena]'), ct = $('honor-cont'); if (rs && ct) rs.addEventListener('input', function () { ct.textContent = rs.value.length + ' / 500'; });
    enviar('f-cot', 'cotizacion'); enviar('f-honor', 'honor'); enviar('f-resena', 'resena');
    RK.listo.then(function () { return RK.pedir(API + '?accion=contenido'); }).then(function (d) { if (d.ok) pintar(d.contenido); }).catch(function () { /* sin contenido dinámico */ });
  });
})();
