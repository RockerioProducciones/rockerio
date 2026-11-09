/* Portal de socios. El enlace secreto (?t=…) se guarda solo en esta pestaña y se borra de la barra de direcciones. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', R = window.Reglas;
  var PAGOS = ['Venta efectivo', 'Venta transferencia', 'Entregado en sesión (pago pendiente)'], ROT = ['Efectivo', 'Transferencia', 'Entregado (pendiente)'];
  var token = '', datos = null, mes = '', vista = 'agenda';
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function $(i) { return document.getElementById(i); }
  function clp(n) { return R.clp(n); }
  function aviso(t, ok) { var a = $('aviso'); a.textContent = t; a.hidden = !t; a.className = 'aviso-msg' + (ok ? ' ok' : ''); if (t) setTimeout(function () { a.hidden = true; }, 6000); }

  try {
    var u = new URL(location.href), t = u.searchParams.get('t');
    if (t) { sessionStorage.setItem('rk_socio', t); history.replaceState(null, '', location.pathname); }
    token = sessionStorage.getItem('rk_socio') || '';
  } catch (e) { token = ''; }

  function post(accion, cuerpo) {
    cuerpo.accion = accion; cuerpo.t = token;
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo) }).then(function (r) { return r.json(); });
  }
  function cargar() {
    return fetch(API + '?accion=socios&t=' + encodeURIComponent(token) + (mes ? '&mes=' + encodeURIComponent(mes) : '')).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) { $('hola').textContent = 'Enlace no válido'; $('tabs').textContent = ''; aviso(d.error || 'Este enlace no es válido.'); return; }
      datos = d; mes = d.resumen.mes; pintar();
    }).catch(function () { aviso('No pudimos cargar los datos. Revisa tu conexión.'); });
  }
  if (!API || !token) { $('hola').textContent = 'Enlace no válido'; aviso('Abre el enlace que te envió Juan Carlos.'); return; }

  var TABS = [['agenda', 'Agenda'], ['musica', 'Tienda de música'], ['bebestible', 'Bebestibles'], ['historial', 'Historial y resumen']];
  function pintar() {
    $('hola').textContent = 'Hola, ' + datos.socio;
    var tb = $('tabs'); tb.textContent = '';
    TABS.forEach(function (x) { var b = el('button', '', x[1]); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(x[0] === vista)); b.onclick = function () { vista = x[0]; pintar(); }; tb.appendChild(b); });
    TABS.forEach(function (x) { $('v-' + x[0]).hidden = x[0] !== vista; });
    if (vista === 'agenda') pintarAgenda(); else if (vista === 'historial') pintarHistorial(); else pintarCatalogo(vista);
  }
  function pintarAgenda() {
    var s = $('v-agenda'); s.textContent = '';
    s.appendChild(el('p', 'sub', 'Próximos 30 días. Solo lectura.'));
    if (!datos.agenda.length) s.appendChild(el('p', 'sub', 'No hay reservas ni bloqueos próximos.'));
    var ult = '', caja;
    datos.agenda.forEach(function (x) {
      if (x.fecha !== ult) { ult = x.fecha; caja = el('div', 'dia'); caja.appendChild(el('h3', '', R.fechaLarga(x.fecha))); s.appendChild(caja); }
      var e = el('div', 'ev'); e.appendChild(el('b', '', x.inicio + (x.fin ? '–' + x.fin : '')));
      e.appendChild(el('span', '', x.banda + ' · ' + x.servicio)); e.appendChild(el('span', 'st', x.estado)); caja.appendChild(e);
    });
  }
  function pasoDoble(b, fn) { var t = b.textContent; b.onclick = function () { if (b.textContent !== t) { fn(); return; } b.textContent = '¿Confirmar?'; setTimeout(function () { b.textContent = t; }, 4000); }; }
  var CART = { musica: {}, bebestible: {} }, PAGO_SEL = { musica: '', bebestible: '' }, NOTA = { musica: '', bebestible: '' };
  function fotoOk(u) { u = u || ''; if (/^assets\/[\w\/.\-]+$/.test(u) && u.indexOf('..') < 0) return u; return /^https:\/\//.test(u) ? u : ''; }
  function pintarCatalogo(tipo) {
    var s = $('v-' + tipo); s.textContent = '';
    var lista = (tipo === 'musica' ? datos.musica : datos.bebestibles), cart = CART[tipo], ico = tipo === 'musica' ? '🎸' : '🥤', txt = tipo === 'musica' ? 'Música' : 'Bebestibles';
    var pt = datos.resumen.porTipo[txt] || { cobrado: 0, porCobrar: 0 };
    var an = el('div', 'anexo'); an.appendChild(el('b', '', 'Cuenta aparte · no suma al balance')); an.appendChild(el('span', '', ' Cobrado del mes: ' + clp(pt.cobrado) + ' · Por cobrar: ' + clp(pt.porCobrar))); s.appendChild(an);
    var w = el('div', 'pos'), izq = el('div'), der = el('div', 'pos-der'); w.appendChild(izq); w.appendChild(der); s.appendChild(w);
    var bq = el('input', 'pos-bq'); bq.placeholder = 'Buscar producto…'; izq.appendChild(bq);
    var g = el('div', 'pos-grid'); izq.appendChild(g);
    function grilla() {
      g.textContent = ''; var q = bq.value.trim().toLowerCase();
      lista.filter(function (p) { return !q || (p.nombre + ' ' + p.detalle + ' ' + p.categoria).toLowerCase().indexOf(q) >= 0; }).forEach(function (p) {
        var ag = p.stock === 0, c = el('button', 'pos-p' + (ag ? ' ag' : '') + (cart[p.fila] ? ' en' : '')); c.type = 'button';
        var im = el('div', 'ph'), f = fotoOk(p.foto); if (f) { var i = el('img'); i.src = f; i.alt = ''; i.loading = 'lazy'; im.appendChild(i); } else im.textContent = ico; c.appendChild(im);
        c.appendChild(el('b', '', p.nombre)); if (p.detalle) c.appendChild(el('small', '', p.detalle));
        c.appendChild(el('span', 'pr', clp(p.precio))); c.appendChild(el('small', '', ag ? 'Agotado' : (p.stock === '' || p.stock === null ? '' : 'Quedan ' + p.stock)));
        if (cart[p.fila]) c.appendChild(el('i', 'n', String(cart[p.fila])));
        c.onclick = function () { if (ag) { aviso('Producto agotado'); return; } if (p.stock !== '' && p.stock !== null && (cart[p.fila] || 0) >= p.stock) { aviso('No hay más stock'); return; } cart[p.fila] = (cart[p.fila] || 0) + 1; carro(); grilla(); };
        g.appendChild(c);
      });
      if (!g.firstChild) g.appendChild(el('p', 'sub', lista.length ? 'Sin resultados.' : 'Aún no hay productos disponibles.'));
    }
    bq.oninput = grilla; grilla();
    function carro() {
      der.textContent = ''; der.appendChild(el('h3', '', 'Venta actual'));
      var ks = Object.keys(cart), tot = 0;
      if (!ks.length) der.appendChild(el('p', 'sub', 'Toca los productos para agregarlos.'));
      ks.forEach(function (k) {
        var p = lista.filter(function (x) { return String(x.fila) === k; })[0]; if (!p) { delete cart[k]; return; }
        var fl = el('div', 'pos-l'); fl.appendChild(el('span', '', p.nombre + (p.detalle ? ' · ' + p.detalle : '')));
        var q = el('span', 'q'), m = el('button', 'pb sec', '−'), pl = el('button', 'pb sec', '+');
        m.onclick = function () { if (--cart[k] <= 0) delete cart[k]; carro(); grilla(); };
        pl.onclick = function () { if (p.stock !== '' && p.stock !== null && cart[k] >= p.stock) { aviso('No hay más stock'); return; } cart[k]++; carro(); grilla(); };
        q.appendChild(m); q.appendChild(el('b', '', String(cart[k]))); q.appendChild(pl); fl.appendChild(q); fl.appendChild(el('span', 'm', clp(p.precio * cart[k]))); tot += p.precio * cart[k]; der.appendChild(fl);
      });
      var t = el('div', 'pos-tot'); t.appendChild(el('span', '', 'Total')); t.appendChild(el('b', '', clp(tot))); der.appendChild(t);
      der.appendChild(el('small', 'lb', '¿Cómo se paga?')); var pg = el('div', 'pos-pago');
      [[PAGOS[0], '💵 Efectivo'], [PAGOS[1], '🏦 Transferencia'], [PAGOS[2], '🎧 Entregado en sala']].forEach(function (x) { var b = el('button', 'pb' + (PAGO_SEL[tipo] === x[0] ? ' on' : ''), x[1]); b.onclick = function () { PAGO_SEL[tipo] = x[0]; carro(); }; pg.appendChild(b); });
      der.appendChild(pg);
      var nt = el('input'); nt.placeholder = 'Comprador o banda (opcional)'; nt.maxLength = 100; nt.value = NOTA[tipo]; nt.oninput = function () { NOTA[tipo] = nt.value; }; der.appendChild(nt);
      var ok = el('button', 'pos-ok', 'Confirmar venta' + (tot ? ' · ' + clp(tot) : ''));
      ok.onclick = function () {
        if (!ks.length) { aviso('Agrega productos a la venta.'); return; } if (!PAGO_SEL[tipo]) { aviso('Elige cómo se paga.'); return; }
        ok.disabled = true;
        post('socios_carrito', { tipo: tipo, items: ks.map(function (k) { return { fila: Number(k), cantidad: cart[k] }; }), pago: PAGO_SEL[tipo], nota: NOTA[tipo] }).then(function (r) {
          if (r.ok) { CART[tipo] = {}; PAGO_SEL[tipo] = ''; NOTA[tipo] = ''; aviso('Venta registrada ✔', true); cargar(); } else { ok.disabled = false; aviso(r.error || 'No se pudo registrar.'); }
        }).catch(function () { ok.disabled = false; aviso('No se pudo registrar. Revisa tu conexión.'); });
      };
      der.appendChild(ok);
    }
    carro();
  }
  function pintarHistorial() {
    var s = $('v-historial'); s.textContent = ''; var r = datos.resumen;
    var sel = el('select'); r.meses.forEach(function (m) { var o = el('option', '', m); o.value = m; if (m === mes) o.selected = true; sel.appendChild(o); });
    sel.onchange = function () { mes = sel.value; cargar(); }; sel.style.maxWidth = '180px'; s.appendChild(sel);
    var gn = datos.general; s.appendChild(el('h3', '', 'Resumen general del mes (sala y estudio)'));
    var cg = el('div', 'cifras'); s.appendChild(cg);
    [['Jornadas finalizadas', gn.jornadas, 1], ['Horas', gn.horas, 1], ['Sala de ensayo', gn.sala], ['Estudio', gn.estudio], ['Extras y video', gn.extras + gn.video], ['Material en bruto', gn.bruto], ['Total ingresos', gn.total], ['Reservas por realizar', gn.pendientes, 1]].forEach(function (x) { var d = el('div', 'cifra'); d.appendChild(el('small', '', x[0])); d.appendChild(el('b', '', x[2] ? String(x[1]) : clp(x[1]))); cg.appendChild(d); });
    if (gn.historial && gn.historial.length) {
      s.appendChild(el('h3', '', 'Balances cerrados')); var th0 = el('table', 'tab-p'), bh0 = el('tbody'); th0.appendChild(bh0); s.appendChild(th0);
      gn.historial.slice(0, 12).forEach(function (h) { var tr = el('tr'); [h.mes, 'Brutos ' + clp(h.brutos), 'Sala ' + clp(h.sala), 'Estudio ' + clp(h.estudio), 'Juan Carlos ' + clp(h.jc), 'Jaime ' + clp(h.jaime), 'Estudio ' + clp(h.est)].forEach(function (x) { tr.appendChild(el('td', '', x)); }); bh0.appendChild(tr); });
    }
    s.appendChild(el('h3', '', 'Tienda y bebestibles · cuenta aparte (no suma al balance)'));
    var c = el('div', 'cifras'); s.appendChild(c);
    [['Cobrado del mes', r.cobrado], ['Efectivo', r.efectivo], ['Transferencia', r.transferencia], ['Por cobrar (mes)', r.porCobrar], ['Pendiente total', r.pendienteTotal]].forEach(function (x) {
      var d = el('div', 'cifra'); d.appendChild(el('small', '', x[0])); d.appendChild(el('b', '', clp(x[1]))); c.appendChild(d);
    });
    var det = el('p', 'sub'); var partes = [];
    Object.keys(r.porTipo).forEach(function (k) { partes.push(k + ': ' + clp(r.porTipo[k].cobrado)); });
    Object.keys(r.porVendedor).forEach(function (k) { partes.push('Vendió ' + k + ': ' + clp(r.porVendedor[k].cobrado)); });
    det.textContent = partes.join(' · '); s.appendChild(det);
    s.appendChild(el('h3', '', 'Por cobrar'));
    if (!datos.pendientes.length) s.appendChild(el('p', 'sub', 'Nada por cobrar.'));
    var tp = el('table', 'tab-p'), bp = el('tbody'); tp.appendChild(bp); s.appendChild(tp);
    datos.pendientes.forEach(function (v) {
      var tr = el('tr'); [v.fecha, v.cantidad + ' × ' + v.producto + ' (' + v.tipo + ')', clp(v.total), v.vendedor].forEach(function (x) { tr.appendChild(el('td', '', x)); });
      var td = el('td');
      [['Cobrado: efectivo', PAGOS[0]], ['Cobrado: transferencia', PAGOS[1]]].forEach(function (o) {
        var b = el('button', 'pb', o[0]); pasoDoble(b, function () {
          post('socios_cobrar', { id: v.id, pago: o[1] }).then(function (x) { if (x.ok) { aviso('Cobro registrado', true); cargar(); } else aviso(x.error || 'No se pudo registrar.'); });
        }); td.appendChild(b);
      }); tr.appendChild(td); bp.appendChild(tr);
    });
    s.appendChild(el('h3', '', 'Historial de ventas'));
    var th = el('table', 'tab-p'), bh = el('tbody'); th.appendChild(bh); s.appendChild(th);
    if (!datos.ventas.length) s.appendChild(el('p', 'sub', 'Sin ventas este mes.'));
    datos.ventas.forEach(function (v) {
      var tr = el('tr'); [v.fecha, v.cantidad + ' × ' + v.producto, clp(v.total), v.pago, v.vendedor].forEach(function (x) { tr.appendChild(el('td', '', x)); }); bh.appendChild(tr);
    });
  }
  cargar();
})();
