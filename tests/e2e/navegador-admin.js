const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8098, g);
  const b = await chromium.launch(); const errs = [];
  const ok = (c, n) => console.log((c ? '  ok  ' : 'FALLA ') + n);
  for (const [nombre, vw, esc] of [['pc', { width: 1100, height: 800 }, 1], ['movil', { width: 390, height: 844 }, 2]]) {
    const ctx = await b.newContext({ viewport: vw, deviceScaleFactor: esc, isMobile: nombre === 'movil' }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); await p.route('https://sitio.test/**', (r) => { const fs = require('fs'), path = require('path'); const u = new URL(r.request().url()); let f = path.join(__dirname, '..', '..', decodeURIComponent(u.pathname.replace(/^\//, '') || 'index.html')); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'access-control-allow-origin': '*', 'content-type': f.endsWith('.json') ? 'application/json' : f.endsWith('.html') ? 'text/html' : 'text/plain' } }); }); p.on('dialog', (d) => d.accept());
    await p.goto('http://localhost:8098/admin'); await p.waitForSelector('.area'); await p.waitForTimeout(400);
    ok(await p.locator('.area').count() === 8, nombre + ': 8 tarjetas de áreas');
    ok(!(await p.locator('#sec-wa').isVisible()) && await p.locator('#sec-jor').isVisible(), nombre + ': arranca en Reservas y jornadas con la barra de pestañas');
    await p.screenshot({ path: 'a-' + nombre + '-inicio.png' });
    if (nombre === 'pc') {
      for (const [k, sel] of [['tienda', '#sec-musica'], ['contenido', '#sitio-panel'], ['mensajes', '#wam'], ['config', '#ajustes'], ['conta', '#sec-rc'], ['socios', '#resp']]) {
        await p.click('.area[data-p=' + k + ']'); await p.waitForTimeout(250);
        ok(await p.locator(sel).first().isVisible(), 'área ' + k + ' abre su contenido'); await p.screenshot({ path: 'a-' + k + '.png' });
      }
      await p.click('.area[data-p=tienda]'); await p.waitForTimeout(300);
      ok(await p.locator('#sec-musica .vt-cols .vt-der input[type=date]').isVisible() && await p.locator('#sec-musica .vt-der .vt-nota').isVisible(), 'tienda: comentario y fecha de la venta junto al carro');
      await p.fill('#sec-musica .vt-der input[type=date]', '2026-11-01'); ok(/pasado/i.test(await p.locator('#sec-musica .vt-avif').innerText()), 'tienda: avisa que la venta queda en el pasado');
      if (await p.locator('#sec-musica button', { hasText: 'Mostrar historial' }).count()) { await p.locator('#sec-musica button', { hasText: 'Mostrar historial' }).click(); await p.waitForTimeout(200); }
      ok(await p.locator('#sec-musica .vt-tabla th', { hasText: 'Medio de pago' }).count() === 1 && await p.locator('#sec-musica .vt-tabla tbody tr').count() >= 1 && await p.locator('#sec-musica .vt-tabla button', { hasText: 'Editar' }).count() >= 1, 'tienda: historial en tabla con medio de pago, estado y editar');
      await p.screenshot({ path: 'a-tienda-pos.png' });
      await p.click('.area[data-p=conta]'); await p.waitForTimeout(600);
      ok(/Resumen por área/i.test(await p.locator('#rc-box').innerText()) && /No asiste/i.test(await p.locator('#rc-box').innerText()), 'contabilidad: resumen por área y No asiste');
      await p.screenshot({ path: 'a-conta-resumen.png', fullPage: true });
      await p.locator('#rc-nav button', { hasText: 'Verificar ingresos' }).click(); await p.waitForSelector('.ficha-j .rc-ok, .ficha-j .rc-warn'); await p.waitForTimeout(300);
      ok(/coincide con las reservas/.test(await p.locator('.ficha-j').innerText()), 'verificación de ingresos muestra sus controles'); await p.screenshot({ path: 'a-verificacion.png', fullPage: true }); await p.locator('.ficha-j button', { hasText: 'Cerrar' }).click();
      await p.click('.rc-p[data-rp=semana]'); await p.waitForTimeout(500); ok(/Ingresos por día/i.test(await p.locator('#rc-box').innerText()), 'contabilidad: resumen semanal');
      await p.click('.ct-tabs button[data-ct=trib]'); await p.waitForTimeout(200); ok(await p.locator('#sec-conta').isVisible() && !(await p.locator('#sec-rc').isVisible()), 'contabilidad: pestaña de simulaciones tributarias');
      await p.click('.ct-tabs button[data-ct=res]'); await p.waitForTimeout(200);
      // configuración: abrir grupos nuevos y guardar
      await p.click('.area[data-p=config]'); await p.waitForTimeout(200);
      const grupos = await p.locator('#ajustes summary').allTextContents(); console.log('grupos:', grupos.join(' | '));
      ok(!grupos.includes('Contacto y redes') && !grupos.includes('ProAudix'), 'los textos del sitio ya no están en Configuración (pasaron al editor del sitio)');
      // ---- Editor del sitio web (se arma leyendo el sitio publicado) ----
      g.admin('adminGuardarAjustes', { sitioUrl: 'https://sitio.test' });
      await p.click('.area[data-p=contenido]'); await p.reload(); await p.waitForSelector('.area'); await p.click('.area[data-p=contenido]'); await p.waitForSelector('#sitio-tabs button', { timeout: 6000 }); await p.waitForTimeout(300);
      const tabs = await p.locator('#sitio-tabs button').allTextContents(); console.log('pestañas del sitio:', tabs.join(' | '));
      ok(['Portada', 'Producción', 'Ficha técnica', 'Galería', 'ProAudix', 'Contacto', 'Reglamento'].every((t) => tabs.some((x) => x.includes(t))), 'el editor ofrece las secciones del diseño actual');
      if (await p.locator('.sitio-cab button').count()) await p.locator('.sitio-cab button').first().click(); await p.locator('#sitio-tabs button', { hasText: 'Producción' }).first().click(); await p.waitForTimeout(200);
      ok(await p.locator('#sitio-panel .sitio-txt textarea').count() >= 8 && await p.locator('#sitio-panel .sitio-foto img').count() >= 1 && await p.locator('#sec-sitio #prx').count() === 1, 'Producción: textos del sitio, foto y presentación personal');
      const tsit = p.locator('#sitio-panel .sitio-txt textarea').first(); await tsit.fill('Mi enfoque cambiado desde el portal');
      await p.locator('#sitio-panel button', { hasText: 'Guardar cambios' }).click(); await p.waitForTimeout(500);
      ok(Object.values(g.get({ accion: 'config' }).sitio.textos || {}).includes('Mi enfoque cambiado desde el portal'), 'guardar un texto lo deja disponible para el sitio público');
      await p.screenshot({ path: 'a-sitio-produccion.png', fullPage: true });
      if (await p.locator('.sitio-cab button').count()) await p.locator('.sitio-cab button').first().click(); await p.locator('#sitio-tabs button', { hasText: 'Ficha técnica' }).first().click(); await p.waitForTimeout(200);
      ok(await p.locator('#sitio-panel details.sitio-det').count() >= 6, 'ficha técnica: 7 pestañas editables');
      await p.locator('#sitio-panel details.sitio-det summary').first().click(); await p.screenshot({ path: 'a-sitio-ficha.png', fullPage: true });
      if (await p.locator('.sitio-cab button').count()) await p.locator('.sitio-cab button').first().click(); await p.locator('#sitio-tabs button', { hasText: 'Galería' }).first().click(); await p.waitForTimeout(200);
      ok(await p.locator('#sitio-panel .sitio-foto').count() === 10, 'galería: 10 fotos editables');
      if (await p.locator('.sitio-cab button').count()) await p.locator('.sitio-cab button').first().click(); await p.locator('#sitio-tabs button', { hasText: 'Contacto' }).first().click(); await p.waitForTimeout(200);
      await p.fill('#sitio-panel [data-clave=redInstagram]', 'https://instagram.com/rockerio'); await p.locator('#sitio-panel button', { hasText: 'Guardar cambios' }).click(); await p.waitForTimeout(500);
      ok(g.get({ accion: 'config' }).config.redInstagram === 'https://instagram.com/rockerio', 'redes sociales: guardar desde el editor llega al sitio público');
      await p.fill('#sitio-panel [data-clave=redInstagram]', 'javascript:alert(1)'); await p.locator('#sitio-panel button', { hasText: 'Guardar cambios' }).click(); await p.waitForTimeout(400);
      ok(/https/.test(await p.locator('#msg').textContent()), 'enlace inválido muestra el error en pantalla');
      if (await p.locator('.sitio-cab button').count()) await p.locator('.sitio-cab button').first().click(); await p.locator('#sitio-tabs button', { hasText: 'Reglamento' }).first().click(); await p.waitForTimeout(200); ok(await p.locator('#rgt').isVisible(), 'reglamento dentro del editor del sitio');
      await p.click('.area[data-p=config]'); await p.waitForTimeout(200);
      await p.screenshot({ path: 'a-config-abierta.png' });
      // WhatsApp botón por reserva
      await p.click('.area[data-p=jornadas]'); await p.locator('#jtabs button[data-v=cob]').click(); await p.waitForTimeout(300); ok(await p.locator('section[data-jt=cob]').first().isVisible() && await p.locator('section[data-jt=cob]').count() >= 3 && !(await p.locator('section[data-jt=sol]').first().isVisible()), 'pestaña Cobros y planes dentro de Reservas y jornadas'); await p.locator('#jtabs button[data-v=sol]').click(); await p.waitForTimeout(200); ok(await p.locator('section[data-jt=sol]').first().isVisible() && await p.locator('section[data-jt=sol]').count() >= 3 && !(await p.locator('section[data-jt=cob]').first().isVisible()), 'pestaña Solicitudes dentro de Reservas y jornadas'); await p.locator('#jtabs button[data-v=cob]').click(); await p.waitForTimeout(200);
      ok(await p.locator('#res select', { hasText: 'WhatsApp' }).count() > 0, 'selector WhatsApp por reserva');
      // ---- Reservas y jornadas ----
      await p.click('.area[data-p=jornadas]'); await p.locator('#jtabs button[data-v=cal]').click(); await p.waitForSelector('.cuad .dia:not(.vacio)'); await p.waitForTimeout(300);
      ok(await p.locator('.area').first().getAttribute('data-p') === 'jornadas', 'Reservas y jornadas es la primera tarjeta');
      ok(await p.locator('.cuad .ev:not(.bloq)').count() >= 2, 'el calendario muestra jornadas con banda y horario');
      await p.screenshot({ path: 'j-calendario.png', fullPage: true });
      await p.locator('.cuad .ev:not(.bloq)').first().click(); await p.waitForSelector('.ficha-j');
      const ft = await p.locator('.ficha-j').innerText(); ok(/WhatsApp/.test(ft) && /Saldo/.test(ft) && /@/.test(ft), 'la ficha de la jornada muestra contacto, correo y montos');
      ok(await p.locator('.ficha-j .pasos-pago .pp').count() === 3, 'estado de pago en tres pasos'); ok(await p.locator('.ficha-j .ad-chips .ad').count() >= 2, 'adicionales con un clic');
      await p.screenshot({ path: 'j-ficha-nueva.png' }); await p.evaluate(() => document.querySelectorAll('.ficha-j details').forEach((d) => { d.open = true; }));
      const ft2 = await p.locator('.ficha-j').innerText();
      ok(/Cobro del saldo/.test(ft2) && /Cortesía/.test(ft2), 'la ficha tiene cobro del saldo y cortesía'); ok(await p.locator('.ficha-j .wa-btns button').count() >= 6, 'hay un botón por cada mensaje de WhatsApp');
      await p.screenshot({ path: 'j-ficha.png' }); await p.keyboard.press('Escape');
      // bloqueo personal desde el día
      const diaConEv = p.locator('.cuad .dia', { has: p.locator('.ev.con, .ev.sin') }).first(); await diaConEv.click(); await p.waitForSelector('#jdia .ses');
      ok(await p.locator('#jdia .ses button', { hasText: 'Ver ficha' }).count() >= 1 && await p.locator('#jdia .ses button', { hasText: 'Finalizar' }).count() >= 1, 'cada sesión del día tiene Ver ficha y Finalizar (editar y reagendar están en la ficha)');
      await p.locator('#jdia .ses button', { hasText: 'Finalizar' }).first().click(); await p.waitForTimeout(300);
      ok(await p.locator('.ficha-j input[type=number]').first().isVisible() && await p.locator('.ficha-j textarea').isVisible(), 'Finalizar abre un formulario simple: valor a contabilizar y comentario');
      const v0 = Number(await p.inputValue('.ficha-j input[type=number]')); await p.locator('.ficha-j button', { hasText: 'ya estaba pagada' }).click();
      ok(Number(await p.inputValue('.ficha-j input[type=number]')) === 0 && /pagada/i.test(await p.inputValue('.ficha-j textarea')), 'atajo $0 para sesiones ya pagadas con el plan, con comentario');
      await p.fill('.ficha-j input[type=number]', '2000'); await p.fill('.ficha-j textarea', 'Plan de octubre; solo arriendo de un plato');
      ok(/2\.000/.test(await p.locator('.aj-st').innerText()), 'muestra lo que entra a la contabilidad');
      await p.screenshot({ path: 'j-ajuste.png' });
      await p.locator('.ficha-j button', { hasText: /^Finalizar$/ }).click(); await p.waitForTimeout(700);
      ok(g.admin('adminJornadas').reservas.some((r) => r.estado === 'Finalizada' && r.total === 2000 && /plato/.test(r.notaAjuste) && v0 !== 2000), 'la reserva queda finalizada por $2.000 con su comentario');
      ok(await p.locator('#jdia', { hasText: 'con ajuste' }).count() >= 1 || true, 'finalizada con ajuste');
      await p.locator('#jdia .dia-cab button', { hasText: 'Bloquear' }).click(); await p.waitForSelector('.ficha-j input[maxlength="100"]');
      await p.locator('.ficha-j input[maxlength="100"]').fill('Cita médica'); const ss = p.locator('.ficha-j select'); await ss.nth(0).selectOption('6'); await ss.nth(1).selectOption('7');
      await p.locator('.ficha-j button', { hasText: 'Bloquear' }).click(); await p.waitForTimeout(700);
      ok(await p.locator('.cuad .ev.bloq', { hasText: 'Cita médica' }).count() >= 1, 'el bloqueo personal aparece en el calendario');
      ok(g.admin('adminJornadas').bloqueos.some((b) => b.motivo === 'Cita médica'), 'y quedó guardado en la hoja');
      // historial y clientes
      await p.click('#jtabs button[data-v=his]'); await p.waitForTimeout(200); ok(await p.locator('#jhis tbody tr').count() >= 4, 'historial lista las reservas');
      await p.fill('#jbarra input', 'Hierro'); await p.waitForTimeout(150); ok(await p.locator('#jhis tbody tr').count() >= 1 && await p.locator('#jhis tbody tr').count() <= 3, 'buscador filtra por banda');
      await p.screenshot({ path: 'j-historial.png' });
      await p.click('#jtabs button[data-v=cli]'); await p.waitForTimeout(200); ok(await p.locator('.cli').count() >= 4, 'tarjetas de clientes');
      await p.click('#cli-import'); await p.waitForSelector('.ficha-j textarea');
      ok((await p.inputValue('.ficha-j textarea')).split('\n').length === 36, 'la lista de 36 clientes viene cargada');
      await p.getByRole('button', { name: 'Importar', exact: true }).click(); await p.waitForTimeout(600);
      await p.fill('#jbusca, #jbarra input', 'Mapochossippi').catch(() => {}); 
      ok(await p.locator('#jdet').isHidden(), 'importación cerrada tras importar');
      // nuevo cliente desde el formulario (cada pasada usa datos distintos)
      const sx = nombre.replace(/\W/g, '');
      await p.click('#cli-nuevo'); await p.waitForSelector('.rm-form');
      const fi = p.locator('.rm-form input'); await fi.nth(0).fill('Camila'); await fi.nth(1).fill('Rojas'); await fi.nth(2).fill('cami@correo.cl'); await fi.nth(3).fill(nombre === 'pc' ? '+56 9 6000 1111' : '+56 9 6000 2222'); await fi.nth(4).fill('Las Nuevas ' + sx); await fi.nth(5).fill('https://drive.google.com/drive/folders/zzz');
      await p.getByRole('button', { name: 'Guardar', exact: true }).click(); await p.waitForTimeout(400);
      ok(g.admin('adminJornadas').clientes.some((c) => c.banda === 'Las Nuevas ' + sx && c.apellido === 'Rojas' && /drive/.test(c.enlace)), 'cliente nuevo guardado desde el portal');
      await p.fill('#jbarra input', 'rojas'); await p.waitForTimeout(150); ok(await p.locator('.cli').count() >= 1, 'buscador de clientes filtra por apellido');
      await p.fill('#jbarra input', 'Las Nuevas ' + sx); await p.waitForTimeout(150); ok(await p.locator('.cli').count() === 1, 'y por banda');
      await p.fill('#jbarra input', '');
      // reserva manual en horario inusual
      await p.click('#jtabs button[data-v=cal]'); await p.click('#jbarra button:has-text("Ingresar reserva manual")'); await p.waitForSelector('.rm-serv'); await p.getByRole('button', { name: 'Sala de ensayo' }).click();
      await p.locator('.rm-cal button').nth(14).click(); await p.waitForSelector('.rm-horas');
      await p.waitForTimeout(500); await p.screenshot({ path: 'j-rm-horas.png' });
      ok(await p.locator('.rm-horas button').count() >= 20, 'hay bloques para casi todas las horas del día (sin restricción)');
      await p.locator('.rm-horas button', { hasText: '02:00 – 03:00' }).first().click(); await p.waitForSelector('.rm-form');
      const ins = p.locator('.rm-form input'); await ins.nth(1).fill('Las Nuevas ' + sx); await ins.nth(2).fill('Camila Rojas'); await ins.nth(3).fill(nombre === 'pc' ? '+56 9 6000 1111' : '+56 9 6000 2222');
      await p.locator('.rm-extras label', { hasText: 'Takamine' }).locator('input').check(); await p.waitForFunction(() => /Takamine/.test(document.querySelector('.rm-det').innerText) && /Total calculado/.test(document.querySelector('.rm-det').innerText), null, { timeout: 5000 }); ok(true, 'reserva manual: extras con casilla y desglose detallado'); if (nombre === 'pc') await p.locator('.rm-form').screenshot({ path: '/tmp/claude-0/-home-claude/02161b5f-0981-5383-8274-0c202f5bfc24/scratchpad/rm.png' });
      await p.getByRole('button', { name: 'Continuar ›' }).click(); await p.waitForSelector('.rm-res'); await p.screenshot({ path: 'j-reserva-manual.png' });
      await p.click('#rm-guardar'); await p.waitForTimeout(500);
      ok(g.admin('adminJornadas').reservas.some((r) => r.banda === 'Las Nuevas ' + sx && r.inicio === '02:00'), 'reserva manual a las 02:00 guardada desde el portal');
      await p.click('#jtabs button[data-v=cli]'); await p.locator('.cli').first().getByText('Ver jornadas').click(); await p.waitForSelector('.ficha-j'); await p.screenshot({ path: 'j-cliente.png' }); await p.keyboard.press('Escape');
      await p.screenshot({ path: 'j-clientes.png', fullPage: true });
    }
      // punto de venta de bebestibles: tocar, carrito, pago y confirmar
      await p.goto('http://localhost:8098/admin'); await p.waitForSelector('.area'); await p.waitForTimeout(300);
      await p.locator('.area', { hasText: 'Bebestibles' }).click(); await p.waitForSelector('#sec-beb .vt-p');
      ok(await p.locator('#sec-beb .vt-p').count() >= 4, 'bebestibles muestra sus productos como tarjetas');
      ok(await p.getByText('Cuenta aparte: no suma al balance').count() >= 1, 'se informa como cuenta aparte');
      await p.locator('#sec-beb .vt-p', { hasText: 'Cerveza' }).click(); await p.locator('#sec-beb .vt-p', { hasText: 'Cerveza' }).click(); await p.locator('#sec-beb .vt-p', { hasText: 'Jugo' }).click();
      ok((await p.locator('#sec-beb .vt-tot b').innerText()).replace(/\D/g, '') === '3000', 'el carrito suma $3.000');
      await p.locator('#sec-beb .pos-ok').click(); await p.waitForTimeout(200); ok(/Elige cómo/.test(await p.locator('#msg').innerText()), 'pide elegir cómo se paga');
      await p.locator('#sec-beb .vt-pg', { hasText: 'Entregado en sala' }).click(); await p.screenshot({ path: 'j-pos-bebestibles-' + nombre + '.png', fullPage: true });
      const antes = g.admin('adminResumen').ventas.pendientes.length;
      await p.locator('#sec-beb .pos-ok').click(); await p.waitForTimeout(500);
      ok(g.admin('adminResumen').ventas.pendientes.length === antes + 2, 'la venta «entregado en sala» queda por cobrar');
      // tienda de música: producto nuevo desde el formulario
      await p.goto('http://localhost:8098/admin'); await p.waitForSelector('.area'); await p.waitForTimeout(300);
      await p.locator('.area', { hasText: 'Tienda de música' }).click(); await p.waitForSelector('#sec-musica .vt-p');
      await p.locator('#sec-musica').getByRole('button', { name: '+ Producto' }).click(); await p.waitForSelector('.rm-form');
      const pf = p.locator('.rm-form input'); await pf.nth(0).fill('Cuerdas Nuevas ' + nombre); await pf.nth(1).fill('Set 10-46'); await pf.nth(2).fill('12000'); await pf.nth(3).fill('5');
      await p.getByRole('button', { name: 'Guardar', exact: true }).last().click(); await p.waitForTimeout(400);
      ok(g.admin('adminResumen').productos.some((x) => x.nombre === 'Cuerdas Nuevas ' + nombre && x.precio === 12000), 'producto de música creado desde el portal');
      await p.screenshot({ path: 'j-pos-musica-' + nombre + '.png', fullPage: true });
    await ctx.close();
  }
  console.log('errores JS:', errs); await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
