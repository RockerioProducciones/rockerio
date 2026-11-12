// Recorre todas las secciones y pestañas en varios tamaños de pantalla y avisa de desbordes, elementos tapados o cortados.
const { chromium } = require('playwright');
const { iniciar } = require('./servidor.js');
const { sembrar } = require('./demo.js');
const TAM = (process.env.TAM ? JSON.parse(process.env.TAM) : [[320, 640], [390, 844], [430, 932], [600, 900], [768, 1024], [820, 700], [1024, 768], [1280, 800], [1920, 1080]]);
const SECS = ['reservar', 'planes', 'nosotros', 'ficha', 'bandas', 'opiniones', 'cotizar', 'reglamento', 'galeria', 'tienda', 'proaudix', 'contacto'];
(async () => {
  const g = sembrar(); const { srv } = await iniciar(8089, g); const b = await chromium.launch(); const prob = [];
  const medir = () => {
    const out = [], vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push('scroll horizontal (' + document.documentElement.scrollWidth + ' > ' + vw + ')');
    const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' && !e.closest('[hidden]'); };
    const sec = document.querySelector('.sec.activa') || document.body;
    [].forEach.call(sec.querySelectorAll('input:not([type=hidden]):not(.trampa),select,textarea,button,a.btn,summary'), (e) => {
      if (!vis(e) || e.closest('.trampa,[aria-hidden=true],.sel-oculto,.ficha-tabs,.mic-filtro,.menu,.prod-tabs')) return;
      const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight * 6) return;
      if (r.right > vw + 2 || r.left < -2) out.push('fuera de pantalla: ' + (e.id || e.name || e.textContent.trim().slice(0, 25)));
      const sy = window.scrollY; if (r.top + sy < 0) return;
      e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); const x = q.left + q.width / 2, y = q.top + q.height / 2;
      if (y < 0 || y > innerHeight || x < 0 || x > vw) return;
      const t = document.elementFromPoint(x, y); if (t && t !== e && !e.contains(t) && !t.contains(e) && !(e.closest('label') && e.closest('label').contains(t)) && !/vista-barra|wiz-barra/.test(t.className || '')) out.push('tapado: ' + (e.id || e.name || e.textContent.trim().slice(0, 25)) + ' por ' + t.tagName + '.' + (t.className || '').toString().slice(0, 30));
    });
    return out;
  };
  for (const [w, h] of TAM) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 }); const p = await ctx.newPage();
    await p.goto('http://localhost:8089/'); await p.waitForFunction(() => window.RK && window.RK.conectado()); await p.waitForTimeout(400);
    const rev = async (nom) => { const o = await p.evaluate(medir); o.forEach((x) => prob.push(w + 'x' + h + ' [' + nom + '] ' + x)); };
    await rev('inicio');
    for (const id of SECS) {
      await p.goto('http://localhost:8089/#' + id); await p.waitForTimeout(450);
      if (id === 'bandas') { await p.evaluate(() => { const f = document.getElementById('honor-form'); if (f) f.hidden = false; }); }
      await rev(id);
      const tabs = await p.locator('#' + id + ' [role=tab], #' + id + ' .ficha-tab').count();
      for (let i = 0; i < tabs; i++) { const t = p.locator('#' + id + ' [role=tab], #' + id + ' .ficha-tab').nth(i); if (!(await t.isVisible())) continue; await t.click(); await p.waitForTimeout(250); await rev(id + ' pestaña ' + (i + 1)); }
    }
    // flujo de reserva paso a paso
    await p.goto('http://localhost:8089/#reservar'); await p.waitForTimeout(400); await rev('reservar paso 1');
    await p.click('.tarjeta.principal').catch(() => {}); await p.waitForTimeout(300); await rev('reserva paso 1b');
    await p.click('#wiz-sig'); await p.waitForTimeout(300); await rev('reserva paso 2 día');
    const f = g.admin('adminResumen').reservas[0].fecha, dnum = String(Number(f.slice(8)));
    await p.locator('.cal-dia:not(:disabled)', { hasText: new RegExp('^' + dnum + '(?!\\d)') }).first().click(); await p.waitForTimeout(500); await rev('reserva paso 2 horas');
    await p.locator('.hora:not(.ocupado):not(:disabled)').first().click(); await p.waitForTimeout(500); await rev('reserva paso 3 datos');
    await p.fill('#banda', 'B'); await p.fill('#nombre', 'N Persona'); await p.fill('#telefono', '+56 9 7777 1234'); await p.fill('#correo', 'e@c.cl'); await p.click('#wiz-sig'); await p.waitForTimeout(500);
    await rev('reserva paso 4'); await p.click('#ex-toggle').catch(() => {}); await p.waitForTimeout(200); await rev('reserva paso 4 extras abiertos');
    await ctx.close();
  }
  const u = [...new Set(prob)]; console.log(u.length ? u.join('\n') : 'Sin problemas en ' + TAM.length + ' tamaños'); console.log('TOTAL', u.length);
  await b.close(); srv.close();
})();
