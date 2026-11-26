/* Rockerío en vivo: invisible mientras está apagado; al activarlo aparece en Reservar y en Disponibilidad con su bloque fijo. */
const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8098, g);
  const b = await chromium.launch(); let fallas = 0; const chk = (c, m) => { if (!c) fallas++; console.log((c ? '  ok  ' : 'FALLA ') + m); };
  const U = 'http://localhost:8098/';
  const abrir = async (ruta, vp) => { const p = await (await b.newContext({ viewport: vp || { width: 390, height: 844 } })).newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(U + ruta); return p; };
  /* apagado */
  let p = await abrir('index.html#reservar'); await p.waitForSelector('#paso-servicio'); await p.waitForTimeout(1500);
  chk(!(await p.locator('#op-vivo').isVisible()), 'apagado: Reservar no ofrece Rockerío en vivo');
  p = await abrir('disponibilidad.html'); await p.waitForSelector('.dp-cal');
  chk(await p.locator('.dp-sv', { hasText: 'en vivo' }).count() === 0, 'apagado: Disponibilidad tampoco');
  /* encendido */
  g.admin('adminGuardarAjustes', { verVivo: 'SI' });
  p = await abrir('index.html#reservar'); await p.waitForSelector('#paso-servicio'); await p.waitForTimeout(2000);
  chk(await p.locator('#op-vivo').isVisible(), 'encendido: Reservar ofrece Rockerío en vivo');
  chk(/100\.000/.test(await p.locator('#p-vivo').innerText()), 'muestra la tarifa configurada ($100.000)');
  await p.locator('#op-vivo').click(); await p.waitForTimeout(600);
  chk((await p.locator('#horas-btns .hbtn').count()) === 1 && /4/.test(await p.locator('#horas-btns').innerText()), 'una sola duración: el bloque fijo de 4 horas');
  chk(/19:00 a 23:00|7:00 PM/.test(await p.locator('#aviso-incl').innerText()) || /19:00/.test(await p.locator('#aviso-incl').innerText()), 'explica el bloque 19:00 a 23:00');
  chk(await p.locator('#adicionales').isHidden(), 'sin arriendos ni video para el show');
  const dias = await p.locator('#cal .dia.libre, #cal button:not([disabled]), #cal [data-f]:not(.cerrado):not(.lleno)').count();
  chk(dias > 0, 'el calendario deja elegir días de show (' + dias + ')');
  chk(p.errs.length === 0, 'sin errores JS ' + p.errs.join('|'));
  /* disponibilidad */
  p = await abrir('disponibilidad.html'); await p.waitForSelector('.dp-cal');
  chk(await p.locator('.dp-sv', { hasText: 'en vivo' }).count() === 1, 'encendido: Disponibilidad muestra la opción');
  await p.locator('.dp-sv', { hasText: 'en vivo' }).click(); await p.waitForTimeout(400);
  const hs = await p.locator('.dp-b').allInnerTexts();
  chk(hs.length > 0 && hs.every((t) => /19:00 a 23:00/.test(t)), 'solo ofrece el bloque 19:00 a 23:00 (' + hs.length + ' días)');
  chk(/s=vivo/.test(await p.locator('.dp-b').first().getAttribute('href')), 'el enlace lleva s=vivo');
  chk(p.errs.length === 0, 'Disponibilidad sin errores JS ' + p.errs.join('|'));
  await b.close(); srv.close(); console.log(fallas ? fallas + ' con falla' : 'todo bien'); process.exit(fallas ? 1 : 0);
})();
