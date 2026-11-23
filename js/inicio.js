/* Inicio más directo: (1) los precios de la portada llevan a reservar con el servicio ya elegido;
   (2) en celular, barra inferior fija tipo app con las secciones principales y «Más». No cambia datos ni reglas. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* 1 · Atajo: tocar «Ensayo $…» o «Estudio $…» abre la reserva con ese servicio y pasa al día */
  function atajo(valor) {
    var r = document.querySelector('input[name="servicio"][value="' + valor + '"]');
    if (!r) { location.hash = '#reservar'; return; }
    location.hash = '#reservar';
    setTimeout(function () {
      r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
      var s = $('paso-servicio'), sig = $('wiz-sig');
      if (s && sig && s.offsetParent !== null) sig.click();
    }, 180);
  }
  [['chip-ensayo', 'ensayo'], ['chip-estudio', 'grabacion']].forEach(function (x) {
    var e = $(x[0]); if (!e) return;
    e.setAttribute('role', 'button'); e.tabIndex = 0; e.style.cursor = 'pointer';
    e.addEventListener('click', function () { atajo(x[1]); });
    e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); atajo(x[1]); } });
  });

  /* 2 · Barra inferior (solo celular; el CSS la oculta en pantallas grandes) */
  var PRINCIPALES = [['reservar', '📅', 'Reservar'], ['nosotros', '🎚️', 'Producción'], ['planes', '🏷️', 'Planes'], ['tienda', '🛍️', 'Tienda']];
  var bar = document.createElement('nav'); bar.id = 'barra-app'; bar.setAttribute('aria-label', 'Secciones principales');
  PRINCIPALES.forEach(function (p) {
    var a = document.createElement('a'); a.href = '#' + p[0]; a.setAttribute('data-bar', p[0]);
    var i = document.createElement('i'); i.textContent = p[1]; a.appendChild(i); a.appendChild(document.createTextNode(p[2])); bar.appendChild(a);
  });
  var mas = document.createElement('button'); mas.type = 'button'; mas.setAttribute('aria-haspopup', 'dialog');
  var im = document.createElement('i'); im.textContent = '☰'; mas.appendChild(im); mas.appendChild(document.createTextNode('Más')); bar.appendChild(mas);
  document.body.appendChild(bar);

  var hoja = document.createElement('div'); hoja.id = 'barra-mas'; hoja.hidden = true; hoja.setAttribute('role', 'dialog'); hoja.setAttribute('aria-label', 'Más secciones');
  var cuerpo = document.createElement('div'); cuerpo.className = 'bm-in'; hoja.appendChild(cuerpo); document.body.appendChild(hoja);
  function cerrar() { hoja.hidden = true; mas.setAttribute('aria-expanded', 'false'); }
  function abrir() {
    cuerpo.textContent = '';
    var h = document.createElement('b'); h.textContent = 'Más secciones'; cuerpo.appendChild(h);
    var ya = PRINCIPALES.map(function (p) { return p[0]; });
    [].forEach.call(document.querySelectorAll('#menu .tarjeta[data-vista]'), function (t) {
      var v = t.getAttribute('data-vista'); if (t.hidden || ya.indexOf(v) >= 0) return;
      var a = document.createElement('a'); a.href = '#' + v;
      var ic = document.createElement('i'); ic.textContent = t.getAttribute('data-ico') || '•'; a.appendChild(ic);
      var tx = t.querySelector('b'); a.appendChild(document.createTextNode(tx ? tx.textContent : v));
      a.addEventListener('click', cerrar); cuerpo.appendChild(a);
    });
    hoja.hidden = false; mas.setAttribute('aria-expanded', 'true');
  }
  mas.addEventListener('click', function () { hoja.hidden ? abrir() : cerrar(); });
  hoja.addEventListener('click', function (e) { if (e.target === hoja) cerrar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  window.addEventListener('hashchange', cerrar);

  /* sección activa resaltada; y la barra se esconde mientras se escribe (para no tapar el teclado) */
  function activa() {
    var v = document.body.getAttribute('data-vista') || 'inicio';
    [].forEach.call(bar.querySelectorAll('a'), function (a) { if (a.getAttribute('data-bar') === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  new MutationObserver(activa).observe(document.body, { attributes: true, attributeFilter: ['data-vista'] }); activa();
  document.addEventListener('focusin', function (e) { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'radio' && e.target.type !== 'checkbox') document.body.classList.add('escribiendo'); });
  document.addEventListener('focusout', function () { document.body.classList.remove('escribiendo'); });

  /* 3 · «Reservar de nuevo»: los datos de contacto se recuerdan SOLO en el dispositivo del cliente (no se envían a ningún lado) */
  (function () {
    var CAMPOS = ['banda', 'nombre', 'telefono', 'correo'], K = 'rk-datos', form = $('form'); if (!form) return;
    function leer() { try { var d = JSON.parse(localStorage.getItem(K) || 'null'); return d && typeof d === 'object' ? d : null; } catch (e) { return null; } }
    function poner(id, v) { var e = $(id); if (!e || typeof v !== 'string' || !v) return; e.value = v.slice(0, 80); e.dispatchEvent(new Event('input', { bubbles: true })); }
    var d = leer();
    if (d) {
      CAMPOS.forEach(function (c) { var e = $(c); if (e && (!e.value || /^\+569\s*$/.test(e.value))) poner(c, d[c]); });
      var aviso = document.createElement('p'); aviso.className = 'datos-guardados'; aviso.style.cssText = 'font-size:.78rem;color:#a8a39a;margin:.4rem 0 0';
      aviso.appendChild(document.createTextNode('Usamos los datos de tu última reserva en este dispositivo. '));
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Borrar'; b.style.cssText = 'background:none;border:0;color:var(--oro,#f5b82e);text-decoration:underline;padding:0;font:inherit;cursor:pointer';
      b.addEventListener('click', function () { try { localStorage.removeItem(K); } catch (e) { /* nada */ } CAMPOS.forEach(function (c) { var e = $(c); if (e) { e.value = c === 'telefono' ? '+569 ' : ''; e.dispatchEvent(new Event('input', { bubbles: true })); } }); aviso.remove(); });
      aviso.appendChild(b); var fs = $('paso-datos'); if (fs) fs.appendChild(aviso);
    }
    form.addEventListener('submit', function () {
      var o = {}; CAMPOS.forEach(function (c) { var e = $(c); if (e && e.value) o[c] = e.value; });
      if (o.banda && o.nombre && o.telefono && o.correo) { try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } }
    }, true);
  })();
})();
