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

/** Cuando es true, adminResumen() no arma el resumen completo (lo usan las acciones rápidas de «Reservas y jornadas»). */
var LIGERO_ = false;
var RAPIDAS_ = ['adminCambiarAdicionales', 'adminAgregarAdicional','adminCambiarEstado', 'adminReagendar', 'adminAjustarReserva', 'adminMarcarCobro', 'adminMarcarCortesia', 'adminAjustarRetencion', 'adminGuardarEnlace', 'adminEliminarReserva', 'adminCuadrarReservas', 'adminDesbloquear'];
/** Ejecuta una acción sobre reservas y devuelve solo «Reservas y jornadas» (una llamada en vez de dos: se nota mucho menos la espera). */
function adminRapido(nombre, args) {
  exigirAdmin_();
  if (RAPIDAS_.indexOf(nombre) < 0) throw new Error('Acción no permitida.');
  LIGERO_ = true;
  try { globalThis[nombre].apply(null, Array.isArray(args) ? args : []); } finally { LIGERO_ = false; }
  return adminJornadas();
}

function adminResumen(mesVentas) {
  exigirAdmin_();
  if (LIGERO_) return { ligero: true };
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
        inicio: horaCelda_(r[RES.inicio - 1]), fin: horaCelda_(r[RES.fin - 1]), banda: String(r[RES.banda - 1]),
        contacto: String(r[RES.contacto - 1]), telefono: String(r[RES.telefono - 1]),
        total: Number(r[RES.total - 1]) || 0, abono: Number(r[RES.abono - 1]) || 0,
        pago: String(r[RES.pago - 1] || ''), plan: String(r[RES.plan - 1] || ''), fechaTxt: Reglas.fechaLarga(fecha), saldo: estado === EST.NO_ASISTE ? 0 : (Number(r[RES.total - 1]) || 0) - (Number(r[RES.abono - 1]) || 0), ajuste: ajusteDe_(r), notaAjuste: String(r[RES.notaAjuste - 1] || ''), totalOriginal: totalOriginal_(r), retenido: Number(r[RES.retenido - 1]) || 0, devolver: Number(r[RES.devolver - 1]) || 0
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
  if (ESTADOS_QUE_OCUPAN.indexOf(estado) >= 0) { // reactivar una anulada: el horario no debe haberse ocupado mientras tanto
    var rr = sh.getRange(celda.getRow(), 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
    if (!eventoVivo_(getCalendar_(), rr[RES.evento - 1], rr)) {
      var fch = aFechaIso_(rr[RES.fecha - 1]), h0 = aHora_(rr[RES.inicio - 1]), nh = Number(rr[RES.horas - 1]);
      if (fch && h0 !== null && nh > 0) {
        var oc = ocupadasRango_(fch, 1)[fch] || [];
        for (var h = h0; h < h0 + nh; h++) if (oc.indexOf(h) >= 0) throw new Error('Ese horario (' + fch + ' · ' + h0 + ':00 a ' + (h0 + nh) + ':00) ya lo ocupa otra reserva o un bloqueo. Reagenda esta reserva a otro horario o libera el actual.');
      }
    }
  }
  sh.getRange(celda.getRow(), RES.estado).setValue(estado);
  sincronizarEstado_(sh, celda.getRow()); // el disparador de edición no se activa con cambios hechos por script
  return adminResumen();
}

/** Tengo el comprobante: el horario de una reserva «sin abono» se guarda HORAS_MAX_COMPROBANTE horas más (no vence sola antes). */
function adminMantenerHorario(codigo) {
  exigirAdmin_();
  conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas), celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
    if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
    var f = celda.getRow(), est = estadoNorm_(sh.getRange(f, RES.estado).getValue());
    if (est !== EST.SIN_ABONO) throw new Error('Solo una reserva «sin abono» necesita mantener su horario.');
    sh.getRange(f, RES.pago, 1, 2).setValues([[PAGO_COMPROBANTE, new Date()]]);
  });
  return adminResumen();
}

/** Revisa las reservas futuras que deben ocupar horario y repone en el calendario las que no tienen su evento (sin pisar horarios ya tomados). */
function adminRepararAgenda() {
  exigirAdmin_();
  var sh = abrirBd_().getSheetByName(HOJAS.reservas), n = sh.getLastRow(), hoy = ahoraChile_().fecha, cal = getCalendar_(), rep = [], choque = [];
  if (n < 2) return 'No hay reservas.';
  var datos = sh.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues();
  datos.forEach(function (r, i) {
    var est = estadoNorm_(r[RES.estado - 1]), f = aFechaIso_(r[RES.fecha - 1]);
    if (!r[RES.codigo - 1] || !f || f < hoy || [EST.SIN_ABONO, EST.CON_ABONO].indexOf(est) < 0) return;
    if (eventoVivo_(cal, r[RES.evento - 1], r)) return;
    var h0 = aHora_(r[RES.inicio - 1]), nh = Number(r[RES.horas - 1]), oc = ocupadasRango_(f, 1)[f] || [], libre = h0 !== null && nh > 0;
    for (var h = h0; libre && h < h0 + nh; h++) if (oc.indexOf(h) >= 0) libre = false;
    if (!libre) { choque.push(String(r[RES.codigo - 1])); return; }
    sincronizarEstado_(sh, i + 2); rep.push(String(r[RES.codigo - 1]));
  });
  return (rep.length ? 'Repuestas en el calendario: ' + rep.join(', ') + '. ' : 'Todas las reservas vigentes están en el calendario. ') + (choque.length ? 'Sin reponer por choque de horario: ' + choque.join(', ') + '.' : '');
}

function adminBloquear(fecha, desde, hasta, motivo) {
  exigirAdmin_();
  if (!Reglas.fechaValida(String(fecha))) throw new Error('Fecha inválida.');
  var d = aHora_(desde), h = aHora_(hasta);
  if ((d === null) !== (h === null)) throw new Error('Indica desde y hasta, o deja ambos vacíos para bloquear todo el día.');
  if (d !== null && !(d >= 0 && h <= 24 && h > d)) throw new Error('Rango de horas inválido.');
  // El bloqueo no se rige por el horario oficial, pero no puede quedar encima de una reserva vigente.
  var choques = reservasVigentesEn_(String(fecha)).filter(function (x) { return d === null || (x.ini < h && x.fin > d); });
  if (choques.length) throw new Error('Ese bloqueo quedaría sobre la reserva de ' + choques[0].banda + ' (' + Reglas.horaTxt(choques[0].ini) + ' a ' + Reglas.horaTxt(choques[0].fin) + '). Reagéndala o elige otro horario.');
  abrirBd_().getSheetByName(HOJAS.bloqueos).appendRow([String(fecha), d === null ? '' : String(d), h === null ? '' : String(h), textoSeguro_(String(motivo || '').slice(0, 100))]);
  return adminResumen();
}

/** Reservas vigentes (que ocupan agenda) de un día: [{ini, fin, banda, codigo}] con horas enteras. */
function reservasVigentesEn_(fecha, excluirCodigo) {
  var sh = abrirBd_().getSheetByName(HOJAS.reservas), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    if (!r[RES.codigo - 1] || String(r[RES.codigo - 1]) === String(excluirCodigo || '') || aFechaIso_(r[RES.fecha - 1]) !== fecha) return;
    if (ESTADOS_QUE_OCUPAN.indexOf(estadoNorm_(r[RES.estado - 1])) < 0) return;
    var i = aHora_(r[RES.inicio - 1]), h = Number(r[RES.horas - 1]) || 0;
    if (i !== null) out.push({ ini: i, fin: i + h, banda: String(r[RES.banda - 1]), codigo: String(r[RES.codigo - 1]) });
  });
  return out;
}

/** Reagenda una reserva (misma duración, mismo precio). Máximo `reagendoCambios` veces; como administrador puedes hacer una excepción con excepcion=true.
 *  Nunca puede quedar sobre otra reserva ni sobre un bloqueo. */
