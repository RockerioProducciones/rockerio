/* Sirve el sitio y conecta el navegador con el Apps Script simulado (mismo código que se instala en Google). */
const http = require('http'), fs = require('fs'), path = require('path');
const { crear } = require('./gas-sim');
const RAIZ = path.join(__dirname, '../..'), TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const SHIM = `<script>window.google={script:{run:(function(){function mk(ok,ko){return new Proxy({},{get:function(_,fn){if(fn==='withSuccessHandler')return function(f){return mk(f,ko)};if(fn==='withFailureHandler')return function(f){return mk(ok,f)};return function(){var a=[].slice.call(arguments);fetch('/rpc',{method:'POST',body:JSON.stringify({fn:fn,args:a})}).then(function(r){return r.json()}).then(function(r){if(r.error){ko&&ko({message:r.error})}else{ok&&ok(r.ok)}})}}})}return mk(null,null)})()}};</script>`;
function iniciar(puerto, g) {
  g = g || crear();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const json = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u.pathname === '/exec') {
      if (req.method === 'POST') { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { try { json(JSON.parse(g.ctx.doPost({ postData: { contents: b } }).getContent())); } catch (e) { json({ ok: false, error: String(e) }); } }); return; }
      return json(g.get(Object.fromEntries(u.searchParams)));
    }
    if (u.pathname === '/rpc') { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => { const { fn, args } = JSON.parse(b); try { json({ ok: JSON.parse(JSON.stringify(g.ctx[fn](...args) === undefined ? null : g.ctx[fn](...args))) }); } catch (e) { json({ error: String(e.message || e) }); } }); return; }
    if (u.pathname === '/admin') { const h = fs.readFileSync(path.join(RAIZ, 'apps-script/Admin.html'), 'utf8').replace('<script>', SHIM + '<script>'); res.writeHead(200, { 'Content-Type': TIPOS['.html'] }); return res.end(h); }
    if (u.pathname === '/js/config.js') { res.writeHead(200, { 'Content-Type': TIPOS['.js'] }); return res.end("window.ROCKERIO={APPS_SCRIPT_URL:'/exec',SITIO_URL:''};"); }
    let p = path.join(RAIZ, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); res.end(fs.readFileSync(p));
  });
  return new Promise((ok) => srv.listen(puerto, () => ok({ srv, g })));
}
module.exports = { iniciar };
if (require.main === module) iniciar(8099).then(() => console.log('http://localhost:8099'));
