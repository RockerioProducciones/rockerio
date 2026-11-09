/* Pruebas de las reglas de negocio. Ejecutar con:  node tests/reglas.test.js */
const assert = require('assert');
const R = require('../js/reglas.js');

let ok = 0;
function t(nombre, fn) {
  try { fn(); ok++; console.log('  ok  ' + nombre); }
  catch (e) { console.error('FALLA ' + nombre + '\n      ' + e.message); process.exitCode = 1; }
}

const cfg = R.normalizarConfig({});

console.log('Precios');
t('ensayo 2 h = $30.000, abono $10.000, saldo $20.000', () => {
  const p = R.calcularPrecio(cfg, { servicio: 'ensayo', horas: 2 });
  assert.deepStrictEqual([p.total, p.abono, p.saldo], [30000, 10000, 20000]);
});
t('ensayo 3 h con 2 extras, video y bruto = $93.000', () => {
  const p = R.calcularPrecio(cfg, { servicio: 'ensayo', horas: 3, extras: 2, video: true, raw: true });
  assert.strictEqual(p.total, 45000 + 2 * 3000 * 3 + 20000 + 10000);
  assert.strictEqual(p.abono, 15000);
});
t('extras por sesión cuando extraModo = sesion', () => {
  const c = R.normalizarConfig({ extraModo: 'sesion' });
  assert.strictEqual(R.calcularPrecio(c, { servicio: 'ensayo', horas: 3, extras: 2 }).extras, 6000);
});
t('grabación 4 h = $120.000 y no admite video ni extras', () => {
  const p = R.calcularPrecio(cfg, { servicio: 'grabacion', horas: 4, extras: 3, video: true, raw: true });
  assert.deepStrictEqual([p.total, p.abono], [120000, 20000]);
});
t('video y bruto no se cobran bajo 2 horas', () => {
  const p = R.calcularPrecio(cfg, { servicio: 'ensayo', horas: 1, video: true, raw: true });
  assert.strictEqual(p.total, 15000);
});
t('precios con formato chileno de texto se leen bien', () => {
  assert.strictEqual(R.normalizarConfig({ precioEnsayoHora: '$16.500' }).precioEnsayoHora, 16500);
  assert.strictEqual(R.clp(1234567), '$1.234.567');
});

console.log('Grabación incluida en el ensayo');
t('escala 2 h a 5 h', () => {
  const m = (h) => R.grabacionIncluidaMin(cfg, 'ensayo', h);
  assert.deepStrictEqual([m(1), m(2), m(3), m(4), m(5), m(6)], [0, 30, 60, 120, 180, 180]);
});
t('el estudio no regala grabación', () => assert.strictEqual(R.grabacionIncluidaMin(cfg, 'grabacion', 5), 0));
t('si se vacía la escala, no se regala nada', () => {
  assert.strictEqual(R.grabacionIncluidaMin(R.normalizarConfig({ escalaGrabacion: '' }), 'ensayo', 5), 0);
});

