/**
 * Tienda de música, bebestibles y sus ventas; costos mensuales y cierre de mes.
 * Cada venta tiene 3 estados de pago: Venta efectivo, Venta transferencia, Entregado en sesión (pago pendiente).
 * Todo queda en la hoja «Ventas» (nunca se borra); el Balance y los resúmenes se calculan desde ahí.
 */

var PAGO = { EFECTIVO: 'Venta efectivo', TRANSFERENCIA: 'Venta transferencia', PENDIENTE: 'Entregado en sesión (pago pendiente)', ANULADA: 'Anulada' };
var PAGOS_VENTA = [PAGO.EFECTIVO, PAGO.TRANSFERENCIA, PAGO.PENDIENTE];
var COLS_VENTAS = 13;
var VT = { fecha: 1, producto: 2, cantidad: 3, precio: 4, total: 5, tipo: 6, pago: 7, vendedor: 8, nota: 9, cobro: 10, id: 11, reserva: 12, cliente: 13 };
var ETIQUETA_TIPO = { musica: 'Música', bebestible: 'Bebestibles' };

function pagoNorm_(v) {
  var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
  var todos = PAGOS_VENTA.concat([PAGO.ANULADA]);
  for (var i = 0; i < todos.length; i++) if (todos[i].toLowerCase() === s) return todos[i];
  return '';
}

function tipoCatalogo_(t) { return t === 'bebestible' ? 'bebestible' : 'musica'; }
function hojaCatalogo_(tipo) { return abrirBd_().getSheetByName(tipoCatalogo_(tipo) === 'bebestible' ? HOJAS.bebestibles : HOJAS.tienda); }

function leerProductos_(tipo) {
  var sh = hojaCatalogo_(tipo), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 7).getValues().forEach(function (r, i) {
    if (!r[1]) return;
    out.push({
      fila: i + 2, categoria: String(r[0] || ''), nombre: String(r[1]), detalle: String(r[2] || ''),
      precio: r[3] === '' ? '' : Reglas.aNumero(r[3], ''), stock: r[4] === '' ? '' : Reglas.aNumero(r[4], ''),
      visible: Reglas.aBool(r[5], false), foto: String(r[6] || '')
    });
  });
  return out;
}

/* ---------- catálogo (administrador) ---------- */

var CARPETA_PRODUCTOS = 'Rockerío · Fotos de productos';
function guardarFotoProducto_(b64, nombre) {
  var bytes = decodificar_(b64, 500 * 1024), t = tipoImagen_(bytes);
  if (!t) throw new Error('La foto debe ser una imagen PNG, JPG o WebP.');
  var id = guardarPublico_(carpetaDrive_(CARPETA_PRODUCTOS), 'prod-' + String(nombre).replace(/[^\w\- ]/g, '').slice(0, 30) + '-' + Date.now() + '.' + t[1], t[0], bytes);
  return 'https://lh3.googleusercontent.com/d/' + id;
}

