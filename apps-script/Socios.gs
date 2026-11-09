/**
 * Enlace para socios (Jaime Encina, Gabriela Martelli…): agenda en solo lectura, venta de música y bebestibles,
 * e historial/resumen del mes. Funciona con un enlace secreto (token) que tú creas, cambias o borras desde el portal.
 * Los tokens viven en Propiedades del script (no en GitHub ni en la hoja). El socio NUNCA ve teléfonos, correos ni montos de reservas.
 */

var SOCIOS_INICIALES = ['Jaime y Gabriela']; // un solo enlace compartido: ambos ven lo mismo

function leerTokens_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TOKENS_SOCIOS') || '{}'); } catch (e) { return {}; }
}
function guardarTokens_(t) { PropertiesService.getScriptProperties().setProperty('TOKENS_SOCIOS', JSON.stringify(t)); }

function nuevoToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }

/** Crea los enlaces iniciales la primera vez. */
function prepararSocios_() {
  var t = leerTokens_();
  if (Object.keys(t).length) return;
  SOCIOS_INICIALES.forEach(function (n) { t[nuevoToken_()] = { nombre: n, creado: ahoraChile_().fecha }; });
  guardarTokens_(t);
}

function leerSocios_() {
  var t = leerTokens_();
  return Object.keys(t).map(function (k) { return { token: k, nombre: t[k].nombre, creado: t[k].creado || '', tipo: t[k].tipo === 'social' ? 'social' : 'colega', rol: t[k].rol || '' }; })
    .sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; });
}

function adminCrearSocio(nombre, tipo) {
  exigirAdmin_();
  nombre = limpiar_(nombre, 40);
  if (!nombre) throw new Error('Escribe el nombre del socio.');
  return conBloqueo_(function () {
    var t = leerTokens_();
    if (Object.keys(t).length >= 10) throw new Error('Máximo 10 enlaces de socios.');
    t[nuevoToken_()] = { nombre: nombre, creado: ahoraChile_().fecha, tipo: tipo === 'social' ? 'social' : 'colega' };
    guardarTokens_(t);
    return adminResumen();
  });
}

/** Cambia el enlace de un socio: el anterior deja de funcionar al instante. */
function adminRegenerarSocio(token) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var t = leerTokens_();
    if (!t[token]) throw new Error('Enlace no encontrado.');
    var datos = t[token]; delete t[token];
    t[nuevoToken_()] = { nombre: datos.nombre, creado: ahoraChile_().fecha, tipo: datos.tipo || 'colega' };
    guardarTokens_(t);
    return adminResumen();
  });
}

function adminEliminarSocio(token) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var t = leerTokens_();
    delete t[token];
    guardarTokens_(t);
    return adminResumen();
  });
}

/** 'social' (solo agenda) o 'colega' (agenda + ventas + resúmenes). */
function tipoSocio_(token) { var t = leerTokens_()[String(token || '').toLowerCase()]; return t && t.tipo === 'social' ? 'social' : 'colega'; }

/** Devuelve el nombre del socio o '' si el token no vale. Frena a quien prueba tokens al azar. */
function socioDe_(token) {
  token = String(token || '').toLowerCase();
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('tokmal') || 0) >= 40) return '';
  var t = leerTokens_(), ok = /^[a-z0-9._-]{4,64}$/.test(token) && t[token];
  if (!ok) { cache.put('tokmal', String(Number(cache.get('tokmal') || 0) + 1), 600); return ''; }
  return t[token].nombre;
}

function catalogoSocios_(tipo) {
  return leerProductos_(tipo).filter(function (p) { return p.visible && p.precio !== ''; })
    .map(function (p) { return { fila: p.fila, categoria: p.categoria, nombre: p.nombre, detalle: p.detalle, precio: p.precio, stock: p.stock, foto: fotoValida_(p.foto) }; });
}

/** Agenda desde el 1° del mes actual hasta ~3 meses adelante: solo banda, hora, servicio y estado. Sin teléfonos, correos ni montos. */
function agendaDetalle_() {
  var ss = abrirBd_(), hoy = ahoraChile_().fecha, desde = hoy.slice(0, 8) + '01', fin = Reglas.sumarDias(hoy, 95), out = [];
  var sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    var f = aFechaIso_(r[RES.fecha - 1]), e = estadoNorm_(r[RES.estado - 1]);
    if (!r[RES.codigo - 1] || f < desde || f > fin || e === EST.ANULADA) return;
    out.push({ fecha: f, inicio: horaCelda_(r[RES.inicio - 1]), fin: horaCelda_(r[RES.fin - 1]), servicio: String(r[RES.servicio - 1]), banda: String(r[RES.banda - 1]), estado: e });
  });
  var sb = ss.getSheetByName(HOJAS.bloqueos), m = sb.getLastRow();
  if (m > 1) sb.getRange(2, 1, m - 1, 4).getValues().forEach(function (r) {
    var f = aFechaIso_(r[0]);
    if (f && f >= desde && f <= fin) out.push({ fecha: f, inicio: String(r[1] || ''), fin: String(r[2] || ''), servicio: 'Bloqueo', banda: String(r[3] || 'No disponible'), estado: 'Bloqueo' });
  });
  out.sort(function (a, b) { return (a.fecha + a.inicio) < (b.fecha + b.inicio) ? -1 : 1; });
  return out;
}