function adminReagendar(codigo, fecha, inicio, excepcion) {
  exigirAdmin_();
  fecha = String(fecha || ''); inicio = Number(inicio);
  if (!Reglas.fechaValida(fecha)) throw new Error('Elige una fecha válida.');
  if (!(inicio >= 0 && inicio <= 23 && inicio === Math.floor(inicio))) throw new Error('Elige la hora de inicio.');
  var cfg = getCfg_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas), celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
    if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
    var f = celda.getRow(), r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0], estado = estadoNorm_(r[RES.estado - 1]);
    if ([EST.SIN_ABONO, EST.CON_ABONO].indexOf(estado) < 0) throw new Error('Solo se pueden reagendar reservas vigentes (no finalizadas, anuladas ni inasistencias).');
    var horas = Number(r[RES.horas - 1]) || 1;
    if (inicio + horas > 24) throw new Error('La sesión terminaría después de medianoche.');
    // Nunca al pasado ni fuera del horario de atención de ese día (la «excepción» solo salta el límite de reagendos).
    var ahoraR = ahoraChile_();
    if (fecha < ahoraR.fecha || (fecha === ahoraR.fecha && inicio <= ahoraR.hora)) throw new Error('FECHA: ese horario ya pasó. Elige uno futuro.');
    var abiertasR = Reglas.horasAbiertas(cfg, fecha);
    if (!abiertasR.length) throw new Error('FUERA_HORARIO: ese día no hay atención. Elige otro día (o bloquea/ingresa a mano si es una excepción).');
    for (var hh = inicio; hh < inicio + horas; hh++) if (abiertasR.indexOf(hh) < 0) throw new Error('FUERA_HORARIO: ' + hh + ':00 está fuera del horario de atención de ese día. Elige otro horario.');
    var hechos = Number(r[RES.reagendos - 1]) || 0, max = Number(cfg.reagendoCambios) || 2;
    if (esCasa_(String(r[RES.telefono - 1]), r[RES.banda - 1])) excepcion = true; // banda de la casa: reagendos sin tope
    if (hechos >= max && !excepcion) throw new Error('LIMITE: esta reserva ya se reagendó ' + hechos + ' ' + (hechos === 1 ? 'vez' : 'veces') + ' (máximo ' + max + ').');
    reservasVigentesEn_(fecha, codigo).forEach(function (x) { if (x.ini < inicio + horas && x.fin > inicio) throw new Error('CHOQUE: ese horario quedaría sobre la reserva de ' + x.banda + ' (' + Reglas.horaTxt(x.ini) + ' a ' + Reglas.horaTxt(x.fin) + ').'); });
    var oc = ocupadasRango_(fecha, 1)[fecha] || [], propias = [];
    if (aFechaIso_(r[RES.fecha - 1]) === fecha) { var i0 = aHora_(r[RES.inicio - 1]); for (var q = i0; i0 !== null && q < i0 + horas; q++) propias.push(q); }
    for (var h = inicio; h < inicio + horas; h++) if (oc.indexOf(h) >= 0 && propias.indexOf(h) < 0) throw new Error('CHOQUE: ese horario está bloqueado u ocupado (' + h + ':00). Quita el bloqueo o elige otro.');
    sh.getRange(f, RES.fecha).setValue(fechaHora_(fecha, 0));
    sh.getRange(f, RES.inicio).setNumberFormat('@').setValue(Reglas.horaTxt(inicio));
    sh.getRange(f, RES.fin).setNumberFormat('@').setValue(Reglas.horaTxt(inicio + horas));
    sh.getRange(f, RES.reagendos).setValue(hechos + 1);
    sh.getRange(f, RES.recordatorio).setValue('');
    var ev = r[RES.evento - 1] ? obtenerEvento_(getCalendar_(), r[RES.evento - 1]) : null;
    if (ev) ev.setTime(fechaHora_(fecha, inicio), fechaHora_(fecha, inicio + horas));
    return adminResumen();
  });
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
    archivos = archivos.filter(function (a) { return /^Respaldo /.test(a.getName()); }); // «Instantánea…» y «Previo…» no se borran solas
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

/** Instantánea con nombre (la pones tú, antes de un cambio grande). No se borra sola. */
function adminInstantanea(nombre) {
  exigirAdmin_();
  var n = String(nombre || '').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ\-.,()]/g, '').trim().slice(0, 50) || 'sin nombre';
  var copia = DriveApp.getFileById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'))
    .makeCopy('Instantánea ' + n + ' ' + ahoraChile_().fecha + ' ' + Utilities.formatDate(new Date(), Reglas.TZ, 'HH-mm') + ' · Rockerío', carpetaRespaldos_());
  registrarCambio_('Instantánea', n, '', copia.getName());
  return 'Instantánea guardada: «' + copia.getName() + '».';
}

/* ---------- Registro de tus cambios personales (hoja «Cambios») ---------- */

var CAMBIOS_MAX = 1000;

/** Anota quién/qué cambió y el valor anterior. Nunca interrumpe lo que estás guardando; las claves y tokens no se anotan. */
function registrarCambio_(tipo, detalle, antes, ahora) {
  try {
    if (/token|clave|secret|password|contraseña/i.test(String(detalle))) return;
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')), sh = ss.getSheetByName('Cambios');
    if (!sh) { sh = ss.insertSheet('Cambios'); sh.getRange(1, 1, 1, 5).setValues([['Fecha', 'Tipo', 'Qué', 'Antes', 'Después']]).setFontWeight('bold'); sh.setFrozenRows(1); }
    var rec = function (v) { return String(v === undefined || v === null ? '' : v).slice(0, 1500); };
    sh.appendRow([Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH:mm'), rec(tipo), rec(detalle), rec(antes), rec(ahora)]);
    var n = sh.getLastRow();
    if (n > CAMBIOS_MAX + 1) sh.deleteRows(2, n - CAMBIOS_MAX - 1);
  } catch (err) { console.error('registrarCambio_: ' + err); }
}

function adminListarCambios() {
  exigirAdmin_();
  var sh = abrirBd_().getSheetByName('Cambios'), n = sh ? sh.getLastRow() : 0;
  if (n < 2) return [];
  return sh.getRange(Math.max(2, n - 99), 1, Math.min(100, n - 1), 5).getValues().reverse().map(function (r) {
    return { fecha: String(r[0]), tipo: String(r[1]), que: String(r[2]), antes: String(r[3]).slice(0, 300), ahora: String(r[4]).slice(0, 300) };
  });
}

function carpetaRespaldos_() {
  var it = DriveApp.getFoldersByName(CARPETA_RESPALDOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_RESPALDOS);
}

/** Lista las copias disponibles (más nuevas primero). */
function adminListarRespaldos() {
  exigirAdmin_();
  var out = [], f = carpetaRespaldos_().getFiles();
  while (f.hasNext()) {
    var a = f.next();
    out.push({ id: a.getId(), nombre: a.getName(), creado: Utilities.formatDate(a.getDateCreated(), 'America/Santiago', 'yyyy-MM-dd HH:mm'), t: a.getDateCreated().getTime() });
  }
  out.sort(function (a, b) { return b.t - a.t; });
  return out.slice(0, 60).map(function (x) { delete x.t; return x; });
}

/**
 * Restaura TODA la información desde una copia. Seguridad:
 * 1) exige que la copia sea un archivo de la carpeta de respaldos y tenga las hojas clave;
 * 2) antes de tocar nada guarda una copia «Previo a restaurar» del estado actual (se puede deshacer);
 * 3) copia hoja por hoja solo los datos (no borra hojas, fórmulas de formato ni enlaces).
 */
function adminRestaurar(id) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var carpeta = carpetaRespaldos_(), ok = false, f = carpeta.getFiles();
    while (f.hasNext()) if (f.next().getId() === String(id)) ok = true;
    if (!ok) throw new Error('Esa copia no está en la carpeta de respaldos.');
    var origen = SpreadsheetApp.openById(id), destino = abrirBd_();
    [HOJAS.reservas, HOJAS.clientes].forEach(function (n) {
      if (!origen.getSheetByName(n)) throw new Error('La copia no tiene la hoja «' + n + '». No se restauró nada.');
    });
    var previo = DriveApp.getFileById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'))
      .makeCopy('Previo a restaurar ' + ahoraChile_().fecha + ' ' + Utilities.formatDate(new Date(), Reglas.TZ, 'HH-mm') + ' · Rockerío', carpeta);
    var n = 0;
    origen.getSheets().forEach(function (h) {
      var d = destino.getSheetByName(h.getName());
      if (!d || h.getName() === 'Cambios') return; // el registro de cambios no se retrocede
      var filas = h.getLastRow(), cols = h.getLastColumn();
      var vals = filas && cols ? h.getRange(1, 1, filas, cols).getValues() : [];
      d.clearContents();
      if (vals.length) {
        if (d.getMaxRows() < vals.length) d.insertRowsAfter(d.getMaxRows(), vals.length - d.getMaxRows());
        if (d.getMaxColumns() < cols) d.insertColumnsAfter(d.getMaxColumns(), cols - d.getMaxColumns());
        d.getRange(1, 1, vals.length, cols).setValues(vals);
      }
      n++;
    });
    try { limpiarCacheContenido_(); } catch (e) { /* sin caché */ }
    try { CacheService.getScriptCache().removeAll(['esq3']); } catch (e) { /* sin caché */ }
    return 'Restaurado ✔ (' + n + ' hojas). Antes de restaurar se guardó «' + previo.getName() + '». Recarga el portal.';
  });
}

