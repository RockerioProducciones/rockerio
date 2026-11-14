/* Disponibilidad pública en calendario: días coloreados, detalle de horas al tocar, sin datos de clientes. */
const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8097, g);
  const b = await chromium.launch(); let fallas = 0; const chk = (c, m) => { if (!c) fallas++; console.log((c ? '  ok  ' : 'FALLA ') + m); };
  for (const [nom, vp] of [['movil', { width: 390, height: 844 }], ['pc', { width: 1280, height: 900 }]]) {
    const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8097/disponibilidad.html'); await p.waitForSelector('.dp-cal', { timeout: 8000 });
    const n = await p.locator('.dp-d:not(.fuera)').count(); chk(n >= 14, nom + ': calendario con ' + n + ' días');
    chk(await p.locator('.dp-det .dp-h').count() > 0, nom + ': muestra las horas del día elegido');
    const libre = p.locator('.dp-d.libre, .dp-d.poco').nth(1); if (await libre.count()) { await libre.click(); chk(await libre.getAttribute('aria-pressed') === 'true', nom + ': tocar un día lo selecciona'); }
    chk(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), nom + ': sin desborde horizontal');
    chk(errs.length === 0, nom + ': sin errores JS ' + errs.join('|'));
    await p.screenshot({ path: '/tmp/disp-' + nom + '.png', fullPage: true });
  }
  await b.close(); srv.close(); process.exit(fallas ? 1 : 0);
})();
