/* Comparador Raw / Mix / Master: las 3 versiones suenan sincronizadas y al tocar una tarjeta solo cambia cuál se escucha. */
const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
function wav(freq, seg, rate) { // WAV mono 16 bits en base64
  const n = Math.floor(seg * rate), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * freq * i / rate) * 12000), 44 + i * 2);
  return b.toString('base64');
}
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8098, g);
  [['En bruto', 'AAAAAAAAAA1'], ['Mezclada', 'AAAAAAAAAA2'], ['Masterizada', 'AAAAAAAAAA3']].forEach((x) => g.admin('adminGuardarMuestra', { fila: null, grupo: 'Cancion Prueba', tipo: 'Comparador', etiqueta: x[0], enlace: 'https://drive.google.com/file/d/' + x[1] + '/view', descripcion: '', visible: true }));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const peds = [];
  await p.route(/accion=audiomix/, (r) => { const id = (/id=([\w-]+)/.exec(r.request().url()) || [])[1]; peds.push(id); const f = { AAAAAAAAAA1: 220, AAAAAAAAAA2: 440, AAAAAAAAAA3: 880 }[id] || 330; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, tipo: 'audio/wav', b64: wav(f, 6, 8000) }) }); });
  const ok = (c, n) => console.log((c ? '  ok  ' : 'FALLA ') + n); let fallas = 0; const chk = (c, n) => { if (!c) fallas++; ok(c, n); };
  await p.goto('http://localhost:8098/'); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(600);
  await p.evaluate(() => { const c = document.getElementById('comparador'); c.hidden = false; let e = c; while (e && e !== document.body) { e.hidden = false; e.removeAttribute('hidden'); if (getComputedStyle(e).display === 'none') e.style.setProperty('display', 'block', 'important'); e = e.parentElement; } });
  chk(await p.locator('#comparador .comp-et').count() === 3, 'el comparador muestra las 3 tarjetas');
  await p.locator('#comparador .comp-et').nth(0).click(); await p.waitForSelector('#comparador .comp-ctl', { timeout: 8000 });
  chk(peds.length === 3, 'se cargan las 3 versiones: ' + peds.join(','));
  chk((await p.locator('#comparador .comp-ctl .mz-play').textContent()).trim() === '⏸', 'suena de inmediato al tocar RAW');
  await p.waitForTimeout(1200);
  const t1 = await p.locator('#comparador .comp-tm').textContent();
  await p.locator('#comparador .comp-et').nth(1).click(); await p.waitForTimeout(150);
  const t2 = await p.locator('#comparador .comp-tm').textContent();
  const seg = (t) => { const m = /^(\d+):(\d+)/.exec(t); return Number(m[1]) * 60 + Number(m[2]); };
  chk(seg(t2) >= seg(t1) && seg(t2) <= seg(t1) + 2, 'al tocar MIX sigue en el mismo punto (' + t1 + ' → ' + t2 + ')');
  chk((await p.locator('#comparador .comp-ctl .mz-play').textContent()).trim() === '⏸', 'sigue sonando al cambiar de versión');
  chk(await p.locator('#comparador .comp-et').nth(1).getAttribute('aria-pressed') === 'true' && await p.locator('#comparador .comp-et').nth(0).getAttribute('aria-pressed') === 'false', 'la tarjeta activa cambia');
  chk(peds.length === 3, 'cambiar de versión no vuelve a descargar nada');
  await p.locator('#comparador .comp-ctl .mz-play').click(); chk((await p.locator('#comparador .comp-ctl .mz-play').textContent()).trim() === '▶', 'se puede pausar');
  await p.locator('#comparador .comp-et').nth(2).click(); await p.waitForTimeout(150); chk((await p.locator('#comparador .comp-ctl .mz-play').textContent()).trim() === '⏸', 'tocar una tarjeta con pausa reanuda la reproducción');
  await p.screenshot({ path: '/tmp/comparador.png', clip: await p.locator('#comparador').boundingBox() });
  chk(errs.length === 0, 'sin errores JS ' + errs.join('|'));
  await b.close(); srv.close(); process.exit(fallas ? 1 : 0);
})();
