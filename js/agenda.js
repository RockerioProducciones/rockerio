/* Agenda pública de solo lectura: muestra horas libres y ocupadas. Nunca muestra nombres ni datos de nadie. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', R = window.Reglas, cont = document.getElementById('dias');
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function msg(t) { cont.textContent = ''; cont.appendChild(el('p', 'sub', t)); }
  if (!API) return msg('La agenda aún no está conectada.');
  fetch(API + '?accion=agenda').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) return msg('No pudimos cargar la agenda. Intenta de nuevo.');
    cont.textContent = '';
    Object.keys(d.dias).sort().forEach(function (f) {
      var x = d.dias[f], libres = {}; x.libres.forEach(function (h) { libres[h] = true; });
      var caja = el('div', 'dia'); caja.appendChild(el('h3', '', R.fechaLarga(f)));
      if (!x.abiertas.length) caja.appendChild(el('span', 'sub', 'Cerrado'));
      else { var hs = el('div', 'hs'); x.abiertas.forEach(function (h) { hs.appendChild(el('span', 'h ' + (libres[h] ? 'libre' : 'ocupada'), R.horaTxt(h))); }); caja.appendChild(hs); }
      cont.appendChild(caja);
    });
  }).catch(function () { msg('No pudimos cargar la agenda. Intenta de nuevo.'); });
})();
