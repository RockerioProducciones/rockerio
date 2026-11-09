/**
 * PORTAL DE ADMINISTRACIÓN
 * Se publica como una SEGUNDA implementación con acceso "Solo yo". Google exige iniciar sesión,
 * y además cada función verifica que el correo activo sea el administrador guardado en las
 * propiedades del script (ADMIN_EMAIL). El correo no está escrito en el código.
 */

function exigirAdmin_() {
  var admin = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').trim().toLowerCase();
  var activo = '';
  try { activo = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { /* sin sesión */ }
  if (!admin || !activo || activo !== admin) throw new Error('Acceso denegado.');
}

function paginaAdmin_() {
  try {
    exigirAdmin_();
  } catch (e) {
    return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:2rem">Acceso denegado. Inicia sesión con la cuenta de administración.</p>')
      .setTitle('Acceso denegado');
  }
  return HtmlService.createHtmlOutputFromFile('Admin').setTitle('Rockerío · Administración')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function adminResumen(mesVentas) {
  exigirAdmin_();
  var ss = abrirBd_(), hoy = ahoraChile_().fecha;
  var cfg = getCfg_();

  var reservas = [];
  var sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) {
    sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
      var fecha = aFechaIso_(r[RES.fecha - 1]), estado = estadoNorm_(r[RES.estado - 1]);
      if (!r[RES.codigo - 1]) return;
      if (fecha < hoy && estado !== EST.SIN_ABONO) return;
      reservas.push({
        codigo: String(r[RES.codigo - 1]), estado: estado, servicio: String(r[RES.servicio - 1]), fecha: fecha,
        inicio: String(r[RES.inicio - 1]), fin: String(r[RES.fin - 1]), banda: String(r[RES.banda - 1]),
        contacto: String(r[RES.contacto - 1]), telefono: String(r[RES.telefono - 1]),
        total: Number(r[RES.total - 1]) || 0, abono: Number(r[RES.abono - 1]) || 0,
        plan: String(r[RES.plan - 1] || ''), fechaTxt: Reglas.fechaLarga(fecha), saldo: (Number(r[RES.total - 1]) || 0) - (Number(r[RES.abono - 1]) || 0), retenido: Number(r[RES.retenido - 1]) || 0, devolver: Number(r[RES.devolver - 1]) || 0
      });
    });
    reservas.sort(function (a, b) { return (a.fecha + a.inicio) < (b.fecha + b.inicio) ? -1 : 1; });
  }

  var bloqueos = [];
  var sb = ss.getSheetByName(HOJAS.bloqueos), m = sb.getLastRow();
  if (m > 1) {
    sb.getRange(2, 1, m - 1, 4).getValues().forEach(function (r, i) {
      var f = aFechaIso_(r[0]);
      if (f && f >= hoy) bloqueos.push({ fila: i + 2, fecha: f, desde: String(r[1]), hasta: String(r[2]), motivo: String(r[3] || '') });
    });
    bloqueos.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  }
  var cl = leerClientes_();
  reservas.forEach(function (r) { r.enlace = enlaceDe_(cl, r.telefono, r.banda); });
  var pendientes = 0;
  reservas.forEach(function (r) { if (r.estado === EST.SIN_ABONO) pendientes++; });
  var planes = leerPlanes_();
  var honor = leerHonor_(), resenas = leerResenas_(), solicitudes = leerSolicitudes_();
  return { planes: planes, presentacion: { titulo: cfg.presentacionTitulo, texto: cfg.presentacion }, muestras: leerMuestras_(), honor: honor, resenas: resenas, solicitudes: solicitudes,
    cuenta: { reservas: pendientes, planes: planes.filter(function (x) { return !x.pagado; }).length, honor: honor.filter(function (x) { return x.estado === 'PENDIENTE'; }).length, resenas: resenas.filter(function (x) { return x.estado === 'PENDIENTE'; }).length, solicitudes: solicitudes.filter(function (x) { return x.estado === 'NUEVA'; }).length },
    clientes: cl, productos: leerProductos_('musica'), bebestibles: leerProductos_('bebestible'), ventas: datosVentas_(mesVentas), socios: leerSocios_(), costos: leerCostos_(), historial: leerHistorial_(), mesActual: mesActual_(), sitioUrl: cfg.sitioUrl, tema: cfg.tema, wa: waDatos_(), reglamento: cfg.reglamento, ajustes: leerAjustes_(), horarios: leerHorarios_(), ingresos: leerIngresosBalance_(), contab: leerTributario_(), compras: leerCompras_(), regimen: cfg.regimen, contabilidadFormal: cfg.contabilidadFormal, hoy: hoy, estados: ESTADOS, reservas: reservas, bloqueos: bloqueos, reservasActivas: cfg.reservasActivas, avisoBanner: cfg.avisoBanner, pagoOnline: cfg.pagoOnline, hayLinkPago: !!cfg.linkPago,
    pagoTransferencia: cfg.pagoTransferencia, hayDatosTransf: !!cfg.datosTransferencia, urlHoja: ss.getUrl() };
}

