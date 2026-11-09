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

  /* ---------- pintado ---------- */
  function pintar(c) {
    var mics = c.muestras.filter(function (g) { return g.tipo === 'Micrófono'; });
    var otros = c.muestras.filter(function (g) { return g.tipo !== 'Micrófono'; });
    $('mics-box').hidden = !mics.length; $('escucha-box').hidden = !otros.length;
    mics.forEach(function (g) { $('mics').appendChild(tarjeta(g)); });
    otros.forEach(function (g) { $('escucha').appendChild(tarjeta(g)); });

    var K = window.RK.cfg(); $('bandas').hidden = !K.verHonor; $('nav-bandas').hidden = !K.verHonor;
    var host = function (u) { var m = /^https:\/\/(?:www\.)?([^\/]+)/.exec(u || ''); return m ? m[1] : ''; };
    var etiq = function (u) { var h = host(u); return /spotify/.test(h) ? 'Spotify' : /bandcamp/.test(h) ? 'Bandcamp' : /youtu/.test(h) ? 'YouTube' : /instagram/.test(h) ? 'Instagram' : /soundcloud/.test(h) ? 'SoundCloud' : 'Enlace'; };
    c.honor.forEach(function (h) {
      var k = el('div', 'card honor-card');
      var cab = el('div', 'honor-cab2');
      if (/^https:\/\//.test(h.logo)) { var i = el('img', 'logo'); i.src = h.logo; i.alt = 'Logo de ' + h.banda; i.loading = 'lazy'; i.referrerPolicy = 'no-referrer'; cab.appendChild(i); }
      var t = el('div'); t.appendChild(el('h3', '', h.banda)); if (h.genero) t.appendChild(el('span', 'chip-genero', h.genero)); cab.appendChild(t); k.appendChild(cab);
      if (h.formacion) { var fo = el('p', 'nota'); fo.appendChild(document.createTextNode('Formación: ')); fo.appendChild(el('strong', '', h.formacion)); k.appendChild(fo); }
      k.appendChild(el('p', '', h.resena));
      var r = el('p', 'redes');
      [[h.instagram], [h.enlace], [/^https:\/\/(?:www\.)?youtube\.com\/channel|\/@/.test(h.youtube || '') ? h.youtube : '']].forEach(function (x) { if (/^https:\/\//.test(x[0])) { var a = el('a', 'chip-red', etiq(x[0])); a.href = x[0]; a.target = '_blank'; a.rel = 'noopener nofollow'; r.appendChild(a); } });
      if (r.firstChild) k.appendChild(r);
      var m = /v=([\w-]{11})$/.exec(h.youtube || '');
      if (m) { var d = el('div', 'muestra'), b = el('button', 'btn chico', '▶ Ver video'); b.type = 'button';
        b.addEventListener('click', function () { d.replaceChild(marco('https://www.youtube-nocookie.com/embed/' + m[1], 'yt'), b); }); d.appendChild(b); k.appendChild(d); }
      $('honor').appendChild(k);
    });
    if (!c.honor.length) $('honor').appendChild(el('p', 'nota', 'Pronto verás aquí a las bandas que han pasado por el estudio. ¡Sé la primera!'));

    $('opiniones').hidden = !K.verEvaluaciones;
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
      btn.disabled = true;
      (archivo ? logoB64(archivo) : Promise.resolve('')).then(function (b64) {
        if (b64) datos.logoB64 = b64;
        return RK.pedir(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) });
      })
        .then(function (d) { if (d.ok) { ok.textContent = d.mensaje; ok.hidden = false; f.reset(); } else { err.textContent = d.error || 'No se pudo enviar.'; err.hidden = false; } })
        .catch(function (e) { err.textContent = e && e.message && /logo|imagen|PNG/.test(e.message) ? e.message : 'No pudimos enviar el formulario. Escríbenos por WhatsApp.'; err.hidden = false; })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ---------- arranque ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var cot = $('f-cot');
    if (!API) { // sin servidor: la cotización va por WhatsApp y las secciones dinámicas no se muestran
      cot.addEventListener('submit', function (ev) {
        ev.preventDefault(); var d = new FormData(cot), t = cot.querySelector('select').selectedOptions[0].textContent;
        var u = RK.wsp('Hola, quiero cotizar: ' + t + '.\nNombre: ' + d.get('nombre') + '\n' + d.get('mensaje')); window.open(u, '_blank', 'noopener');
      });
      return;
    }
    enviar('f-cot', 'cotizacion'); enviar('f-honor', 'honor'); enviar('f-resena', 'resena');
    RK.listo.then(function () { return RK.pedir(API + '?accion=contenido'); }).then(function (d) { if (d.ok) pintar(d.contenido); }).catch(function () { /* sin contenido dinámico */ });
  });
})();
