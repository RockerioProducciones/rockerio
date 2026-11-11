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
  /* Lo que edita la dueña desde el portal («Sitio web») se aplica encima del contenido original del sitio. */
  var sitio = {};
  function dato(parte, ruta) { var v = sitio[parte]; return (v && (Array.isArray(v) ? v.length : Object.keys(v).length)) ? Promise.resolve(parte === 'ficha' ? { secciones: v } : v) : json(ruta); }
  function conNegritas(e, t) {
    e.textContent = '';
    String(t).split(/\*\*(.+?)\*\*/g).forEach(function (p, i) { if (!p) return; if (i % 2) e.appendChild(el('strong', '', p)); else e.appendChild(document.createTextNode(p)); });
  }
  function aplicarSitio() {
    var tx = sitio.textos || {}, ft = sitio.fotos || {};
    [].forEach.call(document.querySelectorAll('[data-ed]'), function (e) { var v = tx[e.getAttribute('data-ed')]; if (typeof v === 'string' && v) conNegritas(e, v); });
    [].forEach.call(document.querySelectorAll('[data-ed-foto]'), function (e) { var v = ft[e.getAttribute('data-ed-foto')]; if (typeof v === 'string' && /^(https:\/\/|assets\/)/.test(v)) e.src = v; });
    if (sitio.ficha && sitio.ficha.length) { fichaDatos = { secciones: sitio.ficha }; pintarFicha(); }
    if (sitio.galeria && sitio.galeria.length) pintarGaleria();
    if (sitio.playlist && sitio.playlist.url) pintarPlaylist();
  }

  /* ---------- carga ---------- */
  function cargar() {
    var tienda = json('data/tienda.json').catch(function () { return []; });
    var conf = API
      ? pedir(API + '?accion=config').then(function (d) {
          if (!d.ok) throw new Error('config');
          conexion = true; if (d.ahora) ahora = d.ahora;
          cfg = R.normalizarConfig(d.config); if (window.RKTema) window.RKTema.defecto(cfg.tema); sitio = d.sitio || {}; try { aplicarSitio(); } catch (e) { /* el sitio sigue con su contenido original */ } return d.tienda;
        }).catch(function () { conexion = false; return null; })
      : Promise.resolve(null);
    return Promise.all([conf, tienda]).then(function (r) { pintarTienda(r[0] && r[0].length ? r[0] : r[1]); });
  }

  /* ---------- calendario reutilizable (reserva y planes) ----------
     o = { cont, hoy, dias: {fecha: {libres}}, horas: fn, elegida: fn, deshabilitada: fn(fecha), alElegir: fn(fecha) } */
  function calendario(o) {
    var c = o.cont; c.textContent = ''; c.classList.add('sem');
    var fechas = Object.keys(o.dias).sort();
    if (!fechas.length) return;
    var lunesDe = function (f) { return R.sumarDias(f, -((R.diaSemana(f) + 6) % 7)); };
    var lunes = []; fechas.forEach(function (f) { var l = lunesDe(f); if (lunes.indexOf(l) < 0) lunes.push(l); });
    var habil = function (f) { return !!o.dias[f] && R.inicios(o.dias[f].libres, o.horas()).length > 0 && !(o.deshabilitada && o.deshabilitada(f)); };
    var idx = c._sem;
    var el_ = o.elegida && o.elegida();
    if (el_ && lunes.indexOf(lunesDe(el_)) >= 0 && c._ultima !== el_) idx = lunes.indexOf(lunesDe(el_));
    if (idx === undefined || idx < 0 || idx >= lunes.length) { idx = 0; for (var q = 0; q < lunes.length; q++) { var hay = false; for (var k = 0; k < 7; k++) if (habil(R.sumarDias(lunes[q], k))) hay = true; if (hay) { idx = q; break; } } }
    c._sem = idx; c._ultima = el_;
    var l0 = lunes[idx], l6 = R.sumarDias(l0, 6);
    var nav = el('div', 'sem-nav');
    var ant = el('button', 'sem-b', '‹'); ant.type = 'button'; ant.setAttribute('aria-label', 'Semana anterior'); ant.disabled = idx === 0; ant.addEventListener('click', function () { c._sem = idx - 1; calendario(o); });
    var sig = el('button', 'sem-b', '›'); sig.type = 'button'; sig.setAttribute('aria-label', 'Semana siguiente'); sig.disabled = idx >= lunes.length - 1; sig.addEventListener('click', function () { c._sem = idx + 1; calendario(o); });
    var m0 = MESES[Number(l0.slice(5, 7)) - 1], m6 = MESES[Number(l6.slice(5, 7)) - 1];
    nav.appendChild(ant); nav.appendChild(el('div', 'sem-tit', Number(l0.slice(8)) + (m0 !== m6 ? ' ' + m0 : '') + ' – ' + Number(l6.slice(8)) + ' ' + m6 + ' ' + l6.slice(0, 4))); nav.appendChild(sig);
    c.appendChild(nav);
    var g = el('div', 'sem-grid'); var DS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (var d = 0; d < 7; d++) (function (d) {
      var f = R.sumarDias(l0, d), n = o.dias[f] ? R.inicios(o.dias[f].libres, o.horas()).length : 0;
      var b = el('button', 'cal-dia'); b.type = 'button';
      b.appendChild(el('b', 'dn', String(Number(f.slice(8)))));
      b.appendChild(el('span', 'dw', DS[d]));
      b.appendChild(el('small', 'dc', !o.dias[f] ? '—' : n ? n + (n === 1 ? ' bloque' : ' bloques') : 'Sin cupo'));
      var off = !habil(f);
      b.disabled = off; b.setAttribute('aria-pressed', o.elegida() === f ? 'true' : 'false');
      b.setAttribute('aria-label', R.fechaLarga(f) + (off ? ', sin cupo' : ', ' + n + ' bloques libres'));
      if (f === o.hoy) b.classList.add('hoy');
      if (n && !off) b.classList.add('libre');
      b.addEventListener('click', function () { o.alElegir(f); });
      g.appendChild(b);
    })(d);
    c.appendChild(g);
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
    $('wsp').href = wspUrl('Hola 👋 Me gustaría consultar por ' + cfg.nombreNegocio);
    txt($('tyc-txt'), 'Leí el reglamento interno y acepto que el horario queda reservado ' + cfg.minutosReserva + ' minutos a la espera del abono (' + R.clp(cfg.abonoPorHora) + ' por hora) y que puedo anular o reagendar con al menos ' + cfg.horasAnulacion + ' horas de anticipación. También acepto que usen mis datos personales para gestionar mi reserva, según la sección «Protección de datos personales».');
    var rl = el('a', 'ver-reg', ' Ver reglamento'); rl.href = '#reglamento'; rl.setAttribute('role', 'button');
    rl.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); abrirReglamento(); }); $('tyc-txt').appendChild(rl);
    txt($('pie'), '© ' + new Date().getFullYear() + ' ' + cfg.nombreNegocio);
    var av = $('aviso'); av.hidden = !cfg.avisoBanner; txt(av, cfg.avisoBanner || '');
    var dias = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var b = (cfg.horarios[d] || []).map(function (x) { return R.horaTxt(x[0]) + '–' + R.horaTxt(x[1]); }).join(' y ');
      return R.DIAS[d] + ' ' + (b || 'cerrado');
    });
    txt($('horarios-txt'), 'Horario de atención: ' + dias.join(' · '));
    var hl = $('horarios-lista'); hl.textContent = ''; [1, 2, 3, 4, 5, 6, 0].forEach(function (d) { var b = (cfg.horarios[d] || []).map(function (x) { return R.horaTxt(x[0]) + ' a ' + R.horaTxt(x[1]); }).join(' y '), li = el('li', b ? '' : 'cerrado'); li.appendChild(el('span', '', R.DIAS[d])); li.appendChild(el('b', '', b || 'Cerrado')); hl.appendChild(li); });
    var tl = String(cfg.whatsapp || ''); txt($('ct-tel'), tl.length === 11 ? '+' + tl.slice(0, 2) + ' ' + tl.slice(2, 3) + ' ' + tl.slice(3, 7) + ' ' + tl.slice(7) : '+' + tl);
    var cm = $('ct-mail'); cm.hidden = !R.correoValido(cfg.correoContacto || ''); if (!cm.hidden) { cm.href = 'mailto:' + cfg.correoContacto; txt($('ct-correo'), cfg.correoContacto); }
    var mapaB = $('ct-mapa'); if (cfg.direccion && !mapaB.firstChild) { var ifr = document.createElement('iframe'); ifr.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(cfg.direccion) + '&output=embed'; ifr.loading = 'lazy'; ifr.title = 'Mapa de ' + cfg.nombreNegocio; ifr.referrerPolicy = 'no-referrer'; mapaB.appendChild(ifr); mapaB.hidden = false; }
    var pausa = $('pausa'); pausa.hidden = cfg.reservasActivas;
    if (!cfg.reservasActivas) {
      pausa.textContent = 'Las reservas en línea están pausadas por ahora. ';
      var a = el('a', '', 'Escríbenos por WhatsApp'); a.href = wspUrl('Hola 👋 Me gustaría reservar, ¿me ayudan a ver los horarios disponibles?'); pausa.appendChild(a);
    }
    /* reglamento: «## » = título, «- » = viñeta, otra línea = párrafo; los {valores} salen de la configuración */
    var valores = { negocio: cfg.nombreNegocio, abonoPorHora: R.clp(cfg.abonoPorHora), devolucionPorHora: R.clp(cfg.abonoPorHora - cfg.retencionPorHora), horasAnulacion: cfg.horasAnulacion, retencionPorHora: R.clp(cfg.retencionPorHora), noAsisteCobroPorHora: R.clp(cfg.noAsisteCobroPorHora || 5000), reagendoSemanas: cfg.reagendoSemanas, reagendoCambios: cfg.reagendoCambios, minutosReserva: cfg.minutosReserva };
    var rg = $('reglamento-in'); rg.textContent = ''; var lista = null;
    (String(cfg.reglamento || '') + (/datos personales/i.test(String(cfg.reglamento || '')) || !cfg.reglamento ? '' : '\n\n' + R.CLAUSULA_DATOS)).split(/\r?\n/).forEach(function (l) {
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
    var RED = [['📸', 'Instagram', cfg.redInstagram, 'Instagram'], ['▶️', 'Canal de YouTube', cfg.redYoutube, 'Sesiones y videopodcasts'], ['🎵', 'YouTube Music', cfg.redYoutubeMusic, 'Lista oficial'], ['🌳', 'Linktree', cfg.redLinktree, 'Todos nuestros enlaces'], ['🟣', 'Twitch', cfg.redTwitch, 'Transmisiones en vivo'], ['📘', 'Facebook', cfg.redFacebook, 'Comunidad Rockerío'], ['🎶', 'TikTok', cfg.redTiktok, 'Videos cortos'], ['🎧', 'Spotify', cfg.redSpotify, 'Nuestra música'], ['🌐', 'Sitio web', cfg.sitioWeb, 'Página web']].concat(pares(cfg.enlacesExtra).map(function (x) { return ['🔗', x[0], x[1], 'Enlace']; }));
    var rc = $('redes'); rc.textContent = '';
    RED.forEach(function (x) { if (!/^https:\/\/[^\s"'<>]{4,300}$/.test(x[2] || '')) return; var l = el('a', 'ct-red'); l.href = x[2]; l.target = '_blank'; l.rel = 'noopener'; l.appendChild(el('span', 'ic', x[0])); var t = el('div'); t.appendChild(el('b', '', x[1])); t.appendChild(el('small', '', x[3])); l.appendChild(t); rc.appendChild(l); });
    rc.hidden = !rc.firstChild;
    $('redes-t').parentNode.hidden = $('redes').hidden;
    var mp = $('maps'); mp.hidden = !/^https:\/\//.test(cfg.mapsUrl || ''); if (!mp.hidden) mp.href = cfg.mapsUrl;
    var m2 = $('maps2'); m2.hidden = mp.hidden; $('sep2').hidden = mp.hidden; if (!m2.hidden) m2.href = cfg.mapsUrl;
    txt($('pa-texto'), cfg.proaudixTexto);
    var pl = [['Sitio web', cfg.proaudixWeb], ['Instagram', cfg.proaudixInstagram], ['Facebook', cfg.proaudixFacebook], ['YouTube', cfg.proaudixYoutube]];
    if (cfg.proaudixWhatsapp) pl.unshift(['WhatsApp', 'https://wa.me/' + cfg.proaudixWhatsapp]);
    enlaces($('pa-links'), pl.concat(pares(cfg.proaudixEnlaces)));
    txt($('hero-t'), cfg.heroTitulo); txt($('hero-p'), cfg.heroTexto);
    [['nosotros', 'verProduccion'], ['ficha', 'verFicha'], ['planes', 'verPlanes'], ['galeria', 'verGaleria'], ['opiniones', 'verEvaluaciones'], ['proaudix', 'verProaudix'], ['contacto', 'verContacto'], ['bandas', 'verHonor'], ['tienda', 'verTienda'], ['cotizar', 'verCotizar'], ['reglamento', 'verReglamento']].forEach(function (x) { if (!cfg[x[1]]) $(x[0]).hidden = true; else if (x[0] !== 'reglamento' && x[0] !== 'tienda' && x[0] !== 'galeria') $(x[0]).hidden = false; });
    if (!cfg.verHonor) $('bandas').hidden = true;
    pintarHoras(); refrescarAgenda(); if (fichaDatos) pintarFicha();
  }

  /* El reglamento se abre en una ventana emergente para no sacar al cliente de su reserva. */
  function abrirReglamento() {
    var previo = document.activeElement, ov = el('div', 'reg-ov'), c = el('div', 'reg-modal'), cab = el('div', 'reg-cab');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Reglamento interno');
    cab.appendChild(el('h3', '', 'Reglamento interno'));
    var x = el('button', 'btn chico', 'Cerrar ✕'); x.type = 'button'; cab.appendChild(x); c.appendChild(cab);
    var cuerpo = el('div', 'reglamento'); [].forEach.call($('reglamento-in').childNodes, function (n) { cuerpo.appendChild(n.cloneNode(true)); });
    if (!cuerpo.firstChild) cuerpo.appendChild(el('p', '', 'El reglamento no está disponible por ahora.'));
    c.appendChild(cuerpo); var pie = el('div', 'reg-pie'), ok = el('button', 'btn', 'Entendido, volver a mi reserva'); ok.type = 'button'; pie.appendChild(ok); c.appendChild(pie); ov.appendChild(c);
    function cerrar() { document.removeEventListener('keydown', tecla); ov.remove(); document.body.classList.remove('reg-abierto'); if (previo && previo.focus) previo.focus(); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    x.addEventListener('click', cerrar); ok.addEventListener('click', cerrar); ov.addEventListener('click', function (e) { if (e.target === ov) cerrar(); });
    document.addEventListener('keydown', tecla); document.body.classList.add('reg-abierto'); document.body.appendChild(ov); x.focus();
  }

  /* ---------- estáticos ---------- */
  var fichaDatos = null;
  /** Ficha técnica. Los {valores} (precios, abono, escala de grabación incluida) salen de la configuración, así nunca quedan desactualizados. */
  /** Carrusel elegante con infografía: items = [{src, titulo, descripcion, datos:[…]}]. Flechas, puntos, deslizar, ampliar al tocar. */
  /** Fotos pequeñas acompañadas de su texto (galería y ficha técnica); al tocar una se abre en grande. */
  function listaFotos(cont, items) {
    var fotos = items.filter(function (f) { return f.src; }); cont.textContent = ''; var g = el('div', 'fo-lista');
    fotos.forEach(function (f, k) {
      var it = el('div', 'fo-it'), im = el('img'); im.src = f.src; im.alt = f.alt || f.titulo || ''; im.loading = 'lazy'; im.tabIndex = 0;
      im.addEventListener('click', function () { visor(fotos, k); }); im.addEventListener('keydown', function (e) { if (e.key === 'Enter') visor(fotos, k); });
      var tx = el('div', 'fo-tx'); tx.appendChild(el('b', '', f.titulo || f.alt || '')); if (f.descripcion) tx.appendChild(el('p', '', f.descripcion));
      if (f.datos && f.datos.length) { var ch = el('div', 'carr-datos'); f.datos.forEach(function (x) { ch.appendChild(el('i', '', x)); }); tx.appendChild(ch); }
      it.appendChild(im); it.appendChild(tx); g.appendChild(it);
    });
    cont.appendChild(g);
  }
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
    if (!fichaDatos) { dato('ficha', 'data/ficha.json').then(function (d) { fichaDatos = fichaDatos || d; pintarFicha(); }).catch(function () { $('ficha').hidden = true; }); return; }
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
      var fts = s.mics ? [] : (s.fotos || []).filter(function (f) { return f && f.src; }), hero = el('div', 'ficha-hero' + (fts.length ? '' : ' sin-foto') + (s.mics ? ' ficha-mics' : ''));
      if (fts.length) { hero.style.backgroundImage = 'url("' + fts[0].src.replace(/"/g, '') + '")'; hero.tabIndex = 0; hero.setAttribute('role', 'button'); hero.setAttribute('aria-label', 'Ampliar foto de ' + s.titulo); hero.addEventListener('click', function (e) { if (e.target.closest('.info-stats')) return; visor(fts, 0); }); hero.addEventListener('keydown', function (e) { if (e.key === 'Enter') visor(fts, 0); }); }
      var cab = el('div', 'ficha-cab'); cab.appendChild(el('span', 'ficha-ico', s.icono || '')); var tx = el('div'); tx.appendChild(el('h3', '', s.titulo)); if (s.resumen) tx.appendChild(el('p', 'sub', s.resumen)); cab.appendChild(tx); hero.appendChild(cab);
      if (s.stats && s.stats.length) hero.appendChild(infografia(s.stats));
      panel.appendChild(hero);
      if (fts.length > 1) { var cc = el('div', 'carr-caja'); panel.appendChild(cc); listaFotos(cc, fts.slice(1)); }
      var g = el('div', 'grid'); panel.appendChild(g);
      (s.bloques || []).forEach(function (b) {
        var c = el('div', 'card'); c.appendChild(el('h3', '', b.titulo)); var ul = el('ul');
        b.items.forEach(function (i) {
          if (i === '{escala}') { Object.keys(cfg.escala || {}).sort(function (x, y) { return x - y; }).forEach(function (h) { ul.appendChild(el('li', '', 'Bloque de ' + h + ' hrs: incluye hasta ' + R.minutosTxt(cfg.escala[h]) + ' de grabación')); }); return; }
          ul.appendChild(el('li', '', i.replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; })));
        });
        if (/software|plugin/i.test(b.titulo) && b.items.every(function (i) { return i.length <= 48 && i.indexOf('{') < 0; })) { var cs = el('div', 'chips-sw'); b.items.forEach(function (i) { cs.appendChild(el('span', '', i)); }); c.appendChild(cs); c.className += ' card-sw'; g.appendChild(c); return; }
        if (ul.children.length) { c.appendChild(ul); g.appendChild(c); }
      });
      if (s.mics) panel.appendChild($('mics-box'));
      if (s.escucha) panel.appendChild($('escucha-box'));
    }
    secs.forEach(function (s) { var b = el('button', 'ficha-tab'); b.appendChild(el('span', 'ft-ico', s.icono || '')); b.appendChild(el('span', 'ft-tit', s.titulo)); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-id', s.id); b.addEventListener('click', function () { mostrar(s.id); }); tabs.appendChild(b); });
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
  var seqG = 0, seqP = 0;
  function pintarGaleria() {
    var n = ++seqG;
    dato('galeria', 'data/galeria.json').then(function (g) {
      if (n !== seqG) return;
      var cont = $('galeria-in'); cont.textContent = '';
      var fotos = g.filter(function (f) { return f.src; }), videos = g.filter(function (f) { return f.video; });
      var info = $('galeria-info'); if (info) { info.textContent = ''; info.appendChild(infografia([['📸', String(fotos.length), 'fotos del estudio'], ['🎛️', '2', 'salas: ensayo y grabación'], ['🎙️', '17', 'micrófonos de estudio'], ['🎚️', '32', 'canales Midas M32']])); }
      var cc = $('galeria-car'); if (cc) listaFotos(cc, fotos);
      videos.forEach(function (f) { cont.appendChild(tarjetaVideo(f)); });
    }).catch(function () { $('galeria').hidden = true; });
  }
  /** Reproductor de tu playlist de YouTube Music (data/playlist.json) en Producción y Galería. */
  function pintarPlaylist() {
    var n = ++seqP;
    dato('playlist', 'data/playlist.json').then(function (d) {
      if (n !== seqP) return;
      var m = /[?&]list=([\w-]+)/.exec(d.url || ''); if (!m) return;
      [].forEach.call(document.querySelectorAll('[data-playlist]'), function (c) {
        c.textContent = ''; c.appendChild(el('h3', '', '🎵 ' + (d.titulo || 'Nuestra playlist')));
        if (d.texto) c.appendChild(el('p', 'sub', d.texto));
        var fr = el('iframe', 'pl-frame'); fr.src = 'https://www.youtube-nocookie.com/embed/videoseries?list=' + m[1]; fr.title = 'Playlist de trabajos terminados'; fr.loading = 'lazy';
        fr.allow = 'accelerometer; encrypted-media; picture-in-picture'; fr.setAttribute('allowfullscreen', ''); c.appendChild(fr);
        var b = el('a', 'btn chico', 'Abrir en YouTube Music'); b.href = d.url; b.target = '_blank'; b.rel = 'noopener'; c.appendChild(b);
        c.hidden = false; var vt = $('trabajos-vacio'); if (vt) vt.hidden = true;
      });
    }).catch(function () {});
  }
  function pintarTienda(items) {
    var cont = $('tienda-in'); cont.textContent = '';
    items = (items || []).filter(function (p) { return !/beb/i.test(p.categoria || ''); });
    if (!items.length) { $('tienda').hidden = true; return; }
    $('tienda').hidden = !cfg.verTienda;
    var rejilla = el('div', 'prods tienda-grid'); cont.appendChild(rejilla);
    items.forEach(function (p) {
      var agotado = p.stock === 0, f = el('div', 'prod' + (agotado ? ' agotado' : '') + (p.foto ? ' con-foto' : ''));
      var fo = el('div', 'prod-fotobox');
      if (p.foto) { var im = el('img', 'prod-foto'); im.src = p.foto; im.alt = p.nombre; im.loading = 'lazy'; fo.appendChild(im); } else fo.appendChild(el('span', 'prod-sinfoto', '🎸'));
      f.appendChild(fo);
      f.appendChild(el('div', 'prod-cat', p.categoria || 'Insumos'));
      f.appendChild(el('h4', 'prod-nom', p.nombre));
      if (p.detalle) f.appendChild(el('p', 'prod-det', p.detalle));
      var pie = el('div', 'prod-pie'); pie.appendChild(el('span', 'pr', p.precio ? R.clp(p.precio) : 'Consultar'));
      if (!agotado) {
        var b = el('a', 'prod-wsp', 'Comprar por WhatsApp'); b.target = '_blank'; b.rel = 'noopener';
        b.href = wspUrl('Hola 👋 Me gustaría comprar: ' + p.nombre + (p.detalle ? ' (' + p.detalle + ')' : '') + (p.precio ? ' — ' + R.clp(p.precio) : '') + '. ¿Lo tienen disponible?');
        pie.appendChild(b);
      } else pie.appendChild(el('span', 'prod-ago', 'Agotado'));
      f.appendChild(pie); rejilla.appendChild(f);
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
    pintarArriendos();
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

  /** Instrumentos y accesorios en arriendo: cada uno se elige por separado; el valor sale de la configuración. */
  var ARRIENDOS = ['Set de platos Kingdo SN8 (B8): Hi-Hat 14” / Crash 16” / Crash 18” / Ride 20”', 'Bajo eléctrico Epiphone Thunderbird Pro IV', 'Guitarra eléctrica Squier Stratocaster Vintage Modified ’70', 'Guitarra electroacústica Takamine', 'Pedalera multiefecto para bajo', 'Pedalera multiefecto para guitarra'];
  var arrSel = {};
  function arriendosElegidos() { return ARRIENDOS.filter(function (n, k) { return arrSel[k]; }); }
  function pintarArriendos() {
    var c = $('arriendo-lista'); if (!c) return; c.textContent = '';
    $('p-extra').textContent = R.clp(cfg.precioExtraEquipo) + (cfg.extraModo === 'hora' ? '/hr c/u' : ' c/u');
    ARRIENDOS.forEach(function (n, k) {
      var l = el('label', 'ex-fila-ck'), i = el('input'); i.type = 'checkbox'; i.checked = !!arrSel[k];
      i.addEventListener('change', function () { arrSel[k] = i.checked; $('extras').value = arriendosElegidos().length; resumen(); });
      l.appendChild(i); l.appendChild(el('span', '', n)); c.appendChild(l);
    });
    $('extras').value = arriendosElegidos().length;
  }
  function solicitud() {
    return {
      servicio: S.servicio, fecha: S.fecha, inicio: S.inicio, horas: S.horas,
      extras: S.servicio === 'ensayo' ? Number($('extras').value) || 0 : 0, video: $('video').checked, raw: $('raw').checked,
      zurdo: $('zurdo').checked, voces: Number($('voces').value),
      banda: $('banda').value, nombre: $('nombre').value, telefono: $('telefono').value, correo: $('correo').value,
      comentario: ($('comentario').value + (arriendosElegidos().length && S.servicio === 'ensayo' ? ' [Arriendos: ' + arriendosElegidos().join('; ') + ']' : '')).slice(0, 500), tyc: $('tyc').checked, web: $('web').value
    };
  }
  function fila(dl, k, v) { dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', v)); }
  function resumen() {
    var dl = $('tr-lista'), tot = $('tr-total'), its = $('ro-items'), falta = [];
    dl.textContent = ''; tot.textContent = ''; its.textContent = '';
    var ens = S.servicio === 'ensayo', hrs = S.horas + (S.horas === 1 ? ' hr' : ' hrs');
    txt($('ro-fee'), R.clp(Number(cfg.noAsisteCobroPorHora) || 5000));
    $('ro-titulo').textContent = (ens ? '🎸 Sala de ensayo' : '🎛️ Estudio de grabación') + ' · ' + hrs;
    if (S.fecha) fila(dl, '📅 Día', R.fechaLarga(S.fecha)); else falta.push('el día');
    if (S.inicio !== null) fila(dl, '🕒 Horario', R.horaTxt(S.inicio) + ' a ' + R.horaTxt(S.inicio + S.horas)); else if (S.fecha) falta.push('tu horario');
    var s = solicitud();
    if ($('banda').value.trim() || $('nombre').value.trim()) fila(dl, '👤 Banda y contacto', ($('banda').value.trim() || '—') + ' · ' + ($('nombre').value.trim() || '—') + (R.telefonoValido(R.normalizarTelefono($('telefono').value)) ? ' (+' + R.normalizarTelefono($('telefono').value) + ')' : ''));
    function linea(t, v) { var f = el('div', 'ro-it'); f.appendChild(el('span', '', t)); f.appendChild(el('b', '', R.clp(v))); its.appendChild(f); }
    if (S.inicio !== null) {
      var ok = R.addonsPermitidos(cfg, S.servicio, S.horas), p = R.calcularPrecio(cfg, s), g = R.grabacionIncluidaMin(cfg, S.servicio, S.horas);
      if (ens) fila(dl, '🥁 Batería', s.zurdo ? 'Zurdo' : 'Diestro');
      if (ens && Number($('voces').value) > 0) fila(dl, '🎤 Micrófonos vocales', $('voces').value);
      linea((ens ? 'Sala de ensayo' : 'Estudio de grabación') + ' (' + hrs + ')', p.base);
      if (p.extras) {
        var arr = arriendosElegidos(), unit = arr.length ? Math.round(p.extras / arr.length) : p.extras;
        arr.forEach(function (n) { linea('🎸 ' + n.split(':')[0] + (cfg.extraModo === 'hora' ? ' (' + S.horas + (S.horas === 1 ? ' hr' : ' hrs') + ')' : ''), unit); });
      }
      if (p.video && s.video && ok) linea('🎥 Grabación en video GoPro Hero 13', p.video);
      if (p.raw && s.raw && ok) linea('💾 Material en bruto multitrack', p.raw);
      if (p.horasConveniente) its.appendChild(el('div', 'nota ahorro', '✔ Tarifa conveniente aplicada en ' + p.horasConveniente + (p.horasConveniente === 1 ? ' hora' : ' horas') + ' (ahorras ' + R.clp(p.ahorro) + ').'));
      if (g) its.appendChild(el('div', 'nota ahorro', '🎙️ Incluye ' + R.minutosTxt(g) + ' de grabación con mezcla.'));
      var t1 = el('div', 'ro-tot'); t1.appendChild(el('span', '', 'Total de la sesión:')); t1.appendChild(el('b', '', R.clp(p.total))); tot.appendChild(t1);
      var t2 = el('div', 'ro-abono'); var t2a = el('div'); t2a.appendChild(el('b', '', 'Abono requerido (' + R.clp(cfg.abonoPorHora) + ' / hr):')); t2a.appendChild(el('small', '', '(' + R.clp(cfg.abonoPorHora) + ' x ' + S.horas + (S.horas === 1 ? ' hora' : ' horas') + ' para confirmar en agenda oficial)')); t2.appendChild(t2a); t2.appendChild(el('b', 'v', R.clp(p.abono))); tot.appendChild(t2);
      var t3 = el('div', 'ro-saldo'); var t3a = el('div'); t3a.appendChild(el('b', '', 'Saldo restante a pagar en sala:')); t3a.appendChild(el('small', '', '(Se cancela presencialmente al ingresar a tu jornada)')); t3.appendChild(t3a); t3.appendChild(el('b', 'v', R.clp(p.saldo))); tot.appendChild(t3);
    }
    var bd = $('ro-badge'); bd.textContent = falta.length ? 'Faltan datos' : 'Datos completados'; bd.className = 'ro-badge' + (falta.length ? ' falta' : '');
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
    var box = o.box; box.hidden = false; box.textContent = ''; box.className = 'caja pago-of';
    var cab = el('div', 'ro-cab'); cab.appendChild(el('b', '', '✔ Resumen oficial de la sesión')); cab.appendChild(el('span', 'ro-badge', 'Reserva registrada')); box.appendChild(cab);
    var tk = el('div', 'ro-ticket'); var tl = el('div'); tl.appendChild(el('small', '', 'Ticket de reserva generado:')); tl.appendChild(el('b', 'cod', o.titulo.replace(/^.*?(#\S+).*$/, '$1').charAt(0) === '#' ? o.titulo.replace(/^.*?(#\S+).*$/, '$1') : o.titulo)); tk.appendChild(tl);
    var cupo = el('div', 'ro-cupo'); cupo.setAttribute('role', 'timer'); tk.appendChild(cupo); box.appendChild(tk);
    var res = el('div', 'ro-det'); o.lineas.forEach(function (l) { res.appendChild(el('p', '', l)); }); box.appendChild(res);
    var tm = el('div', 'ro-abono'); var ta = el('div'); ta.appendChild(el('b', '', 'Abona ' + R.clp(o.monto) + ' para confirmar tu horario')); ta.appendChild(el('small', '', 'Tu horario queda tomado por ' + o.pago.minutosReserva + ' minutos; si no llega el abono, se libera solo.')); tm.appendChild(ta); tm.appendChild(el('b', 'v', R.clp(o.monto))); box.appendChild(tm);
    var bts = el('div', 'ro-bts'); box.appendChild(bts);
    if (o.pago.link) { var p = el('a', 'ro-b ro-azul', '💳 Pagar abono en línea (instantáneo)'); p.href = o.pago.link; p.target = '_blank'; p.rel = 'noopener'; bts.appendChild(p); }
    if (o.pago.mp && o.pagar) {
      var pm = el('button', 'ro-b ro-azul', '💳 Pagar con Mercado Pago (se confirma sola)'); pm.type = 'button';
      pm.addEventListener('click', function () {
        pm.disabled = true; pm.textContent = 'Abriendo Mercado Pago…'; try { sessionStorage.setItem('rk_pago', JSON.stringify(o.pagar)); } catch (e) { /* sin almacenamiento */ }
        pedir(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'mp_pagar', codigo: o.pagar.codigo, telefono: o.pagar.telefono }) })
          .then(function (d) { if (d.ok && /^https:\/\//.test(d.url || '')) { location.href = d.url; } else { pm.disabled = false; pm.textContent = '💳 Pagar con Mercado Pago'; avisoPago(o.box, d.error || 'No pudimos abrir el pago.'); } })
          .catch(function () { pm.disabled = false; pm.textContent = '💳 Pagar con Mercado Pago'; avisoPago(o.box, 'No pudimos abrir el pago. Prueba con transferencia.'); });
      });
      bts.appendChild(pm);
    }
    var tr = el('div', 'ro-trans');
    var bt = el('button', 'ro-b ro-osc', '🏦 Ver datos de transferencia bancaria'); bt.type = 'button';
    var dt = el('div', 'ro-datos'); dt.hidden = true;
    if (o.pago.transferencia) { dt.appendChild(el('pre', '', o.pago.transferencia)); var cb = el('button', 'btn chico', 'Copiar datos'); cb.type = 'button'; cb.addEventListener('click', function () { copiar(o.pago.transferencia, cb); }); dt.appendChild(cb); }
    else dt.appendChild(el('p', 'nota', 'Te enviaremos los datos de transferencia por WhatsApp.'));
    bt.addEventListener('click', function () { dt.hidden = !dt.hidden; }); tr.appendChild(bt); tr.appendChild(dt); bts.appendChild(tr);
    var w = el('a', 'ro-b ro-wsp', '📲 Enviar comprobante por WhatsApp'); w.href = wspUrl(o.whatsapp + '\nTe adjunto el comprobante del abono de ' + R.clp(o.monto) + '. ¡Gracias!'); w.target = '_blank'; w.rel = 'noopener'; bts.appendChild(w);
    box.appendChild(el('p', 'nota', 'Abre la conversación con el detalle de tu reserva ya escrito y adjunta el comprobante.'));
    if (o.pagar) {
      var yp = el('button', 'ro-b ro-osc', '✅ Ya envié mi comprobante'); yp.type = 'button'; yp.className += ' ro-yapague';
      yp.addEventListener('click', function () {
        yp.disabled = true; yp.textContent = 'Avisando…';
        pedir(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'pagado', codigo: o.pagar.codigo, telefono: o.pagar.telefono }) })
          .then(function (d) { if (d.ok) { yp.hidden = true; relojes.forEach(clearInterval); relojes = []; cupo.textContent = 'Horario guardado'; avisoPago(box, d.mensaje, true); } else { yp.disabled = false; yp.textContent = '✅ Ya envié mi comprobante'; avisoPago(box, d.error || 'No pudimos registrar el aviso.'); } })
          .catch(function () { yp.disabled = false; yp.textContent = '✅ Ya envié mi comprobante'; avisoPago(box, 'No pudimos avisar. Escríbenos por WhatsApp con tu comprobante.'); });
      });
      box.appendChild(yp);
    }
    iniciarCuenta(cupo, o.pago.segundos, bts);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function avisoPago(box, texto, bueno) {
    var a = box.querySelector('.ro-aviso'); if (!a) { a = el('p', 'ro-aviso nota'); a.setAttribute('role', 'status'); box.appendChild(a); }
    a.textContent = texto; a.style.color = bueno ? 'var(--ok, #4ade80)' : 'var(--rojo, #ff5a5f)';
  }
  /** Cuenta regresiva del horario tomado. Al llegar a cero avisa que se liberó. */
  var relojes = [];
  function iniciarCuenta(caja, segundos, pasos) {
    if (!(segundos > 0)) { caja.hidden = true; return; }
    var fin = Date.now() + segundos * 1000;
    function pintar() {
      var resto = Math.max(0, Math.round((fin - Date.now()) / 1000));
      caja.textContent = '';
      if (resto > 0) { caja.className = 'ro-cupo'; caja.appendChild(el('small', '', '⏱ Cupo reservado por:')); caja.appendChild(el('b', '', String(Math.floor(resto / 60)).padStart(2, '0') + ':' + String(resto % 60).padStart(2, '0') + ' min')); return true; }
      caja.className = 'ro-cupo vencida'; caja.appendChild(el('b', '', 'El tiempo terminó y el horario se liberó.')); caja.appendChild(el('small', '', 'Si ya abonaste, escríbenos por WhatsApp con tu comprobante; si no, vuelve a reservar.')); pasos.style.opacity = '.55'; return false;
    }
    if (!pintar()) return;
    var id = setInterval(function () { if (!pintar() || !document.body.contains(caja)) clearInterval(id); }, 1000);
    relojes.push(id);
  }

  /* ---------- envío de la reserva ---------- */
  /* Vuelta desde Mercado Pago: se confirma la reserva sin esperar el aviso automático. */
  (function retornoPago() {
    var q = /[?&]pago=(ok|pendiente|error)\b/.exec(location.search); if (!q || !API) return;
    var datos = null; try { datos = JSON.parse(sessionStorage.getItem('rk_pago') || 'null'); } catch (e) { /* nada */ }
    var b = el('div', 'caja pago-of'); b.setAttribute('role', 'status'); b.style.margin = '12px auto'; b.style.maxWidth = '880px';
    var m = document.querySelector('main'); if (!m) return; m.insertBefore(b, m.firstChild);
    if (q[1] === 'error') { b.textContent = 'El pago no se completó. Tu horario sigue guardado unos minutos: puedes reintentar o pagar por transferencia.'; return; }
    b.textContent = 'Estamos confirmando tu pago…';
    if (!datos) { b.textContent = 'Recibimos tu pago. En unos minutos te confirmamos la reserva por WhatsApp.'; return; }
    var intentos = 0;
    (function otra() {
      pedir(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'mp_verificar', codigo: datos.codigo, telefono: datos.telefono }) })
        .then(function (d) {
          if (d.ok && d.confirmada) { b.textContent = '✅ ¡Pago recibido! Tu reserva ' + datos.codigo + ' quedó confirmada. Te esperamos 🤘'; try { sessionStorage.removeItem('rk_pago'); } catch (e) { /* nada */ } }
          else if (++intentos < 4) setTimeout(otra, 4000);
          else b.textContent = 'Recibimos tu solicitud de pago. Apenas Mercado Pago lo confirme, tu reserva queda lista (te avisamos por WhatsApp).';
        })
        .catch(function () { b.textContent = 'Recibimos tu pago. Te confirmamos la reserva por WhatsApp.'; });
    })();
  })();
  var ultimoTel = '';
  function enviar(ev) {
    ev.preventDefault(); if (enviando) return; mostrarError('');
    var s = solicitud();
    if (!S.fecha || S.inicio === null) return mostrarError('Elige el día y tu horario.');
    var v = R.validarSolicitud(cfg, ahora, s, []);
    if (!v.ok) return mostrarError(v.error);
    if (!conexion) return respaldoWhatsApp(v);
    enviando = true; $('enviar').disabled = true; $('enviar').textContent = 'Enviando…';
    s.accion = 'reservar'; ultimoTel = s.telefono;
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
      monto: r.abono, pago: d.pago, whatsapp: d.whatsapp || ('Hola, quiero confirmar mi reserva ' + d.codigo),
      pagar: ultimoTel ? { codigo: d.codigo, telefono: ultimoTel } : null
    });
    $('form').hidden = true; $('tu-reserva').hidden = true;
  }

  window.RK = {
    cfg: function () { return cfg; }, micsCatalogo: function () { return dato('microfonos', 'data/microfonos.json').catch(function () { return []; }); }, wsp: wspUrl, el: el, pedir: pedir, api: API, calendario: calendario, bloques: bloques,
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
    ['video', 'raw', 'voces'].forEach(function (id) { $(id).addEventListener('change', resumen); }); ['banda', 'nombre', 'telefono'].forEach(function (id) { $(id).addEventListener('input', resumen); });
    [].forEach.call(document.querySelectorAll('#orient button'), function (b) { b.addEventListener('click', function () { $('zurdo').checked = b.getAttribute('data-z') === '1'; [].forEach.call(document.querySelectorAll('#orient button'), function (x) { x.className = x === b ? 'on' : ''; }); resumen(); }); });
    $('form').addEventListener('submit', enviar);
  });
})();
