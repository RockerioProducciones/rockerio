/* Sitio Rockerío. Toda la lógica de negocio vive en reglas.js; aquí solo se muestra y se envía. */
(function () {
  'use strict';
  var R = window.Reglas, API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '';
  var $ = function (id) { return document.getElementById(id); };
  var cfg = R.normalizarConfig({}), ahora = R.ahoraChile(new Date());
  var conexion = false, enviando = false, agenda = null;
  var S = { servicio: 'ensayo', horas: 2, fecha: null, inicio: null };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function txt(e, t) { e.textContent = t; return e; }
  function el(tag, cls, t) { var e = document.createElement(tag); if (cls) e.className = cls; if (t !== undefined) e.textContent = t; return e; }
  function wspUrl(msg) { return 'https://wa.me/' + cfg.whatsapp + (msg ? '?text=' + encodeURIComponent(msg) : ''); }

  function pedir(url, opts) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 20000);
    opts = opts || {}; opts.signal = c.signal;
    return fetch(url, opts).then(function (r) { return r.json(); }).finally(function () { clearTimeout(t); });
  }
  function json(ruta) { return fetch(ruta).then(function (r) { return r.json(); }); }

  /* ---------- carga ---------- */
  function cargar() {
    var tienda = json('data/tienda.json').catch(function () { return []; });
    var conf = API
      ? pedir(API + '?accion=config').then(function (d) {
          if (!d.ok) throw new Error('config');
          conexion = true; if (d.ahora) ahora = d.ahora;
          cfg = R.normalizarConfig(d.config); if (window.RKTema) window.RKTema.defecto(cfg.tema); return d.tienda;
        }).catch(function () { conexion = false; return null; })
      : Promise.resolve(null);
    return Promise.all([conf, tienda]).then(function (r) { pintarTienda(r[0] || r[1]); });
  }

  /* ---------- calendario reutilizable (reserva y planes) ----------
     o = { cont, hoy, dias: {fecha: {libres}}, horas: fn, elegida: fn, deshabilitada: fn(fecha), alElegir: fn(fecha) } */
  function calendario(o) {
    var c = o.cont; c.textContent = '';
    var fechas = Object.keys(o.dias).sort();
    if (!fechas.length) return;
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(function (d) { c.appendChild(el('div', 'cal-dow', d)); });
    for (var i = 0; i < (R.diaSemana(fechas[0]) + 6) % 7; i++) c.appendChild(el('div'));
    fechas.forEach(function (f, idx) {
      var n = R.inicios(o.dias[f].libres, o.horas()).length;
      var dia = Number(f.slice(8)), b = el('button', 'cal-dia', String(dia)); b.type = 'button';
      if (dia === 1 || idx === 0) b.appendChild(el('small', '', MESES[Number(f.slice(5, 7)) - 1]));
      var off = !n || (o.deshabilitada && o.deshabilitada(f));
      b.disabled = !!off; b.setAttribute('aria-pressed', o.elegida() === f ? 'true' : 'false');
      b.setAttribute('aria-label', R.fechaLarga(f) + (off ? ', sin cupo' : ''));
      if (f === o.hoy) b.classList.add('hoy');
      b.addEventListener('click', function () { o.alElegir(f); });
      c.appendChild(b);
    });
  }

  /** Muestra todos los bloques del horario de atención: los libres se pueden elegir; los ocupados aparecen tachados y no se pueden tocar. */
  function bloques(cont, libres, horas, alElegir, elegido, abiertas) {
    cont.textContent = '';
    var ini = R.inicios(libres, horas), todos = abiertas ? R.inicios(abiertas, horas) : ini;
    if (!ini.length) { cont.appendChild(el('p', 'nota', 'No quedan bloques de ' + horas + (horas === 1 ? ' hora' : ' horas') + ' ese día. Prueba otro día o menos horas.')); }
    todos.forEach(function (h) {
      var libre = ini.indexOf(h) >= 0, b = el('button', 'hora' + (libre ? '' : ' ocupado'), R.horaTxt(h) + ' a ' + R.horaTxt(h + horas)); b.type = 'button';
      if (!libre) { b.appendChild(el('small', '', '🔒 Ocupado')); b.setAttribute('aria-disabled', 'true'); }
      else b.appendChild(el('small', 'disp', '✔ Disponible · Elegir →'));
      b.setAttribute('aria-pressed', elegido === h ? 'true' : 'false');
      if (libre) b.addEventListener('click', function () { alElegir(h); });
      else { b.disabled = true; b.title = 'Ocupado'; }
      cont.appendChild(b);
    });
    if (todos.length > ini.length) cont.appendChild(el('p', 'nota', 'Los bloques con candado ya están tomados.'));
  }

  /* ---------- disponibilidad ---------- */
  function agendaLocal(dias) {
    var out = {};
    for (var i = 0; i < dias; i++) {
      var f = R.sumarDias(ahora.fecha, i), r = R.horasLibres(cfg, f, [], ahora);
      out[f] = { abiertas: r.abiertas, libres: r.libres };
    }
    return out;
  }
  /** Trae de una sola vez la disponibilidad de los próximos días (servidor) o la calcula localmente. */
  function traerAgenda(dias, plan) {
    if (!conexion) return Promise.resolve({ hoy: ahora.fecha, dias: agendaLocal(dias) });
    return pedir(API + '?accion=agenda&dias=' + dias + (plan ? '&plan=1' : '')).then(function (d) {
      if (!d.ok) throw new Error('agenda'); return d;
    }).catch(function () { conexion = false; return { hoy: ahora.fecha, dias: agendaLocal(dias) }; });
  }

  /* ---------- textos que dependen de la configuración ---------- */
  function pintarConfig() {
    document.title = cfg.nombreNegocio.toUpperCase().replace('ROCKERIO', 'ROCKERÍO') + ' · Sala de ensayo y estudio en Quinta Normal';
    txt($('chip-ensayo'), 'Ensayo ' + R.clp(cfg.precioEnsayoHora) + ' / hora');
    txt($('chip-estudio'), 'Estudio ' + R.clp(cfg.precioGrabacionHora) + ' / hora');
    var tcE = R.tarifaConveniente(cfg, 'ensayo', '2026-01-05', cfg.convenienteDesde, 1), tcG = R.tarifaConveniente(cfg, 'grabacion', '2026-01-05', cfg.convenienteDesde, 1);
    var chipC = $('chip-conv'); chipC.hidden = !(tcE.horas || tcG.horas);
    if (!chipC.hidden) txt(chipC, 'Lun–Vie ' + R.horaTxt(cfg.convenienteDesde) + ' a ' + R.horaTxt(cfg.convenienteHasta) + (tcE.horas ? ': ensayo ' + R.clp(tcE.precio) + ' / hora' : '') + (tcG.horas ? (tcE.horas ? ' · ' : ': ') + 'estudio ' + R.clp(tcG.precio) + ' / hora' : ''));
    txt($('p-ensayo'), R.clp(cfg.precioEnsayoHora) + ' por hora');
    txt($('p-grab'), R.clp(cfg.precioGrabacionHora) + ' por hora');
    txt($('p-video'), '+' + R.clp(cfg.precioVideo)); txt($('p-extra'), R.clp(cfg.precioExtraEquipo) + (cfg.extraModo === 'hora' ? ' por hora' : ' por sesión'));
    txt($('p-raw'), '+' + R.clp(cfg.precioRaw));
    txt($('dir'), cfg.direccion); txt($('dir2'), String(cfg.direccion || '').replace(/[\s·]+$/, '').toUpperCase()); $('franja-dir').hidden = !cfg.direccion;
    txt($('max-dias'), String(cfg.anticipacionMaxDias));
    $('wsp').href = wspUrl('Hola, quiero consultar por ' + cfg.nombreNegocio);
    txt($('tyc-txt'), 'Leí el reglamento interno y acepto que el horario queda reservado ' + cfg.minutosReserva + ' minutos a la espera del abono (' + R.clp(cfg.abonoPorHora) + ' por hora) y que puedo anular o reagendar con al menos ' + cfg.horasAnulacion + ' horas de anticipación.');
    var rl = el('a', '', ' Ver reglamento'); rl.href = '#reglamento'; rl.target = '_blank'; $('tyc-txt').appendChild(rl);
    txt($('pie'), '© ' + new Date().getFullYear() + ' ' + cfg.nombreNegocio);
    var av = $('aviso'); av.hidden = !cfg.avisoBanner; txt(av, cfg.avisoBanner || '');
    var dias = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var b = (cfg.horarios[d] || []).map(function (x) { return R.horaTxt(x[0]) + '–' + R.horaTxt(x[1]); }).join(' y ');
      return R.DIAS[d] + ' ' + (b || 'cerrado');
    });
    txt($('horarios-txt'), 'Horario de atención: ' + dias.join(' · '));
    var pausa = $('pausa'); pausa.hidden = cfg.reservasActivas;
    if (!cfg.reservasActivas) {
      pausa.textContent = 'Las reservas en línea están pausadas por ahora. ';
      var a = el('a', '', 'Escríbenos por WhatsApp'); a.href = wspUrl('Hola, quiero reservar'); pausa.appendChild(a);
    }
    /* reglamento: «## » = título, «- » = viñeta, otra línea = párrafo; los {valores} salen de la configuración */
    var valores = { abonoPorHora: R.clp(cfg.abonoPorHora), devolucionPorHora: R.clp(cfg.abonoPorHora - cfg.retencionPorHora), horasAnulacion: cfg.horasAnulacion, retencionPorHora: R.clp(cfg.retencionPorHora), reagendoSemanas: cfg.reagendoSemanas, reagendoCambios: cfg.reagendoCambios, minutosReserva: cfg.minutosReserva };
    var rg = $('reglamento-in'); rg.textContent = ''; var lista = null;
    String(cfg.reglamento || '').split(/\r?\n/).forEach(function (l) {
      l = l.trim().replace(/\{(\w+)\}/g, function (m, k) { return valores[k] !== undefined ? valores[k] : m; });
      if (!l) { lista = null; return; }
      if (l.indexOf('## ') === 0) { rg.appendChild(el('h3', '', l.slice(3))); lista = null; }
      else if (l.indexOf('- ') === 0) { if (!lista) { lista = el('ul', 'reg-lista'); rg.appendChild(lista); } lista.appendChild(el('li', '', l.slice(2))); }
      else { rg.appendChild(el('p', '', l)); lista = null; }
    });
    $('reglamento').hidden = !rg.firstChild;
    var pc = $('nosotros-in'); pc.textContent = ''; txt($('nosotros-t'), cfg.presentacion ? cfg.presentacionTitulo : 'Producción musical y estudio');
    var base = ['Hola. Soy Juan Carlos, técnico superior en informática e ingeniero en sonido, con más de 5 años de experiencia en producción musical, ensayo y grabación en Quinta Normal, Santiago.',
      'Rockerío Producciones nace de la idea de que una banda merece un espacio cómodo, técnico y honesto para ensayar, grabar y crecer, sin rodeos ni humo.'];
    (cfg.presentacion ? cfg.presentacion.split(/\n\s*\n/) : base).forEach(function (p) { if (p.trim()) pc.appendChild(el('p', '', p.trim())); });
    /* contacto, redes y apartado ProAudix (solo se muestran los enlaces que existan y sean https) */
    var pares = function (t) { return String(t || '').split(/\r?\n/).map(function (l) { var p = l.split('|'); return p.length > 1 ? [p[0].trim(), p.slice(1).join('|').trim()] : null; }).filter(Boolean); };
    var enlaces = function (cont, lista) {
      cont.textContent = '';
      lista.forEach(function (x) { if (!/^https:\/\/[^\s"'<>]{4,300}$/.test(x[1] || '')) return; var l = el('a', 'enlace', x[0]); l.href = x[1]; l.target = '_blank'; l.rel = 'noopener'; cont.appendChild(l); });
      cont.hidden = !cont.firstChild;
    };
    enlaces($('redes'), [['Instagram', cfg.redInstagram], ['Facebook', cfg.redFacebook], ['YouTube', cfg.redYoutube], ['TikTok', cfg.redTiktok], ['Spotify', cfg.redSpotify], ['Sitio web', cfg.sitioWeb]].concat(pares(cfg.enlacesExtra)));
    $('redes-t').hidden = $('redes').hidden;
    var mp = $('maps'); mp.hidden = !/^https:\/\//.test(cfg.mapsUrl || ''); if (!mp.hidden) mp.href = cfg.mapsUrl;
    var m2 = $('maps2'); m2.hidden = mp.hidden; $('sep2').hidden = mp.hidden; if (!m2.hidden) m2.href = cfg.mapsUrl;
    txt($('pa-texto'), cfg.proaudixTexto);
    var pl = [['Sitio web', cfg.proaudixWeb], ['Instagram', cfg.proaudixInstagram], ['Facebook', cfg.proaudixFacebook], ['YouTube', cfg.proaudixYoutube]];
    if (cfg.proaudixWhatsapp) pl.unshift(['WhatsApp', 'https://wa.me/' + cfg.proaudixWhatsapp]);
    enlaces($('pa-links'), pl.concat(pares(cfg.proaudixEnlaces)));
    txt($('hero-t'), cfg.heroTitulo); txt($('hero-p'), cfg.heroTexto);
    [['nosotros', 'verProduccion'], ['ficha', 'verFicha'], ['planes', 'verPlanes'], ['galeria', 'verGaleria'], ['opiniones', 'verEvaluaciones'], ['proaudix', 'verProaudix'], ['contacto', 'verContacto'], ['tienda', 'verTienda'], ['cotizar', 'verCotizar'], ['reglamento', 'verReglamento']].forEach(function (x) { if (!cfg[x[1]]) $(x[0]).hidden = true; else if (x[0] !== 'reglamento' && x[0] !== 'tienda' && x[0] !== 'galeria') $(x[0]).hidden = false; });
    if (!cfg.verHonor) $('bandas').hidden = true;
    pintarHoras(); refrescarAgenda(); if (fichaDatos) pintarFicha();
  }

  /* ---------- estáticos ---------- */
  var fichaDatos = null;
  /** Ficha técnica. Los {valores} (precios, abono, escala de grabación incluida) salen de la configuración, así nunca quedan desactualizados. */
  /** Carrusel elegante con infografía: items = [{src, titulo, descripcion, datos:[…]}]. Flechas, puntos, deslizar, ampliar al tocar. */
  function carrusel(cont, items, opciones) {
    cont.textContent = ''; if (!items.length) { cont.hidden = true; return; } cont.hidden = false;
    var pos = 0, auto = null, c = el('div', 'carr'), vp = el('div', 'carr-vp'), pista = el('div', 'carr-pista'), pts = el('div', 'carr-pts'), cnt = el('span', 'carr-n');
    var fotos = items.map(function (f) { return { src: f.src, alt: f.titulo || f.alt || '' }; });
    items.forEach(function (f, k) {
      var s = el('figure', 'carr-sl'), im = el('img'); im.src = f.src; im.alt = f.titulo || f.alt || ''; im.loading = k ? 'lazy' : 'eager'; im.addEventListener('click', function () { visor(fotos, k); }); s.appendChild(im);
      var pie = el('figcaption', 'carr-pie');
      if (f.titulo) pie.appendChild(el('b', '', f.titulo)); if (f.descripcion) pie.appendChild(el('span', '', f.descripcion));
      if (f.datos && f.datos.length) { var ch = el('div', 'carr-datos'); f.datos.forEach(function (x) { ch.appendChild(el('i', '', x)); }); pie.appendChild(ch); }
      if (pie.childNodes.length) s.appendChild(pie); pista.appendChild(s);
      var p = el('button', 'carr-pt'); p.type = 'button'; p.setAttribute('aria-label', 'Foto ' + (k + 1)); p.addEventListener('click', function () { ir(k, true); }); pts.appendChild(p);
    });
    function ir(n, manual) {
      pos = (n + items.length) % items.length; pista.style.transform = 'translateX(' + (-pos * 100) + '%)';
      [].forEach.call(pts.children, function (p, k) { p.className = 'carr-pt' + (k === pos ? ' on' : ''); }); cnt.textContent = (pos + 1) + ' / ' + items.length;
      if (manual) parar();
    }
    function parar() { if (auto) { clearInterval(auto); auto = null; } }
    vp.appendChild(pista); c.appendChild(vp);
    if (items.length > 1) {
      var ant = el('button', 'carr-b ant', '‹'), sig = el('button', 'carr-b sig', '›'); ant.type = sig.type = 'button'; ant.setAttribute('aria-label', 'Anterior'); sig.setAttribute('aria-label', 'Siguiente');
      ant.addEventListener('click', function () { ir(pos - 1, true); }); sig.addEventListener('click', function () { ir(pos + 1, true); });
      c.appendChild(ant); c.appendChild(sig); c.appendChild(cnt); c.appendChild(pts);
      var x0 = 0; vp.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      vp.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 40) ir(pos + (d < 0 ? 1 : -1), true); });
      if (!(opciones && opciones.sinAuto) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) auto = setInterval(function () { if (document.hidden || !c.offsetParent) return; ir(pos + 1); }, 6000);
    }
    cont.appendChild(c); ir(0);
  }
  /** Infografía: datos destacados con icono. stats = [[icono, valor, etiqueta]]. */
  function infografia(stats) {
    var g = el('div', 'info-stats');
    (stats || []).forEach(function (s) { var t = el('div', 'info-st'); t.appendChild(el('span', 'ic', s[0])); t.appendChild(el('b', '', s[1])); t.appendChild(el('small', '', s[2])); g.appendChild(t); });
    return g;
  }
  var fichaTab = null;
  function pintarFicha() {
    if (!fichaDatos) { json('data/ficha.json').then(function (d) { fichaDatos = d; pintarFicha(); }).catch(function () { $('ficha').hidden = true; }); return; }
    var cont = $('ficha-in'); cont.textContent = ''; cont.className = 'ficha-app';
    var v = { precioEnsayoHora: R.clp(cfg.precioEnsayoHora), plan8: R.clp(cfg.plan8), plan12: R.clp(cfg.plan12), abonoPorHora: R.clp(cfg.abonoPorHora), horasAnulacion: cfg.horasAnulacion };
    var secs = fichaDatos.secciones || []; if (!secs.length) { $('ficha').hidden = true; return; }
    if (!fichaTab || !secs.some(function (s) { return s.id === fichaTab; })) fichaTab = secs[0].id;
    var tabs = el('div', 'ficha-tabs'); tabs.setAttribute('role', 'tablist'); cont.appendChild(tabs);
    var panel = el('div', 'ficha-panel'); cont.appendChild(panel);
    // los catálogos dinámicos (micrófonos y muestras) viven en el HTML y se mueven al panel que corresponde
    var guarda = $('ficha-guarda');
    function mostrar(id) {
      fichaTab = id; ['mics-box', 'escucha-box'].forEach(function (k) { var n = document.getElementById(k); if (n) guarda.appendChild(n); }); panel.textContent = '';
      [].forEach.call(tabs.children, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-id') === id ? 'true' : 'false'); });
      var s = secs.filter(function (x) { return x.id === id; })[0]; if (!s) return;
      var cab = el('div', 'ficha-cab'); cab.appendChild(el('span', 'ficha-ico', s.icono || '')); var tx = el('div'); tx.appendChild(el('h3', '', s.titulo)); if (s.resumen) tx.appendChild(el('p', 'sub', s.resumen)); cab.appendChild(tx); panel.appendChild(cab);
      if (s.stats && s.stats.length) panel.appendChild(infografia(s.stats));
      if (s.fotos && s.fotos.length) { var cc = el('div', 'carr-caja'); panel.appendChild(cc); carrusel(cc, s.fotos); }
      var g = el('div', 'grid'); panel.appendChild(g);
      (s.bloques || []).forEach(function (b) {
        var c = el('div', 'card'); c.appendChild(el('h3', '', b.titulo)); var ul = el('ul');
        b.items.forEach(function (i) {
          if (i === '{escala}') { Object.keys(cfg.escala || {}).sort(function (x, y) { return x - y; }).forEach(function (h) { ul.appendChild(el('li', '', 'Bloque de ' + h + ' hrs: incluye hasta ' + R.minutosTxt(cfg.escala[h]) + ' de grabación')); }); return; }
          ul.appendChild(el('li', '', i.replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; })));
        });
        if (ul.children.length) { c.appendChild(ul); g.appendChild(c); }
      });
      if (s.mics) panel.appendChild($('mics-box'));
      if (s.escucha) panel.appendChild($('escucha-box'));
    }
    secs.forEach(function (s) { var b = el('button', 'ficha-tab', (s.icono || '') + ' ' + s.titulo); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-id', s.id); b.addEventListener('click', function () { mostrar(s.id); }); tabs.appendChild(b); });
    mostrar(fichaTab);
  }
  /** Visor de fotos: ampliar, avanzar con flechas o deslizando, cerrar con Esc o tocando fuera. */
  function visor(lista, pos) {
    var fondo = el('div', 'visor'); fondo.setAttribute('role', 'dialog'); fondo.setAttribute('aria-label', 'Galería de fotos');
    var img = el('img'), pie = el('p', 'visor-pie'), x = 0;
    function ver(n) { pos = (n + lista.length) % lista.length; img.src = lista[pos].src; img.alt = lista[pos].alt; pie.textContent = lista[pos].alt + ' (' + (pos + 1) + '/' + lista.length + ')'; }
    function cerrar() { document.removeEventListener('keydown', tecla); fondo.remove(); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowRight') ver(pos + 1); else if (e.key === 'ArrowLeft') ver(pos - 1); }
    var ant = el('button', 'visor-b ant', '‹'), sig = el('button', 'visor-b sig', '›'), cer = el('button', 'visor-b cer', '×');
    [ant, sig, cer].forEach(function (b) { b.type = 'button'; }); ant.setAttribute('aria-label', 'Anterior'); sig.setAttribute('aria-label', 'Siguiente'); cer.setAttribute('aria-label', 'Cerrar');
    ant.onclick = function (e) { e.stopPropagation(); ver(pos - 1); }; sig.onclick = function (e) { e.stopPropagation(); ver(pos + 1); }; cer.onclick = cerrar;
    fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
    fondo.addEventListener('touchstart', function (e) { x = e.touches[0].clientX; }, { passive: true });
    fondo.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - x; if (Math.abs(d) > 50) ver(pos + (d < 0 ? 1 : -1)); });
    [img, pie, ant, sig, cer].forEach(function (n) { fondo.appendChild(n); });
    document.body.appendChild(fondo); document.addEventListener('keydown', tecla); ver(pos); cer.focus();
  }
  /** Video de la galería: YouTube (youtu.be/… o youtube.com/watch?v=…) o Drive (…/file/d/ID/…). Se carga recién al tocar «Ver video». */
  function urlVideo(u) {
    var y = /(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{11})/.exec(u || ''), d = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]{10,60})/.exec(u || '');
    return y ? 'https://www.youtube-nocookie.com/embed/' + y[1] : d ? 'https://drive.google.com/file/d/' + d[1] + '/preview' : '';
  }
  function tarjetaVideo(f) {
    var c = el('div', 'video-card'), emb = urlVideo(f.video);
    c.appendChild(el('b', '', f.alt || 'Video'));
    if (!emb) { c.appendChild(el('small', 'nota', 'Enlace de video no válido.')); return c; }
    var b = el('button', 'btn chico', '▶ Ver video'); b.type = 'button';
    b.addEventListener('click', function () { var fr = el('iframe'); fr.src = emb; fr.allowFullscreen = true; fr.loading = 'lazy'; fr.referrerPolicy = 'no-referrer'; fr.title = f.alt || 'Video'; c.replaceChild(fr, b); });
    c.appendChild(b); return c;
  }
  function pintarGaleria() {
    json('data/galeria.json').then(function (g) {
      var cont = $('galeria-in'); cont.textContent = '';
      var fotos = g.filter(function (f) { return f.src; }), videos = g.filter(function (f) { return f.video; });
      var info = $('galeria-info'); if (info) { info.textContent = ''; info.appendChild(infografia([['📸', String(fotos.length), 'fotos del estudio'], ['🎛️', '2', 'salas: ensayo y grabación'], ['🎙️', '17', 'micrófonos de estudio'], ['🎚️', '32', 'canales Midas M32']])); }
      var cc = $('galeria-car'); if (cc) carrusel(cc, fotos);
      var tira = el('div', 'galeria'); fotos.forEach(function (f, k) { var i = el('img'); i.src = f.src; i.alt = f.alt || f.titulo || ''; i.loading = 'lazy'; i.tabIndex = 0; i.addEventListener('click', function () { visor(fotos, k); }); i.addEventListener('keydown', function (e) { if (e.key === 'Enter') visor(fotos, k); }); tira.appendChild(i); });
      cont.appendChild(tira);
      videos.forEach(function (f) { cont.appendChild(tarjetaVideo(f)); });
    }).catch(function () { $('galeria').hidden = true; });
  }
  /** Reproductor de tu playlist de YouTube Music (data/playlist.json) en Producción y Galería. */
  function pintarPlaylist() {
    json('data/playlist.json').then(function (d) {
      var m = /[?&]list=([\w-]+)/.exec(d.url || ''); if (!m) return;
      [].forEach.call(document.querySelectorAll('[data-playlist]'), function (c) {
        c.textContent = ''; c.appendChild(el('h3', '', '🎵 ' + (d.titulo || 'Nuestra playlist')));
        if (d.texto) c.appendChild(el('p', 'sub', d.texto));
        var fr = el('iframe', 'pl-frame'); fr.src = 'https://www.youtube-nocookie.com/embed/videoseries?list=' + m[1]; fr.title = 'Playlist de trabajos terminados'; fr.loading = 'lazy';
        fr.allow = 'accelerometer; encrypted-media; picture-in-picture'; fr.setAttribute('allowfullscreen', ''); c.appendChild(fr);
        var b = el('a', 'btn chico', 'Abrir en YouTube Music'); b.href = d.url; b.target = '_blank'; b.rel = 'noopener'; c.appendChild(b);
        c.hidden = false;
      });
    }).catch(function () {});
  }
  function pintarTienda(items) {
    var cont = $('tienda-in'); cont.textContent = '';
    if (!items || !items.length) { $('tienda').hidden = true; return; }
    $('tienda').hidden = !cfg.verTienda;
    var cats = {};
    items.forEach(function (p) { (cats[p.categoria] = cats[p.categoria] || []).push(p); });
    Object.keys(cats).forEach(function (k) {
      cont.appendChild(el('h3', '', k));
      var rejilla = el('div', 'prods'); cont.appendChild(rejilla);
      cats[k].forEach(function (p) {
        var agotado = p.stock === 0, f = el('div', 'prod' + (agotado ? ' agotado' : '') + (p.foto ? ' con-foto' : ''));
        if (p.foto) { var im = el('img', 'prod-foto'); im.src = p.foto; im.alt = p.nombre; im.loading = 'lazy'; f.appendChild(im); }
        var izq = el('div', 'prod-txt'); izq.appendChild(el('span', '', p.nombre));
        if (p.detalle) izq.appendChild(el('small', '', p.detalle));
        if (agotado) izq.appendChild(el('small', '', 'Agotado'));
        f.appendChild(izq); f.appendChild(el('span', 'pr', p.precio ? R.clp(p.precio) : 'Consultar'));
        if (!agotado) {
          var b = el('a', 'btn chico', 'Pedir'); b.target = '_blank'; b.rel = 'noopener';
          b.href = wspUrl('Hola, quiero comprar: ' + p.nombre + (p.detalle ? ' (' + p.detalle + ')' : '') + (p.precio ? ' — ' + R.clp(p.precio) : '') + '. ¿Lo tienen disponible?');
          f.appendChild(b);
        }
        rejilla.appendChild(f);
      });
    });
  }

  /* ---------- reserva: pasos ---------- */
  function limites() { return R.limitesHoras(cfg, S.servicio); }

  function pintarHoras() {
    var lim = limites(), c = $('horas-btns'); c.textContent = '';
    S.horas = Math.min(Math.max(S.horas, lim.min), lim.max);
    for (var h = lim.min; h <= lim.max; h++) (function (h) {
      var b = el('button', 'hbtn', String(h)); b.type = 'button'; b.setAttribute('aria-pressed', h === S.horas ? 'true' : 'false');
      b.setAttribute('aria-label', h + (h === 1 ? ' hora' : ' horas'));
      b.addEventListener('click', function () { S.horas = h; pintarHoras(); alCambiarDuracion(); });
      c.appendChild(b);
    })(h);
    var ai = $('aviso-incl'), gm = R.grabacionIncluidaMin(cfg, S.servicio, S.horas); ai.textContent = '';
    if (gm) { var t1 = el('b', '', '🎙️ ¡Ya incluyes ' + R.minutosTxt(gm) + ' de grabación con mezcla!'); ai.appendChild(t1); ai.appendChild(el('span', '', ' Por reservar ' + S.horas + ' horas de ensayo puedes usar parte de tu tiempo para llevarte un registro multipista profesional.')); ai.hidden = false; }
    else if (S.servicio === 'ensayo') { ai.appendChild(el('span', '', '💡 Desde 2 horas de ensayo incluyes minutos de grabación con mezcla: 2 h = 30 min · 3 h = 1 h · 4 h = 2 h · 5 h = 3 h, y así sucesivamente.')); ai.hidden = false; }
    else ai.hidden = true;
    var ex = $('extras'), prev = Number(ex.value) || 0; ex.textContent = '';
    for (var i = 0; i <= 4; i++) { var op = el('option', '', i === 0 ? 'Ninguno' : i + ' (' + R.clp(i * cfg.precioExtraEquipo * (cfg.extraModo === 'hora' ? S.horas : 1)) + ')'); op.value = i; ex.appendChild(op); }
    ex.value = prev;
    var ens = S.servicio === 'ensayo', addOk = R.addonsPermitidos(cfg, S.servicio, S.horas);
    $('adicionales').hidden = !ens;
    ['video', 'raw'].forEach(function (id) { $(id).closest('label').style.display = addOk ? '' : 'none'; if (!addOk) $(id).checked = false; });
    renumerar();
  }

  function refrescarAgenda() {
    traerAgenda(cfg.anticipacionMaxDias + 1, false).then(function (d) { agenda = d.dias; if (d.hoy) ahora.fecha = d.hoy; if (S.fecha && S.inicio !== null && agenda[S.fecha] && R.inicios(agenda[S.fecha].libres, S.horas).indexOf(S.inicio) < 0) S.inicio = null; pintarCalendario(); estado(); });
  }
  function pintarCalendario() {
    if (!agenda) return;
    calendario({ cont: $('cal'), hoy: ahora.fecha, dias: agenda, horas: function () { return S.horas; }, elegida: function () { return S.fecha; }, alElegir: elegirFecha });
    pintarHorarios();
  }
  function elegirFecha(f) { S.fecha = f; S.inicio = null; pintarCalendario(); estado(); }
  function pintarHorarios() {
    var c = $('horarios');
    if (!S.fecha || !agenda || !agenda[S.fecha]) { c.textContent = ''; c.appendChild(el('p', 'nota', 'Primero elige un día.')); return; }
    bloques(c, agenda[S.fecha].libres, S.horas, function (h) { S.inicio = h; pintarHorarios(); estado(); }, S.inicio, agenda[S.fecha].abiertas);
  }
  function alCambiarDuracion() {
    if (S.fecha && agenda && !R.inicios(agenda[S.fecha].libres, S.horas).length) S.fecha = null;
    if (S.inicio !== null && S.fecha && R.inicios(agenda[S.fecha].libres, S.horas).indexOf(S.inicio) < 0) S.inicio = null;
    pintarCalendario(); estado();
  }

  /** Activa los pasos en orden y actualiza el resumen "Tu reserva". */
  function estado() {
    var tieneFecha = !!S.fecha, tieneHora = S.inicio !== null;
    $('paso-fecha').classList.remove('off');
    $('paso-hora').classList.toggle('off', !tieneFecha);
    $('adicionales').classList.toggle('off', !tieneHora);
    $('paso-datos').classList.toggle('off', !tieneHora);
    resumen();
    if (window.RK && window.RK.alCambiar) window.RK.alCambiar();
  }
  function renumerar() {
    var n = 0;
    document.querySelectorAll('#form fieldset').forEach(function (f) {
      if (f.hidden) return; n++;
      var l = f.querySelector('legend'); l.textContent = l.textContent.replace(/^\d+ ·/, n + ' ·');
    });
  }

  function solicitud() {
    return {
      servicio: S.servicio, fecha: S.fecha, inicio: S.inicio, horas: S.horas,
      extras: Number($('extras').value) || 0, video: $('video').checked, raw: $('raw').checked,
      zurdo: $('zurdo').checked, voces: Number($('voces').value),
      banda: $('banda').value, nombre: $('nombre').value, telefono: $('telefono').value, correo: $('correo').value,
      comentario: $('comentario').value, tyc: $('tyc').checked, web: $('web').value
    };
  }
  function fila(dl, k, v) { dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', v)); }
  function resumen() {
    var dl = $('tr-lista'), tot = $('tr-total'), falta = [];
    dl.textContent = ''; tot.textContent = '';
    fila(dl, 'Servicio', S.servicio === 'ensayo' ? 'Sala de ensayo' : 'Estudio de grabación');
    fila(dl, 'Duración', S.horas + (S.horas === 1 ? ' hora' : ' horas'));
    if (S.fecha) fila(dl, 'Día', R.fechaLarga(S.fecha)); else falta.push('el día');
    if (S.inicio !== null) fila(dl, 'Horario', R.horaTxt(S.inicio) + ' a ' + R.horaTxt(S.inicio + S.horas)); else if (S.fecha) falta.push('tu horario');
    var s = solicitud();
    if (S.inicio !== null) {
      if (S.servicio === 'ensayo') {
        if (s.extras) fila(dl, 'Equipo extra', String(s.extras));
        if (s.video && R.addonsPermitidos(cfg, S.servicio, S.horas)) fila(dl, 'Video GoPro', 'Sí');
        if (s.raw && R.addonsPermitidos(cfg, S.servicio, S.horas)) fila(dl, 'Material en bruto', 'Sí');
      }
      var p = R.calcularPrecio(cfg, s), g = R.grabacionIncluidaMin(cfg, S.servicio, S.horas);
      tot.appendChild(el('div', 'tr-monto', R.clp(p.total)));
      if (p.horasConveniente) tot.appendChild(el('div', 'nota ahorro', '✔ Tarifa conveniente aplicada en ' + p.horasConveniente + (p.horasConveniente === 1 ? ' hora' : ' horas') + ' (ahorras ' + R.clp(p.ahorro) + ').'));
      tot.appendChild(el('div', 'nota', 'Abono para confirmar: ' + R.clp(p.abono) + ' · saldo en el estudio: ' + R.clp(p.saldo)));
      if (g) tot.appendChild(el('div', 'nota', 'Incluye ' + R.minutosTxt(g) + ' de grabación.'));
    }
    txt($('tr-falta'), falta.length ? 'Falta elegir ' + falta.join(' y ') + '.' : '');
  }
  function mostrarError(m) { var e = $('error'); e.hidden = !m; e.textContent = m || ''; if (m) e.scrollIntoView({ block: 'center' }); }

  /* ---------- pantalla de pago (reserva y planes) ---------- */
  function copiar(texto, boton) {
    var listo = function () { boton.textContent = '¡Copiado!'; setTimeout(function () { boton.textContent = 'Copiar datos'; }, 2500); };
    try { navigator.clipboard.writeText(texto).then(listo, function () {}); } catch (e) { /* sin portapapeles */ }
  }
  /** o = { box, titulo, lineas: [], monto, pago: {transferencia, link, instrucciones, minutosReserva, segundos}, whatsapp } */
  function mostrarPago(o) {
    relojes.forEach(clearInterval); relojes = [];
    var box = o.box; box.hidden = false; box.textContent = '';
    box.appendChild(el('h3', '', o.titulo));
    o.lineas.forEach(function (l) { box.appendChild(el('p', '', l)); });
    var cuenta = el('div', 'cuenta'); cuenta.setAttribute('role', 'timer'); box.appendChild(cuenta);
    var ol = el('ol', 'pasos');
    var p1 = el('li'); p1.appendChild(el('b', '', 'Abona ' + R.clp(o.monto) + ' para confirmar tu horario')); p1.appendChild(el('div', 'nota', 'Tu horario queda tomado por ' + o.pago.minutosReserva + ' minutos; si no llega el abono, se libera solo.'));
    if (o.pago.transferencia) {
      var t = el('div', 'datos', o.pago.transferencia); p1.appendChild(t);
      var cb = el('button', 'btn chico', 'Copiar datos'); cb.type = 'button'; cb.addEventListener('click', function () { copiar(o.pago.transferencia, cb); }); p1.appendChild(cb);
    } else {
      p1.appendChild(el('div', 'nota', 'Te enviaremos los datos de transferencia por WhatsApp.'));
    }
    if (o.pago.link) { var p = el('a', 'btn chico', 'Pagar en línea'); p.href = o.pago.link; p.target = '_blank'; p.rel = 'noopener'; p1.appendChild(document.createTextNode(' ')); p1.appendChild(p); }
    ol.appendChild(p1);
    var p2 = el('li'); p2.appendChild(el('b', '', 'Envía el comprobante por WhatsApp'));
    p2.appendChild(el('div', 'nota', 'Abre la conversación con el detalle de tu reserva ya escrito y adjunta el comprobante.'));
    var w = el('a', 'btn', 'Enviar comprobante por WhatsApp'); w.href = wspUrl(o.whatsapp + '\nAdjunto el comprobante del abono de ' + R.clp(o.monto) + '.'); w.target = '_blank'; w.rel = 'noopener';
    p2.appendChild(w); ol.appendChild(p2); box.appendChild(ol);
    iniciarCuenta(cuenta, o.pago.segundos, ol);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  /** Cuenta regresiva del horario tomado. Al llegar a cero avisa que se liberó. */
  var relojes = [];
  function iniciarCuenta(caja, segundos, pasos) {
    if (!(segundos > 0)) { caja.hidden = true; return; }
    var fin = Date.now() + segundos * 1000;
    function pintar() {
      var resto = Math.max(0, Math.round((fin - Date.now()) / 1000));
      if (resto > 0) { caja.textContent = 'Tu horario está tomado por ' + String(Math.floor(resto / 60)).padStart(2, '0') + ':' + String(resto % 60).padStart(2, '0') + ' minutos. Abona antes de que termine el tiempo.'; caja.className = 'cuenta' + (resto <= 120 ? ' urgente' : ''); return true; }
      caja.textContent = 'El tiempo terminó y el horario se liberó. Si ya abonaste, escríbenos por WhatsApp con tu comprobante; si no, vuelve a reservar.';
      caja.className = 'cuenta vencida'; pasos.style.opacity = '.55'; return false;
    }
    if (!pintar()) return;
    var id = setInterval(function () { if (!pintar() || !document.body.contains(caja)) clearInterval(id); }, 1000);
    relojes.push(id);
  }

  /* ---------- envío de la reserva ---------- */
  function enviar(ev) {
    ev.preventDefault(); if (enviando) return; mostrarError('');
    var s = solicitud();
    if (!S.fecha || S.inicio === null) return mostrarError('Elige el día y tu horario.');
    var v = R.validarSolicitud(cfg, ahora, s, []);
    if (!v.ok) return mostrarError(v.error);
    if (!conexion) return respaldoWhatsApp(v);
    enviando = true; $('enviar').disabled = true; $('enviar').textContent = 'Enviando…';
    s.accion = 'reservar';
    pedir(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(s) })
      .then(function (d) { d.ok ? exito(d) : (mostrarError(d.error || 'No se pudo reservar.'), refrescarAgenda()); })
      .catch(function () { mostrarError('No pudimos confirmar el envío. Antes de reintentar, escríbenos por WhatsApp para revisar si quedó registrada.'); respaldoWhatsApp(v, true); })
      .finally(function () { enviando = false; $('enviar').disabled = false; $('enviar').textContent = 'Solicitar reserva'; });
  }
  function respaldoWhatsApp(v, soloEnlace) {
    var box = $('listo'); box.hidden = false; box.textContent = '';
    box.appendChild(el('h3', '', soloEnlace ? 'Confirma por WhatsApp' : 'Un paso más: envíanos tu solicitud por WhatsApp'));
    var a = el('a', 'btn', 'Abrir WhatsApp'); a.href = wspUrl(R.resumenTexto(cfg, v, '')); a.target = '_blank'; a.rel = 'noopener';
    box.appendChild(a); box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function exito(d) {
    var r = d.resumen;
    mostrarPago({
      box: $('listo'), titulo: '¡Reserva registrada! Código #' + d.codigo.replace('RP-', ''),
      lineas: [R.fechaLarga(r.fecha) + ', ' + R.horaTxt(r.inicio) + ' a ' + R.horaTxt(r.fin) + '. Total ' + R.clp(r.total) + '.'],
      monto: r.abono, pago: d.pago, whatsapp: d.whatsapp || ('Hola, quiero confirmar mi reserva ' + d.codigo)
    });
    $('form').hidden = true; $('tu-reserva').hidden = true;
  }

  window.RK = {
    cfg: function () { return cfg; }, wsp: wspUrl, el: el, pedir: pedir, api: API, calendario: calendario, bloques: bloques,
    estado: function () { return S; }, traerAgenda: traerAgenda, mostrarPago: mostrarPago, conectado: function () { return conexion; }, ahora: function () { return ahora; }
  };
  window.RK.listo = new Promise(function (ok) { window.RK._listo = ok; });

  /* ---------- arranque ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    pintarFicha(); pintarGaleria(); pintarPlaylist(); pintarConfig(); estado();
    cargar().then(function () { pintarConfig(); window.RK._listo(); });
    document.querySelectorAll('input[name=servicio]').forEach(function (r) {
      r.addEventListener('change', function () { S.servicio = r.value; pintarHoras(); alCambiarDuracion(); });
    });
    ['extras', 'video', 'raw'].forEach(function (id) { $(id).addEventListener('change', resumen); });
    $('form').addEventListener('submit', enviar);
  });
})();
