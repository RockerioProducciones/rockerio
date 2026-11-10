/* Móvil: al escribir, el teclado no debe tapar el campo ni dejar barras fijas robando espacio. */
(function () {
  var de = document.documentElement, activo = null, t = 0;
  var esCampo = function (e) { return e && /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !/^(checkbox|radio|button|submit|range|file)$/.test(e.type || ''); };
  var tactil = function () { try { return matchMedia('(pointer:coarse)').matches || innerWidth < 800; } catch (x) { return innerWidth < 800; } };
  function mostrar(el) {
    if (!el || !el.scrollIntoView) return;
    var vv = window.visualViewport, alto = vv ? vv.height : innerHeight, r = el.getBoundingClientRect();
    var top = vv ? vv.offsetTop : 0;
    if (r.top < top + 70 || r.bottom > top + alto - 20) { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { el.scrollIntoView(); } }
  }
  function tarde(el) { clearTimeout(t); t = setTimeout(function () { if (activo === el) mostrar(el); }, 320); }
  document.addEventListener('focusin', function (e) {
    if (!esCampo(e.target) || !tactil()) return;
    activo = e.target; de.classList.add('teclado'); tarde(activo);
  });
  document.addEventListener('focusout', function () {
    clearTimeout(t);
    setTimeout(function () { if (!esCampo(document.activeElement)) { activo = null; de.classList.remove('teclado'); } }, 150);
  });
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', function () { if (activo) tarde(activo); });
  }
})();