/* ---------- Clientes y material (carpeta de Drive por banda) ---------- */

function leerClientes_() {
  var sh = abrirBd_().getSheetByName(HOJAS.clientes), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 11).getValues().forEach(function (r) {
    if (!r[0]) return;
    var nom = String(r[8] || ''), ape = String(r[9] || '');
    out.push({ telefono: String(r[0]), correo: String(r[1] || ''), banda: String(r[2] || ''), contacto: (nom || ape) ? (nom + ' ' + ape).trim() : String(r[3] || ''),
      nombre: nom || String(r[3] || ''), apellido: ape, reservas: Number(r[4]) || 0, enlace: String(r[7] || ''), casa: String(r[10] || '').toUpperCase() === 'SI' });
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

/* ---------- Base de datos de clientes (alta, edición y baja manual desde el portal) ---------- */

/** Crea o edita un cliente. d: { clave (vacía si es nuevo), nombre, apellido, correo, banda, telefono (opcional), enlace (Drive, opcional) }.
 *  La clave interna es el teléfono normalizado; si no hay teléfono se crea una clave «MAN-…» y al reservar con otro teléfono se crea otro registro. */
function adminGuardarCliente(d) {
  exigirAdmin_();
  d = d || {};
  var nombre = limpiar_(d.nombre, 60), apellido = limpiar_(d.apellido, 60), correo = limpiar_(d.correo, 120).toLowerCase(), banda = limpiar_(d.banda, 80);
  var enlace = String(d.enlace || '').trim(), clave = String(d.clave || '');
  if (!nombre) throw new Error('Escribe el nombre.');
  if (!banda) throw new Error('Escribe el nombre de la banda o proyecto.');
  if (correo && !Reglas.correoValido(correo)) throw new Error('Revisa el correo.');
  if (enlace && !/^https:\/\/(drive|docs)\.google\.com\/[^\s]+$/.test(enlace)) throw new Error('El enlace debe ser de Google Drive (https://drive.google.com/...).');
  var tel = d.telefono ? Reglas.normalizarTelefono(String(d.telefono)) : '';
  if (d.telefono && !Reglas.telefonoValido(tel)) throw new Error('Revisa el teléfono. Ejemplo: +56 9 1234 5678.');
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.clientes), n = sh.getLastRow();
    if (!sh.getRange(1, 9).getValue()) sh.getRange(1, 9, 1, 2).setValues([['Nombre', 'Apellido']]).setFontWeight('bold');
    var datos = n > 1 ? sh.getRange(2, 1, n - 1, 3).getValues() : [], fila = -1, dup = -1;
    datos.forEach(function (r, i) {
      if (clave && String(r[0]) === clave) fila = i;
      var otro = !clave || String(r[0]) !== clave;
      if (otro && ((tel && String(r[0]) === tel) || (correo && String(r[1] || '').toLowerCase() === correo))) dup = i;
    });
    if (clave && fila < 0) throw new Error('Cliente no encontrado.');
    if (dup >= 0) throw new Error('Ya existe un cliente con ese ' + (tel && String(datos[dup][0]) === tel ? 'teléfono' : 'correo') + ' (' + (datos[dup][2] || 'sin banda') + ').');
    var f;
    if (fila < 0) {
      var llave = tel || ('MAN-' + Utilities.formatDate(new Date(), 'America/Santiago', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10));
      var hoy = new Date();
      sh.appendRow([llave, '', '', '', 0, hoy, '', '', '', '']);
      f = sh.getLastRow();
      sh.getRange(f, 1).setNumberFormat('@').setValue(llave);
    } else {
      f = fila + 2;
      if (tel && /^MAN-/.test(clave)) sh.getRange(f, 1).setNumberFormat('@').setValue(tel);
    }
    sh.getRange(f, 2).setValue(textoSeguro_(correo));
    sh.getRange(f, 3).setValue(textoSeguro_(banda));
    sh.getRange(f, 4).setValue(textoSeguro_((nombre + ' ' + apellido).trim()));
    sh.getRange(f, 9, 1, 2).setValues([[textoSeguro_(nombre), textoSeguro_(apellido)]]);
    // El enlace de Drive es de la banda: se aplica a todos los clientes con la misma banda.
    var todos = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues() : [], b = banda.toLowerCase();
    todos.forEach(function (r, i) {
      if (i + 2 === f || (enlace && String(r[2] || '').trim().toLowerCase() === b)) sh.getRange(i + 2, 8).setValue(enlace);
    });
    if (d.casa !== undefined) { // «Banda de la casa»: vale para toda la banda (todos los integrantes con el mismo nombre de banda)
      if (!sh.getRange(1, 11).getValue()) sh.getRange(1, 11).setValue('Banda de la casa').setFontWeight('bold');
      var marca = d.casa ? 'SI' : '';
      sh.getRange(f, 11).setValue(marca);
      todos.forEach(function (r, i) { if (String(r[2] || '').trim().toLowerCase() === b) sh.getRange(i + 2, 11).setValue(marca); });
      registrarCambio_('Banda de la casa', banda, d.casa ? 'no' : 'sí', d.casa ? 'sí' : 'no');
    }
    return { ok: true };
  });
}

/** Importa clientes en bloque. filas = [{nombre, apellido?, banda, telefono}]. Omite los que ya existen (por teléfono). Devuelve {agregados, omitidos:[texto]}. */
function adminImportarClientes(filas) {
  exigirAdmin_();
  if (!filas || !filas.length) throw new Error('No hay clientes para importar.');
  if (filas.length > 300) throw new Error('Máximo 300 clientes por vez.');
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.clientes), n = sh.getLastRow();
    if (!sh.getRange(1, 9).getValue()) sh.getRange(1, 9, 1, 2).setValues([['Nombre', 'Apellido']]).setFontWeight('bold');
    var existentes = {}; if (n > 1) sh.getRange(2, 1, n - 1, 1).getValues().forEach(function (r) { existentes[String(r[0])] = 1; });
    var hoy = new Date(), agregados = 0, omitidos = [];
    filas.forEach(function (x) {
      var nombre = limpiar_(x.nombre, 60), apellido = limpiar_(x.apellido, 60), banda = limpiar_(x.banda, 80), tel = Reglas.normalizarTelefono(String(x.telefono || ''));
      if (!nombre || !banda) { omitidos.push((nombre || '(sin nombre)') + ': falta nombre o banda'); return; }
      if (!Reglas.telefonoValido(tel)) { omitidos.push(nombre + ': teléfono no válido (' + x.telefono + ')'); return; }
      if (existentes[tel]) { omitidos.push(nombre + ': ya estaba en la base'); return; }
      sh.appendRow([tel, '', textoSeguro_(banda), textoSeguro_((nombre + ' ' + apellido).trim()), 0, hoy, '', '', textoSeguro_(nombre), textoSeguro_(apellido)]);
      sh.getRange(sh.getLastRow(), 1).setNumberFormat('@').setValue(tel);
      existentes[tel] = 1; agregados++;
    });
    return { agregados: agregados, omitidos: omitidos };
  });
}

