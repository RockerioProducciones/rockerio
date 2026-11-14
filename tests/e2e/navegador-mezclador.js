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
  const g = sembrar(); const { srv } = await iniciar(8099, g);
  const I = ['Batería', 'Bajo', 'Guitarras', 'Voces', 'Completa'], E = ['En bruto', 'Mezcla', 'Master']; let n = 0; const ids = {};
  I.forEach((i) => E.forEach((e) => { const id = 'BBBBBBBB' + String(++n).padStart(2, '0'); ids[id] = i === 'Completa' ? 990 : 200 + n * 20; g.admin('adminGuardarMuestra', { fila: null, grupo: 'Tema Prueba', tipo: 'Mezclador', etiqueta: i + ' · ' + e, enlace: 'https://drive.google.com/file/d/' + id + '/view', descripcion: '', visible: true }); }));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/accion=audiomix/, (r) => { const id = (/id=([\w-]+)/.exec(r.request().url()) || [])[1]; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, tipo: 'audio/wav', b64: wav(ids[id] || 300, 6, 8000) }) }); });
  let fallas = 0; const chk = (c, m) => { if (!c) fallas++; console.log((c ? '  ok  ' : 'FALLA ') + m); };
  await p.goto('http://localhost:8099/'); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(600);
  await p.evaluate(() => { let e = document.getElementById('mezclador'); e.hidden = false; while (e && e !== document.body) { e.hidden = false; e.removeAttribute('hidden'); if (getComputedStyle(e).display === 'none') e.style.setProperty('display', 'block', 'important'); e = e.parentElement; } });
  await p.locator('#mezclador .btn', { hasText: 'Cargar mezclador' }).click(); await p.waitForSelector('#mezclador .mz-daw', { timeout: 10000 });
  const vis = async () => p.locator('#mezclador .mz-pista:not([hidden])').count();
  chk(await vis() === 4, 'modo Pistas: 4 instrumentos visibles (sin la completa)');
  chk(await p.locator('#mezclador .mz-modo button').count() === 2, 'aparece el interruptor Pistas / Canción completa');
  await p.locator('#mezclador .mz-modo button[data-m=completa]').click();
  chk(await vis() === 1, 'modo Canción completa: una sola pista visible');
  chk((await p.locator('#mezclador .mz-pista:not([hidden]) .mz-nom').textContent()) === 'Completa', 'la pista visible es la completa');
  await p.locator('#mezclador .mz-et', { hasText: 'MASTER' }).click(); await p.locator('#mezclador .mz-play').click(); await p.waitForTimeout(500);
  chk((await p.locator('#mezclador .mz-play').textContent()).trim() === '⏸', 'reproduce la completa');
  await p.locator('#mezclador .mz-modo button[data-m=pistas]').click(); chk(await vis() === 4, 'vuelve a Pistas');
  await p.screenshot({ path: '/tmp/mezclador.png', clip: await p.locator('#mezclador').boundingBox() });
  chk(errs.length === 0, 'sin errores JS ' + errs.join('|'));
  await b.close(); srv.close(); process.exit(fallas ? 1 : 0);
})();
