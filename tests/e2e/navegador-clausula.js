// Comprueba que el reglamento muestra la cláusula de protección de datos y que se pide aceptarla al reservar. Uso: node tests/e2e/navegador-clausula.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..', '..');
const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': /\.js$/.test(f) ? 'text/javascript' : /\.css$/.test(f) ? 'text/css' : /\.json$/.test(f) ? 'application/json' : 'text/html' }); r.end(b); } }); }).listen(8097, async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const ok = (c, n) => console.log((c ? '  ok  ' : 'FALLA ') + n);
  await p.route(/script\.google\.com|googleapis|gstatic|youtube|maps/, (r) => r.abort());
  await p.goto('http://localhost:8097/#reglamento'); await p.waitForTimeout(900);
  const t = await p.locator('#reglamento').innerText();
  ok(/protección de datos personales/i.test(t), 'el reglamento incluye «Protección de datos personales»');
  ok(/Ley N° 19\.628/.test(t) && /Tus derechos/.test(t) && /Rockerío/.test(t), 'con derechos, ley chilena y el nombre del negocio (sin llaves sueltas)');
  ok(!/\{negocio\}/.test(t), 'no quedan marcas sin reemplazar');
  const tyc = await p.locator('#tyc-txt').innerText(); ok(/datos personales/.test(tyc), 'la casilla de aceptación menciona el tratamiento de datos');
  await b.close(); srv.close();
});