/** Quita el cliente de la base. Sus reservas pasadas se conservan en la hoja Reservas. */
function adminEliminarCliente(clave) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.clientes), n = sh.getLastRow(), fila = -1;
    if (n > 1) sh.getRange(2, 1, n - 1, 1).getValues().forEach(function (r, i) { if (String(r[0]) === String(clave)) fila = i + 2; });
    if (fila < 0) throw new Error('Cliente no encontrado.');
    sh.deleteRow(fila);
    return { ok: true };
  });
}

/* ---------- Reserva manual (sin restricción de horario, anticipación ni días abiertos) ---------- */

/** p: { servicio: ensayo|grabacion, fecha, inicio (0-23), horas (1-24), banda, nombre, telefono, correo (opcional), estado,
 *       total (opcional: reemplaza el cálculo), extras, video, raw, comentario, forzar }.
 *  Solo se avisa si el horario choca con otra reserva o bloqueo; con forzar=true se guarda igual. */
/**
 * Suma a una reserva ya creada el material en bruto o el video (con su precio de la configuración).
 * Con «pagado» el monto entra como pagado: sube el total y el abono, y el saldo queda igual.
 */
var EQUIPOS_ARRIENDO_ = ['Set de platos Kingdo SN8 (B8)', 'Bajo eléctrico Epiphone Thunderbird Pro IV', 'Guitarra eléctrica Squier Stratocaster Vintage Modified ’70', 'Guitarra electroacústica Takamine', 'Pedalera multiefecto para bajo', 'Pedalera multiefecto para guitarra'];

/**
 * Agregar o quitar adicionales de una reserva con un clic (equipos de arriendo, video, material en bruto).
 * d = { equipos: [nombres], video: bool, raw: bool } con el estado FINAL deseado. Ajusta total y saldo (el abono no cambia).
 */
function adminCambiarAdicionales(codigo, d) {
  exigirAdmin_();
  d = d || {};
  return conBloqueo_(function () {
    var cfg = getCfg_(), rf = ajustarFilaBase_(codigo), sh = rf.sh, f = rf.f, r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
    var est = estadoNorm_(r[RES.estado - 1]);
    if (est === EST.NO_ASISTE || est === EST.ANULADA) throw new Error('Esta reserva está cerrada: no admite cambios de adicionales.');
    if (r[RES.cortesia - 1] === 'SI') throw new Error('Es una cortesía: no admite cambios de adicionales.');
    var horas = Number(r[RES.horas - 1]) || 1, esEnsayo = String(r[RES.servicio - 1]) === ETIQUETA_SERVICIO.ensayo;
    var delta = 0, partes = [];
    // equipos de arriendo (solo sala de ensayo)
    if (d.equipos !== undefined) {
      if (!esEnsayo) throw new Error('Los equipos de arriendo son solo para la sala de ensayo.');
      var nuevos = [];
      (d.equipos || []).forEach(function (n) { n = String(n); if (EQUIPOS_ARRIENDO_.indexOf(n) >= 0 && nuevos.indexOf(n) < 0) nuevos.push(n); });
      var antes = Number(r[RES.extras - 1]) || 0, unidad = cfg.precioExtraEquipo * (cfg.extraModo === 'hora' ? horas : 1), dEq = (nuevos.length - antes) * unidad;
      {
        var com = String(r[RES.comentarios - 1] || '').replace(/\s*\[Arriendos:[^\]]*\]/g, '').replace(/\s*·?\s*Equipos: [^·\[]*/g, '').trim();
        sh.getRange(f, RES.comentarios).setValue(textoSeguro_((com + (nuevos.length ? ' · Equipos: ' + nuevos.join(', ') : '')).replace(/^\s*·\s*/, '').slice(0, 500)));
        sh.getRange(f, RES.extras).setValue(nuevos.length);
        sh.getRange(f, RES.extrasM).setValue(Math.max(0, (Number(r[RES.extrasM - 1]) || 0) + dEq));
        delta += dEq; r[RES.extrasM - 1] = Math.max(0, (Number(r[RES.extrasM - 1]) || 0) + dEq);
        if (nuevos.length !== antes) partes.push('equipos ' + antes + ' → ' + nuevos.length);
      }
    }
    var orig = null; try { orig = JSON.parse(String(r[RES.original - 1] || '')); } catch (e) { orig = null; }
    var dEquipo = delta, dV = 0, dR = 0;
    [['video', RES.video, RES.videoM, cfg.precioVideo, 'v'], ['raw', RES.raw, RES.rawM, cfg.precioRaw, 'r']].forEach(function (x) {
      if (d[x[0]] === undefined) return;
      var quiere = !!d[x[0]], tiene = String(r[x[1] - 1]) === 'SI';
      if (quiere === tiene) return;
      var monto = quiere ? (Math.round(Number(x[3])) || 0) : (Number(r[x[2] - 1]) || Math.round(Number(x[3])) || 0), signo = quiere ? 1 : -1;
      sh.getRange(f, x[1]).setValue(quiere ? 'SI' : 'NO'); sh.getRange(f, x[2]).setValue(quiere ? (Number(r[x[2] - 1]) || 0) + monto : 0);
      delta += signo * monto; if (x[4] === 'v') dV = signo * monto; else dR = signo * monto;
      partes.push((quiere ? '+ ' : '− ') + (x[0] === 'video' ? 'video' : 'material en bruto'));
    });
    if (!delta && !partes.length && d.equipos === undefined) return { ok: true };
    var total = Math.max(0, (Number(r[RES.total - 1]) || 0) + delta), abono = Number(r[RES.abono - 1]) || 0;
    sh.getRange(f, RES.total).setValue(total); sh.getRange(f, RES.saldo).setValue(Math.max(0, total - abono));
    if (orig && typeof orig.t === 'number') {
      orig.t += delta; orig.e = (Number(orig.e) || 0) + dEquipo; orig.v = (Number(orig.v) || 0) + dV; orig.r = (Number(orig.r) || 0) + dR;
      sh.getRange(f, RES.original).setValue(JSON.stringify(orig));
      if (Number(r[RES.ajuste - 1]) || 0) ajustarFila_(codigo, { descuento: Number(r[RES.ajuste - 1]), nota: String(r[RES.notaAjuste - 1] || '') });
    }
    registrarCambio_('Adicionales de la reserva', String(codigo) + ' · ' + String(r[RES.banda - 1]) + ' · ' + (partes.join(', ') || 'equipos') + ' · total ' + Reglas.clp(total), '', '');
    return { ok: true };
  });
}

