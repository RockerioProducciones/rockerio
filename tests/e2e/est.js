const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8097, g);
  const b = await chromium.launch(); const vw = process.argv[2] === 'm' ? { width: 390, height: 844 } : { width: 1280, height: 900 };
  const ctx = await b.newContext({ viewport: vw, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('rk_tema', 'carbon'); } catch (e) {} });
  await p.goto('http://localhost:8097/'); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(600);
  const pre = process.argv[2] === 'm' ? 'em-' : 'ed-';
  await p.screenshot({ path: pre + '1-home.png' });
  await p.click('.tarjeta.principal'); await p.waitForTimeout(400); await p.screenshot({ path: pre + '2-paso1.png' });
  await p.click('#wiz-sig'); await p.waitForTimeout(400);
  const f = g.admin('adminResumen').reservas[0].fecha, dn = String(Number(f.slice(8)));
  await p.locator('.cal-dia:not(:disabled)', { hasText: new RegExp('^' + dn + '(?!\\d)') }).first().click(); await p.waitForTimeout(500); await p.screenshot({ path: pre + '3-horas.png' });
  for (const v of ['nosotros','proaudix','galeria','bandas']) { await p.goto('http://localhost:8097/#' + v); await p.waitForTimeout(500); await p.screenshot({ path: pre + v + '.png' }); }
  await b.close(); srv.close(); process.exit(0);
})();