/** p = {tipo, fila (vacío = nuevo), categoria, nombre, detalle, precio, stock, visible}. Precio y stock vacíos son válidos. */
function adminGuardarProducto(p) {
  exigirAdmin_();
  var nombre = limpiar_(p.nombre, 100);
  if (!nombre) throw new Error('El producto necesita un nombre.');
  var precio = String(p.precio === null || p.precio === undefined ? '' : p.precio).trim();
  var stock = String(p.stock === null || p.stock === undefined ? '' : p.stock).trim();
  if (precio !== '' && !(Number(precio) >= 0)) throw new Error('Precio inválido.');
  if (stock !== '' && !(Number(stock) >= 0 && Number(stock) % 1 === 0)) throw new Error('El stock debe ser un número entero.');
  var foto = String(p.foto || '').trim();
  if (foto && !fotoValida_(foto)) throw new Error('La foto debe ser una ruta del sitio (assets/…jpg) o un enlace https.');
  if (p.fotoB64) foto = guardarFotoProducto_(p.fotoB64, nombre); // foto subida desde el portal: se guarda en tu Drive
  var fila = [
    textoSeguro_(limpiar_(p.categoria, 40) || 'Otros'), textoSeguro_(nombre), textoSeguro_(limpiar_(p.detalle, 150)),
    precio === '' ? '' : Number(precio), stock === '' ? '' : Number(stock), p.visible ? 'SI' : 'NO', foto
  ];
  return conBloqueo_(function () {
    var sh = hojaCatalogo_(p.tipo), ant = p.fila ? sh.getRange(filaProducto_(sh, p.fila), 1, 1, 7).getValues()[0] : null;
    if (p.fila) sh.getRange(filaProducto_(sh, p.fila), 1, 1, 7).setValues([fila]); else sh.appendRow(fila);
    registrarCambio_('Producto', nombre, ant ? ant.join(' | ') : '', fila.join(' | '));
    if (stock !== '') {
      var antesSt = ant && ant[4] !== '' ? Number(ant[4]) : 0, nuevoSt = Number(stock);
      if (!ant && nuevoSt > 0) registrarIngresoStock_(p.tipo, nombre + (fila[2] ? ' · ' + fila[2] : ''), nuevoSt, 0, nuevoSt, 'Producto nuevo');
      else if (ant && nuevoSt > antesSt) registrarIngresoStock_(p.tipo, nombre + (fila[2] ? ' · ' + fila[2] : ''), nuevoSt - antesSt, antesSt, nuevoSt, 'Ajuste de stock');
    }
    return adminResumen();
  });
}

/** Agrega al catálogo los productos base que falten (por nombre) y les pone foto si no tenían. No toca precios ni stock existentes. */
function adminCargarBase(tipo) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var base = tipoCatalogo_(tipo) === 'bebestible' ? BASE_BEBESTIBLES : BASE_TIENDA, sh = hojaCatalogo_(tipo), n = sh.getLastRow();
    var datos = n > 1 ? sh.getRange(2, 1, n - 1, 7).getValues() : [];
    base.forEach(function (b) {
      var i = -1;
      datos.forEach(function (r, k) { if (String(r[1]).toLowerCase() === b[1].toLowerCase() && String(r[2]).toLowerCase() === b[2].toLowerCase()) i = k; });
      if (i < 0) { sh.appendRow(b); datos.push(b.slice()); if (Number(b[4]) > 0) registrarIngresoStock_(tipo, b[1] + (b[2] ? ' · ' + b[2] : ''), Number(b[4]), 0, Number(b[4]), 'Producto base'); }
      else if (!datos[i][6]) sh.getRange(i + 2, 7).setValue(b[6]);
    });
    return adminResumen();
  });
}

function adminEliminarProducto(fila, tipo) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = hojaCatalogo_(tipo), fp = filaProducto_(sh, fila);
    registrarCambio_('Producto eliminado', String(sh.getRange(fp, 2).getValue()), sh.getRange(fp, 1, 1, 7).getValues()[0].join(' | '), '');
    sh.deleteRow(fp);
    return adminResumen();
  });
}