function adminAgregarAdicional(codigo, d) {
  exigirAdmin_();
  d = d || {};
  var tipo = d.tipo === 'video' ? 'video' : d.tipo === 'raw' ? 'raw' : '';
  if (!tipo) throw new Error('Elige qué agregar: material en bruto o video.');
  return conBloqueo_(function () {
    var cfg = getCfg_(), monto = Math.round(Number(tipo === 'raw' ? cfg.precioRaw : cfg.precioVideo)) || 0;
    var rf = ajustarFilaBase_(codigo), sh = rf.sh, f = rf.f, r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
    var est = estadoNorm_(r[RES.estado - 1]);
    if (est === EST.NO_ASISTE || est === EST.ANULADA) throw new Error('Esta reserva no admite adicionales.');
    var colFlag = tipo === 'raw' ? RES.raw : RES.video, colM = tipo === 'raw' ? RES.rawM : RES.videoM;
    if (String(r[colFlag - 1]) === 'SI') throw new Error(tipo === 'raw' ? 'Esta reserva ya incluye material en bruto.' : 'Esta reserva ya incluye video.');
    var total = (Number(r[RES.total - 1]) || 0) + monto, abono = (Number(r[RES.abono - 1]) || 0) + (d.pagado ? monto : 0);
    sh.getRange(f, colFlag).setValue('SI');
    sh.getRange(f, colM).setValue((Number(r[colM - 1]) || 0) + monto);
    sh.getRange(f, RES.total).setValue(total);
    sh.getRange(f, RES.abono).setValue(abono);
    sh.getRange(f, RES.saldo).setValue(Math.max(0, total - abono));
    var orig = null;
    try { orig = JSON.parse(String(r[RES.original - 1] || '')); } catch (e) { orig = null; }
    if (orig && typeof orig.t === 'number') { orig.t += monto; orig[tipo === 'raw' ? 'r' : 'v'] = (Number(orig[tipo === 'raw' ? 'r' : 'v']) || 0) + monto; sh.getRange(f, RES.original).setValue(JSON.stringify(orig)); }
    var nota = String(r[RES.comentarios - 1] || '');
    sh.getRange(f, RES.comentarios).setValue(textoSeguro_((nota ? nota + ' · ' : '') + (tipo === 'raw' ? 'Material en bruto' : 'Video') + ' agregado' + (d.pagado ? ' (' + Reglas.clp(monto) + ' ya pagado)' : '')));
    return { ok: true };
  });
}

/** Desglose de una reserva manual (para mostrarlo mientras se arma): valores de la configuración, sin guardar nada. */
function adminCalcularReserva(p) {
  exigirAdmin_();
  p = p || {};
  var cfg = getCfg_(), servicio = p.servicio === 'grabacion' ? 'grabacion' : (p.servicio === 'vivo' ? 'vivo' : 'ensayo'), horas = Math.max(1, Math.min(24, Number(p.horas) || 1));
  if (servicio === 'vivo') horas = cfg.vivoHasta - cfg.vivoDesde;
  var n = servicio === 'ensayo' ? Math.max(0, Math.min(6, Number(p.extras) || 0)) : 0;
  var c = Reglas.calcularPrecio(cfg, { servicio: servicio, fecha: String(p.fecha || ''), inicio: Number(p.inicio) || 0, horas: horas, extras: n, video: !!p.video, raw: !!p.raw });
  c.unidadExtra = cfg.precioExtraEquipo * (cfg.extraModo === 'hora' ? horas : 1); c.precioVideo = cfg.precioVideo; c.precioRaw = cfg.precioRaw; c.addons = !!Reglas.addonsPermitidos(cfg, servicio, horas);
  c.extraTxt = cfg.extraModo === 'hora' ? 'por hora c/u' : 'por sesión c/u'; c.abonoHora = cfg.abonoPorHora;
  return c;
}

