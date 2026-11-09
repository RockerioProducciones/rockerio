/* Pruebas de las validaciones del servidor (funciones puras de apps-script/Contenido.gs). */
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/Contenido.gs', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8'), ctx);
let ok = 0;
function t(n, f) { try { f(); ok++; console.log('  ok  ' + n); } catch (e) { console.error('FALLA ' + n + '\n      ' + e.message); process.exitCode = 1; } }

t('limpiar_ quita control, colapsa espacios y acota', () => {
  assert.strictEqual(ctx.limpiar_('  a\u0000b \n  c ', 10), 'a b c');
  assert.strictEqual(ctx.limpiar_('x'.repeat(50), 5).length, 5);
});
t('urlHttps_ solo acepta https', () => {
  assert.ok(ctx.urlHttps_('https://ejemplo.cl/logo.png'));
  assert.strictEqual(ctx.urlHttps_('http://ejemplo.cl/logo.png'), '');
  assert.strictEqual(ctx.urlHttps_('javascript:alert(1)'), '');
  assert.strictEqual(ctx.urlHttps_('https://a.cl/"><script>'), '');
});
t('ytUrl_ normaliza a un id de 11 caracteres', () => {
  const esperado = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  assert.strictEqual(ctx.ytUrl_('https://youtu.be/dQw4w9WgXcQ'), esperado);
  assert.strictEqual(ctx.ytUrl_('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), esperado);
  assert.strictEqual(ctx.ytUrl_('https://www.youtube.com/embed/dQw4w9WgXcQ'), esperado);
  assert.strictEqual(ctx.ytUrl_('https://evil.com/watch?v=dQw4w9WgXcQ'), '');
  assert.strictEqual(ctx.ytUrl_('https://www.youtube.com/watch?v=corto'), '');
});
t('instagram_ acepta usuario o enlace', () => {
  assert.strictEqual(ctx.instagram_('@los.maderos'), 'https://instagram.com/los.maderos');
  assert.strictEqual(ctx.instagram_('https://www.instagram.com/losmaderos/'), 'https://instagram.com/losmaderos');
  assert.strictEqual(ctx.instagram_('https://evil.com/x'), '');
  assert.strictEqual(ctx.instagram_('a b'), '');
});
t('los cinco estados de reserva se reconocen aunque cambien mayúsculas o espacios', () => {
  assert.strictEqual(ctx.ESTADOS.length, 5);
  assert.strictEqual(ctx.estadoNorm_('  reservado (CON abono) '), 'Reservado (con abono)');
  assert.strictEqual(ctx.estadoNorm_('finalizada'), 'Finalizada');
  assert.strictEqual(ctx.estadoNorm_('EXPIRADA'), '');
  assert.ok(ctx.ESTADOS_QUE_OCUPAN.indexOf('Anulada') < 0 && ctx.ESTADOS_QUE_OCUPAN.indexOf('No asiste') >= 0);
});

console.log('\n' + ok + ' pruebas correctas' + (process.exitCode ? ', con fallas.' : '.'));
