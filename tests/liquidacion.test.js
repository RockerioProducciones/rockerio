/* Pruebas de cómo cada estado afecta el dinero (retenciones y devoluciones). */
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const ctx = { Utilities: { parseDate: (s) => new Date(s.replace(' ', 'T') + ':00-03:00') } }; vm.createContext(ctx);
['Reglas', 'Code'].forEach(f => vm.runInContext(fs.readFileSync(__dirname + `/../apps-script/${f}.gs`, 'utf8'), ctx));
let ok = 0;
function t(n, f) { try { f(); ok++; console.log('  ok  ' + n); } catch (e) { console.error('FALLA ' + n + '\n      ' + e.message); process.exitCode = 1; } }

function correr(cfgExtra, estado, fila) {
  ctx.getCfg_ = () => ctx.Reglas.normalizarConfig(cfgExtra || {});
  let escrito = null;
  const sh = { getRange: () => ({ setValues: v => { escrito = v[0]; }, setValue: () => {} }) };
  const r = new Array(29).fill('');
  r[ctx.RES.horas - 1] = 2; r[ctx.RES.abono - 1] = 10000; r[ctx.RES.abonoRecibido - 1] = 'SI';
  r[ctx.RES.fecha - 1] = '2099-01-10'; r[ctx.RES.inicio - 1] = '19:00';
  Object.assign(r, fila || {});
  ctx.liquidar_(sh, 2, r, estado);
  return escrito === null ? null : JSON.parse(JSON.stringify(escrito));
}
const RES = () => ctx.RES;

t('No asiste con abono de $10.000 (2 h): se cobran $10.000', () => assert.deepStrictEqual(correr({}, 'No asiste'), ['SI', 10000, 0]));
t('No asiste sin abono recibido: igual queda cerrada con retención de $5.000 por hora', () => assert.deepStrictEqual(correr({}, 'No asiste', { [RES().abonoRecibido - 1]: 'NO' }), ['SI', 10000, 0]));
t('Anulada a tiempo: retiene $1.000 por hora y devuelve $4.000 por hora', () => assert.deepStrictEqual(correr({}, 'Anulada'), ['SI', 2000, 8000]));
t('Anulada tarde (menos de 24 h): se retiene todo el abono', () => assert.deepStrictEqual(correr({}, 'Anulada', { [RES().fecha - 1]: '2000-01-10' }), ['SI', 10000, 0]));
t('Anulada tarde pero con anulacionTardiaRetiene = NO: se trata como a tiempo', () => assert.deepStrictEqual(correr({ anulacionTardiaRetiene: 'NO' }, 'Anulada', { [RES().fecha - 1]: '2000-01-10' }), ['SI', 2000, 8000]));
t('Anulada sin abono recibido: nada retenido ni devuelto', () => assert.deepStrictEqual(correr({}, 'Anulada', { [RES().abonoRecibido - 1]: 'NO' }), ['NO', 0, 0]));
t('Anulada ya liquidada no se recalcula', () => assert.strictEqual(correr({}, 'Anulada', { [RES().retenido - 1]: 2000 }), null));
t('Con abono o Finalizada: abono recibido y sin retenciones', () => {
  assert.deepStrictEqual(correr({}, 'Reservado (con abono)', { [RES().abonoRecibido - 1]: 'NO' }), ['SI', '', '']);
  assert.deepStrictEqual(correr({}, 'Finalizada', { [RES().abonoRecibido - 1]: 'NO' }), ['SI', '', '']);
});
console.log('\n' + ok + ' pruebas correctas' + (process.exitCode ? ', con fallas.' : '.'));

/* ---- Horario tomado: vence a los minutosReserva y se libera ---- */
{
  const fs2 = require('fs'), vm2 = require('vm'), as = require('assert');
  const ctx2 = { console }; vm2.createContext(ctx2);
  vm2.runInContext(fs2.readFileSync(__dirname + '/../apps-script/Reglas.gs', 'utf8'), ctx2);
  vm2.runInContext(fs2.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8'), ctx2);
  const n = 30, mk = (estado, minutos) => { const f = new Array(n).fill(''); f[2] = estado; f[1] = vm2.runInContext('new Date(' + (Date.now() - minutos * 60000) + ')', ctx2); f[21] = 'ev'; return f; };
  const filas = [mk('Reservado (sin abono)', 25), mk('Reservado (sin abono)', 10), mk('Reservado (con abono)', 500)];
  const borrados = [];
  ctx2.abrirBd_ = () => ({ getSheetByName: () => ({ getLastRow: () => filas.length + 1,
    getRange: (r, c, nr) => nr ? { getValues: () => filas } : { setValue: (v) => { filas[r - 2][c - 1] = v; } } }) });
  ctx2.getCalendar_ = () => ({}); ctx2.borrarEvento_ = (cal, id) => borrados.push(id);
  ctx2.liberarVencidas_({ minutosReserva: 20 });
  try {
    as.strictEqual(filas[0][2], 'Anulada'); as.strictEqual(filas[1][2], 'Reservado (sin abono)'); as.strictEqual(filas[2][2], 'Reservado (con abono)'); as.strictEqual(borrados.length, 1);
    console.log('  ok  liberarVencidas_: libera solo lo vencido (25 min > 20) y respeta lo pagado');
  } catch (e) { console.error('FALLA liberarVencidas_\n      ' + e.message); process.exitCode = 1; }
}