function adminReservaManual(p) {
  exigirAdmin_();
  p = p || {};
  var cfg = getCfg_();
  var servicio = p.servicio === 'grabacion' ? 'grabacion' : (p.servicio === 'vivo' ? 'vivo' : 'ensayo');
  var fecha = String(p.fecha || ''), inicio = Number(p.inicio), horas = Number(p.horas);
  if (servicio === 'vivo') {
    inicio = cfg.vivoDesde; horas = cfg.vivoHasta - cfg.vivoDesde;
    if (!Reglas.vivoDiaValido(cfg, fecha)) throw new Error('Rockerío en vivo solo se agenda en: ' + cfg.vivoDias.toLowerCase() + '. Puedes cambiar los días en Configuración.');
  }
  if (!Reglas.fechaValida(fecha)) throw new Error('Elige una fecha válida.');
  if (!(inicio >= 0 && inicio <= 23 && inicio === Math.floor(inicio))) throw new Error('Elige la hora de inicio.');
  if (!(horas >= 1 && horas <= 24 && horas === Math.floor(horas)) || inicio + horas > 24) throw new Error('La duración debe ser de 1 a 24 horas y terminar antes de medianoche.');
  var banda = limpiar_(p.banda, 80), nombre = limpiar_(p.nombre, 80), correo = limpiar_(p.correo, 120).toLowerCase();
  var tel = Reglas.normalizarTelefono(String(p.telefono || ''));
  if (!banda) throw new Error('Escribe la banda o proyecto.');
  if (!nombre) throw new Error('Escribe el nombre del contacto.');
  if (!Reglas.telefonoValido(tel)) throw new Error('Revisa el teléfono. Ejemplo: +56 9 1234 5678.');
  if (correo && !Reglas.correoValido(correo)) throw new Error('Revisa el correo.');
  var estado = estadoNorm_(p.estado) || EST.CON_ABONO, pago = String(p.pago || ''), medioPago = String(p.medio || '');
  if (pago === 'completo' || pago === 'abono') estado = EST.CON_ABONO; else if (pago === 'ninguno') estado = EST.SIN_ABONO;
  if (pago === 'completo' && MEDIOS_PAGO.indexOf(medioPago) < 0) throw new Error('Elige el medio de pago.');
  var equipos = (Array.isArray(p.equipos) ? p.equipos : []).map(function (x) { return limpiar_(x, 120); }).filter(Boolean).slice(0, 6);
  var extras = servicio === 'ensayo' ? Math.max(0, Math.min(6, equipos.length || Number(p.extras) || 0)) : 0;
  var d = { servicio: servicio, fecha: fecha, inicio: inicio, horas: horas, extras: extras, video: !!p.video, raw: !!p.raw };
  var c = Reglas.calcularPrecio(cfg, d);
  var total = c.total, abono = c.abono;
  if (p.total !== undefined && p.total !== null && String(p.total).trim() !== '') {
    total = Number(String(p.total).replace(/[^\d]/g, ''));
    if (isNaN(total)) throw new Error('Revisa el total.');
    abono = Math.min(total, abono);
  }
  // Abono flexible (ej. banda amiga): monto acordado a mano; 0 = sin abono
  if (!p.codigoEditar && p.abono !== undefined && p.abono !== null && String(p.abono).trim() !== '' && pago !== 'completo') {
    var ab = Number(String(p.abono).replace(/[^\d]/g, ''));
    if (isNaN(ab)) throw new Error('Revisa el abono.');
    abono = Math.min(total, ab);
    if (abono === 0) { pago = 'ninguno'; estado = EST.SIN_ABONO; }
  }
  var desplazadas = [];
  return conBloqueo_(function () {
    var codigo = null, creada = new Date(), propias = [];
    if (p.codigoEditar) { // edición: se reemplaza la reserva existente conservando su código
      var shE = abrirBd_().getSheetByName(HOJAS.reservas), celdaE = shE.getLastRow() > 1 ? shE.createTextFinder(String(p.codigoEditar)).matchEntireCell(true).findNext() : null;
      if (!celdaE || celdaE.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
      var rv = shE.getRange(celdaE.getRow(), 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
      codigo = String(rv[RES.codigo - 1]); creada = rv[RES.creada - 1] || creada;
      if (!p.estado) estado = estadoNorm_(rv[RES.estado - 1]) || estado;
      if (aFechaIso_(rv[RES.fecha - 1]) === fecha) { var i0 = aHora_(rv[RES.inicio - 1]), n0 = Number(rv[RES.horas - 1]) || 0; for (var q = i0; i0 !== null && q < i0 + n0; q++) propias.push(q); }
    }
    if (!p.forzar) {
      var oc = ocupadasRango_(fecha, 1)[fecha] || [], choca = [];
      for (var h = inicio; h < inicio + horas; h++) if (oc.indexOf(h) >= 0 && propias.indexOf(h) < 0) choca.push(h + ':00');
      if (choca.length) {
        // Prioridad de tus ingresos: si lo que choca son SOLO reservas de clientes que aún no abonan, se liberan y la tuya queda
        var shD = abrirBd_().getSheetByName(HOJAS.reservas), nD = shD.getLastRow(), cubiertas = [], aAnular = [];
        if (nD > 1) shD.getRange(2, 1, nD - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (rd, iD) {
          if (estadoNorm_(rd[RES.estado - 1]) !== EST.SIN_ABONO || aFechaIso_(rd[RES.fecha - 1]) !== fecha) return;
          if (String(rd[RES.pago - 1]) === PAGO_COMPROBANTE || String(rd[RES.pago - 1]) === PAGO_MANUAL || /^Reserva manual/.test(String(rd[RES.comentarios - 1])) || esCasa_(String(rd[RES.telefono - 1]), rd[RES.banda - 1])) return;
          var i1 = aHora_(rd[RES.inicio - 1]), n1 = Number(rd[RES.horas - 1]) || 0, hs = [];
          for (var q1 = i1; i1 !== null && q1 < i1 + n1; q1++) if (q1 >= inicio && q1 < inicio + horas) hs.push(q1);
          if (hs.length) { cubiertas = cubiertas.concat(hs); aAnular.push({ fila: iD + 2, rd: rd }); }
        });
        var libres = choca.every(function (t) { return cubiertas.indexOf(parseInt(t, 10)) >= 0; });
        if (!libres || !aAnular.length) throw new Error('CHOQUE: ese horario ya está ocupado o bloqueado (' + choca.join(', ') + ').');
        var calD = getCalendar_();
        aAnular.forEach(function (x) {
          shD.getRange(x.fila, RES.estado).setValue(EST.ANULADA); borrarEvento_(calD, x.rd[RES.evento - 1]);
          desplazadas.push(String(x.rd[RES.banda - 1]) + ' (' + String(x.rd[RES.codigo - 1]) + ')');
          registrarCambio_('Reserva sin abono desplazada por ingreso manual', String(x.rd[RES.codigo - 1]) + ' · ' + String(x.rd[RES.banda - 1]) + ' · ' + fecha, 'Reservado (sin abono)', 'Anulada');
        });
      }
    }
    if (p.codigoEditar) {
      var shB = abrirBd_().getSheetByName(HOJAS.reservas), cB = shB.createTextFinder(String(p.codigoEditar)).matchEntireCell(true).findNext(), evV = shB.getRange(cB.getRow(), RES.evento).getValue();
      var evOld = evV ? obtenerEvento_(getCalendar_(), evV) : null; if (evOld) evOld.deleteEvent();
      shB.deleteRow(cB.getRow());
    } else codigo = siguienteCodigo_();
    var evento = getCalendar_().createEvent(tituloEvento_(estado, banda, servicio, horas, codigo), fechaHora_(fecha, inicio), fechaHora_(fecha, inicio + horas),
      { description: 'Reserva manual #' + codigo + '\nBanda: ' + banda + '\nContacto: ' + nombre + '\nTeléfono: +' + tel + (correo ? '\nCorreo: ' + correo : '') +
        (p.comentario ? '\nComentarios: ' + limpiar_(p.comentario, 300) : '') + '\nTotal ' + Reglas.clp(total), location: cfg.direccion });
    var sh = abrirBd_().getSheetByName(HOJAS.reservas), fila = new Array(ENCABEZADO_RESERVAS.length);
    fila[RES.codigo - 1] = codigo; fila[RES.creada - 1] = creada; fila[RES.estado - 1] = estado;
    fila[RES.servicio - 1] = ETIQUETA_SERVICIO[servicio]; fila[RES.fecha - 1] = fechaHora_(fecha, 0);
    fila[RES.inicio - 1] = Reglas.horaTxt(inicio); fila[RES.fin - 1] = Reglas.horaTxt(inicio + horas); fila[RES.horas - 1] = horas;
    fila[RES.banda - 1] = textoSeguro_(banda); fila[RES.contacto - 1] = textoSeguro_(nombre); fila[RES.telefono - 1] = tel; fila[RES.correo - 1] = textoSeguro_(correo);
    fila[RES.extras - 1] = extras; fila[RES.video - 1] = d.video ? 'SI' : 'NO'; fila[RES.raw - 1] = d.raw ? 'SI' : 'NO';
    fila[RES.total - 1] = total; fila[RES.abono - 1] = abono; fila[RES.saldo - 1] = total - abono;
    fila[RES.zurdo - 1] = 'NO'; fila[RES.voces - 1] = 0; fila[RES.comentarios - 1] = textoSeguro_('Reserva manual' + (equipos.length && servicio === 'ensayo' ? ' · Equipos: ' + equipos.map(function (x) { return x.split(':')[0]; }).join(', ') : '') + (p.comentario ? ' · ' + limpiar_(p.comentario, 300) : ''));
    fila[RES.evento - 1] = evento.getId();
    var mm = { b: c.base, e: c.extras, v: c.video, r: c.raw }, dManual = c.total - total;
    if (dManual !== 0) { mm = repartirDescuento_({ b: c.base, e: c.extras, v: c.video, r: c.raw }, dManual); fila[RES.ajuste - 1] = dManual; fila[RES.notaAjuste - 1] = 'Total ingresado a mano'; fila[RES.original - 1] = JSON.stringify({ b: c.base, e: c.extras, v: c.video, r: c.raw, t: c.total }); }
    fila[RES.base - 1] = mm.b; fila[RES.extrasM - 1] = mm.e; fila[RES.videoM - 1] = mm.v; fila[RES.rawM - 1] = mm.r; fila[RES.abonoRecibido - 1] = 'NO';
    if (pago === 'ninguno') fila[RES.pago - 1] = PAGO_MANUAL;
    sh.appendRow(fila);
    var f = sh.getLastRow();
    sh.getRange(f, RES.telefono).setNumberFormat('@').setValue(tel);
    if (estado !== EST.SIN_ABONO) sincronizarEstado_(sh, f);
    if (pago === 'completo' && !p.codigoEditar) { sh.getRange(f, RES.cobro, 1, 2).setValues([['', medioPago]]); sh.getRange(f, RES.fechaPago).setValue(fechaHora_(ahoraChile_().fecha, 0)); }
    registrarCliente_({ telefono: tel, correo: correo, banda: banda, nombre: nombre });
    return { ok: true, codigo: codigo, desplazadas: desplazadas };
  });
}

/** Elimina una reserva (fila y evento del calendario). Para anular conservando el historial usa «Anulada». */
function adminEliminarReserva(codigo) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas), celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
    if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
    var ev = sh.getRange(celda.getRow(), RES.evento).getValue(), evento = ev ? obtenerEvento_(getCalendar_(), ev) : null;
    if (evento) evento.deleteEvent();
    sh.deleteRow(celda.getRow());
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
        fecha: fecha, fechaTxt: fecha ? Reglas.fechaLarga(fecha) : '', inicio: horaCelda_(r[RES.inicio - 1]), fin: horaCelda_(r[RES.fin - 1]), horas: Number(r[RES.horas - 1]) || 0,
        banda: String(r[RES.banda - 1]), contacto: String(r[RES.contacto - 1]), telefono: String(r[RES.telefono - 1]), correo: String(r[RES.correo - 1] || ''),
        extras: Number(r[RES.extras - 1]) || 0, video: String(r[RES.video - 1]) === 'SI', raw: String(r[RES.raw - 1]) === 'SI', zurdo: String(r[RES.zurdo - 1]) === 'SI',
        voces: Number(r[RES.voces - 1]) || 0, comentarios: String(r[RES.comentarios - 1] || ''), pago: String(r[RES.pago - 1] || ''),
        total: total, abono: abono, saldo: estadoNorm_(r[RES.estado - 1]) === EST.NO_ASISTE ? 0 : total - abono, ajuste: ajusteDe_(r), notaAjuste: String(r[RES.notaAjuste - 1] || ''), totalOriginal: totalOriginal_(r), retenido: Number(r[RES.retenido - 1]) || 0, devolver: Number(r[RES.devolver - 1]) || 0,
        cobro: String(r[RES.cobro - 1]) === 'POR COBRAR', medio: String(r[RES.medioPago - 1] || ''), cortesia: String(r[RES.cortesia - 1]) === 'SI', fechaPago: aFechaIso_(r[RES.fechaPago - 1]),
        plan: String(r[RES.plan - 1] || ''), creada: aFechaIso_(r[RES.creada - 1]), reag: Number(r[RES.reagendos - 1]) || 0
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
  reservas.forEach(function (r) { r.enlace = enlaceDe_(cl, r.telefono, r.banda); });
  cl.forEach(function (c) { porTel[c.telefono] = { telefono: c.telefono, correo: c.correo, banda: c.banda, contacto: c.contacto, nombre: c.nombre, apellido: c.apellido, enlace: c.enlace, casa: c.casa, jornadas: 0, finalizadas: 0, gastado: 0, ultima: '', proxima: '' }; });
  reservas.forEach(function (r) {
    var c = porTel[r.telefono] || (porTel[r.telefono] = { telefono: r.telefono, correo: r.correo, banda: r.banda, contacto: r.contacto, enlace: '', jornadas: 0, finalizadas: 0, gastado: 0, ultima: '', proxima: '' });
    if (r.estado === EST.ANULADA) return;
    c.jornadas++;
    if (r.estado === EST.FINALIZADA) { c.finalizadas++; c.gastado += r.total; }
    if (r.fecha && r.fecha < hoy && r.estado !== EST.SIN_ABONO && (!c.ultima || r.fecha > c.ultima)) c.ultima = r.fecha;
    if (r.fecha && r.fecha >= hoy && (!c.proxima || r.fecha < c.proxima)) c.proxima = r.fecha;
  });
  var clientes = Object.keys(porTel).map(function (t) { return porTel[t]; }).sort(function (a, b) { return b.jornadas - a.jornadas || (a.banda < b.banda ? -1 : 1); });
  return { hoy: hoy, reservas: reservas, bloqueos: bloqueos, inhabiles: inhabiles, clientes: clientes, estados: ESTADOS, wa: waDatos_(), maxReag: getCfg_().reagendoCambios, vivo: { dias: (Reglas.VIVO_DIAS[getCfg_().vivoDias] || [5, 6]), diasTxt: getCfg_().vivoDias, desde: getCfg_().vivoDesde, hasta: getCfg_().vivoHasta, precio: getCfg_().vivoPrecio }, precios: { raw: getCfg_().precioRaw, video: getCfg_().precioVideo, equipo: getCfg_().precioExtraEquipo, equipoModo: getCfg_().extraModo } };
}


