const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8098, g);
  const b = await chromium.launch(); const errs = [];
  const ok = (c, n) => console.log((c ? '  ok  ' : 'FALLA ') + n);
  for (const [nombre, vw, esc] of [['pc', { width: 1100, height: 800 }, 1], ['movil', { width: 390, height: 844 }, 2]]) {
    const ctx = await b.newContext({ viewport: vw, deviceScaleFactor: esc, isMobile: nombre === 'movil' }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
    await p.goto('http://localhost:8098/admin'); await p.waitForSelector('.area'); await p.waitForTimeout(400);
    ok(await p.locator('.area').count() === 9, nombre + ': 9 tarjetas de áreas');
    ok(!(await p.locator('#sec-wa').isVisible()) && await p.locator('#sec-jor').isVisible(), nombre + ': arranca en Reservas y jornadas con la barra de pestañas');
    await p.screenshot({ path: 'a-' + nombre + '-inicio.png' });
    if (nombre === 'pc') {
      for (const [k, sel] of [['reservas', '#res'], ['solicitudes', '#sol'], ['tienda', '#sec-musica'], ['contenido', '#rgt'], ['mensajes', '#wam'], ['config', '#ajustes'], ['conta', '#sec-conta'], ['socios', '#resp']]) {
        await p.click('.area[data-p=' + k + ']'); await p.waitForTimeout(250);
        ok(await p.locator(sel).first().isVisible(), 'área ' + k + ' abre su contenido'); await p.screenshot({ path: 'a-' + k + '.png' });
      }
      // configuración: abrir grupos nuevos y guardar
      await p.click('.area[data-p=config]'); await p.waitForTimeout(200);
      const grupos = await p.locator('#ajustes summary').allTextContents(); console.log('grupos:', grupos.join(' | '));
      ok(grupos.includes('Contacto y redes') && grupos.includes('ProAudix') && grupos.includes('Portada y secciones'), 'grupos nuevos de configuración');
      await p.locator('#ajustes summary', { hasText: 'Contacto y redes' }).click();
      await p.fill('[data-clave=redInstagram]', 'https://instagram.com/rockerio'); await p.fill('[data-clave=enlacesExtra]', 'Mi canal | https://youtube.com/@rockerio');
      await p.click('#ajg'); await p.waitForTimeout(500);
      ok(g.get({ accion: 'config' }).config.redInstagram === 'https://instagram.com/rockerio', 'guardar desde el portal llega al sitio público');
      await p.fill('[data-clave=redInstagram]', 'javascript:alert(1)'); await p.click('#ajg'); await p.waitForTimeout(400);
      ok(/https/.test(await p.locator('#msg').textContent()), 'enlace inválido muestra el error en pantalla');
      await p.locator('#ajustes summary', { hasText: 'Portada y secciones' }).click(); await p.locator('#ajustes summary', { hasText: 'Portada y secciones' }).scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
      await p.screenshot({ path: 'a-config-abierta.png' });
      // WhatsApp botón por reserva
      await p.click('.area[data-p=reservas]'); await p.waitForTimeout(200);
      ok(await p.locator('#res select', { hasText: 'WhatsApp' }).count() > 0, 'selector WhatsApp por reserva');
      // ---- Reservas y jornadas ----
      await p.click('.area[data-p=jornadas]'); await p.waitForSelector('.cuad .dia'); await p.waitForTimeout(300);
      ok(await p.locator('.area').first().getAttribute('data-p') === 'jornadas', 'Reservas y jornadas es la primera tarjeta');
      ok(await p.locator('.cuad .ev:not(.bloq)').count() >= 2, 'el calendario muestra jornadas con banda y horario');
      await p.screenshot({ path: 'j-calendario.png', fullPage: true });
      await p.locator('.cuad .ev:not(.bloq)').first().click(); await p.waitForSelector('.ficha-j');
      const ft = await p.locator('.ficha-j').innerText(); ok(/WhatsApp/.test(ft) && /Saldo/.test(ft) && /@/.test(ft), 'la ficha de la jornada muestra contacto, correo y montos');
      await p.screenshot({ path: 'j-ficha.png' }); await p.keyboard.press('Escape');
      // bloqueo personal desde el día
      const diaConEv = p.locator('.cuad .dia', { has: p.locator('.ev:not(.bloq)') }).first(); await diaConEv.click(); await p.waitForSelector('#jdia input');
      await p.locator('#jdia input[placeholder^="Motivo"]').fill('Cita médica'); await p.locator('#jdia button', { hasText: 'Bloquear' }).click(); await p.waitForTimeout(700);
      ok(await p.locator('.cuad .ev.bloq', { hasText: 'Cita médica' }).count() >= 1, 'el bloqueo personal aparece en el calendario');
      ok(g.admin('adminJornadas').bloqueos.some((b) => b.motivo === 'Cita médica'), 'y quedó guardado en la hoja');
      // historial y clientes
      await p.click('#jtabs button[data-v=his]'); await p.waitForTimeout(200); ok(await p.locator('#jhis tbody tr').count() >= 4, 'historial lista las reservas');
      await p.fill('#jbarra input', 'Hierro'); await p.waitForTimeout(150); ok(await p.locator('#jhis tbody tr').count() === 1, 'buscador filtra por banda');
      await p.screenshot({ path: 'j-historial.png' });
      await p.click('#jtabs button[data-v=cli]'); await p.waitForTimeout(200); ok(await p.locator('.cli').count() >= 4, 'tarjetas de clientes');
      await p.locator('.cli').first().getByText('Ver jornadas').click(); await p.waitForSelector('.ficha-j'); await p.screenshot({ path: 'j-cliente.png' }); await p.keyboard.press('Escape');
      await p.screenshot({ path: 'j-clientes.png', fullPage: true });
    }
    await ctx.close();
  }
  console.log('errores JS:', errs); await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
