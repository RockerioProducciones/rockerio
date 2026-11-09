/* Navegación por tarjetas: el inicio muestra un menú y cada tarjeta abre UNA sección (con botón «Inicio»).
   Sin JavaScript, el sitio se ve como una sola página larga. Usa el # de la dirección, así funcionan Atrás y los enlaces. */
(function () {
  'use strict';
  var body = document.body; body.classList.add('con-vistas');
  var secs = [].slice.call(document.querySelectorAll('main > section.sec'));
  function porId(id) { for (var i = 0; i < secs.length; i++) if (secs[i].id === id) return secs[i]; return null; }
  var primera = true;

  function mostrar() {
    var id = decodeURIComponent((location.hash || '').slice(1)), s = id && porId(id);
    if (!s || s.hidden) { id = 'inicio'; s = null; }
    body.setAttribute('data-vista', id);
    secs.forEach(function (x) { x.classList.toggle('activa', x === s); });
    [].forEach.call(document.querySelectorAll('.tarjeta[data-vista]'), function (a) { if (a.getAttribute('data-vista') === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var barra = document.getElementById('vista-barra'); barra.hidden = !s;
    if (s) { var h = s.querySelector('h2'); document.getElementById('vista-titulo').textContent = h ? h.textContent : ''; }
    if (!primera) window.scrollTo(0, 0);
    primera = false;
  }
  function tarjetas() {
    [].forEach.call(document.querySelectorAll('.tarjeta[data-vista], .honor-banda[data-vista]'), function (a) { var s = porId(a.getAttribute('data-vista')); a.hidden = !s || s.hidden; });
  }
  var mo = new MutationObserver(function () { tarjetas(); mostrar(); });
  secs.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['hidden'] }); });
  window.addEventListener('hashchange', mostrar);
  tarjetas(); mostrar();
})();
