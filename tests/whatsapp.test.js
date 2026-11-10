/* Pruebas de las plantillas y del envío automático de WhatsApp (con la API simulada). */
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const ctx = { console }; vm.createContext(ctx);
['Reglas', 'Code', 'Contenido', 'WhatsApp'].forEach((f) => vm.runInContext(fs.readFileSync(__dirname + `/../apps-script/${f}.gs`, 'utf8'), ctx));
let ok = 0;
function t(n, f) { try { f(); ok++; console.log('  ok  ' + n); } catch (e) { console.error('FALLA ' + n + '\n      ' + e.message); process.exitCode = 1; } }
const R = ctx.Reglas, cfgBase = R.normalizarConfig({ waPhoneId: '1234567890', waPlantillaRecordatorio: 'recordatorio_reserva', waAutoActivo: 'SI' });
const llamadas = []; let respuesta = { codigo: 200, texto: '{}' }, token = 'TOKEN_DE_PRUEBA_1234567890abcdef';
ctx.Utilities = { formatDate: () => '2026-11-09 18:00' };
ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => token }) };
ctx.UrlFetchApp = { fetch: (url, o) => { llamadas.push({ url, o }); return { getResponseCode: () => respuesta.codigo, getContentText: () => respuesta.texto }; } };

t('llenarPlantilla reemplaza claves y deja las desconocidas', () => {
  assert.strictEqual(R.llenarPlantilla('Hola {nombre}, {x} y {saldo}', { nombre: 'Ana', saldo: '1000 pesos' }), 'Hola Ana, {x} y 1000 pesos');
});
t('las 7 plantillas por defecto existen y usan solo claves conocidas', () => {
  const ok_ = ['nombre', 'banda', 'servicio', 'fecha', 'hora', 'fin', 'codigo', 'total', 'abono', 'saldo', 'direccion', 'negocio', 'sitio', 'horasAnulacion', 'enlaceDescarga', 'enlaceResena', 'enlaceHonor'];
  ['msgRecordatorio', 'msgConfirmacion', 'msgCobroAbono', 'msgGracias', 'msgResena', 'msgDescarga', 'msgHonor'].forEach((k) => {
    assert.ok(cfgBase[k].length > 20);
    (cfgBase[k].match(/\{(\w+)\}/g) || []).forEach((m) => assert.ok(ok_.includes(m.slice(1, -1)), k + ' usa ' + m));
  });
});
t('enviarWhatsApp_ arma la solicitud de plantilla de la API', () => {
  llamadas.length = 0;
  ctx.enviarWhatsApp_(cfgBase, '+56 9 1234 5678', ['Ana', 'Ensayo', 'lunes 9 de noviembre', '18:00', '20:00']);
  const l = llamadas[0], cuerpo = JSON.parse(l.o.payload);
  assert.strictEqual(l.url, 'https://graph.facebook.com/v23.0/1234567890/messages');
  assert.strictEqual(l.o.headers.Authorization, 'Bearer ' + token);
  assert.strictEqual(cuerpo.to, '56912345678'); assert.strictEqual(cuerpo.template.name, 'recordatorio_reserva'); assert.strictEqual(cuerpo.template.language.code, 'es');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cuerpo.template.components[0].parameters.map((p) => p.text))), ['Ana', 'Ensayo', 'lunes 9 de noviembre', '18:00', '20:00']);
});
t('enviarWhatsApp_ informa el error de la API y valida la configuración', () => {
  respuesta = { codigo: 400, texto: JSON.stringify({ error: { message: 'Template not found' } }) };
  assert.throws(() => ctx.enviarWhatsApp_(cfgBase, '56912345678', ['a', 'b', 'c', 'd', 'e']), /400.*Template not found/);
  respuesta = { codigo: 200, texto: '{}' };
  assert.throws(() => ctx.enviarWhatsApp_(R.normalizarConfig({}), '56912345678', []), /ID del número/);
  assert.throws(() => ctx.enviarWhatsApp_(R.normalizarConfig({ waPhoneId: '123456', waPlantillaRecordatorio: 'MAL NOMBRE' }), '56912345678', []), /plantilla/);
  token = ''; assert.throws(() => ctx.enviarWhatsApp_(cfgBase, '56912345678', []), /token/); token = 'TOKEN_DE_PRUEBA_1234567890abcdef';
  assert.throws(() => ctx.enviarWhatsApp_(cfgBase, '123', []), /Teléfono/);
});
t('enviarRecordatorios: solo reservas confirmadas de mañana, sin repetir; marca enviados y errores', () => {
  const n = 31, mk = (estado, fecha, extra) => { const f = new Array(n).fill(''); f[2] = estado; f[0] = 'RP-' + Math.random(); f[4] = fecha; f[5] = '18:00'; f[6] = '20:00'; f[3] = 'Ensayo'; f[9] = 'Ana'; f[10] = '56912345678'; f[8] = 'Banda'; if (extra) f[30] = extra; return f; };
  ctx.ahoraChile_ = () => ({ fecha: '2026-11-09', hora: 10 });
  const filas = [mk('Reservado (con abono)', '2026-11-10'), mk('Reservado (con abono)', '2026-11-10', 'Enviado antes'), mk('Reservado (sin abono)', '2026-11-10'), mk('Reservado (con abono)', '2026-11-11'), mk('Reservado (con abono)', '2026-11-10')];
  ctx.getCfg_ = () => cfgBase; ctx.conBloqueo_ = (fn) => fn();
  ctx.abrirBd_ = () => ({ getSheetByName: () => ({ getLastRow: () => filas.length + 1, getRange: (r, c, nr) => nr ? { getValues: () => filas } : { setValue: (v) => { filas[r - 2][c - 1] = v; } } }) });
  ctx.aFechaIso_ = (v) => String(v); const avisos = []; ctx.avisarAdmin_ = (a, b) => avisos.push(a);
  llamadas.length = 0; ctx.enviarRecordatorios();
  assert.strictEqual(llamadas.length, 2); assert.ok(/^Enviado /.test(filas[0][30])); assert.strictEqual(filas[1][30], 'Enviado antes'); assert.strictEqual(filas[2][30], ''); assert.strictEqual(filas[3][30], '');
  llamadas.length = 0; ctx.enviarRecordatorios(); assert.strictEqual(llamadas.length, 0, 'no repite');
  const f2 = [mk('Reservado (con abono)', '2026-11-10')]; respuesta = { codigo: 400, texto: '{"error":{"message":"fuera de ventana"}}' };
  ctx.abrirBd_ = () => ({ getSheetByName: () => ({ getLastRow: () => 2, getRange: (r, c, nr) => nr ? { getValues: () => f2 } : { setValue: (v) => { f2[0][c - 1] = v; } } }) });
  ctx.enviarRecordatorios(); assert.ok(/^ERROR/.test(f2[0][30])); assert.strictEqual(avisos.length, 1);
});
t('apagado: no envía nada', () => { llamadas.length = 0; ctx.getCfg_ = () => R.normalizarConfig({}); ctx.enviarRecordatorios(); assert.strictEqual(llamadas.length, 0); });
t('migrarMensajes_: pasa al estilo nuevo solo lo que seguía igual al original anterior', () => {
  const props = {}; ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) };
  const guardado = {}; ctx.leerConfigCruda_ = () => ({ msgRecordatorio: ctx.MENSAJES_ANTERIORES_.msgRecordatorio, msgGracias: 'Mi texto propio {nombre}', msgResena: ctx.MENSAJES_ANTERIORES_.msgResena + ' ' });
  ctx.ponerConfig_ = (v) => Object.assign(guardado, v);
  ctx.migrarMensajes_();
  assert.deepStrictEqual(Object.keys(guardado).sort(), ['msgRecordatorio', 'msgResena']); assert.strictEqual(guardado.msgRecordatorio, R.CONFIG_POR_DEFECTO.msgRecordatorio);
  Object.keys(guardado).forEach((k) => delete guardado[k]); ctx.migrarMensajes_(); assert.strictEqual(Object.keys(guardado).length, 0, 'solo una vez');
});
console.log(ok + ' pruebas de whatsapp ok');
