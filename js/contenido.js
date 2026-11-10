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
    var b = el('button', 'btn chico', '▶ Escuchar'); b.type = 'button'; b.setAttribute('aria-label', 'Escuchar ' + (item.etiqueta || 'muestra'));
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
  function comparador(grupos, contId, tx) {
    var cont = $(contId || 'comparador'); if (!cont) return;
    var vac = $((contId || 'abc') === 'aislados' ? 'aislados-vacio' : 'abc-vacio'); if (vac) vac.hidden = !!grupos.length;
    cont.textContent = ''; cont.hidden = !grupos.length; if (!grupos.length) return;
    tx = tx || {};
    cont.appendChild(el('div', 'comp-kick', tx.kick || 'Experiencia interactiva en tiempo real'));
    cont.appendChild(el('h3', 'comp-tit', tx.tit || 'Comparador A/B/C: Raw → Mix → Master'));
    cont.appendChild(el('p', 'comp-sub', tx.sub || 'Toca cualquiera de las 3 etapas para escuchar la evolución sonora de una misma canción en Rockerío Producciones: desde la captura en bruto de sala, la apertura estéreo y el balance de mezcla, hasta el punch comercial con compresión de bus analógica SSL.'));
    var sel = el('div', 'comp-canciones'), cuerpo = el('div'); cont.appendChild(sel); cont.appendChild(cuerpo);
    function mostrar(g, btnSel) {
      [].forEach.call(sel.children, function (b) { b.setAttribute('aria-pressed', b === btnSel ? 'true' : 'false'); });
      cuerpo.textContent = '';
      if (g.descripcion) cuerpo.appendChild(el('p', 'nota', g.descripcion));
      if (!ETAPAS.some(function (e) { return g.items.some(function (x) { return x.etiqueta === e[3]; }); })) { g.items.forEach(function (i) { cuerpo.appendChild(muestra(i)); }); return; }
      var fila = el('div', 'comp-etapas'), play = el('div', 'comp-play'), actual = null, tiempo = 0;
      ETAPAS.forEach(function (e, i) {
        var it = g.items.filter(function (x) { return x.etiqueta === e[3]; })[0]; if (!it) return;
        var b = el('button', 'comp-et'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('span', 'comp-n', e[0])); b.appendChild(el('span', 'comp-pl', '▶'));
        b.appendChild(el('b', '', e[1])); b.appendChild(el('small', '', e[2]));
        b.addEventListener('click', function () {
          var a0 = play.querySelector('audio'); if (a0) tiempo = a0.currentTime;
          [].forEach.call(fila.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          play.textContent = ''; var p = reproductor(it.enlace); play.appendChild(p);
          if (p.tagName === 'AUDIO') { p.addEventListener('loadedmetadata', function () { try { p.currentTime = tiempo; } catch (x) { /* sin posición */ } p.play().catch(function () {}); }); p.preload = 'metadata'; }
          actual = i;
        });
        fila.appendChild(b);
      });
      cuerpo.appendChild(fila); cuerpo.appendChild(play);
    }
    grupos.forEach(function (g, i) {
      if (grupos.length > 1) { var b = el('button', 'btn chico sec-b', g.grupo); b.type = 'button'; b.addEventListener('click', function () { mostrar(g, b); }); sel.appendChild(b); }
      else cont.insertBefore(el('div', 'comp-cancion', '🎵 ' + g.grupo), sel);
    });
    if (grupos.length > 1) mostrar(grupos[0], sel.firstChild); else mostrar(grupos[0], null);
  }

  /** Micrófonos: cada tarjeta trae foto, marca/modelo, tipo y patrón, uso, reseña técnica y sus propias muestras de audio. */
  var MARCAS = ['telefunken', 'shure', 'rode', 'røde', 'neumann', 'akg', 'sennheiser', 'audix', 'beyerdynamic', 'audio-technica', 'electro-voice', 'warm audio', 'universal audio', 'sm'];
  function partirNombre(m) {
    if (m.marca || m.modelo) return { marca: m.marca || '', modelo: m.modelo || m.nombre };
    var w = String(m.nombre || '').split(' '), p = w[0] ? w[0].toLowerCase() : '';
    return (w.length > 1 && MARCAS.indexOf(p) >= 0 && p !== 'sm') ? { marca: w[0], modelo: w.slice(1).join(' ') } : { marca: '', modelo: m.nombre };
  }
  function pintarMics(cat, grupos) {
    var norm = function (t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }, porNombre = {}, usados = {};
    grupos.forEach(function (g) { porNombre[norm(g.grupo)] = g; });
    var lista = cat.map(function (m) {
      var g = porNombre[norm(m.nombre)]; if (g) usados[norm(m.nombre)] = 1;
      var propias = (m.muestras || []).filter(function (x) { return x && /^https:\/\//.test(x.enlace || ''); });
      var np = partirNombre(m);
      return { nombre: m.nombre, marca: np.marca, modelo: np.modelo, tipo: m.tipo || '', patron: m.patron || '', foto: m.foto, uso: m.uso, descripcion: m.descripcion || (g && g.descripcion) || '', items: propias.concat(g ? g.items : []).slice(0, 4) };
    });
    grupos.forEach(function (g) { if (!usados[norm(g.grupo)]) { var np = partirNombre({ nombre: g.grupo }); lista.push({ nombre: g.grupo, marca: np.marca, modelo: np.modelo, tipo: '', patron: '', foto: '', uso: '', descripcion: g.descripcion || '', items: g.items.slice(0, 4) }); } });
    var cont = $('mics'); cont.textContent = ''; $('mics-box').hidden = !lista.length;
    var etiquetas = [], vistas = {};
    lista.forEach(function (m) { m.tags = String(m.uso || '').split(/\s*[\/,]\s*/).filter(Boolean).map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); }); m.tags.forEach(function (t) { var k = t.toLowerCase(); if (!vistas[k]) { vistas[k] = 1; etiquetas.push(t); } }); });
    var filtro = document.getElementById('mics-filtro'); if (filtro) filtro.remove();
    var tarjetas = [], nota = document.getElementById('mics-hint'); if (nota) nota.remove();
    if (etiquetas.length > 1) {
      filtro = el('div', 'mic-filtro'); filtro.id = 'mics-filtro'; filtro.setAttribute('role', 'group'); filtro.setAttribute('aria-label', 'Filtrar micrófonos por uso');
      var activo = '';
      var botones = [''].concat(etiquetas).map(function (t) { var b = el('button', 'mic-chip', t || 'Todos'); b.type = 'button'; b.setAttribute('aria-pressed', t ? 'false' : 'true'); b.addEventListener('click', function () { activo = t.toLowerCase(); botones.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); tarjetas.forEach(function (c) { c.el.hidden = !!activo && c.tags.indexOf(activo) < 0; }); cont.scrollLeft = 0; }); filtro.appendChild(b); return b; });
      cont.parentNode.insertBefore(filtro, cont);
    }
    nota = el('p', 'mic-hint', 'Desliza para ver todos los micrófonos · toca ▶ en una muestra para escucharla'); nota.id = 'mics-hint'; cont.parentNode.insertBefore(nota, cont);
    lista.forEach(function (m) {
      var it = el('article', 'mic-it'), f = el('div', 'mic-foto'); tarjetas.push({ el: it, tags: m.tags.map(function (t) { return t.toLowerCase(); }) });
      if (/^(https:\/\/|assets\/)/.test(m.foto || '')) { var im = el('img'); im.src = m.foto; im.alt = m.nombre; im.loading = 'lazy'; f.appendChild(im); } else { f.classList.add('sin-foto'); f.appendChild(el('span', 'mic-ico', '🎙️')); }
      if (m.tipo) f.appendChild(el('span', 'mic-tipo', m.tipo));
      var tx = el('div', 'mic-tx');
      if (m.marca) tx.appendChild(el('small', 'mic-marca', m.marca));
      tx.appendChild(el('h4', 'mic-nom', m.modelo));
      var meta = el('div', 'mic-meta'); if (m.patron) meta.appendChild(el('span', 'mic-spec', '◎ ' + m.patron)); m.tags.forEach(function (t) { meta.appendChild(el('span', 'mic-tag', t)); }); if (meta.firstChild) tx.appendChild(meta);
      if (m.descripcion) tx.appendChild(el('p', 'mic-desc', m.descripcion));
      var mu = el('div', 'mic-muestras'); mu.appendChild(el('div', 'mic-m-tit', '🎧 Muestras de audio' + (m.items.length ? ' · ' + m.items.length : '')));
      if (m.items.length) m.items.forEach(function (i) { mu.appendChild(muestra(i)); }); else mu.appendChild(el('small', 'nota', 'Muestras próximamente.'));
      tx.appendChild(mu);
      it.appendChild(f); it.appendChild(tx); cont.appendChild(it);
    });
  }

  /* ---------- pestañas de Producción (mismo esquema que la ficha técnica) ---------- */
  function pestanasProd() {
    var tabs = $('prod-tabs'); if (!tabs) return;
    var paneles = [].slice.call(document.querySelectorAll('#nosotros .prod-panel'));
    function ir(id) {
      [].forEach.call(tabs.querySelectorAll('.ficha-tab'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-p') === id ? 'true' : 'false'); });
      paneles.forEach(function (p) { p.hidden = p.getAttribute('data-p') !== id; });
    }
    [].forEach.call(tabs.querySelectorAll('.ficha-tab'), function (b) { b.addEventListener('click', function () { ir(b.getAttribute('data-p')); }); });
  }
  pestanasProd();

  /* ---------- pintado ---------- */
  function pintar(c) {
    var mics = c.muestras.filter(function (g) { return g.tipo === 'Micrófono'; });
    var otros = c.muestras.filter(function (g) { return g.tipo !== 'Micrófono' && g.tipo !== 'Comparador' && g.tipo !== 'Aislado'; });
    comparador(c.muestras.filter(function (g) { return g.tipo === 'Comparador'; }));
    comparador(c.muestras.filter(function (g) { return g.tipo === 'Aislado'; }), 'aislados', { kick: 'Pista por pista', tit: 'Instrumentos aislados', sub: 'Elige un instrumento (batería, guitarras, bajo, voces) y escúchalo solo, tal como queda grabado en la sala. Si tiene versión en bruto, mezclada y masterizada, puedes alternar entre ellas.' });
    $('escucha-box').hidden = !otros.length;
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
      if (formId === 'f-honor') datos.redes = JSON.stringify(leerRedes());
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
  function leerRedes() {
    var out = []; [].forEach.call(document.querySelectorAll('#honor-redes .red-fila'), function (f) { var u = f.querySelector('input').value.trim(); if (u) out.push({ r: f.querySelector('select').value, u: u }); }); return out;
  }
  function filaRed() {
    var cont = $('honor-redes'); if (cont.children.length >= 3) return;
    var f = el('div', 'red-fila'), sl = document.createElement('select'), inp = document.createElement('input'), x = el('button', 'btn chico sec-b', '✕');
    REDES.forEach(function (n) { var o = document.createElement('option'); o.textContent = n; sl.appendChild(o); });
    inp.type = 'text'; inp.maxLength = 300; inp.placeholder = 'https://… o @usuario (Instagram)'; sl.setAttribute('aria-label', 'Red social'); inp.setAttribute('aria-label', 'Enlace de la red');
    x.type = 'button'; x.setAttribute('aria-label', 'Quitar red'); x.addEventListener('click', function () { f.remove(); $('honor-red-mas').hidden = false; });
    f.appendChild(sl); f.appendChild(inp); f.appendChild(x); cont.appendChild(f);
    $('honor-red-mas').hidden = cont.children.length >= 3;
  }
  function honorUI() {
    var mas = $('honor-red-mas'); if (!mas) return;
    filaRed(); mas.addEventListener('click', filaRed);
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