/** Suma de los montos que usa el Balance (horas + equipos + video + material). */
function sumaMontos_(r) {
  return (Number(r[RES.base - 1]) || 0) + (Number(r[RES.extrasM - 1]) || 0) + (Number(r[RES.videoM - 1]) || 0) + (Number(r[RES.rawM - 1]) || 0);
}

/** Total original (antes de descuentos/ajustes) de una fila de reserva. */
function totalOriginal_(r) {
  try { var o = JSON.parse(String(r[RES.original - 1] || '')); if (o && typeof o.t === 'number') return o.t; } catch (e) { /* sin ajuste guardado */ }
  var s = sumaMontos_(r);
  return s > 0 ? s : (Number(r[RES.total - 1]) || 0);
}

/** Ajuste vigente: el guardado, o la diferencia entre el valor original y el total si alguien cambió el total a mano. */
function ajusteDe_(r) {
  var g = Number(r[RES.ajuste - 1]) || 0;
  if (g) return g;
  return totalOriginal_(r) - (Number(r[RES.total - 1]) || 0);
}

/** Reparte un descuento (o recargo si es negativo) sobre los montos: horas → equipos → video → material. */
function repartirDescuento_(orig, desc) {
  var m = { b: orig.b, e: orig.e, v: orig.v, r: orig.r }, resto = desc;
  if (resto < 0) { m.b += -resto; return m; }
  ['b', 'e', 'v', 'r'].forEach(function (k) { var q = Math.min(m[k], resto); m[k] -= q; resto -= q; });
  return m;
}

/**
 * Ajusta el cobro de una reserva (descuento, recargo o total final exacto) y, si quieres, la finaliza.
 * d = {descuento (pesos; negativo = recargo) | totalFinal, nota, finalizar}. El descuento se reparte en horas → equipos → video → material,
 * así el Balance y el resumen contable lo toman en cuenta. Los montos originales quedan guardados y el ajuste se puede cambiar o quitar.
 */
function adminAjustarReserva(codigo, d) {
  exigirAdmin_();
  return conBloqueo_(function () { ajustarFila_(codigo, d || {}); return adminResumen(); });
}

/** Núcleo del ajuste (se llama dentro de un bloqueo). Devuelve {sh, f}. */
function ajustarFilaBase_(codigo) {
  var sh = abrirBd_().getSheetByName(HOJAS.reservas);
  var celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
  if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
  return { sh: sh, f: celda.getRow() };
}

function ajustarFila_(codigo, d) {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas);
    var celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
    if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
    var f = celda.getRow(), r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
    var estado = estadoNorm_(r[RES.estado - 1]);
    if (estado === EST.NO_ASISTE) throw new Error('«No asiste» ya cierra la reserva con el cobro de la retención; no admite descuentos.');
    if (estado === EST.ANULADA) throw new Error('Una reserva anulada no admite ajustes.');
    var orig = null;
    try { orig = JSON.parse(String(r[RES.original - 1] || '')); } catch (e) { orig = null; }
    if (!orig || typeof orig.t !== 'number') {
      var sm = sumaMontos_(r);
      orig = sm > 0 ? { b: Number(r[RES.base - 1]) || 0, e: Number(r[RES.extrasM - 1]) || 0, v: Number(r[RES.videoM - 1]) || 0, r: Number(r[RES.rawM - 1]) || 0, t: sm }
                    : { b: Number(r[RES.total - 1]) || 0, e: 0, v: 0, r: 0, t: Number(r[RES.total - 1]) || 0 };
    }
    var bruto = orig.t, desc;
    if (d.totalFinal !== undefined && d.totalFinal !== null && String(d.totalFinal) !== '') {
      var tf = Math.round(Number(d.totalFinal)); if (!isFinite(tf) || tf < 0) throw new Error('El total final debe ser un monto válido (0 o más).');
      desc = bruto - tf;
    } else {
      desc = Math.round(Number(d.descuento) || 0); if (!isFinite(desc)) throw new Error('El descuento debe ser un número.');
    }
    if (desc > bruto) throw new Error('El descuento no puede ser mayor que el total de la reserva (' + Reglas.clp(bruto) + ').');
    var rep = repartirDescuento_(orig, desc), b = rep.b, e = rep.e, v = rep.v, rw = rep.r;
    var total = bruto - desc, abono = Number(r[RES.abono - 1]) || 0;
    sh.getRange(f, RES.total).setValue(total);
    sh.getRange(f, RES.saldo).setValue(Math.max(0, total - abono));
    sh.getRange(f, RES.base, 1, 4).setValues([[b, e, v, rw]]);
    sh.getRange(f, RES.ajuste, 1, 3).setValues([[desc, textoSeguro_(String(d.nota || '').slice(0, 200)), JSON.stringify(orig)]]);
    if (d.finalizar && estado !== EST.FINALIZADA) { sh.getRange(f, RES.estado).setValue(EST.FINALIZADA); sincronizarEstado_(sh, f); }
    if (d.finalizar && d.medio && MEDIOS_PAGO.indexOf(String(d.medio)) >= 0 && r[RES.cortesia - 1] !== 'SI') { // el saldo se cobró al finalizar: queda registrado el medio de pago
      sh.getRange(f, RES.cobro, 1, 2).setValues([['', String(d.medio)]]); sh.getRange(f, RES.fechaPago).setValue(fechaHora_(ahoraChile_().fecha, 0));
    }
    return { sh: sh, f: f };
}


