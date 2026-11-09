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
  function pintarCatalogo(tipo) {
    var s = $('v-' + tipo); s.textContent = '';
    var lista = tipo === 'musica' ? datos.musica : datos.bebestibles;
    s.appendChild(el('p', 'sub', 'Elige cómo se pagó: efectivo, transferencia, o entregado en sesión con pago pendiente (queda en «Por cobrar»).'));
    if (!lista.length) s.appendChild(el('p', 'sub', 'No hay productos disponibles todavía.'));
    var g = el('div', 'prods'); s.appendChild(g);
    lista.forEach(function (p) {
      var c = el('div', 'prod'); c.appendChild(el('div', 'n', p.nombre + ' · ' + clp(p.precio)));
      if (p.detalle) c.appendChild(el('div', 'd', p.detalle));
      c.appendChild(el('div', 'd', p.stock === '' || p.stock === null ? 'Sin control de stock' : 'Stock: ' + p.stock));
      var a = el('div', 'acc'), q = el('input'); q.type = 'number'; q.min = 1; q.max = 99; q.value = 1; q.setAttribute('aria-label', 'Cantidad'); a.appendChild(q);
      ROT.forEach(function (n, i) {
        var b = el('button', 'pb' + (i === 2 ? ' sec' : ''), n);
        pasoDoble(b, function () {
          post('socios_vender', { tipo: tipo, fila: p.fila, cantidad: Number(q.value), pago: PAGOS[i] }).then(function (r) {
            if (r.ok) { aviso('Venta registrada (' + r.id + ')', true); cargar(); } else aviso(r.error || 'No se pudo registrar.');
          }).catch(function () { aviso('No se pudo registrar. Revisa tu conexión.'); });
        });
        a.appendChild(b);
      });
      c.appendChild(a); g.appendChild(c);
    });
  }
  function pintarHistorial() {
    var s = $('v-historial'); s.textContent = ''; var r = datos.resumen;
    var sel = el('select'); r.meses.forEach(function (m) { var o = el('option', '', m); o.value = m; if (m === mes) o.selected = true; sel.appendChild(o); });
    sel.onchange = function () { mes = sel.value; cargar(); }; sel.style.maxWidth = '180px'; s.appendChild(sel);
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