/** Historial de ingresos de stock (hoja «StockIngresos»): cuándo se agregaron unidades, cuántas y con qué origen. */
function registrarIngresoStock_(tipo, producto, cantidad, antes, despues, origen) {
  try {
    if (!(Number(cantidad) > 0)) return;
    var ss = abrirBd_(), sh = ss.getSheetByName('StockIngresos');
    if (!sh) { sh = ss.insertSheet('StockIngresos'); sh.getRange(1, 1, 1, 7).setValues([['Fecha y hora', 'Tipo', 'Producto', 'Cantidad agregada', 'Stock antes', 'Stock después', 'Origen']]).setFontWeight('bold'); sh.setFrozenRows(1); }
    sh.appendRow([Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH:mm'), tipoCatalogo_(tipo), textoSeguro_(String(producto || '').slice(0, 150)), Number(cantidad), antes === '' ? 0 : Number(antes), Number(despues), String(origen || '')]);
    var n = sh.getLastRow(); if (n > 1501) sh.deleteRows(2, n - 1501);
  } catch (e) { console.error('registrarIngresoStock_: ' + e); }
}

/** Últimos ingresos de stock por tipo (más nuevos primero). */
function leerIngresosStock_() {
  var out = { musica: [], bebestible: [] };
  try {
    var sh = abrirBd_().getSheetByName('StockIngresos'), n = sh ? sh.getLastRow() : 0;
    if (n < 2) return out;
    sh.getRange(Math.max(2, n - 399), 1, Math.min(400, n - 1), 7).getValues().reverse().forEach(function (r) {
      var t = r[1] === 'bebestible' ? 'bebestible' : 'musica';
      if (out[t].length < 100) out[t].push({ fecha: String(r[0]), producto: String(r[2]), cantidad: Number(r[3]) || 0, antes: Number(r[4]) || 0, despues: Number(r[5]) || 0, origen: String(r[6]) });
    });
  } catch (e) { /* sin historial */ }
  return out;
}

function adminReponer(fila, cantidad, tipo) {
  exigirAdmin_();
  cantidad = Number(cantidad);
  if (!(cantidad >= 1 && cantidad % 1 === 0)) throw new Error('Cantidad inválida.');
  return conBloqueo_(function () {
    var sh = hojaCatalogo_(tipo), f = filaProducto_(sh, fila), actual = sh.getRange(f, 5).getValue(), antes = actual === '' ? 0 : Number(actual);
    sh.getRange(f, 5).setValue(antes + cantidad);
    registrarIngresoStock_(tipo, sh.getRange(f, 2).getValue() + (sh.getRange(f, 3).getValue() ? ' · ' + sh.getRange(f, 3).getValue() : ''), cantidad, antes, antes + cantidad, 'Reposición');
    return adminResumen();
  });
}

/* ---------- ventas ---------- */

function siguienteIdVenta_() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('CONTADOR_V') || 0) + 1;
  props.setProperty('CONTADOR_V', String(n));
  return 'V-' + (1000 + n);
}

/** Registra una venta: descuenta stock (si el producto lo lleva) y la anota. Debe llamarse dentro de conBloqueo_. */
/** Fecha de la venta: vacía = ahora. Con fecha (AAAA-MM-DD, no futura) se registra en esa fecha, para cargar el historial. */
function fechaVenta_(fecha) {
  if (!fecha) return new Date();
  fecha = String(fecha);
  if (!Reglas.fechaValida(fecha)) throw new Error('La fecha de la venta no es válida.');
  if (fecha > ahoraChile_().fecha) throw new Error('La fecha de la venta no puede ser futura.');
  return fechaHora_(fecha, 12);
}

/** Reservas de hoy a las que se puede asociar una venta (en curso, próximas o recién terminadas). Cada venta queda ligada a UNA reserva; los ingresos no se mezclan. */
function sesionesVenta_() {
  var ah = ahoraChile_(), out = [], sr = abrirBd_().getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n < 2) return out;
  function hh(s) { var m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? Number(m[1]) + Number(m[2]) / 60 : null; }
  sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    if (!r[RES.codigo - 1] || aFechaIso_(r[RES.fecha - 1]) !== ah.fecha) return;
    var e = estadoNorm_(r[RES.estado - 1]);
    if ([EST.SIN_ABONO, EST.CON_ABONO, EST.FINALIZADA].indexOf(e) < 0) return;
    var ini = horaCelda_(r[RES.inicio - 1]), fin = horaCelda_(r[RES.fin - 1]), a = hh(ini), b = hh(fin);
    if (a === null || b === null) return;
    var fase = ah.hora >= a && ah.hora < b ? 'curso' : (ah.hora < a ? 'proxima' : 'terminada');
    out.push({ codigo: String(r[RES.codigo - 1]), banda: String(r[RES.banda - 1]), servicio: String(r[RES.servicio - 1]), inicio: ini, fin: fin, fase: fase });
  });
  var orden = { curso: 0, proxima: 1, terminada: 2 };
  return out.sort(function (x, y) { return orden[x.fase] - orden[y.fase] || (x.inicio < y.inicio ? -1 : 1); });
}

