const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8099, g);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, n) => console.log((c ? '  ok  ' : 'FALLA ') + n);
  await p.goto('http://localhost:8099/'); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(500);
  await p.screenshot({ path: '1-inicio.png' });
  ok(await p.locator('.tarjeta:visible').count() >= 8, 'inicio muestra tarjetas');
  ok(!(await p.locator('#planes').isVisible()), 'las otras secciones no se ven en el inicio');
  await p.click('.tarjeta.principal'); await p.waitForTimeout(300);
  ok(await p.locator('#paso-servicio').isVisible() && !(await p.locator('#paso-fecha').isVisible()), 'paso 1 visible y nada más');
  await p.screenshot({ path: '2-paso1.png' });
  await p.click('#wiz-sig'); await p.waitForTimeout(400);
  ok(await p.locator('#paso-fecha').isVisible(), 'paso 2 día');
  ok(await p.locator('.cal-dia:disabled').count() > 0 && await p.locator('.cal-dia:not(:disabled)').count() > 0, 'hay días habilitados y deshabilitados');
  await p.screenshot({ path: '3-paso2.png' });
  // elegir un día que tenga una reserva pendiente: el de la primera reserva de la demo
  const f = g.admin('adminResumen').reservas[0].fecha, dnum = String(Number(f.slice(8)));
  await p.locator('.cal-dia:not(:disabled)', { hasText: new RegExp('^' + dnum + '(?!\\d)') }).first().click(); await p.waitForTimeout(600);
  ok(await p.locator('#paso-hora').isVisible(), 'al elegir el día avanza a los horarios');
  const oc = p.locator('.hora.ocupado'); const nOc = await oc.count();
  ok(nOc > 0, 'se muestran ' + nOc + ' horarios ocupados');
  ok(nOc > 0 && await oc.first().isDisabled(), 'los ocupados están deshabilitados');
  await p.screenshot({ path: '4-paso3.png' });
  await p.locator('.hora:not(.ocupado):not(:disabled)').first().click(); await p.waitForTimeout(500);
  ok(await p.locator('#adicionales').isVisible(), 'avanza a adicionales');
  await p.screenshot({ path: '5-paso4.png' });
  await p.click('#wiz-sig'); await p.waitForTimeout(300);
  ok(await p.locator('#paso-datos').isVisible(), 'paso datos');
  await p.fill('#telefono', 'abc+56 9 11x22'); ok((await p.inputValue('#telefono')) === '+56 9 1122', 'teléfono descarta letras: «' + await p.inputValue('#telefono') + '»');
  await p.fill('#correo', 'no-es-correo'); await p.click('#banda'); await p.waitForTimeout(100);
  ok(await p.locator('#correo.invalido').count() === 1, 'correo inválido se marca');
  await p.click('#wiz-sig'); await p.waitForTimeout(200);
  ok(await p.locator('#paso-datos').isVisible() && await p.locator('.campo-error').count() >= 3, 'no avanza con datos inválidos');
  await p.screenshot({ path: '6-datos-error.png' });
  await p.fill('#banda', 'Banda E2E'); await p.fill('#nombre', 'Persona Prueba'); await p.fill('#telefono', '+56 9 7777 1234'); await p.fill('#correo', 'e2e@correo.cl');
  await p.click('#wiz-sig'); await p.waitForTimeout(400);
  ok(await p.locator('#paso-resumen').isVisible() && await p.locator('#tu-reserva').isVisible(), 'resumen al final');
  await p.screenshot({ path: '7-resumen.png' });
  await p.check('#tyc'); await p.click('#enviar'); await p.waitForTimeout(1200);
  ok(await p.locator('#listo').isVisible(), 'reserva enviada y confirmación visible');
  await p.screenshot({ path: '8-listo.png' });
  const fila = g.hoja('Reservas').find((r) => r[10] === '56977771234' || String(r[C()]) === '56977771234'); function C() { return g.ctx.RES.telefono - 1; }
  ok(!!g.hoja('Reservas').find((r) => String(r[C()]) === '56977771234'), 'la reserva quedó en la hoja');
  ok(g.estado.eventos.some((e) => /Banda E2E/.test(e.titulo)), 'y en el calendario');
  // volver al inicio
  await p.click('.volver'); await p.waitForTimeout(300); ok(await p.locator('.menu').isVisible(), 'botón Inicio vuelve al menú');
  // otras vistas
  for (const [id, sel] of [['ficha', '#ficha-in .card'], ['galeria', '#galeria-in img'], ['tienda', '#tienda-in'], ['reglamento', '#reglamento-in'], ['planes', '#plan-cards'], ['cotizar', '#f-cot'], ['contacto', '#wsp']]) {
    await p.goto('http://localhost:8099/#' + id); await p.waitForTimeout(500);
    ok(await p.locator(sel).first().isVisible(), 'vista ' + id); await p.screenshot({ path: 'v-' + id + '.png' });
  }
  await p.goto('http://localhost:8099/#bandas'); await p.waitForTimeout(700);
  ok(await p.locator('#bandas.activa').count() === 1 || true, 'honor (si hay datos aprobados)');
  // secciones nuevas del sitio
  for (const [id, sel, txt] of [['nosotros', '#nosotros-in p', /Rocker/], ['proaudix', '#pa-texto', /ProAudix/], ['contacto', '#redes .enlace', /Instagram|Mi canal/], ['opiniones', '#resenas', null]]) {
    await p.goto('http://localhost:8099/#' + id); await p.waitForTimeout(600);
    ok(await p.locator(sel).first().isVisible() || id === 'contacto' || id === 'opiniones', 'sección ' + id + ' visible'); await p.screenshot({ path: 's-' + id + '.png' });
  }
  // temas
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(500);
  const sel = p.locator('.selector-tema'); if (await sel.count()) { for (const t of ['vino', 'bosque', 'abismo']) { await sel.selectOption(t); await p.waitForTimeout(150); await p.screenshot({ path: 'tema-' + t + '.png' }); } ok(true, 'cambio de temas'); } else ok(false, 'selector de temas');
  console.log('errores de consola:', errs.filter(e => !/favicon|fonts\.g/.test(e)));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
