/* Conteo anónimo de visitas: una vez por visita envía ciudad/región aproximadas, sección, dispositivo y origen.
   No guarda IP, nombres ni cookies. Se desactiva en Configuración («Contar visitas al sitio») o con «No rastrear» del navegador.
   Para que tus propias visitas no cuenten, abre una vez el sitio con ?sinconteo=1 en cada dispositivo. */
(function () {
  'use strict';
  try {
    var q = /[?&]sinconteo=([01])/.exec(location.search);
    if (q) {
      if (q[1] === '1') localStorage.setItem('rk_sinconteo', '1'); else localStorage.removeItem('rk_sinconteo');
      var av = document.createElement('div'); av.setAttribute('role', 'status');
      av.textContent = q[1] === '1' ? '✔ Listo: este dispositivo ya no cuenta como visita.' : 'Este dispositivo vuelve a contarse como visita.';
      av.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;background:#111;color:#FCC631;border:1px solid #FCC631;border-radius:12px;padding:12px 16px;font:600 14px/1.3 system-ui,sans-serif;max-width:90vw;text-align:center';
      var poner = function () { document.body.appendChild(av); setTimeout(function () { av.remove(); }, 6000); };
      if (document.body) poner(); else document.addEventListener('DOMContentLoaded', poner);
    }
    if (localStorage.getItem('rk_sinconteo') === '1' || navigator.webdriver || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  } catch (e) { return; }
  var SEC = ['reservar', 'nosotros', 'ficha', 'planes', 'galeria', 'opiniones', 'proaudix', 'contacto', 'tienda', 'bandas', 'vivo', 'cotizar', 'reglamento'];
  function seccion() { var h = decodeURIComponent((location.hash || '').slice(1)); return SEC.indexOf(h) >= 0 ? h : 'inicio'; }
  function dispositivo() { var u = navigator.userAgent || ''; if (/iPad|Tablet/i.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'Tablet'; return /Mobi|Android|iPhone/i.test(u) ? 'Móvil' : 'Escritorio'; }
  function origen() {
    var r = document.referrer; if (!r) return 'Directo'; var h = ''; try { h = new URL(r).hostname.toLowerCase(); } catch (e) { return 'Otro'; }
    if (h === location.hostname) return 'Directo';
    if (/instagram\./.test(h)) return 'Instagram'; if (/facebook\.|fb\.com|fb\.me/.test(h)) return 'Facebook'; if (/google\./.test(h)) return 'Google';
    if (/whatsapp\.|wa\.me/.test(h)) return 'WhatsApp'; if (/youtube\.|youtu\.be/.test(h)) return 'YouTube'; return 'Otro';
  }
  function lugar() {
    var g = null; try { g = JSON.parse(sessionStorage.getItem('rk_lugar') || 'null'); } catch (e) { g = null; }
    if (g) return Promise.resolve(g);
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 3500);
    return fetch('https://ipwho.is/?fields=success,country,region,city', { signal: c.signal, cache: 'no-store', referrerPolicy: 'no-referrer' }).then(function (r) { return r.json(); })
      .then(function (d) { return d && d.success ? { pais: d.country || '', region: d.region || '', ciudad: d.city || '' } : null; }).catch(function () { return null; }).then(function (x) {
        if (!x) { var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; } x = { pais: /^America\/(Santiago|Punta_Arenas)$|Pacific\/Easter/.test(tz) ? 'Chile' : '', region: '', ciudad: '' }; }
        try { sessionStorage.setItem('rk_lugar', JSON.stringify(x)); } catch (e) { /* sin almacenamiento */ }
        return x;
      }).finally(function () { clearTimeout(t); });
  }
  function enviar(extra) {
    var api = window.RK && window.RK.api; if (!api) return;
    lugar().then(function (l) {
      var cuerpo = Object.assign({ accion: 'visita', pais: l.pais, region: l.region, ciudad: l.ciudad, dispositivo: dispositivo(), origen: origen() }, extra);
      try { fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), keepalive: true }).catch(function () { /* sin conexión */ }); } catch (e) { /* nada */ }
    });
  }
  var vistas = {};
  function iniciar() {
    var cfg = window.RK && window.RK.cfg && window.RK.cfg(); if (!cfg || cfg.visitasActivo === false) return;
    var nueva = true; try { nueva = localStorage.getItem('rk_vuelve') !== '1'; localStorage.setItem('rk_vuelve', '1'); } catch (e) { nueva = true; }
    var s0 = seccion(); vistas[s0] = 1; enviar({ seccion: s0, nueva: nueva });
    window.addEventListener('hashchange', function () { var s = seccion(); if (s === 'inicio' || vistas[s] || Object.keys(vistas).length > 12) return; vistas[s] = 1; enviar({ seccion: s, vista: true }); });
  }
  try { if (sessionStorage.getItem('rk_cont')) return; sessionStorage.setItem('rk_cont', '1'); } catch (e) { /* sigue */ }
  if (window.RK && window.RK.listo) window.RK.listo.then(iniciar); else window.addEventListener('load', iniciar);
})();
