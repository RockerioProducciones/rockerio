/* Portal de socios. El enlace secreto (?t=…) se guarda solo en esta pestaña y se borra de la barra de direcciones. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', R = window.Reglas;
  var PAGOS = ['Venta efectivo', 'Venta transferencia', 'Entregado en sesión (pago pendiente)'], ROT = ['Efectivo', 'Transferencia', 'Entregado (pendiente)'];
  var token = '', datos = null, mes = '', vista = 'agenda';
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function $(i) { return document.getElementById(i); }
  function clp(n) { return R.clp(n); }
  function aviso(t, ok) { var a = $('aviso'); a.textContent = t; a.hidden = !t; a.className = 'aviso-msg' + (ok ? ' ok' : ''); if (t) setTimeout(function () { a.hidden = true; }, 6000); }

  var MODO = (document.body.getAttribute('data-modo') || ''), CLAVE_LS = 'rk_clave_' + (MODO || 'socios');
  try {
    var u = new URL(location.href), t = u.searchParams.get('t');
    if (t) { sessionStorage.setItem('rk_socio', t); history.replaceState(null, '', location.pathname); }
    token = sessionStorage.getItem('rk_socio') || '';
    if (!token) token = localStorage.getItem(CLAVE_LS) || '';
  } catch (e) { token = ''; }

  /* Indicador de guardado (igual que en el portal de administración): «Guardando…» al instante y «Guardado» con el tiempo. */
  var pill = null, pTmr = null;
  function indicador(txt, cls) {
    if (!pill) {
      var st = document.createElement('style');
      st.textContent = '#guarda{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;padding:9px 16px;border-radius:999px;font-weight:700;font-size:.95rem;box-shadow:0 8px 24px rgba(0,0,0,.55);pointer-events:none;border:1px solid transparent;display:none;max-width:92vw;text-align:center}#guarda.g-ocu{background:#1b1710;color:#ffd166;border-color:#ffd166}#guarda.g-ok{background:#0f2a1a;color:#4ade80;border-color:#4ade80}#guarda.g-err{background:#2a1010;color:#ff8a8a;border-color:#ff5a5f}';
      document.head.appendChild(st); pill = document.createElement('div'); pill.id = 'guarda'; pill.setAttribute('role', 'status'); document.body.appendChild(pill);
    }
    pill.className = cls; pill.textContent = txt; pill.style.display = 'block';
  }
  function post(accion, cuerpo) {
    cuerpo.accion = accion; cuerpo.t = token;
    var t0 = Date.now(); clearTimeout(pTmr); indicador('⏳ Guardando…', 'g-ocu');
    function fin(bien) {
      var seg = ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',');
      indicador(bien ? '✔ Guardado (' + seg + ' s)' : '⚠ No se pudo guardar — revisa el aviso', bien ? 'g-ok' : 'g-err');
      clearTimeout(pTmr); pTmr = setTimeout(function () { if (pill) pill.style.display = 'none'; }, bien ? 2200 : 7000);
    }
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo) }).then(function (r) { return r.json(); }).then(function (d) { fin(!(d && d.ok === false)); return d; }, function (e) { fin(false); throw e; });
  }
  function cargar() {
    return fetch(API + '?accion=socios&t=' + encodeURIComponent(token) + (mes ? '&mes=' + encodeURIComponent(mes) : '')).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) { try { localStorage.removeItem(CLAVE_LS); sessionStorage.removeItem('rk_socio'); } catch (e) { /* sin almacenamiento */ } token = ''; $('tabs').textContent = ''; pedirClave('Clave incorrecta. Revisa que esté bien escrita.'); return; }
      try { if (MODO) localStorage.setItem(CLAVE_LS, token); } catch (e) { /* sin almacenamiento */ }
      $('login').hidden = true; datos = d; mes = d.resumen ? d.resumen.mes : ''; pintar();
    }).catch(function () { aviso('No pudimos cargar los datos. Revisa tu conexión.'); });
  }
  if (window.RKSync) window.RKSync.alCambiar(function () { if (token && datos) cargar(); });
  function pedirClave(msg) {
    $('hola').textContent = MODO === 'social' ? 'Agenda del estudio' : MODO === 'colega' ? 'Portal ProAudix' : 'Portal de socios';
    var f = $('login'); f.hidden = false; if (msg) aviso(msg);
    f.onsubmit = function (e) { e.preventDefault(); var v = $('clave').value.trim().toLowerCase(); if (!v) return; token = v; cargar(); };
    $('clave').focus();
  }
  if (!API) { $('hola').textContent = 'Sitio sin conexión'; aviso('El sitio aún no está conectado al sistema.'); return; }
  if (!token) { pedirClave(''); return; }

  var TODAS = [['agenda', 'Agenda'], ['musica', 'Tienda de música'], ['bebestible', 'Bebestibles'], ['historial', 'Historial y resumen']], TABS = TODAS;
  function pintar() {
    $('hola').textContent = 'Hola, ' + datos.socio; TABS = datos.tipo === 'social' ? TODAS.slice(0, 1) : TODAS; if (datos.tipo === 'social') vista = 'agenda';
    var tb = $('tabs'); tb.textContent = '';
    TABS.forEach(function (x) { var b = el('button', '', x[1]); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(x[0] === vista)); b.onclick = function () { vista = x[0]; pintar(); }; tb.appendChild(b); });
    TABS.forEach(function (x) { $('v-' + x[0]).hidden = x[0] !== vista; });
    if (vista === 'agenda') pintarAgenda(); else if (vista === 'historial') pintarHistorial(); else pintarCatalogo(vista);
  }
  var amesAg = '', selDia = '', vistaAg = 'sem', semAg = '';
  function sumD(f, n) { var d = new Date(f + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function lunesDe(f) { var d = new Date(f + 'T12:00:00Z'); return sumD(f, -((d.getUTCDay() + 6) % 7)); }
  var SHS = 40;
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var COL0 = { ens: '#f5b400', est: '#ef4444', p8: '#3b82f6', p12: '#a855f7', vivo: '#06b6d4', bloq: '#8a8581' };
  function colorEv(x) { var c = (datos && datos.colores) || {}, k = x.cl || (x.estado === 'Bloqueo' ? 'bloq' : /grab|estudio/i.test(x.servicio) ? 'est' : 'ens'); return /^#[0-9a-f]{6}$/i.test(c[k] || '') ? c[k] : COL0[k]; }
  function marcaEv(x) { return x.estado === 'Finalizada' ? (x.porCobrar ? ['pc', '$'] : ['ok', '✔']) : x.estado === 'No asiste' ? ['no', '✕'] : null; }
  function semanaSoc(por, hoy) {
    var dias = []; for (var i = 0; i < 7; i++) dias.push(sumD(semAg, i));
    var ini = 24, fin = 0;
    dias.forEach(function (f) { (por[f] || []).forEach(function (x) { if (x.estado === 'Bloqueo') return; var a = Math.floor(hDec(x.inicio)), z = Math.ceil(hDec(x.fin)); ini = Math.min(ini, a); fin = Math.max(fin, z); }); });
    ini = Math.min(ini, 10); fin = Math.max(fin, 22); if (fin <= ini) fin = ini + 1;
    var DS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], w = el('div', 'sm'), cab = el('div', 'sm-cab'); cab.appendChild(el('div'));
    dias.forEach(function (f, k) { var h = el('div', 'sm-h' + (f === hoy ? ' hoy' : '') + (f === selDia ? ' sel' : '')); h.appendChild(el('span', '', DS[k])); h.appendChild(el('b', '', String(Number(f.slice(8))))); h.onclick = function () { selDia = f; pintarAgenda(); }; cab.appendChild(h); });
    w.appendChild(cab);
    var cu = el('div', 'sm-c'), hc = el('div', 'sm-hr'); hc.style.height = ((fin - ini) * SHS) + 'px';
    for (var hh = ini; hh < fin; hh++) { var l = el('div', '', hh + ':00'); l.style.top = ((hh - ini) * SHS) + 'px'; hc.appendChild(l); } cu.appendChild(hc);
    dias.forEach(function (f) {
      var col = el('div', 'sm-d' + (f === hoy ? ' hoy' : '')); col.style.height = ((fin - ini) * SHS) + 'px';
      for (var hh = ini; hh < fin; hh++) { var ln = el('div', 'sm-l'); ln.style.top = ((hh - ini) * SHS) + 'px'; col.appendChild(ln); }
      col.onclick = function (ev) { if (ev.target === col || /sm-l/.test(ev.target.className)) { selDia = f; pintarAgenda(); } };
      (por[f] || []).forEach(function (x) {
        var blq = x.estado === 'Bloqueo', a = blq ? (x.inicio ? hDec(x.inicio) : ini) : hDec(x.inicio), z = blq ? (x.fin ? hDec(x.fin) : fin) : hDec(x.fin);
        a = Math.max(a, ini); z = Math.min(z, fin); if (z <= a) return;
        var c = el('div', 'sm-r' + (blq ? ' bq' : '')); c.style.setProperty('--c', colorEv(x)); c.style.top = ((a - ini) * SHS) + 'px'; c.style.height = ((z - a) * SHS - 2) + 'px';
        c.appendChild(el('b', '', blq ? '🔒' : x.inicio.replace(':00', '') + '–' + x.fin.replace(':00', ''))); c.appendChild(el('div', 'sm-n', x.banda)); if (z - a >= 2 && !blq) c.appendChild(el('div', 'sm-n s', x.servicio));
        var mk = marcaEv(x); if (mk) { c.classList.add('sm-' + mk[0]); c.appendChild(el('i', 'mk ' + mk[0], mk[1])); }
        c.onclick = function (ev) { ev.stopPropagation(); selDia = f; pintarAgenda(); setTimeout(function () { var d = document.querySelector('.ag-det'); if (d && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50); };
        col.appendChild(c);
      });
      cu.appendChild(col);
    });
    w.appendChild(cu); return w;
  }
  function pintarAgenda() {
    var s = $('v-agenda'); s.textContent = '';
    var hoy = datos.ahora.fecha; if (!amesAg) amesAg = hoy.slice(0, 7); if (!selDia) selDia = hoy; var SEM = vistaAg === 'sem'; if (!semAg) semAg = lunesDe(selDia);
    var y = Number(amesAg.slice(0, 4)), m = Number(amesAg.slice(5, 7));
    var MS = MESES.map(function (x) { return x.toLowerCase(); }), zz = sumD(semAg, 6);
    var cab = el('div', 'ag-cab'); cab.appendChild(el('h2', '', SEM ? 'Semana del ' + semAg.slice(8) + '/' + semAg.slice(5, 7) + '/' + semAg.slice(0, 4) + ' al ' + zz.slice(8) + '/' + zz.slice(5, 7) + '/' + zz.slice(0, 4) : MESES[m - 1] + ' ' + y));
    var nv = el('div', 'ag-nav'); function ir(k) { if (SEM) { semAg = sumD(semAg, 7 * k); selDia = semAg; amesAg = semAg.slice(0, 7); pintarAgenda(); return; } var yy = y, mm = m + k; if (mm < 1) { mm = 12; yy--; } if (mm > 12) { mm = 1; yy++; } amesAg = yy + '-' + String(mm).padStart(2, '0'); pintarAgenda(); }
    [['Mes', function () { vistaAg = 'mes'; amesAg = selDia.slice(0, 7); pintarAgenda(); }, SEM ? 'sec' : ''], ['Semana', function () { vistaAg = 'sem'; semAg = lunesDe(selDia); pintarAgenda(); }, SEM ? '' : 'sec'], ['‹', function () { ir(-1); }, 'sec'], ['Hoy', function () { amesAg = hoy.slice(0, 7); selDia = hoy; semAg = lunesDe(hoy); pintarAgenda(); }, 'sec'], ['›', function () { ir(1); }, 'sec']].forEach(function (x) { var b = el('button', 'pb ' + x[2], x[0]); b.type = 'button'; b.onclick = x[1]; nv.appendChild(b); });
    cab.appendChild(nv); s.appendChild(cab);
    s.appendChild(el('p', 'sub', 'Agenda oficial del estudio. Solo lectura: toca un bloque o un día para ver sus sesiones.'));
    var ley = el('div', 'ag-ley'); [['Sala de ensayo', colorEv({ cl: 'ens' })], ['Estudio de grabación', colorEv({ cl: 'est' })], ['Plan mensual 8 h', colorEv({ cl: 'p8' })], ['Plan mensual 12 h', colorEv({ cl: 'p12' })], ['Rockerío en vivo', colorEv({ cl: 'vivo' })], ['Bloqueo', colorEv({ cl: 'bloq' })]].forEach(function (x) { var e = el('span', '', x[0]); e.style.setProperty('--c', x[1]); ley.appendChild(e); }); s.appendChild(ley);
    var por = {}; datos.agenda.forEach(function (x) { (por[x.fecha] = por[x.fecha] || []).push(x); });
    if (SEM) { s.appendChild(semanaSoc(por, hoy)); } else {
    var g = el('div', 'ag-grid');
    [['Lunes', 'Lun'], ['Martes', 'Mar'], ['Miércoles', 'Mié'], ['Jueves', 'Jue'], ['Viernes', 'Vie'], ['Sábado', 'Sáb'], ['Domingo', 'Dom']].forEach(function (d) { var e = el('div', 'ag-dow'); e.appendChild(el('span', 'f', d[0])); e.appendChild(el('span', 'a', d[1])); g.appendChild(e); });
    var off = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7, nd = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (var i = 0; i < off; i++) g.appendChild(el('div', 'ag-dia vacio'));
    for (var d = 1; d <= nd; d++) (function (d) {
      var f = amesAg + '-' + String(d).padStart(2, '0'), ev = por[f] || [], c = el('button', 'ag-dia' + (f === hoy ? ' hoy' : '') + (f === selDia ? ' sel' : '') + (ev.length ? ' con' : '')); c.type = 'button';
      c.appendChild(el('span', 'n', String(d)));
      ev.slice(0, 3).forEach(function (x) { var ch = el('span', 'ag-ev', x.inicio.replace(':00', '') + ' ' + x.banda); ch.style.setProperty('--c', colorEv(x)); var mk = marcaEv(x); if (mk) { ch.style.position = 'relative'; ch.style.paddingRight = '20px'; ch.appendChild(el('i', 'mk ' + mk[0], mk[1])); } c.appendChild(ch); });
      if (ev.length > 3) c.appendChild(el('span', 'ag-mas', '+' + (ev.length - 3) + ' más'));
      var pts = el('span', 'ag-pts'); ev.slice(0, 6).forEach(function (x) { var p = el('i'), mk = marcaEv(x); p.style.background = colorEv(x); if (mk) p.className = 'st-' + mk[0]; pts.appendChild(p); }); c.appendChild(pts);
      c.onclick = function () { selDia = f; pintarAgenda(); }; g.appendChild(c);
    })(d);
    s.appendChild(g); }
    var ev = (por[selDia] || []).slice().sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; }), det = el('div', 'ag-det');
    det.appendChild(el('h3', '', R.fechaLarga(selDia) + ' · ' + ev.length + (ev.length === 1 ? ' sesión' : ' sesiones')));
    if (!ev.length) det.appendChild(el('p', 'sub', 'Sin reservas ni bloqueos este día.'));
    ev.forEach(function (x) { var e = el('div', 'ag-it'); e.style.setProperty('--c', colorEv(x)); e.appendChild(el('b', '', x.inicio + (x.fin ? ' – ' + x.fin : ''))); e.appendChild(el('span', '', x.banda + ' · ' + x.servicio)); var mk2 = marcaEv(x); if (mk2) e.appendChild(el('i', 'mk mk-s ' + mk2[0], mk2[1])); e.appendChild(el('span', 'st', x.estado)); det.appendChild(e); });
    s.appendChild(det);
  }
  function pasoDoble(b, fn) { var t = b.textContent; b.onclick = function () { if (b.textContent !== t) { fn(); return; } b.textContent = '¿Confirmar?'; setTimeout(function () { b.textContent = t; }, 4000); }; }
  var CART = { musica: {}, bebestible: {} }, PAGO_SEL = { musica: '', bebestible: '' }, NOTA = { musica: '', bebestible: '' }, RES_SEL = { musica: '', bebestible: '' };
  function horaCL() { try { var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':'); return Number(p[0]) + Number(p[1]) / 60; } catch (e) { var n = new Date(); return n.getHours() + n.getMinutes() / 60; } }
  function hDec(s) { var m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? Number(m[1]) + Number(m[2]) / 60 : 0; }
  function fotoOk(u) { u = u || ''; if (/^assets\/[\w\/.\-]+$/.test(u) && u.indexOf('..') < 0) return u; return /^https:\/\//.test(u) ? u : ''; }
  var HIST_VER = { musica: false, bebestible: false, todo: true };
  function tablaVentas(lista, accion) {
    var w = el('div', 'vt-tabla-w'), tb = el('table', 'vt-tabla'), th = el('thead'), trh = el('tr');
    ['Fecha', 'Producto', 'Cant.', 'Total', 'Medio de pago', 'Estado', 'Comprador / comentario'].concat(accion ? ['Cobrar'] : []).forEach(function (h) { trh.appendChild(el('th', '', h)); });
    th.appendChild(trh); tb.appendChild(th); var bd = el('tbody');
    lista.slice(0, 150).forEach(function (x) {
      var tr = el('tr'), an = x.pago === 'Anulada', pe = /pendiente/i.test(x.pago), medio = /efectivo/i.test(x.pago) ? 'Efectivo' : /transfer/i.test(x.pago) ? 'Transferencia' : '—'; if (an) tr.className = 'an';
      tr.appendChild(el('td', '', x.fecha)); tr.appendChild(el('td', 'vt-prod', x.producto)); tr.appendChild(el('td', '', x.cantidad + ' un.')); tr.appendChild(el('td', 'vt-tot', clp(x.total)));
      var cm = el('td'); cm.appendChild(el('span', 'vt-medio', medio)); tr.appendChild(cm);
      var ce = el('td'); ce.appendChild(el('span', 'vt-est ' + (an ? 'x' : pe ? 'p' : 'pg'), an ? 'Anulada' : pe ? 'Pendiente' : '✓ Pagado')); tr.appendChild(ce);
      tr.appendChild(el('td', 'vt-com', (x.cliente ? '🎸 ' + x.cliente + ' · ' : '') + (x.nota || '—') + (x.vendedor ? ' · ' + x.vendedor : ''))); if (accion) { var ca = el('td', 'vt-acc'); accion(x, ca); tr.appendChild(ca); } bd.appendChild(tr);
    });
    tb.appendChild(bd); w.appendChild(tb); return w;
  }
  /* Historial como el del administrador; por tipo (Música/Bebestibles) o de todo el mes (tipo = null). */
  function histVentas(txt, clave) {
    var k = clave || 'todo', lista = datos.ventas.filter(function (x) { return !clave || x.tipo === txt; }), box = el('div', 'vt-hist-box');
    var cab = el('div', 'vt-hist-cab'); cab.appendChild(el('b', '', 'Historial de ventas (' + lista.length + ')'));
    var bt = el('button', 'pb sec', HIST_VER[k] ? 'Ocultar historial' : 'Mostrar historial'); bt.type = 'button';
    bt.onclick = function () { HIST_VER[k] = !HIST_VER[k]; pintar(); }; cab.appendChild(bt); box.appendChild(cab);
    if (HIST_VER[k]) { var h = el('div', 'vt-hist'); if (!lista.length) h.appendChild(el('p', 'sub', 'Sin ventas este mes.')); else h.appendChild(tablaVentas(lista)); box.appendChild(h); }
    return box;
  }
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
      var h0 = horaCL(), ses = (datos.sesiones || []).map(function (q) { var a = hDec(q.inicio), b = hDec(q.fin); return { codigo: q.codigo, banda: q.banda, inicio: q.inicio, fin: q.fin, servicio: q.servicio, fase: h0 >= a && h0 < b ? 'curso' : (h0 < a ? 'proxima' : 'terminada') }; });
      var ord = { curso: 0, proxima: 1, terminada: 2 }; ses.sort(function (a, b) { return ord[a.fase] - ord[b.fase] || (a.inicio < b.inicio ? -1 : 1); });
      var enc = ses.filter(function (q) { return q.fase === 'curso'; });
      if (!RES_SEL[tipo] && !ses.length) RES_SEL[tipo] = 'SUELTA'; if (!RES_SEL[tipo] && enc.length === 1) RES_SEL[tipo] = enc[0].codigo;
      var lr = el('label', 'pos-nota'); lr.appendChild(el('b', '', '¿A qué cliente va esta venta?'));
      var sr = el('select'); sr.appendChild(new Option(ses.length ? '— Elige la reserva —' : '— Sin reservas hoy —', ''));
      ses.forEach(function (q) { sr.appendChild(new Option((q.fase === 'curso' ? '🟢 En curso · ' : q.fase === 'proxima' ? '🕒 Próxima · ' : '⚪ Terminada · ') + q.banda + ' · ' + q.inicio + '–' + q.fin + ' · ' + q.servicio, q.codigo)); });
      sr.appendChild(new Option('Venta suelta (sin reserva)', 'SUELTA')); sr.value = RES_SEL[tipo] || ''; if (sr.value !== (RES_SEL[tipo] || '')) { RES_SEL[tipo] = ''; sr.value = ''; }
      sr.onchange = function () { RES_SEL[tipo] = sr.value; }; lr.appendChild(sr); lr.appendChild(el('small', 'sub', 'Si hay dos bandas a la vez, elige para cada pedido. Los ingresos quedan separados por reserva.')); der.appendChild(lr);
      der.appendChild(el('small', 'lb', '¿Cómo se paga?')); var pg = el('div', 'pos-pago');
      [[PAGOS[0], '💵 Efectivo'], [PAGOS[1], '🏦 Transferencia'], [PAGOS[2], '🎧 Entregado en sala']].forEach(function (x) { var b = el('button', 'pb' + (PAGO_SEL[tipo] === x[0] ? ' on' : ''), x[1]); b.onclick = function () { PAGO_SEL[tipo] = x[0]; carro(); }; pg.appendChild(b); });
      der.appendChild(pg);
      var lc = el('label', 'pos-nota'); lc.appendChild(el('b', '', 'Comentario de la venta'));
      var nt = el('textarea'); nt.rows = 3; nt.placeholder = 'Comprador o banda y detalles (ej.: entregado en el ensayo de 18:00)'; nt.maxLength = 120; nt.value = NOTA[tipo]; nt.oninput = function () { NOTA[tipo] = nt.value; }; lc.appendChild(nt); der.appendChild(lc);
      var ok = el('button', 'pos-ok', 'Confirmar venta' + (tot ? ' · ' + clp(tot) : ''));
      ok.onclick = function () {
        if (!ks.length) { aviso('Agrega productos a la venta.'); return; } if (!RES_SEL[tipo]) { aviso('Elige a qué reserva (cliente) va la venta, o «Venta suelta».'); return; } if (!PAGO_SEL[tipo]) { aviso('Elige cómo se paga.'); return; }
        ok.disabled = true;
        post('socios_carrito', { tipo: tipo, items: ks.map(function (k) { return { fila: Number(k), cantidad: cart[k] }; }), pago: PAGO_SEL[tipo], nota: NOTA[tipo], reserva: RES_SEL[tipo] === 'SUELTA' ? '' : RES_SEL[tipo] }).then(function (r) {
          if (r.ok) { CART[tipo] = {}; PAGO_SEL[tipo] = ''; NOTA[tipo] = ''; RES_SEL[tipo] = ''; aviso('Venta registrada ✔', true); cargar(); } else { ok.disabled = false; aviso(r.error || 'No se pudo registrar.'); }
        }).catch(function () { ok.disabled = false; aviso('No se pudo registrar. Revisa tu conexión.'); });
      };
      der.appendChild(ok);
      var va = el('button', 'pb sec pos-vaciar', '🗑 Vaciar carro'); va.type = 'button';
      va.onclick = function () { Object.keys(cart).forEach(function (k) { delete cart[k]; }); PAGO_SEL[tipo] = ''; NOTA[tipo] = ''; RES_SEL[tipo] = ''; carro(); grilla(); aviso('Carro vaciado', true); };
      der.appendChild(va);
    }
    carro();
    s.appendChild(histVentas(tipo === 'musica' ? 'Música' : 'Bebestibles', tipo));
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
    if (datos.pendientes.length) {
      var hp = el('div', 'vt-hist'); hp.appendChild(tablaVentas(datos.pendientes, function (v, td) {
        var tg = el('button', 'pb vt-cob-t', 'Cobrar ▾'); tg.type = 'button'; tg.onclick = function () { td.classList.toggle('abierto'); }; td.appendChild(tg);
        [['Cobrado: efectivo', PAGOS[0], 'efectivo'], ['Cobrado: transferencia', PAGOS[1], 'transferencia']].forEach(function (o) {
          var b = el('button', 'pb', o[0]); b.type = 'button';
          b.onclick = function () {
            var nodes = [].slice.call(td.childNodes); td.textContent = ''; td.classList.remove('abierto');
            td.appendChild(el('span', 'vt-conf', '¿Registrar ' + clp(v.total) + ' cobrados en ' + o[2] + '?'));
            var si = el('button', 'pb', 'Sí, cobrado'); si.type = 'button';
            si.onclick = function () {
              datos.pendientes = datos.pendientes.filter(function (q) { return q.id !== v.id; }); datos.ventas.forEach(function (q) { if (q.id === v.id) q.pago = o[1]; }); pintar(); aviso('Cobro registrado ✔', true);
              post('socios_cobrar', { id: v.id, pago: o[1] }).then(function (x) { cargar(); if (!x.ok) aviso(x.error || 'No se pudo registrar.'); }).catch(function () { cargar(); aviso('No se pudo registrar. Revisa tu conexión.'); });
            };
            var no = el('button', 'pb sec', 'No'); no.type = 'button'; no.onclick = function () { td.textContent = ''; nodes.forEach(function (n) { td.appendChild(n); }); };
            td.appendChild(si); td.appendChild(no);
          };
          td.appendChild(b);
        });
      })); s.appendChild(hp);
    }
    s.appendChild(histVentas('', null));
  }
  cargar();
})();