console.log('Horarios y agenda');
t('9 de noviembre de 2026 es lunes', () => assert.strictEqual(R.diaSemana('2026-11-09'), 1));
t('fechas imposibles se rechazan', () => {
  assert.strictEqual(R.fechaValida('2026-02-30'), false);
  assert.strictEqual(R.fechaValida('2026-13-01'), false);
  assert.strictEqual(R.fechaValida('2026-11-09'), true);
});
t('lunes abre 9-14 y 17-23', () => {
  assert.deepStrictEqual(R.horasAbiertas(cfg, '2026-11-09'), [9, 10, 11, 12, 13, 17, 18, 19, 20, 21, 22]);
});
t('jueves cierra a las 22', () => assert.strictEqual(Math.max(...R.horasAbiertas(cfg, '2026-11-12')), 21));
t('domingo abre 11 a 22 y sábado 10 a 22', () => {
  assert.deepStrictEqual(R.horasAbiertas(cfg, '2026-11-15'), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  assert.deepStrictEqual(R.horasAbiertas(cfg, '2026-11-14'), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
});
t('día inhábil cierra todo', () => {
  const c = R.normalizarConfig({ diasInhabiles: ['2026-11-10'] });
  assert.deepStrictEqual(R.horasAbiertas(c, '2026-11-10'), []);
});
t('el mismo día exige 4 horas de anticipación', () => {
  const r = R.horasLibres(cfg, '2026-11-10', [], { fecha: '2026-11-10', hora: 10.5 });
  assert.deepStrictEqual(r.libres, [17, 18, 19, 20, 21, 22]);
});
t('a las 18:00 solo queda la hora de las 22', () => {
  const r = R.horasLibres(cfg, '2026-11-10', [], { fecha: '2026-11-10', hora: 18 });
  assert.deepStrictEqual(r.libres, [22]);
});
t('no se reserva en el pasado ni más allá del máximo', () => {
  assert.deepStrictEqual(R.horasLibres(cfg, '2026-11-08', [], { fecha: '2026-11-10', hora: 8 }).libres, []);
  assert.deepStrictEqual(R.horasLibres(cfg, R.sumarDias('2026-11-10', 22), [], { fecha: '2026-11-10', hora: 8 }).libres, []);
  assert.ok(R.horasLibres(cfg, R.sumarDias('2026-11-10', 21), [], { fecha: '2026-11-10', hora: 8 }).libres.length > 0);
});
t('horas ocupadas se descartan', () => {
  const r = R.horasLibres(cfg, '2026-11-12', [19], { fecha: '2026-11-10', hora: 8 });
  assert.ok(r.libres.indexOf(19) < 0 && r.libres.indexOf(18) >= 0);
});
t('bloques continuos de 2 y 3 horas respetan ocupación y receso', () => {
  const libres = R.horasLibres(cfg, '2026-11-09', [19], { fecha: '2026-11-01', hora: 8 }).libres;
  assert.deepStrictEqual(R.inicios(libres, 2), [9, 10, 11, 12, 17, 20, 21]);
  assert.deepStrictEqual(R.inicios(libres, 3), [9, 10, 11, 20]);
});
t('un bloque no puede cruzar el receso de 14:00 a 17:00', () => {
  const libres = R.horasLibres(cfg, '2026-11-09', [], { fecha: '2026-11-01', hora: 8 }).libres;
  assert.ok(R.inicios(libres, 2).indexOf(13) < 0);
});

console.log('Configuración desde la hoja');
t('bloques escritos como texto', () => {
  assert.deepStrictEqual(R.parseBloque('09:00-14:00'), [9, 14]);
  assert.deepStrictEqual(R.parseBloque('10 a 21'), [10, 21]);
  assert.strictEqual(R.parseBloque('14-9'), null);
  assert.strictEqual(R.parseBloque('cerrado'), null);
});
t('domingo configurado desde texto', () => {
  const c = R.normalizarConfig({ horarios: { 0: ['10:00-21:00'] } });
  assert.strictEqual(R.horasAbiertas(c, '2026-11-15').length, 11);
});
t('valores inválidos vuelven al valor por defecto', () => {
  const c = R.normalizarConfig({ anticipacionMinHoras: 'abc', extraModo: 'x' });
  assert.strictEqual(c.anticipacionMinHoras, 4);
  assert.strictEqual(c.extraModo, 'hora');
});
t('SI y NO se interpretan', () => {
  assert.strictEqual(R.normalizarConfig({ reservasActivas: 'NO' }).reservasActivas, false);
  assert.strictEqual(R.normalizarConfig({ reservasActivas: 'SI' }).reservasActivas, true);
});

console.log('Validación de la solicitud');
const ahora = { fecha: '2026-11-01', hora: 9 };
const base = {
  servicio: 'ensayo', fecha: '2026-11-09', inicio: 19, horas: 2, extras: 0,
  banda: 'Los Maderos', nombre: 'Ana Pérez', telefono: '+56 9 1234 5678', correo: 'ana@example.com', tyc: true
};
t('solicitud correcta', () => {
  const r = R.validarSolicitud(cfg, ahora, base, []);
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.fin, 21);
  assert.strictEqual(r.datos.telefono, '56912345678');
  assert.strictEqual(r.grabacionMin, 30);
  assert.strictEqual(r.calculo.abono, 10000);
});
t('el servidor recalcula el precio: no acepta uno enviado', () => {
  const r = R.validarSolicitud(cfg, ahora, Object.assign({}, base, { total: 1 }), []);
  assert.strictEqual(r.calculo.total, 30000);
});
t('horario ocupado', () => {
  const r = R.validarSolicitud(cfg, ahora, base, [20]);
  assert.ok(!r.ok); assert.strictEqual(r.codigo, 'OCUPADO');
});
t('fuera de horario', () => {
  const r = R.validarSolicitud(cfg, ahora, Object.assign({}, base, { inicio: 15 }), []);
  assert.strictEqual(r.codigo, 'OCUPADO');
});
t('se reserva de 1 a 5 horas, ensayo y estudio', () => {
  assert.strictEqual(R.validarSolicitud(cfg, ahora, Object.assign({}, base, { horas: 6 }), []).codigo, 'DURACION');
  assert.strictEqual(R.validarSolicitud(cfg, ahora, Object.assign({}, base, { servicio: 'grabacion', horas: 6 }), []).codigo, 'DURACION');
  assert.ok(R.validarSolicitud(cfg, ahora, Object.assign({}, base, { horas: 1 }), []).ok);
  assert.ok(R.validarSolicitud(cfg, ahora, Object.assign({}, base, { servicio: 'grabacion', horas: 5, inicio: 9 }), []).ok);
});
t('día inhábil cerrado', () => {
  const c = R.normalizarConfig({ diasInhabiles: ['2026-11-15'] });
  assert.strictEqual(R.validarSolicitud(c, ahora, Object.assign({}, base, { fecha: '2026-11-15', inicio: 12 }), []).codigo, 'CERRADO');
});
t('domingo se puede reservar de 11 a 22', () => {
  assert.ok(R.validarSolicitud(cfg, ahora, Object.assign({}, base, { fecha: '2026-11-15', inicio: 11 }), []).ok);
  assert.strictEqual(R.validarSolicitud(cfg, ahora, Object.assign({}, base, { fecha: '2026-11-15', inicio: 10 }), []).codigo, 'OCUPADO');
});
t('reservas pausadas', () => {
  const c = R.normalizarConfig({ reservasActivas: 'NO' });
  assert.strictEqual(R.validarSolicitud(c, ahora, base, []).codigo, 'PAUSADO');
});
t('datos incompletos o inválidos', () => {
  const malo = (campo, valor) => R.validarSolicitud(cfg, ahora, Object.assign({}, base, { [campo]: valor }), []);
  assert.ok(!malo('banda', 'x').ok);
  assert.ok(!malo('telefono', '123').ok);
  assert.ok(!malo('correo', 'sin-arroba').ok);
  assert.ok(!malo('tyc', false).ok);
  assert.ok(!malo('servicio', 'otro').ok);
  assert.ok(!malo('fecha', '2026-02-31').ok);
});
t('extras y video se ignoran en grabación', () => {
  const r = R.validarSolicitud(cfg, ahora, Object.assign({}, base, { servicio: 'grabacion', extras: 3, video: true }), []);
  assert.ok(r.ok);
  assert.deepStrictEqual([r.calculo.total, r.datos.extras, r.datos.video], [60000, 0, false]);
});
t('el texto se limpia de caracteres de control y se acota', () => {
  const r = R.validarDatos(Object.assign({}, base, { banda: 'A\u0000B\n  C' + 'x'.repeat(100) }));
  assert.ok(r.ok);
  assert.ok(r.datos.banda.length <= 60 && !/[\u0000-\u001f]/.test(r.datos.banda));
});
t('resumen para WhatsApp', () => {
  const r = R.validarSolicitud(cfg, ahora, base, []);
  const txt = R.resumenTexto(cfg, r, 'RP-1001');
  assert.ok(/RP-1001/.test(txt) && /19:00 a 21:00/.test(txt) && /\$30\.000/.test(txt));
});
t('hora de Chile calculada con Intl', () => {
  const a = R.ahoraChile(new Date('2026-11-09T12:00:00Z')); // verano chileno = UTC-3
  assert.deepStrictEqual(a, { fecha: '2026-11-09', hora: 9 });
});

t('métodos de pago y anulación tardía se leen de la hoja', () => {
  assert.strictEqual(cfg.pagoTransferencia, true);
  assert.strictEqual(R.normalizarConfig({ pagoTransferencia: 'NO' }).pagoTransferencia, false);
  assert.strictEqual(R.normalizarConfig({ datosTransferencia: ' Banco X ' }).datosTransferencia, 'Banco X');
  assert.strictEqual(cfg.anulacionTardiaRetiene, true);
  assert.strictEqual(cfg.retencionPorHora, 1000);
});
t('sitioUrl y tema se leen de la hoja', () => {
  assert.strictEqual(R.normalizarConfig({ sitioUrl: 'https://rockerioproducciones.cl/' }).sitioUrl, 'https://rockerioproducciones.cl');
  assert.strictEqual(cfg.tema, 'carbon');
  assert.strictEqual(R.normalizarConfig({ tema: 'vino' }).tema, 'vino');
});
t('contabilidad formal apagada por defecto y régimen 14D3 salvo 14D8', () => {
  assert.strictEqual(cfg.contabilidadFormal, false); assert.strictEqual(cfg.regimen, '14D3');
  assert.strictEqual(R.normalizarConfig({ contabilidadFormal: 'SI', regimen: '14 d8' }).contabilidadFormal, true);
  assert.strictEqual(R.normalizarConfig({ regimen: '14 d8' }).regimen, '14D8');
  assert.strictEqual(R.normalizarConfig({ regimen: 'otro' }).regimen, '14D3');
});
t('tarifa conveniente: solo lun-vie dentro de la franja, por hora, y solo si es menor', () => {
  const c = R.normalizarConfig({ tarifaConveniente: 'SI', precioEnsayoConveniente: '12000' });
  // lunes 2026-11-09, 12:00 a 16:00: 2 h dentro de la franja (12 y 13) y 2 fuera
  let p = R.calcularPrecio(c, { servicio: 'ensayo', horas: 4, fecha: '2026-11-09', inicio: 12 });
  assert.strictEqual(p.base, 2 * 12000 + 2 * 15000); assert.strictEqual(p.horasConveniente, 2); assert.strictEqual(p.ahorro, 6000);
  p = R.calcularPrecio(c, { servicio: 'ensayo', horas: 2, fecha: '2026-11-09', inicio: 9 });
  assert.strictEqual(p.base, 24000);
  // sábado: precio normal
  assert.strictEqual(R.calcularPrecio(c, { servicio: 'ensayo', horas: 2, fecha: '2026-11-14', inicio: 10 }).base, 30000);
  // tarde de lunes: precio normal
  assert.strictEqual(R.calcularPrecio(c, { servicio: 'ensayo', horas: 2, fecha: '2026-11-09', inicio: 17 }).base, 30000);
  // apagada o sin fecha: precio normal
  assert.strictEqual(R.calcularPrecio(cfg, { servicio: 'ensayo', horas: 2, fecha: '2026-11-09', inicio: 9 }).base, 30000);
  assert.strictEqual(R.calcularPrecio(c, { servicio: 'ensayo', horas: 2 }).base, 30000);
  // estudio sin tarifa conveniente (0) y precio conveniente mayor al normal se ignora
  assert.strictEqual(R.calcularPrecio(c, { servicio: 'grabacion', horas: 2, fecha: '2026-11-09', inicio: 9 }).base, 60000);
  assert.strictEqual(R.calcularPrecio(R.normalizarConfig({ tarifaConveniente: 'SI', precioEnsayoConveniente: '20000' }), { servicio: 'ensayo', horas: 2, fecha: '2026-11-09', inicio: 9 }).base, 30000);
});
t('minutosReserva: 20 por defecto y siempre entre 5 y 180', () => {
  assert.strictEqual(cfg.minutosReserva, 20);
  assert.strictEqual(R.normalizarConfig({ minutosReserva: '30' }).minutosReserva, 30);
  assert.strictEqual(R.normalizarConfig({ minutosReserva: '1' }).minutosReserva, 5);
  assert.strictEqual(R.normalizarConfig({ minutosReserva: '9999' }).minutosReserva, 180);
  assert.strictEqual(R.normalizarConfig({ minutosReserva: 'abc' }).minutosReserva, 20);
});
t('pago online apagado por defecto y se enciende desde la hoja', () => {
  assert.strictEqual(cfg.pagoOnline, false);
  assert.strictEqual(R.normalizarConfig({ pagoOnline: 'SI' }).pagoOnline, true);
});

console.log('Planes mensuales');
t('plan 8 h = 4 sesiones de 2 h a $112.000; plan 12 h = 4 de 3 h a $168.000', () => {
  const a = R.planInfo(cfg, 'plan8'), b = R.planInfo(cfg, 'plan12');
  assert.deepStrictEqual([a.sesiones, a.horasPorSesion, a.precio, a.porSesion], [4, 2, 112000, 28000]);
  assert.deepStrictEqual([b.sesiones, b.horasPorSesion, b.precio, b.porSesion], [4, 3, 168000, 42000]);
  assert.strictEqual(R.planInfo(cfg, 'otro'), null);
});
const datosPlan = { banda: 'Los Maderos', nombre: 'Ana Pérez', telefono: '+56 9 1234 5678', correo: 'ana@example.com', tyc: true };
const sesiones4 = [{ fecha: '2026-11-09', inicio: 19 }, { fecha: '2026-11-16', inicio: 19 }, { fecha: '2026-11-23', inicio: 19 }, { fecha: '2026-11-30', inicio: 19 }];
t('plan válido con 4 sesiones en días distintos (hasta 35 días)', () => {
  const r = R.validarPlan(cfg, ahora, Object.assign({ tipo: 'plan8', sesiones: sesiones4 }, datosPlan), {});
  assert.ok(r.ok, r.error);
  assert.deepStrictEqual(r.sesiones.map(s => s.fin - s.inicio), [2, 2, 2, 2]);
});
t('plan rechaza menos de 4 sesiones, días repetidos, horas ocupadas y fechas fuera de plazo', () => {
  const p = (s, oc) => R.validarPlan(cfg, ahora, Object.assign({ tipo: 'plan8', sesiones: s }, datosPlan), oc || {});
  assert.ok(!p(sesiones4.slice(0, 3)).ok);
  assert.ok(!p([sesiones4[0], sesiones4[0], sesiones4[2], sesiones4[3]]).ok);
  assert.strictEqual(p(sesiones4, { '2026-11-16': [20] }).codigo, 'OCUPADO');
  assert.ok(!p(sesiones4.slice(0, 3).concat([{ fecha: '2026-12-20', inicio: 19 }])).ok);
});

console.log('\n' + ok + ' pruebas correctas' + (process.exitCode ? ', con fallas.' : '.'));
