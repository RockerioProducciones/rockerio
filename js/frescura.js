/* Frescura: si publicamos una versión nueva, el celular que tenía una copia guardada se recarga solo (sin perder lo que la persona esté escribiendo). */
(function () {
  function ver(t) { var m = /\.js\?v=(\d+)/.exec(t || ''); return m ? m[1] : ''; }
  var s = document.querySelector('script[src*=".js?v="]'), mia = s ? ver(s.getAttribute('src')) : '', oculto = 0;
  if (!mia || !window.fetch) return;
  function escribiendo() { var r = false; Array.prototype.forEach.call(document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea'), function (e) { var v = String(e.value || '').trim(); if (e.type === 'tel' ? v.replace(/\D/g, '').length > 3 : (v.length > 1 && e.type !== 'range')) r = true; /* el teléfono viene con +569 de inicio */ }); return r; }
  function revisar() {
    fetch(location.pathname, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var nueva = ver(t); if (!nueva || nueva === mia) return;
      var g = ''; try { g = sessionStorage.getItem('rk_fresco') || ''; } catch (e) { g = ''; }
      if (g === nueva || escribiendo()) return; /* una sola vez por versión, y nunca mientras escriben */
      try { sessionStorage.setItem('rk_fresco', nueva); } catch (e) { /* sin almacenamiento: igual recarga una vez */ }
      location.reload();
    }).catch(function () { /* sin red: no pasa nada */ });
  }
  setTimeout(revisar, 1200);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { oculto = Date.now(); return; }
    if (oculto && Date.now() - oculto > 5 * 60 * 1000) revisar();
  });
})();