/** Valida la reserva elegida para una venta y devuelve {codigo, banda}; vacío = venta suelta (sin reserva). */
function reservaParaVenta_(codigo) {
  codigo = String(codigo || '').trim();
  if (!codigo) return { codigo: '', banda: '' };
  var sr = abrirBd_().getSheetByName(HOJAS.reservas), f = filaPorTexto_(sr, codigo, RES.codigo);
  if (!f) throw new Error('No encontramos esa reserva para asociar la venta.');
  var r = sr.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
  if (estadoNorm_(r[RES.estado - 1]) === EST.ANULADA) throw new Error('Esa reserva está anulada.');
  return { codigo: codigo, banda: String(r[RES.banda - 1]) };
}

function registrarVenta_(tipo, fila, cantidad, pago, vendedor, nota, fecha, reserva) {
  var fv = fechaVenta_(fecha), rv = reservaParaVenta_(reserva);
  pago = pagoNorm_(pago);
  if (PAGOS_VENTA.indexOf(pago) < 0) throw new Error('Elige cómo se pagó: efectivo, transferencia o pago pendiente.');
  cantidad = Number(cantidad);
  if (!(cantidad >= 1 && cantidad <= 99 && cantidad % 1 === 0)) throw new Error('Cantidad inválida.');
  var sh = hojaCatalogo_(tipo), f = filaProducto_(sh, fila), r = sh.getRange(f, 1, 1, 6).getValues()[0];
  var precio = Reglas.aNumero(r[3], null);
  if (!r[1] || precio === null) throw new Error('Este producto no tiene precio. Defínelo antes de vender.');
  if (r[4] !== '') {
    var stock = Number(r[4]);
    if (stock < cantidad) throw new Error('Stock insuficiente: quedan ' + stock + '.');
    sh.getRange(f, 5).setValue(stock - cantidad);
  }
  var id = siguienteIdVenta_();
  abrirBd_().getSheetByName(HOJAS.ventas).appendRow([fv, textoSeguro_(String(r[1])), cantidad, precio, precio * cantidad,
    ETIQUETA_TIPO[tipoCatalogo_(tipo)], pago, textoSeguro_(limpiar_(vendedor, 40)), textoSeguro_(limpiar_(nota, 120)), '', id, rv.codigo, textoSeguro_(rv.banda)]);
  return id;
}

/** Registra un carrito completo (varios productos) con una sola forma de pago. Valida todo antes de descontar nada.
 *  items = [{fila, cantidad}]. Debe llamarse dentro de conBloqueo_. Devuelve los ids de venta. */
function registrarCarrito_(tipo, items, pago, vendedor, nota, fecha, reserva) {
  fechaVenta_(fecha); reservaParaVenta_(reserva);
  if (!items || !items.length) throw new Error('El carrito está vacío.');
  if (items.length > 40) throw new Error('Demasiados productos en una venta.');
  pago = pagoNorm_(pago);
  if (PAGOS_VENTA.indexOf(pago) < 0) throw new Error('Elige cómo se pagó: efectivo, transferencia o entregado en sala.');
  var sh = hojaCatalogo_(tipo), juntos = {};
  items.forEach(function (it) { var f = Number(it.fila); juntos[f] = (juntos[f] || 0) + Number(it.cantidad); });
  Object.keys(juntos).forEach(function (k) {
    var f = filaProducto_(sh, Number(k)), r = sh.getRange(f, 1, 1, 6).getValues()[0], c = juntos[k];
    if (!(c >= 1 && c <= 99 && c % 1 === 0)) throw new Error('Cantidad inválida.');
    if (!r[1] || Reglas.aNumero(r[3], null) === null) throw new Error('«' + r[1] + '» no tiene precio.');
    if (r[4] !== '' && Number(r[4]) < c) throw new Error('Stock insuficiente de «' + r[1] + '»: quedan ' + r[4] + '.');
  });
  return Object.keys(juntos).map(function (k) { return registrarVenta_(tipo, Number(k), juntos[k], pago, vendedor, nota, fecha, reserva); });
}