function adminCambiarEstado(codigo, estado) {
  exigirAdmin_();
  if (ESTADOS.indexOf(estado) < 0) throw new Error('Estado no válido.');
  var sh = abrirBd_().getSheetByName(HOJAS.reservas);
  var celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
  if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
  sh.getRange(celda.getRow(), RES.estado).setValue(estado);
  sincronizarEstado_(sh, celda.getRow()); // el disparador de edición no se activa con cambios hechos por script
  return adminResumen();
}

function adminBloquear(fecha, desde, hasta, motivo) {
  exigirAdmin_();
  if (!Reglas.fechaValida(String(fecha))) throw new Error('Fecha inválida.');
  var d = aHora_(desde), h = aHora_(hasta);
  if ((d === null) !== (h === null)) throw new Error('Indica desde y hasta, o deja ambos vacíos para bloquear todo el día.');
  if (d !== null && !(d >= 0 && h <= 24 && h > d)) throw new Error('Rango de horas inválido.');
  abrirBd_().getSheetByName(HOJAS.bloqueos).appendRow([String(fecha), d === null ? '' : String(d), h === null ? '' : String(h), textoSeguro_(String(motivo || '').slice(0, 100))]);
  return adminResumen();
}

function adminDesbloquear(fila) {
  exigirAdmin_();
  var sh = abrirBd_().getSheetByName(HOJAS.bloqueos);
  fila = Number(fila);
  if (!(fila >= 2 && fila <= sh.getLastRow())) throw new Error('Bloqueo no encontrado.');
  sh.deleteRow(fila);
  return adminResumen();
}

