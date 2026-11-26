/* El tema elegido por la persona debe mantenerse aunque lo elija antes de que cargue la configuración del portal. */
const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8095, g); const b = await chromium.launch(); let fallas = 0;
  const ok = (c, n) => { console.log((c ? '  ok  ' : 'FALLA ') + n); if (!c) fallas++; };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  await p.route(/accion=config/, async (r) => { await new Promise((x) => setTimeout(x, 2500)); r.continue(); });
  await p.goto('http://localhost:8095/'); await p.waitForTimeout(500);
  await p.locator('.tema-dot[data-t=rojo]').click();
  await p.waitForFunction(() => window.RK && window.RK.conectado(), null, { timeout: 15000 }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => document.documentElement.dataset.tema) === 'rojo', 'elegido antes de cargar la configuración: se mantiene');
  await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado(), null, { timeout: 15000 }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.documentElement.dataset.tema) === 'rojo', 'al recargar sigue el tema elegido');
  await p.evaluate(() => localStorage.setItem('rk_tema', 'vino|rockerio')); await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado(), null, { timeout: 15000 }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.documentElement.dataset.tema) === 'rojo', 'un tema antiguo (vino) se convierte solo en rojo');
  await p.locator('.tema-dot[data-t=verde]').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.dataset.tema) === 'verde', 'cambiar de nuevo funciona');
  await b.close(); srv.close(); process.exit(fallas ? 1 : 0);
})();