/** Cambia una venta «pendiente» a efectivo o transferencia. Debe llamarse dentro de conBloqueo_. */
function cobrarVenta_(id, pago, quien) {
  pago = pagoNorm_(pago);
  if (pago !== PAGO.EFECTIVO && pago !== PAGO.TRANSFERENCIA) throw new Error('Elige si se cobró en efectivo o por transferencia.');
  var sh = abrirBd_().getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
  if (!f) throw new Error('Venta no encontrada.');
  if (pagoNorm_(sh.getRange(f, VT.pago).getValue()) !== PAGO.PENDIENTE) throw new Error('Esa venta no estaba pendiente de pago.');
  var nota = String(sh.getRange(f, VT.nota).getValue() || '');
  sh.getRange(f, VT.pago).setValue(pago);
  sh.getRange(f, VT.cobro).setValue(new Date());
  sh.getRange(f, VT.nota).setValue(textoSeguro_(limpiar_((nota ? nota + ' · ' : '') + 'cobrado por ' + quien, 200)));
}

function leerVentas_() {
  var sh = abrirBd_().getSheetByName(HOJAS.ventas), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, COLS_VENTAS).getValues().forEach(function (r) {
    if (!r[VT.id - 1]) return;
    out.push({
      id: String(r[VT.id - 1]), fecha: aFechaIso_(r[VT.fecha - 1]), producto: String(r[VT.producto - 1]), cantidad: Number(r[VT.cantidad - 1]) || 0,
      precio: Number(r[VT.precio - 1]) || 0, total: Number(r[VT.total - 1]) || 0, tipo: String(r[VT.tipo - 1]), pago: pagoNorm_(r[VT.pago - 1]),
      vendedor: String(r[VT.vendedor - 1] || ''), nota: String(r[VT.nota - 1] || ''), cobro: aFechaIso_(r[VT.cobro - 1]), reserva: String(r[VT.reserva - 1] || ''), cliente: String(r[VT.cliente - 1] || '')
    });
  });
  return out.reverse(); // las más recientes primero
}

/**
 * Resumen de un mes (AAAA-MM). Función pura, con pruebas.
 * Lo cobrado cuenta en el mes en que se cobró (la fecha de cobro, o la de la venta si se pagó al momento).
 * Lo pendiente cuenta en el mes de la venta, y también se informa el total pendiente de todos los meses.
 */
function resumirVentas_(ventas, mes) {
  var r = { mes: mes, cobrado: 0, efectivo: 0, transferencia: 0, porCobrar: 0, pendienteTotal: 0, porTipo: {}, porVendedor: {}, meses: [] };
  var vistos = {};
  function suma(mapa, clave, campo, monto) { mapa[clave] = mapa[clave] || { cobrado: 0, porCobrar: 0 }; mapa[clave][campo] += monto; }
  ventas.forEach(function (v) {
    if (v.pago === PAGO.ANULADA) return;
    var m = (v.cobro || v.fecha).slice(0, 7);
    vistos[v.fecha.slice(0, 7)] = true; vistos[m] = true;
    if (v.pago === PAGO.PENDIENTE) {
      r.pendienteTotal += v.total;
      if (v.fecha.slice(0, 7) === mes) { r.porCobrar += v.total; suma(r.porTipo, v.tipo, 'porCobrar', v.total); suma(r.porVendedor, v.vendedor || '—', 'porCobrar', v.total); }
    } else if (m === mes) {
      r.cobrado += v.total;
      if (v.pago === PAGO.EFECTIVO) r.efectivo += v.total; else r.transferencia += v.total;
      suma(r.porTipo, v.tipo, 'cobrado', v.total); suma(r.porVendedor, v.vendedor || '—', 'cobrado', v.total);
    }
  });
  r.meses = Object.keys(vistos).sort().reverse();
  return r;
}

