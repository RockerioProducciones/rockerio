// Prueba del campo de teléfono (+569 fijo y formato). Uso: node tests/e2e/navegador-telefono.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<input id="t" type="tel" value="+569 "><input id="u" type="text">');
  await p.addScriptTag({ path: '' + require('path').join(__dirname, '..', '..', 'js', 'teclado.js') + '' });
  const ok = (c, n) => console.log((c ? '  ok  ' : 'FALLA ') + n);
  const t = p.locator('#t');
  await t.fill('56912345678'); ok(await t.inputValue() === '+569 1234 5678', 'formato +569 1234 5678');
  await t.fill('abc'); ok(await t.inputValue() === '+569 ', 'letras no entran, prefijo fijo');
  await t.fill(''); ok(await t.inputValue() === '+569 ', 'vacío vuelve a +569');
  await t.fill('+569 98765432'); ok(await t.inputValue() === '+569 9876 5432', 'pegado con prefijo no se duplica');
  await t.fill('+569 '); await t.focus(); await p.keyboard.press('End'); for (let i = 0; i < 8; i++) await p.keyboard.press('Backspace'); ok(await t.inputValue() === '+569 ', 'Backspace no borra el prefijo');
  await p.keyboard.type('91234567'); ok(await t.inputValue() === '+569 9123 4567', 'tecleando 8 dígitos');
  await p.keyboard.type('99'); ok(await t.inputValue() === '+569 9123 4567', 'tope de 8 dígitos');
  await b.close();
})();
