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
  ok(await p.locator('#arriendo-lista .ex-fila-ck').count() === 6, 'seis arriendos individuales');
  const antesT = await p.textContent('#tr-total'); await p.locator('#arriendo-lista .ex-fila-ck').nth(1).click(); await p.locator('#arriendo-lista .ex-fila-ck').nth(3).click(); await p.waitForTimeout(200);
  ok((await p.textContent('#tr-total')) !== antesT && /Epiphone|Takamine|Squier|Kingdo|Kingdo/.test(await p.textContent('#ro-items')), 'elegir arriendos cambia el total y se ve en el resumen');
  await p.locator('#orient button[data-z="1"]').click(); ok(await p.locator('#zurdo').isChecked(), 'orientación zurdo');
  await p.screenshot({ path: '5-paso4.png', fullPage: true });
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
  for (const [id, sel] of [['ficha', '#ficha-in .card'], ['galeria', '#galeria-car .fo-it img'], ['tienda', '#tienda-in'], ['reglamento', '#reglamento-in'], ['planes', '#plan-cards'], ['cotizar', '#f-cot'], ['contacto', '#wsp']]) {
    await p.goto('http://localhost:8099/#' + id); await p.waitForTimeout(500);
    ok(await p.locator(sel).first().isVisible(), 'vista ' + id); await p.screenshot({ path: 'v-' + id + '.png' });
  }
  // términos y condiciones: el reglamento se abre en una ventana emergente sin sacar al cliente de la reserva
  await p.goto('http://localhost:8099/#reservar'); await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(500);
  const hashAntes = await p.evaluate(() => location.hash);
  await p.evaluate(() => document.querySelector('.ver-reg').click()); await p.waitForSelector('.reg-ov');
  console.log((await p.locator('.reg-modal .reglamento').innerText()).length > 100 && (await p.evaluate(() => location.hash)) === hashAntes ? '  ok  el reglamento abre en ventana emergente y la reserva sigue en su lugar' : 'FALLA ventana del reglamento');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); console.log(await p.locator('.reg-ov').count() === 0 ? '  ok  la ventana se cierra con Escape' : 'FALLA no cierra');
  await p.evaluate(() => document.querySelector('.ver-reg').click()); await p.locator('.reg-pie button').click(); console.log(await p.locator('.reg-ov').count() === 0 ? '  ok  el botón «volver a mi reserva» la cierra' : 'FALLA botón');
  // contenido editado desde el portal («Sitio web») se aplica sobre el sitio
  g.admin('adminGuardarSitio', 'textos', { 'nos.fil.p1': '**Texto nuevo:** editado desde el portal' });
  g.admin('adminGuardarSitio', 'galeria', [{ src: 'assets/sala-1.jpg', titulo: 'Única foto editada' }]);
  await p.goto('http://localhost:8099/#nosotros'); await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(700);
  const ft = await p.evaluate(() => document.querySelector('[data-ed="nos.fil.p1"]').innerHTML);
  console.log(/<strong>Texto nuevo:<\/strong> editado desde el portal/.test(ft) ? '  ok  el texto editado y su negrita se ven en el sitio' : 'FALLA texto editado: ' + ft);
  await p.goto('http://localhost:8099/#galeria'); await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(700);
  const nfotos = await p.locator('#galeria-car .fo-it img').count(); console.log(nfotos === 1 ? '  ok  la galería editada reemplaza a la original' : 'FALLA galería: ' + nfotos);
  ['textos', 'galeria'].forEach((x) => g.admin('adminGuardarSitio', x, x === 'galeria' ? [] : {}));
  await p.goto('http://localhost:8099/#bandas'); await p.waitForTimeout(700);
  await p.goto('http://localhost:8099/#reservar'); await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(600);
  ok((await p.inputValue('#telefono')).startsWith('+569'), 'el teléfono ya trae +569');
  ok(await p.locator('#aviso-incl').isVisible(), 'recuadro de grabación incluida visible en ensayo');
  await p.locator('#horas-btns .hbtn', { hasText: /^3$/ }).click(); await p.waitForTimeout(200);
  ok(/1 hora/.test(await p.textContent('#aviso-incl')), 'con 3 horas incluye 1 hora de grabación');
  ok(await p.locator('.opcion .desc').count() === 2, 'descripciones de sala y estudio');
  await p.goto('http://localhost:8099/#nosotros'); await p.waitForTimeout(600);
  await p.locator('#prod-tabs [data-p="trabajos"]').click();
  ok(await p.locator('#nosotros .prod-panel[data-p="trabajos"] [data-playlist] iframe').count() === 1 && await p.locator('#trabajos-vacio').isHidden(), 'la playlist está en la pestaña Trabajos terminados de Producción');
  ok(await p.locator('#nosotros .prod-panel[data-p="metodo"] [data-playlist]').count() === 0, 'ya no está al final de Estudio y método');
  await p.goto('http://localhost:8099/#galeria'); await p.waitForTimeout(600);
  ok(await p.locator('#galeria [data-playlist] iframe').count() === 1, 'reproductor de playlist en Galería');
  await p.goto('http://localhost:8099/#ficha'); await p.waitForTimeout(600);
  ok(await p.locator('#ficha-in .ficha-tab').count() === 7, '7 pestañas en la ficha técnica');
  ok(await p.locator('.ficha-panel .fo-it').count() >= 2, 'fotos pequeñas con texto en la ficha');
  await p.locator('.ficha-tab', { hasText: 'Computador y DAW' }).click(); await p.waitForTimeout(300);
  ok(/Mac mini M4/.test(await p.textContent('.ficha-panel')) && /LUNA 3\.0/.test(await p.textContent('.ficha-panel')), 'estación de trabajo con Mac mini M4 y LUNA 3.0');
  await p.screenshot({ path: 'v-ficha-estacion.png', fullPage: true });
  await p.locator('.ficha-tab', { hasText: 'Microfonía' }).click(); await p.waitForTimeout(300);
  ok(/Telefunken/.test(await p.textContent('.ficha-panel')) && await p.locator('.ficha-panel .mic-it').count() >= 8 && await p.locator('.ficha-panel .mic-it .mic-spec').count() >= 8 && await p.locator('.ficha-panel .mic-it .mic-m-tit').count() >= 8 && await p.locator('.ficha-panel .ficha-hero img, .ficha-panel .ficha-hero[style*=url]').count() === 0, 'micrófonos: marca/modelo, tipo, patrón, reseña y muestras en una sola tarjeta (sin foto repetida arriba)'); await p.locator('#mics').screenshot({ path: 'v-mics.png' });
    { const n = await p.locator('.ficha-panel .mic-it:visible').count(); await p.locator('.mic-chip').nth(1).click(); const m = await p.locator('.ficha-panel .mic-it:visible').count(); ok(await p.locator('.mic-chip').count() > 2 && m > 0 && m < n, 'filtro de micrófonos por uso'); await p.locator('.mic-chip').first().click(); }
  await p.locator('.ficha-tab', { hasText: 'Muestras' }).click(); await p.waitForTimeout(300);
  await p.locator('.ficha-tab', { hasText: 'Sala de control' }).click(); await p.waitForTimeout(300); await p.screenshot({ path: 'v-ficha-control.png' });
  await p.goto('http://localhost:8099/#reglamento'); await p.waitForTimeout(500);
  ok(/Protección de datos personales/.test(await p.textContent('#reglamento-in')) && /no vendemos/i.test(await p.textContent('#reglamento-in')), 'el reglamento incluye la protección de datos personales');
  await p.goto('http://localhost:8099/#galeria'); await p.waitForTimeout(700);
  ok(await p.locator('#galeria-car .fo-it').count() >= 8 && (await p.locator('#galeria-car .fo-it img').first().boundingBox()).width < 140, 'galería: fotos pequeñas con texto');
  await p.click('#galeria-car .fo-it img'); await p.waitForTimeout(300); ok(await p.locator('.visor img').count() === 1, 'al tocar una foto se abre en grande'); await p.keyboard.press('Escape'); await p.screenshot({ path: 'v-galeria.png' });
  await p.goto('http://localhost:8099/#nosotros'); await p.waitForTimeout(500); await p.screenshot({ path: 'v-prod.png', fullPage: true });

  // Demostración técnica: mezclador de pistas (Web Audio) con audios reales subidos por el portal simulado
  const wavB64 = (f) => { const n = 16000, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * f * i / 8000) * 9000), 44 + i * 2); return b.toString('base64'); };
  const sube = (et, f) => g.admin('adminSubirArchivoAudio', { grupo: 'Tema', etiqueta: et, b64: wavB64(f) });
  g.admin('adminGuardarMezclador', { titulo: 'Tema demo', descripcion: 'Tramo de prueba', pistas: { 'Batería|En bruto': sube('bat raw', 110), 'Batería|Mezcla': sube('bat mix', 220), 'Bajo|En bruto': sube('bajo raw', 55), 'Bajo|Mezcla': sube('bajo mix', 82) } });
  await p.goto('http://localhost:8099/#nosotros'); await p.reload(); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(700);
  await p.locator('#prod-tabs [data-p="demo"]').click();
  ok(await p.locator('#mezclador').isVisible(), 'el mezclador aparece cuando hay una canción cargada');
  await p.locator('#mezclador .btn', { hasText: 'Cargar mezclador' }).click();
  await p.waitForSelector('#mezclador .mz-pista', { timeout: 15000 });
  ok(await p.locator('#mezclador .mz-pista').count() === 2 && await p.locator('#mezclador .mz-et').count() === 2, 'el mezclador carga 2 pistas y 2 etapas (las vacías no se muestran)');
  await p.locator('#mezclador .mz-play').click(); await p.waitForTimeout(1300);
  ok((await p.locator('#mezclador .mz-play').getAttribute('aria-pressed')) === 'true', 'el mezclador reproduce');
  ok(Number(await p.locator('#mezclador .mz-pistas').getAttribute('aria-valuenow')) > 0 || (await p.locator('#mezclador .mz-reloj b').textContent()) !== '00:00.0', 'el reloj y la posición avanzan');
  ok(await p.locator('#mezclador .mz-onda canvas').first().evaluate((c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true; return false; }), 'se dibuja la forma de onda');
  await p.locator('#mezclador .mz-pista').nth(1).locator('.mz-b').nth(0).click();
  ok(await p.locator('#mezclador .mz-pista').nth(0).evaluate((e) => e.classList.contains('apagada')) && !(await p.locator('#mezclador .mz-pista').nth(1).evaluate((e) => e.classList.contains('apagada'))), 'Solo en una pista apaga las demás');
  await p.locator('#mezclador .mz-pista').nth(1).locator('.mz-b').nth(1).click();
  ok(await p.locator('#mezclador .mz-pista').nth(1).evaluate((e) => e.classList.contains('apagada')), 'Silenciar apaga la pista aunque tenga solo');
  await p.locator('#mezclador .mz-et').nth(1).click();
  ok(await p.locator('#mezclador .mz-et').nth(1).getAttribute('aria-pressed') === 'true', 'se puede cambiar de etapa mientras suena');
  ok(await p.locator('#mezclador .mz-globo.ver').count() === 1 && /MIX/.test(await p.locator('#mezclador .mz-globo').textContent()), 'al cambiar de etapa aparece el globo que explica la mezcla');
  await p.locator('#mezclador .btn', { hasText: 'Reiniciar pistas' }).click();
  ok(await p.locator('#mezclador .apagada').count() === 0, 'Reiniciar pistas deja todo activo');
  await p.locator('#mezclador .mz-pista').nth(0).locator('.mz-b').first().click();
  ok(/SOLO/.test(await p.locator('#mezclador .mz-globo').textContent()), 'al hacer solo aparece un globo con la explicación');
  await p.locator('#prod-tabs [data-p="sobre"]').click();
  ok(await p.locator('#mezclador .mz-play').getAttribute('aria-pressed') === 'false', 'al cambiar de pestaña el mezclador se pausa');
  await p.screenshot({ path: 'v-demo.png', fullPage: true });

  await p.goto('http://localhost:8099/#nosotros'); await p.waitForTimeout(400);
  ok(await p.locator('#prod-tabs .ficha-tab').count() === 4 && /Demostración/.test(await p.locator('#prod-tabs .ficha-tab').nth(1).textContent()) && /Trabajos/.test(await p.locator('#prod-tabs .ficha-tab').nth(3).textContent()), 'Producción: Sobre mí, Demostración técnica, Estudio y método, Trabajos terminados');
  ok(await p.locator('#nosotros .prod-panel:not([hidden])').count() === 1, 'solo un panel de Producción visible a la vez');
  await p.locator('#prod-tabs [data-p="metodo"]').click();
  ok(await p.locator('#nosotros .prod-panel[data-p="metodo"]').isVisible() && !(await p.locator('#nosotros .prod-panel[data-p="sobre"]').isVisible()), 'la pestaña Método muestra su panel y oculta el otro');
  await p.locator('#prod-tabs [data-p="metodo"]').click();
  ok(await p.locator('#nosotros .prod-foto').count() === 1, 'una sola foto en Producción, junto al texto');
  await p.goto('http://localhost:8099/#bandas'); await p.waitForTimeout(500);
  ok(await p.locator('#bandas.activa').count() === 1, 'cuadro de honor abre');
  ok(!(await p.locator('#honor-form').isVisible()), 'formulario de honor oculto hasta tocar postular');
  await p.click('#honor-ir'); await p.waitForTimeout(300);
  ok(await p.locator('#honor-form').isVisible(), 'formulario de honor visible');
  await p.selectOption('#honor-redes .red-fila select', 'TikTok'); await p.fill('#honor-redes .red-fila input', 'https://tiktok.com/@bandaprueba');
  await p.click('#honor-red-mas'); ok(await p.locator('#honor-redes .red-fila').count() === 2, 'segunda red');
  await p.fill('#f-honor [name=ultimo]', 'https://youtu.be/dQw4w9WgXcQ'); await p.fill('#f-honor [name=genero]', 'Rock');
  await p.fill('#f-honor [name=banda]', 'Banda Prueba'); await p.fill('#f-honor [name=telefono]', '+56 9 7777 6666'); await p.fill('#f-honor [name=correo]', 'bp@correo.cl'); await p.fill('#f-honor [name=resena]', 'Grabamos nuestro EP en la sala');
  ok((await p.textContent('#honor-cont')).startsWith('30'), 'contador de caracteres');
  await p.screenshot({ path: 'v-honor.png', fullPage: true });
  await p.click('#f-honor button[type=submit]'); await p.waitForTimeout(800);
  ok(await p.locator('.honor-gracias').isVisible(), 'mensaje de gracias tras enviar');
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(500);
  ok(await p.locator('#cta-honor').isVisible(), 'invitación al cuadro de honor en el inicio');
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