function adminConfigurar(reservasActivas, avisoBanner, pagoOnline, pagoTransferencia, tema, sitioUrl, contabilidadFormal, regimen) {
  exigirAdmin_();
  var sh = abrirBd_().getSheetByName(HOJAS.config), n = sh.getLastRow();
  var claves = sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); });
  function poner(clave, valor) {
    var i = claves.indexOf(clave);
    if (i < 0) { sh.appendRow([clave, valor, '']); claves.push(clave); } else sh.getRange(i + 2, 2).setValue(valor);
  }
  poner('reservasActivas', reservasActivas ? 'SI' : 'NO');
  poner('pagoOnline', pagoOnline ? 'SI' : 'NO');
  poner('pagoTransferencia', pagoTransferencia ? 'SI' : 'NO');
  if (tema !== undefined && /^[a-z]{3,20}$/.test(String(tema))) poner('tema', String(tema));
  if (sitioUrl !== undefined) { sitioUrl = String(sitioUrl).trim().replace(/\/+$/, ''); if (sitioUrl === '' || /^https:\/\/[^\s"'<>]{4,150}$/.test(sitioUrl)) poner('sitioUrl', sitioUrl); else throw new Error('La dirección del sitio debe empezar con https://'); }
  if (contabilidadFormal !== undefined) poner('contabilidadFormal', contabilidadFormal ? 'SI' : 'NO');
  if (regimen !== undefined) poner('regimen', String(regimen) === '14D8' ? '14D8' : '14D3');
  poner('avisoBanner', textoSeguro_(String(avisoBanner || '').slice(0, 200)));
  CacheService.getScriptCache().remove('cfgraw');
  return adminResumen();
}

/* ---------- Tienda ---------- */

function conBloqueo_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('El sistema está ocupado. Intenta de nuevo.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function filaProducto_(sh, fila) {
  fila = Number(fila);
  if (!(fila >= 2 && fila <= sh.getLastRow())) throw new Error('Producto no encontrado.');
  return fila;
}

/* ---------- Respaldos ---------- */

var CARPETA_RESPALDOS = 'Rockerío · Respaldos';
var RESPALDOS_A_CONSERVAR = 30;

/**
 * Copia diaria (3 AM) de toda la base de datos a la carpeta "Rockerío · Respaldos" de tu Google Drive.
 * Conserva las últimas 30 copias. Si falla, avisa por correo al administrador.
 */
function respaldar() {
  try {
    var props = PropertiesService.getScriptProperties();
    var it = DriveApp.getFoldersByName(CARPETA_RESPALDOS);
    var carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_RESPALDOS);
    var hoy = ahoraChile_().fecha;
    var copia = DriveApp.getFileById(props.getProperty('SHEET_ID')).makeCopy('Respaldo ' + hoy + ' · Rockerío', carpeta);
    var archivos = [], f = carpeta.getFiles();
    while (f.hasNext()) archivos.push(f.next());
    archivos.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    archivos.slice(RESPALDOS_A_CONSERVAR).forEach(function (a) { a.setTrashed(true); });
    props.setProperty('ULTIMO_RESPALDO', hoy);
    return 'Respaldo creado: ' + copia.getName() + ' (se conservan ' + RESPALDOS_A_CONSERVAR + ').';
  } catch (err) {
    console.error(err && err.stack || err);
    try {
      var a = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
      if (a) MailApp.sendEmail(a, 'Falló el respaldo de Rockerío', 'El respaldo automático no se pudo crear: ' + err);
    } catch (e2) { /* sin aviso */ }
    throw err;
  }
}

function adminRespaldar() {
  exigirAdmin_();
  return respaldar();
}

/* ---------- Clientes y material (carpeta de Drive por banda) ---------- */

function leerClientes_() {
  var sh = abrirBd_().getSheetByName(HOJAS.clientes), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 8).getValues().forEach(function (r) {
    if (!r[0]) return;
    out.push({ telefono: String(r[0]), correo: String(r[1] || ''), banda: String(r[2] || ''), contacto: String(r[3] || ''),
      reservas: Number(r[4]) || 0, enlace: String(r[7] || '') });
  });
  return out;
}

/** El enlace es de la banda: se usa el del cliente o, si no tiene, el de cualquier integrante con la misma banda. */
function enlaceDe_(clientes, telefono, banda) {
  var b = String(banda || '').trim().toLowerCase(), porBanda = '';
  for (var i = 0; i < clientes.length; i++) {
    if (clientes[i].telefono === telefono && clientes[i].enlace) return clientes[i].enlace;
    if (!porBanda && b && clientes[i].banda.trim().toLowerCase() === b && clientes[i].enlace) porBanda = clientes[i].enlace;
  }
  return porBanda;
}

/** Guarda el enlace de la carpeta de Drive de una banda en todos los clientes de esa banda. */
function adminGuardarEnlace(telefono, enlace) {
  exigirAdmin_();
  enlace = String(enlace || '').trim();
  if (enlace && !/^https:\/\/(drive|docs)\.google\.com\/[^\s]+$/.test(enlace)) throw new Error('El enlace debe ser de Google Drive (https://drive.google.com/...).');
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.clientes), n = sh.getLastRow();
    if (n < 2) throw new Error('Cliente no encontrado.');
    var datos = sh.getRange(2, 1, n - 1, 3).getValues();
    var fila = -1;
    datos.forEach(function (r, i) { if (String(r[0]) === String(telefono)) fila = i; });
    if (fila < 0) throw new Error('Cliente no encontrado.');
    var banda = String(datos[fila][2] || '').trim().toLowerCase();
    datos.forEach(function (r, i) {
      if (i === fila || (banda && String(r[2] || '').trim().toLowerCase() === banda)) sh.getRange(i + 2, 8).setValue(enlace);
    });
    return adminResumen();
  });
}

/* ====================================================================
 *  RESERVAS Y JORNADAS (histórico completo, calendario amplio y tarjetas de clientes)
 * ==================================================================== */

/** Todo el histórico para la vista «Reservas y jornadas»: reservas de cualquier fecha y estado, bloqueos, días inhabilitados y clientes con sus totales.
 *  Es solo lectura. Tope de seguridad: las 3000 reservas más recientes. */