function mesActual_() { return ahoraChile_().fecha.slice(0, 7); }
function mesValido_(m) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || '')); }

/** Datos de ventas para mostrar: resumen del mes + historial de ese mes + todas las pendientes. */
function datosVentas_(mes) {
  mes = mesValido_(mes) ? mes : mesActual_();
  var todas = leerVentas_(), resumen = resumirVentas_(todas, mes);
  if (resumen.meses.indexOf(mes) < 0) resumen.meses.unshift(mes);
  return {
    resumen: resumen,
    ventas: todas.filter(function (v) { return (v.cobro || v.fecha).slice(0, 7) === mes || v.fecha.slice(0, 7) === mes; }).slice(0, 300),
    pendientes: todas.filter(function (v) { return v.pago === PAGO.PENDIENTE; }),
    sesiones: sesionesVenta_(),
    ingresosStock: leerIngresosStock_()
  };
}

/* ---------- administrador: ventas ---------- */

function adminVender(tipo, fila, cantidad, pago, nota, fecha, reserva) {
  exigirAdmin_();
  return conBloqueo_(function () { registrarVenta_(tipo, fila, cantidad, pago, 'Administración', nota || '', fecha, reserva); return adminResumen(); });
}
/** Venta por carrito desde el portal: items = [{fila, cantidad}], pago = una de PAGOS_VENTA. */
function adminVenderCarrito(tipo, items, pago, nota, fecha, reserva) {
  exigirAdmin_();
  return conBloqueo_(function () { var ids = registrarCarrito_(tipo, items, pago, 'Administración', nota || '', fecha, reserva); var r = adminResumen(); r.idsVenta = ids; return r; });
}
function adminCobrar(id, pago) {
  exigirAdmin_();
  return conBloqueo_(function () { cobrarVenta_(id, pago, 'Administración'); return adminResumen(); });
}
var VENTAS_RAPIDAS_ = ['adminVender', 'adminVenderCarrito', 'adminCobrar', 'adminAnularVenta', 'adminEditarVenta', 'adminEliminarVenta'];
/** Ejecuta una acción de ventas y devuelve solo productos y ventas (no rearma todo el portal): se nota mucho menos la espera. */
function adminVentaRapida(nombre, args) {
  exigirAdmin_();
  if (VENTAS_RAPIDAS_.indexOf(nombre) < 0) throw new Error('Acción no permitida.');
  VENTAS_PARCIAL_ = true;
  try { return globalThis[nombre].apply(null, Array.isArray(args) ? args : []); } finally { VENTAS_PARCIAL_ = false; }
}
/** Anula una venta (queda en el historial como «Anulada») y devuelve las unidades al stock. */
function adminAnularVenta(id) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var ss = abrirBd_(), sh = ss.getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
    if (!f) throw new Error('Venta no encontrada.');
    var r = sh.getRange(f, 1, 1, COLS_VENTAS).getValues()[0];
    if (pagoNorm_(r[VT.pago - 1]) === PAGO.ANULADA) throw new Error('Esa venta ya estaba anulada.');
    var tipo = String(r[VT.tipo - 1]) === ETIQUETA_TIPO.bebestible ? 'bebestible' : 'musica';
    var cat = hojaCatalogo_(tipo), n = cat.getLastRow();
    if (n > 1) cat.getRange(2, 1, n - 1, 5).getValues().some(function (p, i) {
      if (String(p[1]) !== String(r[VT.producto - 1]) || p[4] === '') return false;
      cat.getRange(i + 2, 5).setValue(Number(p[4]) + Number(r[VT.cantidad - 1]));
      return true;
    });
    sh.getRange(f, VT.pago).setValue(PAGO.ANULADA);
    return adminResumen();
  });
}