/** Resumen general del mes para los socios: jornadas e ingresos por servicio (sin datos de clientes) y el balance cerrado de meses anteriores. */
function resumenGeneral_(mes) {
  mes = mesValido_(mes) ? mes : mesActual_();
  var o = { mes: mes, jornadas: 0, horas: 0, sala: 0, estudio: 0, extras: 0, video: 0, bruto: 0, pendientes: 0 };
  var sr = abrirBd_().getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    var f = aFechaIso_(r[RES.fecha - 1]), e = estadoNorm_(r[RES.estado - 1]);
    if (!r[RES.codigo - 1] || f.slice(0, 7) !== mes) return;
    if (e === EST.SIN_ABONO || e === EST.CON_ABONO) { o.pendientes++; return; }
    if (e !== EST.FINALIZADA) return;
    o.jornadas++; o.horas += Number(r[RES.horas - 1]) || 0;
    var base = Number(r[RES.base - 1]) || 0;
    if (String(r[RES.servicio - 1]) === ETIQUETA_SERVICIO.grabacion) o.estudio += base; else o.sala += base;
    o.extras += Number(r[RES.extrasM - 1]) || 0; o.video += Number(r[RES.videoM - 1]) || 0; o.bruto += Number(r[RES.rawM - 1]) || 0;
  });
  o.total = o.sala + o.estudio + o.extras + o.video + o.bruto;
  o.historial = leerHistorial_();
  return o;
}

function sociosDatos_(token, mes) {
  var nombre = socioDe_(token);
  if (!nombre) return { ok: false, codigo: 'ENLACE', error: 'Este enlace no es válido o fue desactivado. Pide uno nuevo.' };
  if (tipoSocio_(token) === 'social') return { ok: true, socio: nombre, tipo: 'social', ahora: ahoraChile_(), agenda: agendaDetalle_() };
  var v = datosVentas_(mes);
  return { ok: true, socio: nombre, tipo: 'colega', ahora: ahoraChile_(), agenda: agendaDetalle_(), musica: catalogoSocios_('musica'), bebestibles: catalogoSocios_('bebestible'),
    resumen: v.resumen, ventas: v.ventas, pendientes: v.pendientes, general: resumenGeneral_(mes) };
}

function sociosVender_(sol) {
  var nombre = socioDe_(sol.t);
  if (!nombre || tipoSocio_(sol.t) === 'social') return { ok: false, codigo: 'ENLACE', error: 'Enlace no válido.' };
  if (limiteGlobal_('socios_venta', 200)) return { ok: false, codigo: 'TASA', error: 'Demasiadas ventas seguidas. Intenta más tarde.' };
  try {
    var id = conBloqueo_(function () { return registrarVenta_(tipoCatalogo_(sol.tipo), sol.fila, sol.cantidad, sol.pago, nombre, sol.nota); });
    return { ok: true, id: id };
  } catch (e) { return { ok: false, codigo: 'DATOS', error: String(e.message || e) }; }
}

/** Venta por carrito desde el enlace de socios: sol = {t, tipo, items:[{fila,cantidad}], pago, nota}. */
function sociosCarrito_(sol) {
  var nombre = socioDe_(sol.t);
  if (!nombre || tipoSocio_(sol.t) === 'social') return { ok: false, codigo: 'ENLACE', error: 'Enlace no válido.' };
  if (limiteGlobal_('socios_venta', 200)) return { ok: false, codigo: 'TASA', error: 'Demasiadas ventas seguidas. Intenta más tarde.' };
  try {
    var ids = conBloqueo_(function () { return registrarCarrito_(tipoCatalogo_(sol.tipo), sol.items, sol.pago, nombre, sol.nota); });
    return { ok: true, ids: ids };
  } catch (e) { return { ok: false, codigo: 'DATOS', error: String(e.message || e) }; }
}

function sociosCobrar_(sol) {
  var nombre = socioDe_(sol.t);
  if (!nombre || tipoSocio_(sol.t) === 'social') return { ok: false, codigo: 'ENLACE', error: 'Enlace no válido.' };
  try {
    conBloqueo_(function () { cobrarVenta_(String(sol.id || ''), sol.pago, nombre); });
    return { ok: true };
  } catch (e) { return { ok: false, codigo: 'DATOS', error: String(e.message || e) }; }
}


/** Enlaces fijos del sitio: /proaudix (colegas: agenda + ventas + resúmenes) y /agenda (familia: solo agenda). Cada uno se abre con una clave simple. */
var ROLES_ENLACE = { proaudix: { tipo: 'colega', nombre: 'ProAudix · Gaby y Jaime' }, agenda: { tipo: 'social', nombre: 'Agenda · Familia' } };

/**
 * Fija la clave de un enlace fijo. rol = 'proaudix' | 'agenda'. La clave anterior deja de servir al instante.
 * 6 a 40 caracteres: letras, números, punto, guion o guion bajo (no distingue mayúsculas).
 */
function adminGuardarClaveEnlace(rol, clave) {
  exigirAdmin_();
  var def = ROLES_ENLACE[rol]; if (!def) throw new Error('Enlace no válido.');
  clave = String(clave || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{6,40}$/.test(clave)) throw new Error('La clave debe tener entre 6 y 40 caracteres: letras, números, punto, guion o guion bajo (sin espacios).');
  return conBloqueo_(function () {
    var t = leerTokens_(), nombre = def.nombre;
    Object.keys(t).forEach(function (k) {
      var e = t[k];
      if (e.rol === rol || (!e.rol && (e.tipo === 'social' ? 'social' : 'colega') === def.tipo && !Object.keys(t).some(function (o) { return t[o].rol === rol; }))) { if (k !== clave) delete t[k]; }
    });
    if (t[clave] && t[clave].rol !== rol) throw new Error('Esa clave ya la usa otro enlace. Elige otra.');
    t[clave] = { nombre: nombre, creado: ahoraChile_().fecha, tipo: def.tipo, rol: rol };
    guardarTokens_(t);
    return adminResumen();
  });
}
