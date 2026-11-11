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

/* Teléfono: el «+569 » queda fijo (no se puede borrar) y se escriben solo los 8 dígitos restantes, con formato +569 1234 5678. */
(function () {
  var PRE = '+569 ';
  function limpio(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('569') === 0) d = d.slice(3); else if (d.indexOf('56') === 0) d = d.slice(2).replace(/^9/, '');
    return d.slice(0, 8);
  }
  function formato(d) { return PRE + (d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d); }
  function arreglar(e) {
    var c = e.target || e; if (!c || c.type !== 'tel') return;
    var v = formato(limpio(c.value));
    if (c.value !== v) { c.value = v; try { c.setSelectionRange(v.length, v.length); } catch (x) { /* sin cursor */ } }
  }
  document.addEventListener('input', arreglar, true);
  document.addEventListener('focusin', function (e) { var c = e.target; if (c && c.type === 'tel' && c.value.indexOf(PRE) !== 0) arreglar(c); });
  document.addEventListener('keydown', function (e) {
    var c = e.target; if (!c || c.type !== 'tel') return;
    if ((e.key === 'Backspace' && c.selectionStart <= PRE.length && c.selectionEnd <= PRE.length) || (e.key === 'Delete' && c.selectionStart < PRE.length)) e.preventDefault();
  }, true);
  document.addEventListener('click', function (e) { var c = e.target; if (c && c.type === 'tel' && c.selectionStart < PRE.length) { try { c.setSelectionRange(c.value.length, c.value.length); } catch (x) { /* sin cursor */ } } });
})();