/** Ajusta el stock de un producto (por nombre) sumando `delta` unidades. Si el producto no lleva stock, no hace nada. */
function ajustarStockPorNombre_(tipo, nombre, delta) {
  var cat = hojaCatalogo_(tipo), n = cat.getLastRow();
  if (n > 1) cat.getRange(2, 1, n - 1, 5).getValues().some(function (p, i) {
    if (String(p[1]) !== String(nombre) || p[4] === '') return false;
    var nuevo = Number(p[4]) + delta; if (nuevo < 0) throw new Error('Stock insuficiente para ese cambio: quedan ' + p[4] + '.');
    cat.getRange(i + 2, 5).setValue(nuevo); return true;
  });
}

/** Corrige una venta mal ingresada: cantidad, forma de pago y nota. Ajusta el stock y el total. d = {cantidad, pago, nota}. */
function adminEditarVenta(id, d) {
  exigirAdmin_();
  d = d || {};
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
    if (!f) throw new Error('Venta no encontrada.');
    var r = sh.getRange(f, 1, 1, COLS_VENTAS).getValues()[0], pagoAnt = pagoNorm_(r[VT.pago - 1]);
    if (pagoAnt === PAGO.ANULADA) throw new Error('Esa venta está anulada; no se puede editar.');
    var cant = Number(d.cantidad), pago = pagoNorm_(d.pago);
    if (!(cant >= 1 && cant <= 99 && cant % 1 === 0)) throw new Error('Cantidad inválida.');
    if (PAGOS_VENTA.indexOf(pago) < 0) throw new Error('Elige cómo se pagó.');
    var tipo = String(r[VT.tipo - 1]) === ETIQUETA_TIPO.bebestible ? 'bebestible' : 'musica';
    var dif = cant - Number(r[VT.cantidad - 1]);
    if (dif !== 0) ajustarStockPorNombre_(tipo, r[VT.producto - 1], -dif);
    sh.getRange(f, VT.cantidad).setValue(cant);
    sh.getRange(f, VT.total).setValue(cant * (Number(r[VT.precio - 1]) || 0));
    sh.getRange(f, VT.pago).setValue(pago);
    if (pagoAnt === PAGO.PENDIENTE && pago !== PAGO.PENDIENTE) sh.getRange(f, VT.cobro).setValue(new Date());
    if (pago === PAGO.PENDIENTE) sh.getRange(f, VT.cobro).setValue('');
    sh.getRange(f, VT.nota).setValue(textoSeguro_(limpiar_(d.nota, 200)));
    if (d.fecha) sh.getRange(f, VT.fecha).setValue(fechaVenta_(d.fecha));
    if (d.reserva !== undefined) { var rv = reservaParaVenta_(d.reserva); sh.getRange(f, VT.reserva, 1, 2).setValues([[rv.codigo, textoSeguro_(rv.banda)]]); }
    return adminResumen();
  });
}

/** Elimina del todo una venta (por ejemplo, una duplicada). Si no estaba anulada, devuelve las unidades al stock. */
function adminEliminarVenta(id) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
    if (!f) throw new Error('Venta no encontrada.');
    var r = sh.getRange(f, 1, 1, COLS_VENTAS).getValues()[0];
    if (pagoNorm_(r[VT.pago - 1]) !== PAGO.ANULADA) ajustarStockPorNombre_(String(r[VT.tipo - 1]) === ETIQUETA_TIPO.bebestible ? 'bebestible' : 'musica', r[VT.producto - 1], Number(r[VT.cantidad - 1]) || 0);
    sh.deleteRow(f);
    return adminResumen();
  });
}

/* ---------- costos mensuales (luz, caja chica…) ---------- */

function leerCostos_() {
  var sh = abrirBd_().getSheetByName(HOJAS.costos), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 7).getValues().forEach(function (r) {
    if (!r[0]) return;
    out.push({ luzFactura: String(r[6]) === 'SI', mes: String(r[0]), luz: Number(r[1]) || 0, aporte: r[2] === '' ? '' : Number(r[2]), caja: r[3] === '' ? '' : Number(r[3]), otros: Number(r[4]) || 0, notas: String(r[5] || '') });
  });
  return out.sort(function (a, b) { return a.mes < b.mes ? 1 : -1; }).slice(0, 24);
}