function adminJornadas() {
  exigirAdmin_();
  var ss = abrirBd_(), hoy = ahoraChile_().fecha, reservas = [];
  var sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) {
    sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
      if (!r[RES.codigo - 1]) return;
      var fecha = aFechaIso_(r[RES.fecha - 1]), total = Number(r[RES.total - 1]) || 0, abono = Number(r[RES.abono - 1]) || 0;
      reservas.push({
        codigo: String(r[RES.codigo - 1]), estado: estadoNorm_(r[RES.estado - 1]) || String(r[RES.estado - 1]), servicio: String(r[RES.servicio - 1]),
        fecha: fecha, fechaTxt: fecha ? Reglas.fechaLarga(fecha) : '', inicio: String(r[RES.inicio - 1]), fin: String(r[RES.fin - 1]), horas: Number(r[RES.horas - 1]) || 0,
        banda: String(r[RES.banda - 1]), contacto: String(r[RES.contacto - 1]), telefono: String(r[RES.telefono - 1]), correo: String(r[RES.correo - 1] || ''),
        extras: Number(r[RES.extras - 1]) || 0, video: String(r[RES.video - 1]) === 'SI', raw: String(r[RES.raw - 1]) === 'SI', zurdo: String(r[RES.zurdo - 1]) === 'SI',
        voces: Number(r[RES.voces - 1]) || 0, comentarios: String(r[RES.comentarios - 1] || ''),
        total: total, abono: abono, saldo: total - abono, retenido: Number(r[RES.retenido - 1]) || 0, devolver: Number(r[RES.devolver - 1]) || 0,
        plan: String(r[RES.plan - 1] || ''), creada: aFechaIso_(r[RES.creada - 1])
      });
    });
    reservas.sort(function (a, b) { return (b.fecha + b.inicio) < (a.fecha + a.inicio) ? -1 : 1; }); // más reciente primero
    reservas = reservas.slice(0, 3000);
  }
  var bloqueos = [], sb = ss.getSheetByName(HOJAS.bloqueos), m = sb.getLastRow();
  if (m > 1) sb.getRange(2, 1, m - 1, 4).getValues().forEach(function (r, i) {
    var f = aFechaIso_(r[0]); if (f) bloqueos.push({ fila: i + 2, fecha: f, desde: String(r[1]), hasta: String(r[2]), motivo: String(r[3] || '') });
  });
  var inhabiles = [], si = ss.getSheetByName(HOJAS.inhabiles), k = si.getLastRow();
  if (k > 1) si.getRange(2, 1, k - 1, 2).getValues().forEach(function (r) { var f = aFechaIso_(r[0]); if (f) inhabiles.push({ fecha: f, motivo: String(r[1] || '') }); });

  var cl = leerClientes_(), porTel = {};
  cl.forEach(function (c) { porTel[c.telefono] = { telefono: c.telefono, correo: c.correo, banda: c.banda, contacto: c.contacto, enlace: c.enlace, jornadas: 0, finalizadas: 0, gastado: 0, ultima: '', proxima: '' }; });
  reservas.forEach(function (r) {
    var c = porTel[r.telefono] || (porTel[r.telefono] = { telefono: r.telefono, correo: r.correo, banda: r.banda, contacto: r.contacto, enlace: '', jornadas: 0, finalizadas: 0, gastado: 0, ultima: '', proxima: '' });
    if (r.estado === EST.ANULADA) return;
    c.jornadas++;
    if (r.estado === EST.FINALIZADA) { c.finalizadas++; c.gastado += r.total; }
    if (r.fecha && r.fecha < hoy && r.estado !== EST.SIN_ABONO && (!c.ultima || r.fecha > c.ultima)) c.ultima = r.fecha;
    if (r.fecha && r.fecha >= hoy && (!c.proxima || r.fecha < c.proxima)) c.proxima = r.fecha;
  });
  var clientes = Object.keys(porTel).map(function (t) { return porTel[t]; }).sort(function (a, b) { return b.jornadas - a.jornadas || (a.banda < b.banda ? -1 : 1); });
  return { hoy: hoy, reservas: reservas, bloqueos: bloqueos, inhabiles: inhabiles, clientes: clientes, estados: ESTADOS, wa: waDatos_() };
}
