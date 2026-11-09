/* Pruebas del resumen de ventas y de los estados de pago (funciones puras de apps-script/Ventas.gs). */
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/Ventas.gs', 'utf8'), ctx);
let ok = 0;
function t(n, f) { try { f(); ok++; console.log('  ok  ' + n); } catch (e) { console.error('FALLA ' + n + '\n      ' + e.message); process.exitCode = 1; } }
const J = (x) => JSON.parse(JSON.stringify(x));
const v = (o) => Object.assign({ id: 'V-1', fecha: '2026-11-05', cobro: '', producto: 'x', cantidad: 1, precio: 1000, total: 1000, tipo: 'Música', pago: 'Venta efectivo', vendedor: 'Jaime Encina', nota: '' }, o);

t('pagoNorm_ reconoce los 3 estados y Anulada, ignora mayúsculas y espacios', () => {
  assert.strictEqual(ctx.pagoNorm_('venta efectivo'), 'Venta efectivo');
  assert.strictEqual(ctx.pagoNorm_('  Venta   transferencia '), 'Venta transferencia');
  assert.strictEqual(ctx.pagoNorm_('Entregado en sesión (pago pendiente)'), 'Entregado en sesión (pago pendiente)');
  assert.strictEqual(ctx.pagoNorm_('Anulada'), 'Anulada');
  assert.strictEqual(ctx.pagoNorm_('regalo'), '');
});
t('resumen: efectivo y transferencia cuentan en el mes de la venta', () => {
  const r = J(ctx.resumirVentas_([v({ total: 5000 }), v({ id: 'V-2', pago: 'Venta transferencia', total: 3000, tipo: 'Bebestibles' })], '2026-11'));
  assert.strictEqual(r.cobrado, 8000); assert.strictEqual(r.efectivo, 5000); assert.strictEqual(r.transferencia, 3000);
  assert.strictEqual(r.porTipo['Música'].cobrado, 5000); assert.strictEqual(r.porTipo['Bebestibles'].cobrado, 3000);
});
t('resumen: lo pendiente NO es cobrado, se informa aparte', () => {
  const r = J(ctx.resumirVentas_([v({ pago: 'Entregado en sesión (pago pendiente)', total: 4000 })], '2026-11'));
  assert.strictEqual(r.cobrado, 0); assert.strictEqual(r.porCobrar, 4000); assert.strictEqual(r.pendienteTotal, 4000);
});
t('resumen: una venta pendiente de octubre cobrada en noviembre cuenta en noviembre', () => {
  const venta = v({ fecha: '2026-10-28', cobro: '2026-11-03', pago: 'Venta transferencia', total: 7000 });
  assert.strictEqual(J(ctx.resumirVentas_([venta], '2026-11')).cobrado, 7000);
  assert.strictEqual(J(ctx.resumirVentas_([venta], '2026-10')).cobrado, 0);
});
t('resumen: pendiente de otro mes suma al pendiente total pero no al mes', () => {
  const r = J(ctx.resumirVentas_([v({ fecha: '2026-09-10', pago: 'Entregado en sesión (pago pendiente)', total: 2000 })], '2026-11'));
  assert.strictEqual(r.porCobrar, 0); assert.strictEqual(r.pendienteTotal, 2000);
});
t('resumen: las anuladas no cuentan y los meses se listan del más nuevo al más antiguo', () => {
  const r = J(ctx.resumirVentas_([v({ pago: 'Anulada', total: 9999 }), v({ id: 'V-3', fecha: '2026-09-01' })], '2026-11'));
  assert.strictEqual(r.cobrado, 0); assert.deepStrictEqual(r.meses, ['2026-09']);
});
t('resumen: separa por vendedor', () => {
  const r = J(ctx.resumirVentas_([v({ total: 1000 }), v({ id: 'V-2', vendedor: 'Gabriela Martelli', total: 2000 })], '2026-11'));
  assert.strictEqual(r.porVendedor['Jaime Encina'].cobrado, 1000); assert.strictEqual(r.porVendedor['Gabriela Martelli'].cobrado, 2000);
});
t('mesValido_', () => { assert.ok(ctx.mesValido_('2026-11')); assert.ok(!ctx.mesValido_('2026-13')); assert.ok(!ctx.mesValido_("2026-1'")); });
console.log(ok + ' pruebas de ventas ok');