/** Reservas cuyo total no coincide con los montos que usa el Balance (p. ej. total cambiado a mano antes de esta versión). */
function descuadres_() {
  var sh = abrirBd_().getSheetByName(HOJAS.reservas), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    if (!r[RES.codigo - 1]) return;
    var est = estadoNorm_(r[RES.estado - 1]);
    if (est === EST.ANULADA || est === EST.NO_ASISTE) return;
    var total = Number(r[RES.total - 1]) || 0, suma = sumaMontos_(r);
    if (suma !== total) out.push({ codigo: String(r[RES.codigo - 1]), fecha: aFechaIso_(r[RES.fecha - 1]), banda: String(r[RES.banda - 1]), estado: est, total: total, montos: suma });
  });
  return out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
}

/** Deja los montos del Balance iguales al total de la reserva (conserva el total que tú pusiste). */
function adminCuadrarReservas(codigos) {
  exigirAdmin_();
  var lista = descuadres_().filter(function (x) { return !codigos || !codigos.length || codigos.indexOf(x.codigo) >= 0; });
  lista.forEach(function (x) { adminAjustarReserva(x.codigo, { totalFinal: x.total, nota: 'Cuadrado con el total de la reserva' }); });
  return { ok: true, cuadradas: lista.length };
}

/**
 * «No asiste» / «Anulada»: fija a mano cuánto se retiene (0 = perdonar la retención). La reserva sigue cerrada.
 */
function adminAjustarRetencion(codigo, monto, nota) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas);
    var celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
    if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
    var f = celda.getRow(), r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0], est = estadoNorm_(r[RES.estado - 1]);
    if (est !== EST.NO_ASISTE && est !== EST.ANULADA) throw new Error('Solo se edita la retención de reservas en «No asiste» o «Anulada».');
    var m = Math.round(Number(monto)); if (!isFinite(m) || m < 0) throw new Error('La retención debe ser 0 o más.');
    var abono = Number(r[RES.abono - 1]) || 0, recibido = String(r[RES.abonoRecibido - 1]).toUpperCase() === 'SI';
    sh.getRange(f, RES.abonoRecibido, 1, 3).setValues([[recibido ? 'SI' : 'NO', m, recibido ? Math.max(0, abono - m) : 0]]);
    sh.getRange(f, RES.ajuste, 1, 2).setValues([[0, textoSeguro_('Retención fijada a mano: ' + Reglas.clp(m) + (nota ? ' · ' + String(nota).slice(0, 150) : ''))]]);
    return adminResumen();
  });
}

/**
 * DIAGNÓSTICO (se ejecuta a mano desde el editor de Apps Script: elegir «diagnostico» y pulsar Ejecutar).
 * Mide cada lectura por separado y deja el avance en el registro: si algo se cuelga, la última línea dice dónde.
 * Solo LEE; no modifica nada.
 */
function diagnostico() {
  var props = PropertiesService.getScriptProperties(), lineas = [], t0 = Date.now();
  function anotar(t) { lineas.push(Utilities.formatDate(new Date(), 'America/Santiago', 'HH:mm:ss') + ' ' + t); props.setProperty('DIAG', lineas.join('\n')); }
  function paso(n, fn) { var t = Date.now(); anotar('→ ' + n + ' …'); try { var r = fn(); anotar('✔ ' + n + ' (' + (Date.now() - t) + ' ms)' + (r === undefined ? '' : ' · ' + r)); } catch (e) { anotar('✖ ' + n + ': ' + (e && e.message || e)); } }
  anotar('inicio');
  paso('caché', function () { CacheService.getScriptCache().get('prueba'); });
  paso('Drive: hoja de datos', function () { return DriveApp.getFileById(props.getProperty('SHEET_ID')).getName(); });
  var ss = null;
  paso('SpreadsheetApp.openById', function () { ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID')); return ss.getName(); });
  if (!ss) return;
  paso('lista de pestañas', function () { return ss.getSheets().map(function (s) { return s.getName(); }).join(' | '); });
  ss.getSheets().forEach(function (s) {
    paso('tamaño «' + s.getName() + '»', function () { return s.getLastRow() + '×' + s.getLastColumn(); });
  });
  ss.getSheets().forEach(function (s) {
    paso('leer «' + s.getName() + '»', function () { var f = Math.min(s.getLastRow(), 2000), c = s.getLastColumn(); return f && c ? s.getRange(1, 1, f, c).getValues().length + ' filas' : 'vacía'; });
  });
  paso('configuración (getCfg_)', function () { return Object.keys(getCfg_()).length + ' claves'; });
  paso('calendario', function () { return getCalendar_().getName(); });
  paso('candado', function () { var l = LockService.getScriptLock(); var ok = l.tryLock(3000); if (ok) l.releaseLock(); return ok ? 'libre' : 'OCUPADO por otra ejecución'; });
  anotar('FIN en ' + (Date.now() - t0) + ' ms');
}

/** Muestra lo que alcanzó a anotar «diagnostico» (úsalo si se queda colgado: ejecuta esta aparte). */
function verDiagnostico() { console.log(PropertiesService.getScriptProperties().getProperty('DIAG') || '(sin datos)'); }

/**
 * RESCATE (se ejecuta a mano desde el editor): crea una copia limpia de la hoja de datos con Drive y hace que el sistema use esa copia.
 * No borra nada: la hoja original queda intacta y se puede volver a ella con «rescateDeshacer».
 */
function rescate() {
  var props = PropertiesService.getScriptProperties(), viejo = props.getProperty('SHEET_ID');
  if (!viejo) throw new Error('No hay hoja de datos configurada.');
  var copia = DriveApp.getFileById(viejo).makeCopy('Rockerío · Base de datos (copia limpia ' + Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH-mm') + ')');
  props.setProperty('SHEET_ID_ANTERIOR', viejo);
  props.setProperty('SHEET_ID', copia.getId());
  try { CacheService.getScriptCache().removeAll(['cfgraw', 'sitio', 'tienda', 'contenido', 'agver']); } catch (e) { /* sin caché */ }
  console.log('Listo. Ahora el sistema usa la copia: ' + copia.getName() + ' (' + copia.getId() + '). La original sigue intacta: ' + viejo);
}

/** Vuelve a usar la hoja original (la que había antes de «rescate»). */
function rescateDeshacer() {
  var props = PropertiesService.getScriptProperties(), antes = props.getProperty('SHEET_ID_ANTERIOR');
  if (!antes) throw new Error('No hay un rescate previo que deshacer.');
  props.setProperty('SHEET_ID', antes);
  try { CacheService.getScriptCache().removeAll(['cfgraw', 'sitio', 'tienda', 'contenido', 'agver']); } catch (e) { /* sin caché */ }
  console.log('Se volvió a la hoja original: ' + antes);
}

/** Vuelve a crear SOLO el activador de «liberarPendientes» (cada 5 min) si no existe. Se ejecuta a mano desde el editor; no duplica. */
function reponerActivadorLiberar() {
  var hay = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'liberarPendientes'; });
  if (hay) { console.log('Ya existe el activador de liberarPendientes; no se creó otro.'); return; }
  ScriptApp.newTrigger('liberarPendientes').timeBased().everyMinutes(5).create();
  console.log('Activador de liberarPendientes creado (cada 5 minutos).');
}