/** c = {mes AAAA-MM, luz (boleta total), aporte, caja, otros, notas}. Guarda o reemplaza el mes; los demás meses no se tocan. */
function adminGuardarCostos(c) {
  exigirAdmin_();
  if (!mesValido_(c.mes)) throw new Error('El mes debe ser AAAA-MM, por ejemplo 2026-11.');
  var num = function (v, def) { v = String(v === null || v === undefined ? '' : v).trim(); if (v === '') return def; if (!(Number(v) >= 0)) throw new Error('Los montos deben ser números.'); return Number(v); };
  var fila = [String(c.mes), num(c.luz, 0), num(c.aporte, 10000), num(c.caja, 20000), num(c.otros, 0), textoSeguro_(limpiar_(c.notas, 200)), c.luzFactura ? 'SI' : 'NO'];
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.costos), f = filaPorTexto_(sh, c.mes, 1);
    if (f) sh.getRange(f, 1, 1, 7).setValues([fila]); else sh.appendRow(fila);
    SpreadsheetApp.flush();
    return adminResumen();
  });
}

/* ---------- cierre de mes (historial del balance) ---------- */

var CELDAS_CIERRE = ['B24', 'B18', 'B21', 'B22', 'B23', 'B31', 'B36', 'B44', 'B45', 'B46'];
var CELDAS_CIERRE_TRIB = ['B15', 'B16', 'B17', 'B25', 'B26']; // IVA a pagar, remanente, PPM, utilidad tributaria, provisión 1ª categoría

/** Guarda una «foto» del Balance de un mes (AAAA-MM) en la hoja HistorialBalance. Reemplaza la del mismo mes. */
function cerrarMes_(mes) {
  if (!mesValido_(mes)) throw new Error('Mes inválido.');
  var ss = abrirBd_(), b = ss.getSheetByName(HOJAS.balance), celda = b.getRange('B1'), formula = celda.getFormula(), valor = celda.getValue();
  var fila;
  try {
    celda.setValue("'" + mes);
    SpreadsheetApp.flush();
    var t = ss.getSheetByName(HOJAS.tributario);
    fila = [mes, new Date()].concat(CELDAS_CIERRE.map(function (c) { return b.getRange(c).getValue(); }), CELDAS_CIERRE_TRIB.map(function (c) { return t.getRange(c).getValue(); }));
  } finally {
    if (formula) celda.setFormula(formula); else celda.setValue(valor);
    SpreadsheetApp.flush();
  }
  var h = ss.getSheetByName(HOJAS.historial), f = filaPorTexto_(h, mes, 1);
  if (f) h.getRange(f, 1, 1, fila.length).setValues([fila]); else h.appendRow(fila);
}

/** Disparador del día 1 de cada mes: guarda el balance del mes que terminó. */
function cerrarMesAnterior() {
  cerrarMes_(Reglas.sumarDias(ahoraChile_().fecha.slice(0, 8) + '01', -1).slice(0, 7));
}

function leerHistorial_() {
  var sh = abrirBd_().getSheetByName(HOJAS.historial), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 17).getValues().forEach(function (r) {
    if (r[0]) out.push({ ivaPagar: Number(r[12]) || 0, remanente: Number(r[13]) || 0, ppm: Number(r[14]) || 0, utilidad: Number(r[15]) || 0, provision: Number(r[16]) || 0, mes: String(r[0]), brutos: Number(r[2]) || 0, sala: Number(r[3]) || 0, estudio: Number(r[4]) || 0, bruto: Number(r[5]) || 0, tienda: Number(r[6]) || 0, jc: Number(r[9]) || 0, jaime: Number(r[10]) || 0, est: Number(r[11]) || 0 });
  });
  return out.sort(function (a, b) { return a.mes < b.mes ? 1 : -1; }).slice(0, 24);
}

function adminCerrarMes(mes) {
  exigirAdmin_();
  return conBloqueo_(function () { cerrarMes_(mes); return adminResumen(); });
}
