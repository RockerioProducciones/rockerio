/* Pruebas del editor de parámetros (validaciones de apps-script/Ajustes.gs). */
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const ctx = { console }; vm.createContext(ctx);
['Reglas', 'Code', 'Contenido', 'Ventas', 'Ajustes'].forEach((f) => vm.runInContext(fs.readFileSync(__dirname + `/../apps-script/${f}.gs`, 'utf8'), ctx));
let ok = 0;
function t(n, f) { try { f(); ok++; console.log('  ok  ' + n); } catch (e) { console.error('FALLA ' + n + '\n      ' + e.message); process.exitCode = 1; } }
const def = (k) => ctx.ESQUEMA.find((d) => d[0] === k);
const v = (k, x) => ctx.validarAjuste_(def(k), x);
t('todas las claves del esquema existen en la configuración por defecto', () => {
  const d = ctx.Reglas.CONFIG_POR_DEFECTO;
  ctx.ESQUEMA.forEach((e) => assert.ok(e[0] in d, 'falta ' + e[0] + ' en CONFIG_POR_DEFECTO'));
});
t('pesos: entero no negativo', () => {
  assert.strictEqual(v('precioEnsayoHora', '16000'), 16000);
  assert.throws(() => v('precioEnsayoHora', '-1')); assert.throws(() => v('precioEnsayoHora', '15.5')); assert.throws(() => v('precioEnsayoHora', 'abc')); assert.throws(() => v('precioEnsayoHora', ''));
});
t('sino y lista', () => {
  assert.strictEqual(v('pagoOnline', 'SI'), 'SI'); assert.strictEqual(v('pagoOnline', true), 'SI'); assert.strictEqual(v('pagoOnline', 'no'), 'NO');
  assert.strictEqual(v('regimen', '14D8'), '14D8'); assert.throws(() => v('regimen', '14A')); assert.throws(() => v('tema', 'rosa'));
});
t('máximos: minutosReserva ≤ 180, anticipacionMaxDias ≤ 120', () => {
  assert.strictEqual(v('minutosReserva', '30'), 30); assert.throws(() => v('minutosReserva', '500')); assert.throws(() => v('anticipacionMaxDias', '999'));
});
t('url solo https; whatsapp solo números', () => {
  assert.strictEqual(v('linkPago', 'https://pago.cl/x/'), 'https://pago.cl/x'); assert.throws(() => v('linkPago', 'javascript:alert(1)')); assert.strictEqual(v('linkPago', ''), '');
  assert.strictEqual(v('whatsapp', '+56 9 1234 5678'), '56912345678'); assert.throws(() => v('whatsapp', 'hola'));
});
t('texto: bloquea fórmulas', () => { assert.ok(!/^=/.test(v('direccion', '=HYPERLINK("x")'))); });
t('bloqueHorario_ normaliza y rechaza', () => {
  assert.strictEqual(ctx.bloqueHorario_('9-14', 'Lunes'), '09:00-14:00'); assert.strictEqual(ctx.bloqueHorario_('17:00-23:00', 'Lunes'), '17:00-23:00'); assert.strictEqual(ctx.bloqueHorario_('', 'Lunes'), '');
  assert.throws(() => ctx.bloqueHorario_('14-9', 'Lunes')); assert.throws(() => ctx.bloqueHorario_('9-25', 'Lunes')); assert.throws(() => ctx.bloqueHorario_('mañana', 'Lunes'));
});
console.log(ok + ' pruebas de ajustes ok');
