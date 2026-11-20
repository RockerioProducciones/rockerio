/* Medidores LED estéreo (VU) de la portada: dos canales con picos que caen, estilo consola. */
(function () {
  var c = document.querySelector('.hero-vu'); if (!c || !c.getContext) return;
  var g = c.getContext('2d'), W = c.width, H = c.height, N = 32, reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var niv = [0.5, 0.5], pico = [0, 0], tpico = [0, 0], obj = [0.5, 0.5], t0 = 0, vivo = true, ult = 0;
  function col(i) { var f = i / (N - 1); return f < .66 ? '#3ddc6b' : f < .86 ? '#f5b82e' : '#ef4444'; }
  function dibuja() {
    g.clearRect(0, 0, W, H);
    var seg = (W - (N - 1) * 3) / N, h = (H - 8) / 2;
    for (var ch = 0; ch < 2; ch++) {
      var y = ch * (h + 8), on = Math.round(niv[ch] * N), pk = Math.min(N - 1, Math.round(pico[ch] * N));
      for (var i = 0; i < N; i++) {
        var x = i * (seg + 3), enc = i < on || i === pk;
        g.globalAlpha = enc ? 1 : .13; g.fillStyle = col(i);
        if (enc) { g.shadowColor = col(i); g.shadowBlur = 8; } else g.shadowBlur = 0;
        g.fillRect(x, y, seg, h);
      }
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
  }
  function paso(ts) {
    if (!vivo) return; requestAnimationFrame(paso);
    var dt = Math.min(.05, (ts - (ult || ts)) / 1000); ult = ts;
    t0 += dt; var pulso = Math.pow(Math.max(0, Math.sin(t0 * 7.2)), 3) * .28; // «bombo» a ~137 bpm
    for (var ch = 0; ch < 2; ch++) {
      if (Math.random() < dt * 14) obj[ch] = .35 + Math.random() * .5; // golpes nuevos
      var meta = Math.min(1, obj[ch] * .8 + pulso + (ch ? .02 : 0));
      niv[ch] += (meta - niv[ch]) * Math.min(1, dt * (meta > niv[ch] ? 22 : 7)); // sube rápido, baja lento
      if (niv[ch] >= pico[ch]) { pico[ch] = niv[ch]; tpico[ch] = 0; } else { tpico[ch] += dt; if (tpico[ch] > .6) pico[ch] = Math.max(niv[ch], pico[ch] - dt * .5); }
    }
    dibuja();
  }
  if (reduce) { niv = [.7, .62]; pico = [.8, .74]; dibuja(); return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !vivo) { vivo = true; ult = 0; requestAnimationFrame(paso); } else if (!v) vivo = false; }).observe(c);
  document.addEventListener('visibilitychange', function () { if (document.hidden) vivo = false; else if (!vivo) { vivo = true; ult = 0; requestAnimationFrame(paso); } });
  requestAnimationFrame(paso);
})();
