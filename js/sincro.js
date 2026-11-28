/* Sincronía: si alguien reserva o cambia algo (desde otro celular, el Mac del estudio o la web), esta página se actualiza sola.
   Pregunta solo una versión (liviana) cada 30 s con la página a la vista, y al volver a ella. Nunca actualiza mientras se escribe. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', ult = null, fns = [], ocupado = false, ultAct = 0;
  if (!API || !window.fetch) { window.RKSync = { alCambiar: function () {} }; return; }
  ['input', 'keydown', 'pointerdown', 'touchstart'].forEach(function (e) { document.addEventListener(e, function () { ultAct = Date.now(); }, true); });
  function escribiendo() {
    var a = document.activeElement;
    if (a && /^(input|textarea|select)$/i.test(a.tagName) && !/^(checkbox|radio|button|submit)$/i.test(a.type || '')) return true;
    return Date.now() - ultAct < 6000; /* tocó algo hace instantes: no le movemos la pantalla */
  }
  function revisar() {
    if (document.hidden || ocupado || !fns.length) return; ocupado = true;
    fetch(API + '?accion=version', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      ocupado = false; if (!d || !d.ok) return;
      if (ult === null) { ult = d.v; return; }
      if (d.v === ult) return;
      if (escribiendo()) return; /* queda pendiente: se reintenta en la próxima vuelta */
      ult = d.v; fns.forEach(function (f) { try { f(); } catch (e) { /* una página no debe romper a otra */ } });
    }).catch(function () { ocupado = false; });
  }
  window.RKSync = { alCambiar: function (f) { fns.push(f); if (fns.length === 1) { setTimeout(revisar, 2500); setInterval(revisar, 30000); } } };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) revisar(); });
  window.addEventListener('focus', revisar);
})();
