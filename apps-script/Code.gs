/**
 * ROCKERÍO PRODUCCIONES · Servidor de reservas (Google Apps Script)
 *
 * Qué hace:
 *  - Guarda todo en una hoja de cálculo de tu cuenta de Google (reservas, clientes, bloqueos, tienda, balance).
 *  - Usa un Google Calendar como agenda: cada reserva y cada bloqueo es un evento.
 *  - Responde al sitio web: configuración, disponibilidad y reservas.
 *  - Valida TODO en el servidor (horario, choques, anticipación y precio). El navegador no decide nada.
 *
 * No hay clave de administración: administras entrando con tu cuenta de Google a la hoja y al calendario.
 * Instrucciones de instalación: README.md
 */

var HOJAS = {
  config: 'Configuracion',
  horarios: 'Horarios',
  inhabiles: 'DiasInhabiles',
  reservas: 'Reservas',
  clientes: 'Clientes',
  bloqueos: 'Bloqueos',
  tienda: 'Tienda',
  ventas: 'Ventas',
  bebestibles: 'Bebestibles',
  costos: 'CostosMes',
  historial: 'HistorialBalance',
  compras: 'Compras',
  tributario: 'Tributario',
  muestras: 'Muestras',
  honor: 'CuadroHonor',
  resenas: 'Resenas',
  solicitudes: 'Solicitudes',
  planes: 'Planes',
  balance: 'Balance',
  movimientos: 'Movimientos',
  sitio: 'Sitio'
};

var ENCABEZADO_MOVIMIENTOS = ['ID', 'Fecha', 'Tipo (Ingreso/Gasto)', 'Destino (Sala/Estudio)', 'Monto', 'Nota'];

/** Posición (desde 1) de cada columna de la hoja Reservas. No cambies el orden. */
var RES = {
  codigo: 1, creada: 2, estado: 3, servicio: 4, fecha: 5, inicio: 6, fin: 7, horas: 8, banda: 9, contacto: 10,
  telefono: 11, correo: 12, extras: 13, video: 14, raw: 15, total: 16, abono: 17, saldo: 18,
  zurdo: 19, voces: 20, comentarios: 21, evento: 22,
  base: 23, extrasM: 24, videoM: 25, rawM: 26, abonoRecibido: 27, retenido: 28, devolver: 29, plan: 30, recordatorio: 31, reagendos: 32, ajuste: 33, notaAjuste: 34, original: 35,
  cobro: 36, medioPago: 37, cortesia: 38, fechaPago: 39
};
var ENCABEZADO_RESERVAS = ['Código', 'Creada', 'Estado', 'Servicio', 'Fecha', 'Inicio', 'Fin', 'Horas', 'Banda', 'Contacto',
  'Teléfono', 'Correo', 'Equipo extra', 'Video', 'Material en bruto', 'Total', 'Abono', 'Saldo',
  'Baterista zurdo', 'Micrófonos de voz', 'Comentarios', 'ID del evento',
  'Monto horas', 'Monto extras', 'Monto video', 'Monto material bruto', 'Abono recibido', 'Abono retenido', 'Abono a devolver', 'Plan', 'Recordatorio WhatsApp', 'Reagendos', 'Ajuste (descuento)', 'Nota del ajuste', 'Montos originales',
  'Cobro (POR COBRAR si el saldo quedó pendiente)', 'Medio de pago del saldo', 'Cortesía o canje', 'Fecha de pago del saldo'];

/** Los cinco estados de una reserva (así aparecen en la hoja y en el portal). */
var EST = {
  SIN_ABONO: 'Reservado (sin abono)',
  CON_ABONO: 'Reservado (con abono)',
  FINALIZADA: 'Finalizada',
  NO_ASISTE: 'No asiste',
  ANULADA: 'Anulada'
};
var ESTADOS = [EST.SIN_ABONO, EST.CON_ABONO, EST.FINALIZADA, EST.NO_ASISTE, EST.ANULADA];
var ESTADOS_QUE_OCUPAN = [EST.SIN_ABONO, EST.CON_ABONO, EST.FINALIZADA, EST.NO_ASISTE];

/** Devuelve el estado oficial aunque se haya escrito con otras mayúsculas o espacios; '' si no existe. */
function estadoNorm_(v) {
  var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
  for (var i = 0; i < ESTADOS.length; i++) if (ESTADOS[i].toLowerCase() === s) return ESTADOS[i];
  return '';
}
var ETIQUETA_SERVICIO = { ensayo: 'Ensayo', grabacion: 'Grabación' };
var MAX_PENDIENTES_POR_TELEFONO = 3;
var MAX_SOLICITUDES_POR_HORA = 6;

/* ====================================================================
 *  PUNTOS DE ENTRADA DEL SITIO WEB
 * ==================================================================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.admin === '1') return paginaAdmin_();
  try {
    switch (p.accion) {
      case 'config':
        return json_({ ok: true, config: configPublica_(), tienda: tiendaPublica_(), sitio: sitioPublico_(), ahora: ahoraChile_() });
      case 'contenido':
        return json_({ ok: true, contenido: contenidoPublico_() });
      case 'agenda':
        return json_(agenda_(p.dias, p.plan === '1'));
      case 'disponibilidad':
        return json_(disponibilidad_(String(p.fecha || '')));
      case 'socios':
        return json_(sociosDatos_(String(p.t || ''), String(p.mes || '')));
      default:
        return json_({ ok: true, servicio: 'Rockerío', ahora: ahoraChile_() });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'No pudimos cargar los datos. Intenta de nuevo.' });
  }
}

function doPost(e) {
  try {
    var cuerpo = (e && e.postData && e.postData.contents) || '';
    if (cuerpo.length > 600000) return json_({ ok: false, codigo: 'DATOS', error: 'Solicitud demasiado grande.' });
    var sol = JSON.parse(cuerpo);
    if (cuerpo.length > 8000 && sol.accion !== 'honor') return json_({ ok: false, codigo: 'DATOS', error: 'Solicitud demasiado grande.' });
    switch (sol.accion) {
      case 'reservar': return json_(reservar_(sol));
      case 'honor': return json_(registrarHonor_(sol));
      case 'resena': return json_(registrarResena_(sol));
      case 'cotizacion': return json_(registrarCotizacion_(sol));
      case 'plan': return json_(reservarPlan_(sol));
      case 'socios_vender': return json_(sociosVender_(sol));
      case 'socios_carrito': return json_(sociosCarrito_(sol));
      case 'socios_cobrar': return json_(sociosCobrar_(sol));
      default: return json_({ ok: false, codigo: 'DATOS', error: 'Acción no válida.' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, codigo: 'ERROR', error: 'No pudimos registrar tu reserva. Escríbenos por WhatsApp.' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ====================================================================
 *  CONFIGURACIÓN (viene de la hoja, con caché de 2 minutos)
 * ==================================================================== */

function getCfg_() {
  var cache = CacheService.getScriptCache();
  var crudo = cache.get('cfgraw');
  var raw;
  if (crudo) {
    raw = JSON.parse(crudo);
  } else {
    raw = leerConfigCruda_();
    try { cache.put('cfgraw', JSON.stringify(raw), 120); } catch (e) { /* demasiado grande: sin caché */ }
  }
  return Reglas.normalizarConfig(raw);
}

function leerConfigCruda_() {
  var ss = abrirBd_();
  var raw = {};
  var sh = ss.getSheetByName(HOJAS.config);
  var n = sh.getLastRow();
  if (n > 1) {
    sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) {
      if (r[0] !== '') raw[String(r[0]).trim()] = r[1];
    });
  }
  var orden = [1, 2, 3, 4, 5, 6, 0]; // las filas de la hoja van de lunes a domingo
  raw.horarios = {};
  var hs = ss.getSheetByName(HOJAS.horarios);
  hs.getRange(2, 1, 7, 3).getValues().forEach(function (r, i) {
    raw.horarios[orden[i]] = [String(r[1] || ''), String(r[2] || '')];
  });
  raw.diasInhabiles = [];
  var ih = ss.getSheetByName(HOJAS.inhabiles);
  if (ih.getLastRow() > 1) {
    ih.getRange(2, 1, ih.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var f = aFechaIso_(r[0]);
      if (f) raw.diasInhabiles.push(f);
    });
  }
  return raw;
}

/** Lo que el sitio puede ver. Nunca incluye correos ni datos de personas. */
function configPublica_() {
  var c = getCfg_();
  delete c.correoAdmin; delete c.waAutoActivo; delete c.waPhoneId; delete c.waPlantillaRecordatorio; delete c.waIdioma; delete c.waVersion;
  return c;
}

/** Foto de un producto: ruta dentro del sitio (assets/…jpg) o enlace https. Cualquier otra cosa se descarta. */
function fotoValida_(v) {
  v = String(v || '').trim();
  if (/^assets\/[A-Za-z0-9_\/.\-]{1,120}\.(jpg|jpeg|png|webp)$/i.test(v) && v.indexOf('..') < 0) return v;
  return /^https:\/\/[^\s"'<>]{4,300}$/.test(v) ? v : '';
}

function tiendaPublica_() {
  var sh = abrirBd_().getSheetByName(HOJAS.tienda);
  var n = sh.getLastRow();
  if (n < 2) return [];
  var out = [];
  sh.getRange(2, 1, n - 1, 7).getValues().forEach(function (r) {
    if (!Reglas.aBool(r[5], false) || !r[1] || /beb/i.test(String(r[0]))) return;
    var precio = Reglas.aNumero(r[3], null);
    var stock = r[4] === '' ? null : Reglas.aNumero(r[4], null);
    out.push({ categoria: String(r[0] || 'Otros'), nombre: String(r[1]), detalle: String(r[2] || ''), precio: precio, stock: stock, foto: fotoValida_(r[6]) });
  });
  return out;
}

/* ====================================================================
 *  DISPONIBILIDAD
 * ==================================================================== */

function disponibilidad_(fecha) {
  if (!Reglas.fechaValida(fecha)) return { ok: false, error: 'Fecha inválida.' };
  var cfg = getCfg_();
  var r = Reglas.horasLibres(cfg, fecha, horasOcupadas_(fecha, cfg), ahoraChile_());
  return { ok: true, fecha: fecha, abiertas: r.abiertas, libres: r.libres };
}

/** Disponibilidad de los próximos días en una sola consulta (hoy y los 'dias' siguientes). plan = true usa el plazo de los planes. */
function agenda_(dias, plan) {
  var cfg = getCfg_(), ahora = ahoraChile_();
  if (plan) { cfg.anticipacionMaxDias = Reglas.diasPlan(ahora.fecha); }
  var n = Math.max(1, Math.min(Number(dias) || (cfg.anticipacionMaxDias + 1), plan ? 65 : 40));
  var oc = ocupadasRango_(ahora.fecha, n), out = {};
  for (var i = 0; i < n; i++) {
    var f = Reglas.sumarDias(ahora.fecha, i), r = Reglas.horasLibres(cfg, f, oc[f] || [], ahora);
    out[f] = { abiertas: r.abiertas, libres: r.libres };
  }
  return { ok: true, hoy: ahora.fecha, dias: out };
}

/**
 * Horas ocupadas (0-23) por fecha, desde 'desde' durante 'dias' días: { 'AAAA-MM-DD': [horas] }.
 *  - cualquier evento del calendario de la agenda (reservas, pendientes y los que agregues a mano);
 *  - eventos de día completo SOLO si su título empieza con "BLOQUEO";
 *  - filas de la hoja Bloqueos.
 */
function ocupadasRango_(desde, dias) {
  var mapa = {}, tz = Reglas.TZ;
  function marca(f, h) { (mapa[f] = mapa[f] || {})[h] = true; }
  function todoElDia(f) { for (var h = 0; h < 24; h++) marca(f, h); }
  var ini = fechaHora_(desde, 0), fin = fechaHora_(Reglas.sumarDias(desde, dias), 0);
  var cal = getCalendar_(), tzCal = cal.getTimeZone();

  cal.getEvents(ini, fin).forEach(function (ev) {
    if (ev.isAllDayEvent()) {
      if (!/^\s*bloqueo/i.test(ev.getTitle())) return;
      var a = Utilities.formatDate(ev.getAllDayStartDate(), tzCal, 'yyyy-MM-dd'), b = Utilities.formatDate(ev.getAllDayEndDate(), tzCal, 'yyyy-MM-dd');
      for (var f = a, i = 0; f < b && i < 60; f = Reglas.sumarDias(f, 1), i++) todoElDia(f);
      return;
    }
    var t = Math.floor(Math.max(ev.getStartTime().getTime(), ini.getTime()) / 3600000) * 3600000;
    var hasta = Math.min(ev.getEndTime().getTime(), fin.getTime());
    for (; t < hasta; t += 3600000) {
      var d = new Date(t);
      marca(Utilities.formatDate(d, tz, 'yyyy-MM-dd'), Number(Utilities.formatDate(d, tz, 'H')));
    }
  });

  var sh = abrirBd_().getSheetByName(HOJAS.bloqueos), n = sh.getLastRow();
  if (n > 1) {
    sh.getRange(2, 1, n - 1, 3).getValues().forEach(function (r) {
      var f = aFechaIso_(r[0]);
      if (!f) return;
      var d = aHora_(r[1]), h = aHora_(r[2]);
      if (d === null || h === null) { d = 0; h = 24; } // sin horas = todo el día
      for (var k = d; k < h; k++) marca(f, k);
    });
  }
  var out = {};
  Object.keys(mapa).forEach(function (f) { out[f] = Object.keys(mapa[f]).map(Number); });
  return out;
}

function horasOcupadas_(fecha, cfg) {
  return ocupadasRango_(fecha, 1)[fecha] || [];
}

/* ====================================================================
 *  RESERVAR
 * ==================================================================== */

function reservar_(sol) {
  if (sol && sol.web) return { ok: false, codigo: 'DATOS', error: 'Solicitud no válida.' };
  var cfg = getCfg_();
  var tel = Reglas.normalizarTelefono(sol.telefono);
  if (excedeTasa_(tel)) {
    return { ok: false, codigo: 'TASA', error: 'Hiciste varias solicitudes seguidas. Escríbenos por WhatsApp.' };
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return { ok: false, codigo: 'OCUPADO_SISTEMA', error: 'Hay mucha actividad en este momento. Intenta de nuevo en unos segundos.' };
  }

  var v, codigo, res;
  try {
    liberarVencidas_(cfg); // un horario vencido queda libre en el mismo instante en que otra persona lo pide
    var fechaOk = Reglas.fechaValida(String(sol.fecha || ''));
    var ocupadas = fechaOk ? horasOcupadas_(sol.fecha, cfg) : [];
    v = Reglas.validarSolicitud(cfg, ahoraChile_(), sol, ocupadas);
    if (!v.ok) return { ok: false, codigo: v.codigo, error: v.error };
    if (pendientesDe_(v.datos.telefono) >= MAX_PENDIENTES_POR_TELEFONO) {
      return { ok: false, codigo: 'TASA', error: 'Ya tienes reservas pendientes de abono. Escríbenos por WhatsApp para confirmarlas.' };
    }

    var d = v.datos;
    codigo = siguienteCodigo_();
    var inicio = fechaHora_(d.fecha, d.inicio);
    var termino = fechaHora_(d.fecha, v.fin);
    var evento = getCalendar_().createEvent(
      tituloEvento_(EST.SIN_ABONO, d.banda, d.servicio, d.horas, codigo),
      inicio, termino,
      { description: descripcionEvento_(cfg, v, codigo), location: cfg.direccion }
    );
    evento.setColor(CalendarApp.EventColor.YELLOW);

    var sh = abrirBd_().getSheetByName(HOJAS.reservas);
    var fila = new Array(ENCABEZADO_RESERVAS.length);
    fila[RES.codigo - 1] = codigo;
    fila[RES.creada - 1] = new Date();
    fila[RES.estado - 1] = EST.SIN_ABONO;
    fila[RES.servicio - 1] = ETIQUETA_SERVICIO[d.servicio];
    fila[RES.fecha - 1] = fechaHora_(d.fecha, 0);
    fila[RES.inicio - 1] = Reglas.horaTxt(d.inicio);
    fila[RES.fin - 1] = Reglas.horaTxt(v.fin);
    fila[RES.horas - 1] = d.horas;
    fila[RES.banda - 1] = textoSeguro_(d.banda);
    fila[RES.contacto - 1] = textoSeguro_(d.nombre);
    fila[RES.telefono - 1] = d.telefono;
    fila[RES.correo - 1] = textoSeguro_(d.correo);
    fila[RES.extras - 1] = d.extras;
    fila[RES.video - 1] = d.video ? 'SI' : 'NO';
    fila[RES.raw - 1] = d.raw ? 'SI' : 'NO';
    fila[RES.total - 1] = v.calculo.total;
    fila[RES.abono - 1] = v.calculo.abono;
    fila[RES.saldo - 1] = v.calculo.saldo;
    fila[RES.zurdo - 1] = d.zurdo ? 'SI' : 'NO';
    fila[RES.voces - 1] = d.voces;
    fila[RES.comentarios - 1] = textoSeguro_(d.comentario);
    fila[RES.evento - 1] = evento.getId();
    fila[RES.base - 1] = v.calculo.base;
    fila[RES.extrasM - 1] = v.calculo.extras;
    fila[RES.videoM - 1] = v.calculo.video;
    fila[RES.rawM - 1] = v.calculo.raw;
    fila[RES.abonoRecibido - 1] = 'NO';
    sh.appendRow(fila);

    registrarCliente_(d);
    res = {
      ok: true,
      codigo: codigo,
      estado: EST.SIN_ABONO,
      resumen: {
        servicio: d.servicio, fecha: d.fecha, inicio: d.inicio, fin: v.fin, horas: d.horas, banda: d.banda,
        total: v.calculo.total, abono: v.calculo.abono, saldo: v.calculo.saldo, grabacionMin: v.grabacionMin
      },
      whatsapp: Reglas.resumenTexto(cfg, v, codigo),
      pago: { instrucciones: cfg.instruccionesPago, transferencia: (cfg.pagoTransferencia && cfg.datosTransferencia) ? cfg.datosTransferencia : '', link: (cfg.pagoOnline && cfg.linkPago) ? cfg.linkPago : '', minutosReserva: cfg.minutosReserva, segundos: cfg.minutosReserva * 60 }
    };
  } finally {
    lock.releaseLock();
  }

  notificar_(cfg, v, codigo);
  return res;
}

function tituloEvento_(estado, banda, servicio, horas, codigo) {
  var prefijos = {};
  prefijos[EST.SIN_ABONO] = '⏳ '; prefijos[EST.NO_ASISTE] = '✖ '; prefijos[EST.FINALIZADA] = '✔ ';
  var prefijo = prefijos[estado] || '';
  return prefijo + banda + ' · ' + ETIQUETA_SERVICIO[servicio] + ' ' + horas + 'h · #' + codigo;
}

function descripcionEvento_(cfg, v, codigo) {
  var d = v.datos, c = v.calculo;
  var l = ['Reserva #' + codigo, 'Banda: ' + d.banda, 'Contacto: ' + d.nombre, 'Teléfono: +' + d.telefono, 'Correo: ' + d.correo];
  if (d.extras) l.push('Equipo extra: ' + d.extras);
  if (d.video) l.push('Video GoPro: sí');
  if (d.raw) l.push('Material en bruto: sí');
  if (v.grabacionMin) l.push('Grabación incluida: ' + Reglas.minutosTxt(v.grabacionMin));
  l.push('Baterista zurdo: ' + (d.zurdo ? 'sí' : 'no'), 'Micrófonos de voz: ' + d.voces);
  if (d.comentario) l.push('Comentarios: ' + d.comentario);
  l.push('Total ' + Reglas.clp(c.total) + ' · Abono ' + Reglas.clp(c.abono) + ' · Saldo ' + Reglas.clp(c.saldo));
  l.push('', 'Cuando llegue el abono, cambia el Estado a «' + EST.CON_ABONO + '» en la hoja Reservas o en el portal.');
  return l.join('\n');
}

function siguienteCodigo_(prefijo) {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('CONTADOR') || 1000) + 1;
  props.setProperty('CONTADOR', String(n));
  return (prefijo || 'RP') + '-' + n;
}

/** Evita que un teléfono llene la agenda: máximo de solicitudes por hora. */
function excedeTasa_(tel) {
  if (!tel) return false;
  var cache = CacheService.getScriptCache();
  var clave = 'tasa_' + tel;
  var n = Number(cache.get(clave) || 0) + 1;
  cache.put(clave, String(n), 3600);
  return n > MAX_SOLICITUDES_POR_HORA;
}

function pendientesDe_(tel) {
  var sh = abrirBd_().getSheetByName(HOJAS.reservas);
  var n = sh.getLastRow();
  if (n < 2) return 0;
  var cuenta = 0;
  sh.getRange(2, 1, n - 1, RES.plan).getValues().forEach(function (r) {
    if (estadoNorm_(r[RES.estado - 1]) === EST.SIN_ABONO && String(r[RES.telefono - 1]) === tel && !r[RES.plan - 1]) cuenta++;
  });
  return cuenta;
}

function registrarCliente_(d) {
  var sh = abrirBd_().getSheetByName(HOJAS.clientes);
  var hoy = new Date();
  var hallado = sh.getLastRow() > 1 ? sh.createTextFinder(d.telefono).matchEntireCell(true).findNext() : null;
  if (hallado && hallado.getColumn() === 1) {
    var f = hallado.getRow();
    sh.getRange(f, 5).setValue(Number(sh.getRange(f, 5).getValue() || 0) + 1);
    sh.getRange(f, 7).setValue(hoy);
    sh.getRange(f, 3).setValue(textoSeguro_(d.banda));
  } else {
    sh.appendRow([d.telefono, textoSeguro_(d.correo), textoSeguro_(d.banda), textoSeguro_(d.nombre), 1, hoy, hoy]);
  }
}

function notificar_(cfg, v, codigo) {
  var d = v.datos;
  var cuerpo = Reglas.resumenTexto(cfg, v, codigo).replace('Hola, quiero confirmar mi reserva', 'Nueva reserva pendiente de abono');
  cuerpo += '\nTeléfono: +' + d.telefono + '\nCorreo: ' + d.correo;
  if (d.comentario) cuerpo += '\nComentarios: ' + d.comentario;
  cuerpo += '\n\nCuando llegue el abono, cambia el Estado a «' + EST.CON_ABONO + '» en la hoja Reservas o en el portal.';
  try {
    if (cfg.correoAdmin) {
      MailApp.sendEmail({ to: cfg.correoAdmin, subject: 'Nueva reserva #' + codigo + ' · ' + d.banda, body: cuerpo, name: cfg.nombreNegocio });
    }
  } catch (err) { console.error('Correo al administrador: ' + err); }
  try {
    if (cfg.correoCliente && d.correo) {
      var texto = 'Hola ' + d.nombre + ',\n\nRecibimos tu solicitud en ' + cfg.nombreNegocio + '. Tu código es #' + codigo + '.\n\n' +
        Reglas.resumenTexto(cfg, v, '').split('\n').slice(1).join('\n') + '\n\n' +
        'Tu horario queda reservado ' + cfg.minutosReserva + ' minutos a la espera del abono de ' + Reglas.clp(v.calculo.abono) + '. Si no llega, el horario se libera solo.\n' +
        cfg.instruccionesPago + ((cfg.pagoTransferencia && cfg.datosTransferencia) ? '\nTransferencia: ' + cfg.datosTransferencia : '') + ((cfg.pagoOnline && cfg.linkPago) ? '\nPuedes pagar aquí: ' + cfg.linkPago : '') + '\n\n' +
        'Cambios o anulaciones: con al menos ' + cfg.horasAnulacion + ' horas de anticipación, por WhatsApp.\n' + cfg.direccion;
      MailApp.sendEmail({ to: d.correo, subject: 'Tu reserva #' + codigo + ' en ' + cfg.nombreNegocio, body: texto, name: cfg.nombreNegocio, replyTo: cfg.correoAdmin || '' });
    }
  } catch (err) { console.error('Correo al cliente: ' + err); }
}

/* ====================================================================
 *  TRABAJO AUTOMÁTICO
 * ==================================================================== */

/** Cada hora: libera las reservas pendientes que no recibieron abono a tiempo. */
/** Disparador (cada 5 minutos): libera las reservas que no abonaron a tiempo. */
function liberarPendientes() {
  conBloqueo_(function () { liberarVencidas_(getCfg_()); });
}

/** Anula las reservas «sin abono» cuyo plazo (minutosReserva) venció y libera su horario. Llamar con el bloqueo tomado. */
function liberarVencidas_(cfg) {
  var sh = abrirBd_().getSheetByName(HOJAS.reservas);
  var n = sh.getLastRow();
  if (n < 2) return;
  var limite = Date.now() - cfg.minutosReserva * 60000;
  var cal = getCalendar_();
  var datos = sh.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues();
  datos.forEach(function (r, i) {
    if (estadoNorm_(r[RES.estado - 1]) !== EST.SIN_ABONO) return;
    var creada = r[RES.creada - 1];
    if (!(creada instanceof Date) || creada.getTime() > limite) return;
    sh.getRange(i + 2, RES.estado).setValue(EST.ANULADA);
    borrarEvento_(cal, r[RES.evento - 1]);
  });
}

/**
 * Se ejecuta cuando alguien edita la hoja.
 *  - Limpia la caché de configuración.
 *  - Si cambia el Estado de una reserva, actualiza (o elimina) su evento del calendario.
 */
function alEditar(e) {
  try {
    CacheService.getScriptCache().remove('cfgraw');
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== HOJAS.reservas || e.range.getColumn() > RES.estado || e.range.getLastColumn() < RES.estado) return;
    for (var f = Math.max(2, e.range.getRow()); f <= e.range.getLastRow(); f++) sincronizarEstado_(sh, f);
  } catch (err) { console.error(err && err.stack || err); }
}

function sincronizarEstado_(sh, f) {
  var r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
  var estado = estadoNorm_(r[RES.estado - 1]);
  if (!r[RES.codigo - 1]) return;
  var cal = getCalendar_();
  var servicio = String(r[RES.servicio - 1]) === ETIQUETA_SERVICIO.grabacion ? 'grabacion' : 'ensayo';
  var evento = r[RES.evento - 1] ? obtenerEvento_(cal, r[RES.evento - 1]) : null;

  liquidar_(sh, f, r, estado);
  if (estado === EST.ANULADA) {
    if (evento) evento.deleteEvent();
    return;
  }
  if (ESTADOS_QUE_OCUPAN.indexOf(estado) < 0) return;

  var titulo = tituloEvento_(estado, r[RES.banda - 1], servicio, r[RES.horas - 1], r[RES.codigo - 1]);
  if (!evento) { // la reserva se había anulada y se vuelve a activar
    var fecha = aFechaIso_(r[RES.fecha - 1]);
    var inicio = aHora_(r[RES.inicio - 1]);
    if (!fecha || inicio === null) return;
    evento = cal.createEvent(titulo, fechaHora_(fecha, inicio), fechaHora_(fecha, inicio + Number(r[RES.horas - 1])), { location: getCfg_().direccion });
    sh.getRange(f, RES.evento).setValue(evento.getId());
  }
  evento.setTitle(titulo);
  var C = CalendarApp.EventColor;
  evento.setColor(estado === EST.SIN_ABONO ? C.YELLOW : estado === EST.NO_ASISTE ? C.GRAY : (servicio === 'grabacion' ? C.RED : C.GREEN));
}

/**
 * Registra el efecto en dinero de un cambio de estado (alimenta el Balance):
 *  - Reservado (con abono) / Finalizada: se da el abono por recibido.
 *  - No asiste: se cobra noAsisteCobroPorHora ($5.000) por cada hora reservada, haya abono o no (el abono se descuenta; lo que falte se cobra al cliente).
 *  - Anulada: con abono recibido y a tiempo (>= horasAnulacion) se retiene retencionPorHora por hora y el resto se devuelve;
 *    tarde, se retiene todo (salvo que anulacionTardiaRetiene = NO).
 */
function liquidar_(sh, f, r, estado) {
  var cfg = getCfg_();
  var recibido = String(r[RES.abonoRecibido - 1]).toUpperCase() === 'SI';
  if (estado === EST.CON_ABONO || estado === EST.FINALIZADA) recibido = true;
  var abono = Number(r[RES.abono - 1]) || 0, horas = Number(r[RES.horas - 1]) || 0;
  var retenido = '', devolver = '';
  if (estado === EST.NO_ASISTE) {
    // «No asiste»: se cobran $X por cada hora reservada, haya abono o no. Lo abonado se descuenta; el resto queda por cobrar al cliente.
    // La reserva queda CERRADA: se da por cobrado el abono (retención) y esa retención es lo que entra al balance.
    recibido = true;
    retenido = (Number(cfg.noAsisteCobroPorHora) || 0) * horas; devolver = Math.max(0, abono - retenido);
    sh.getRange(f, RES.saldo).setValue(0);
  } else if (estado === EST.ANULADA) {
    if (r[RES.retenido - 1] !== '' && r[RES.retenido - 1] !== null) return; // ya liquidada: no recalcular con otra hora
    if (!recibido) { retenido = 0; devolver = 0; }
    else {
      var fecha = aFechaIso_(r[RES.fecha - 1]), ini = aHora_(r[RES.inicio - 1]);
      var antes = (fecha && ini !== null) ? (fechaHora_(fecha, ini).getTime() - Date.now()) / 3600000 : 0;
      var aTiempo = antes >= cfg.horasAnulacion || !cfg.anulacionTardiaRetiene;
      retenido = aTiempo ? Math.min(abono, cfg.retencionPorHora * horas) : abono;
      devolver = abono - retenido;
    }
  }
  sh.getRange(f, RES.abonoRecibido, 1, 3).setValues([[recibido ? 'SI' : 'NO', retenido, devolver]]);
}

function obtenerEvento_(cal, id) { try { return cal.getEventById(id); } catch (e) { return null; } }
function borrarEvento_(cal, id) { var ev = id ? obtenerEvento_(cal, id) : null; if (ev) ev.deleteEvent(); }

/* ====================================================================
 *  UTILIDADES
 * ==================================================================== */

function ahoraChile_() {
  var n = new Date();
  return {
    fecha: Utilities.formatDate(n, Reglas.TZ, 'yyyy-MM-dd'),
    hora: Number(Utilities.formatDate(n, Reglas.TZ, 'H')) + Number(Utilities.formatDate(n, Reglas.TZ, 'm')) / 60
  };
}

/** Fecha y hora exactas en hora de Chile, sin depender de la zona horaria configurada en el proyecto. */
function fechaHora_(iso, hora) {
  if (hora >= 24) return Utilities.parseDate(Reglas.sumarDias(iso, 1) + ' 00:00', Reglas.TZ, 'yyyy-MM-dd HH:mm');
  return Utilities.parseDate(iso + ' ' + (hora < 10 ? '0' : '') + hora + ':00', Reglas.TZ, 'yyyy-MM-dd HH:mm');
}

function aFechaIso_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return Utilities.formatDate(v, Reglas.TZ, 'yyyy-MM-dd');
  var s = String(v || '').trim();
  return Reglas.fechaValida(s) ? s : '';
}

/** Acepta 19, "19", "19:00", "19:30" (se toma la hora). Devuelve null si está vacío. */
function aHora_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v.getHours();
  if (typeof v === 'number') return v < 1 ? Math.round(v * 24) : Math.floor(v);
  var m = /^\s*(\d{1,2})/.exec(String(v));
  return m ? Number(m[1]) : null;
}

/** Hora de una celda como «HH:mm» aunque Sheets la haya guardado como hora (fecha 1899) o número. */
function horaCelda_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return ('0' + v.getHours()).slice(-2) + ':' + ('0' + v.getMinutes()).slice(-2);
  }
  if (typeof v === 'number' && v < 1) { var t = Math.round(v * 1440); return ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2); }
  return String(v);
}

/** Evita que un texto empiece con = + - @ y se ejecute como fórmula en la hoja. */
function textoSeguro_(v) {
  var s = String(v === null || v === undefined ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function abrirBd_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Falta ejecutar la función instalar().');
  var ss = SpreadsheetApp.openById(id);
  asegurarEsquema_(ss);
  return ss;
}

/** Agrega a la hoja de reservas la columna «Reagendos» si falta (hojas de versiones anteriores). Se revisa una vez cada 6 horas. */
function asegurarEsquema_(ss) {
  var cache = CacheService.getScriptCache();
  if (cache.get('esq7')) return;
  try {
    var sh = ss.getSheetByName(HOJAS.reservas);
    if (sh) {
      if (sh.getMaxColumns() < RES.fechaPago) sh.insertColumnsAfter(sh.getMaxColumns(), RES.fechaPago - sh.getMaxColumns());
      [[RES.reagendos, 'Reagendos'], [RES.ajuste, 'Ajuste (descuento)'], [RES.notaAjuste, 'Nota del ajuste'], [RES.original, 'Montos originales'], [RES.cobro, ENCABEZADO_RESERVAS[RES.cobro - 1]], [RES.medioPago, ENCABEZADO_RESERVAS[RES.medioPago - 1]], [RES.cortesia, ENCABEZADO_RESERVAS[RES.cortesia - 1]], [RES.fechaPago, ENCABEZADO_RESERVAS[RES.fechaPago - 1]]].forEach(function (c) {
        if (!sh.getRange(1, c[0]).getValue()) sh.getRange(1, c[0]).setValue(c[1]).setFontWeight('bold');
      });
    }
    prepararSimple_(ss, HOJAS.movimientos, ENCABEZADO_MOVIMIENTOS, [], { 2: 'yyyy-mm-dd', 5: '$#,##0' });
    prepararSimple_(ss, HOJAS.sitio, ['Parte', 'Contenido (JSON)', 'Actualizado'], [], {});
    // Una sola vez: el cuadro de honor queda visible en la portada (si estaba apagado por una versión anterior).
    var props = PropertiesService.getScriptProperties();
    if (!props.getProperty('MIG_VISIBLES_2')) {
      var hv = ss.getSheetByName(HOJAS.config), nv = hv ? hv.getLastRow() : 0;
      if (nv > 1) {
        var kv = hv.getRange(2, 1, nv - 1, 1).getValues();
        for (var w = 0; w < kv.length; w++) if (['verHonor', 'verTienda'].indexOf(String(kv[w][0])) >= 0) hv.getRange(w + 2, 2).setValue('SI');
      }
      props.setProperty('MIG_VISIBLES_2', '1');
    }
    if (!props.getProperty('MIG_HONOR_1')) {
      var hc = ss.getSheetByName(HOJAS.config), nh = hc ? hc.getLastRow() : 0;
      if (nh > 1) {
        var kk = hc.getRange(2, 1, nh - 1, 1).getValues();
        for (var q = 0; q < kk.length; q++) if (String(kk[q][0]) === 'verHonor') { hc.getRange(q + 2, 2).setValue('SI'); break; }
      }
      props.setProperty('MIG_HONOR_1', '1');
    }
    cache.put('esq7', '1', 21600);
  } catch (e) { /* si falla, se reintenta en la próxima solicitud */ }
}

function getCalendar_() {
  var id = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  return (id && CalendarApp.getCalendarById(id)) || CalendarApp.getDefaultCalendar();
}

/* ====================================================================
 *  INSTALACIÓN (se ejecuta una sola vez a mano)
 * ==================================================================== */

/**
 * Crea la hoja de cálculo, el calendario y los disparadores automáticos.
 * Se puede ejecutar de nuevo sin perder datos: solo agrega lo que falte.
 */
function instalar() {
  var props = PropertiesService.getScriptProperties();
  var ss;
  var id = props.getProperty('SHEET_ID');
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('Rockerío · Base de datos');
    props.setProperty('SHEET_ID', ss.getId());
  }
  if (!props.getProperty('ADMIN_EMAIL')) {
    // Administrador = la cuenta que instala. Cámbialo en Configuración del proyecto > Propiedades del script.
    props.setProperty('ADMIN_EMAIL', Session.getEffectiveUser().getEmail());
  }
  ss.setSpreadsheetTimeZone(Reglas.TZ);
  ss.setSpreadsheetLocale('es_CL');

  prepararConfig_(ss);
  prepararHorarios_(ss);
  prepararSimple_(ss, HOJAS.inhabiles, ['Fecha', 'Motivo'], [], { 1: 'yyyy-mm-dd' });
  prepararReservas_(ss);
  ss.getSheetByName(HOJAS.reservas).getRange(1, RES.recordatorio).setValue('Recordatorio WhatsApp').setFontWeight('bold');
  ss.getSheetByName(HOJAS.reservas).getRange(1, RES.reagendos).setValue('Reagendos').setFontWeight('bold');
  prepararSimple_(ss, HOJAS.clientes, ['Teléfono', 'Correo', 'Banda', 'Contacto', 'Reservas', 'Primera reserva', 'Última reserva', 'Carpeta de material (Drive)', 'Nombre', 'Apellido'], [], { 1: '@', 6: 'yyyy-mm-dd', 7: 'yyyy-mm-dd' });
  prepararSimple_(ss, HOJAS.bloqueos, ['Fecha', 'Desde (hora)', 'Hasta (hora)', 'Motivo'], [], { 1: 'yyyy-mm-dd', 2: '@', 3: '@' });
  prepararTienda_(ss);
  prepararBebestibles_(ss);
  prepararSimple_(ss, HOJAS.ventas, ['Fecha', 'Producto', 'Cantidad', 'Precio unitario', 'Total', 'Tipo', 'Pago', 'Vendedor', 'Nota', 'Fecha de cobro', 'ID'], [], { 1: 'yyyy-mm-dd', 4: '$#,##0', 5: '$#,##0', 10: 'yyyy-mm-dd' });
  ss.getSheetByName(HOJAS.ventas).getRange(2, VT.pago, 5000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(PAGOS_VENTA.concat([PAGO.ANULADA]), true).setAllowInvalid(false).build());
  prepararSimple_(ss, HOJAS.costos, ['Mes (AAAA-MM)', 'Luz total (boleta)', 'Aporte ProAudix', 'Caja chica', 'Otros gastos de sala', 'Notas', 'Luz con factura a nombre del negocio (SI/NO)'], [], { 1: '@', 2: '$#,##0', 3: '$#,##0', 4: '$#,##0', 5: '$#,##0' });
  prepararSimple_(ss, HOJAS.movimientos, ENCABEZADO_MOVIMIENTOS, [], { 2: 'yyyy-mm-dd', 5: '$#,##0' });
  prepararSimple_(ss, HOJAS.sitio, ['Parte', 'Contenido (JSON)', 'Actualizado'], [], {});
  prepararSimple_(ss, HOJAS.compras, ['Fecha', 'Proveedor', 'RUT proveedor', 'Tipo de documento', 'N° documento', 'Descripción', 'Categoría', 'Neto', 'IVA', 'Total pagado'], [], { 1: 'yyyy-mm-dd', 3: '@', 5: '@', 8: '$#,##0', 9: '$#,##0', 10: '$#,##0' });
  prepararSimple_(ss, HOJAS.historial, ['Mes', 'Cerrado el', 'Ingresos brutos', 'Total sala', 'Total estudio', 'Material en bruto', 'Tienda y bebestibles', 'Luz que paga la sala', 'Utilidad de la sala', 'Juan Carlos', 'Jaime', 'Estudio', 'IVA a pagar', 'Remanente de IVA', 'PPM', 'Utilidad tributaria', 'Provisión impuesto 1ª categoría'], [], { 1: '@', 2: 'yyyy-mm-dd hh:mm' });
  prepararSimple_(ss, HOJAS.planes, ['Código', 'Creado', 'Plan', 'Horas por sesión', 'Banda', 'Contacto', 'Teléfono', 'Correo', 'Total', 'Pagado', 'Sesiones agendadas'], [], { 2: 'yyyy-mm-dd', 7: '@', 9: '$#,##0' });
  prepararSimple_(ss, HOJAS.muestras, ['Grupo (micrófono, canción o ensayo)', 'Tipo', 'Etiqueta', 'Enlace del audio', 'Descripción (solo la primera fila del grupo)', 'Visible'],
    [['Shure SM57', 'Micrófono', 'Caja', 'https://drive.google.com/file/d/ID_DEL_ARCHIVO/view', 'Escribe aquí qué es y para qué lo usas.', 'NO']], { 6: '@' });
  prepararSimple_(ss, HOJAS.honor, ['Fecha', 'Estado', 'Banda', 'Teléfono', 'Correo', 'Logo (URL)', 'Instagram', 'Enlace', 'YouTube', 'Reseña', 'Género', 'Formación', 'Redes (JSON)', 'Último trabajo'], [], { 1: 'yyyy-mm-dd', 4: '@' });
  prepararSimple_(ss, HOJAS.resenas, ['Fecha', 'Estado', 'Código de reserva', 'Banda', 'Nombre', 'Teléfono', 'Estrellas', 'Comentario'], [], { 1: 'yyyy-mm-dd', 6: '@' });
  prepararSimple_(ss, HOJAS.solicitudes, ['Fecha', 'Estado', 'Tipo', 'Nombre', 'Teléfono', 'Correo', 'Mensaje', 'Monto cotizado', 'Detalle de la cotización'], [], { 1: 'yyyy-mm-dd', 5: '@', 8: '$#,##0' });
  prepararBalance_(ss);
  prepararTributario_(ss); // al final: sus fórmulas leen Balance, CostosMes, Compras, HistorialBalance y Configuracion
  ordenarHojas_(ss);

  if (!props.getProperty('CALENDAR_ID')) {
    var cal = CalendarApp.createCalendar('Rockerío · Agenda', { summary: 'Reservas y bloqueos de Rockerío Producciones', timeZone: Reglas.TZ });
    props.setProperty('CALENDAR_ID', cal.getId());
  }

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['liberarPendientes', 'alEditar', 'respaldar', 'cerrarMesAnterior', 'enviarRecordatorios'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('liberarPendientes').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('respaldar').timeBased().everyDays(1).atHour(3).create();
  ScriptApp.newTrigger('alEditar').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('enviarRecordatorios').timeBased().everyDays(1).atHour(18).create();
  ScriptApp.newTrigger('cerrarMesAnterior').timeBased().onMonthDay(1).atHour(4).create();
  prepararSocios_();

  var msg = 'Instalación lista.\nHoja de datos: ' + ss.getUrl() +
    '\nCalendario: "Rockerío · Agenda" (aparece en tu Google Calendar, en "Otros calendarios").' +
    '\nAdministrador: ' + props.getProperty('ADMIN_EMAIL') +
    '\nSiguiente paso: Implementar > Nueva implementación > Aplicación web (README, pasos 6 y 7).';
  console.log(msg);
  return msg;
}

/** Muestra el estado de la instalación en el registro. */
function diagnostico() {
  var props = PropertiesService.getScriptProperties();
  var cfg = getCfg_();
  console.log(JSON.stringify({
    hoja: abrirBd_().getUrl(),
    calendario: getCalendar_().getName(),
    disparadores: ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }),
    reservasActivas: cfg.reservasActivas,
    correoAdmin: cfg.correoAdmin,
    proximoCodigo: Number(props.getProperty('CONTADOR') || 1000) + 1,
    ahoraChile: ahoraChile_()
  }, null, 2));
}

function hoja_(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

function prepararConfig_(ss) {
  var sh = ss.getSheets()[0].getName() === 'Hoja 1' || ss.getSheets()[0].getName() === 'Sheet1' ? ss.getSheets()[0].setName(HOJAS.config) : hoja_(ss, HOJAS.config);
  var d = Reglas.CONFIG_POR_DEFECTO;
  var correo = '';
  try { correo = Session.getEffectiveUser().getEmail(); } catch (e) { /* sin correo */ }
  var filas = [
    ['nombreNegocio', d.nombreNegocio, 'Nombre que aparece en el sitio y en los correos.'],
    ['whatsapp', d.whatsapp, 'Con código de país y sin el signo +. Ejemplo: 56912345678.'],
    ['direccion', d.direccion, 'Dirección del estudio.'],
    ['correoAdmin', correo, 'Correo que recibe el aviso de cada reserva.'],
    ['reservasActivas', 'SI', 'SI o NO. En NO se pausan las reservas en línea y el sitio ofrece WhatsApp.'],
    ['avisoBanner', '', 'Aviso destacado arriba del sitio. Déjalo vacío para no mostrar nada.'],
    ['precioEnsayoHora', d.precioEnsayoHora, 'Pesos por hora de sala de ensayo.'],
    ['precioGrabacionHora', d.precioGrabacionHora, 'Pesos por hora de estudio de grabación.'],
    ['precioExtraEquipo', d.precioExtraEquipo, 'Pesos por cada equipo extra arrendado (platillos, bajo, guitarra, pedalboard).'],
    ['extraModo', d.extraModo, 'hora = se cobra por cada hora; sesion = una vez por sesión. LOS DOCUMENTOS DE ORIGEN NO COINCIDEN: confirmar.'],
    ['precioVideo', d.precioVideo, 'Pesos por sesión de video con GoPro.'],
    ['precioRaw', d.precioRaw, 'Pesos por sesión de material en bruto.'],
    ['abonoPorHora', d.abonoPorHora, 'Abono obligatorio por cada hora reservada.'],
    ['plan8', d.plan8, 'Plan mensual de 8 horas (4 ensayos de 2 horas).'],
    ['plan12', d.plan12, 'Plan mensual de 12 horas (4 ensayos de 3 horas).'],
    ['ensayoMinHoras', d.ensayoMinHoras, 'Mínimo de horas de ensayo por reserva.'],
    ['ensayoMaxHoras', d.ensayoMaxHoras, 'Máximo de horas de ensayo por reserva.'],
    ['grabacionMinHoras', d.grabacionMinHoras, 'Mínimo de horas de estudio por reserva.'],
    ['grabacionMaxHoras', d.grabacionMaxHoras, 'Máximo de horas de estudio por reserva.'],
    ['addonsMinHoras', d.addonsMinHoras, 'Horas mínimas para ofrecer video y material en bruto.'],
    ['anticipacionMinHoras', d.anticipacionMinHoras, 'Horas de anticipación mínima para reservar en línea.'],
    ['anticipacionMaxDias', d.anticipacionMaxDias, 'Hasta cuántos días hacia adelante se puede reservar.'],
    ['planMaxDias', d.planMaxDias, 'Hasta cuántos días adelante se pueden agendar las 4 sesiones de un plan mensual.'],
    ['minutosReserva', d.minutosReserva, 'Minutos que el horario queda tomado esperando el abono (entre 5 y 180). Pasado ese tiempo se libera solo y el cliente ve una cuenta regresiva.'],
    ['horasAnulacion', d.horasAnulacion, 'Horas de anticipación para anular o reagendar.'],
    ['retencionPorHora', d.retencionPorHora, 'Pesos que se retienen por hora al anular.'],
    ['noAsisteCobroPorHora', d.noAsisteCobroPorHora, 'Pesos que se cobran por cada hora reservada cuando el cliente no asiste (haya abonado o no).'],
    ['escalaGrabacion', d.escalaGrabacion, 'Grabación incluida en el ensayo, como horas:minutos. Vacío = no se ofrece. CONFIRMAR que sigue vigente.'],
    ['pagoTransferencia', 'SI', 'SI o NO. Muestra los datos de transferencia al terminar la reserva (si escribiste datosTransferencia).'],
    ['datosTransferencia', '', 'Texto público con tus datos para transferir. Vacío = se los envías por WhatsApp. Ojo: lo que escribas aquí lo ve cualquiera.'],
    ['anulacionTardiaRetiene', 'SI', 'SI = si anulan con menos de horasAnulacion de anticipación, se retiene todo el abono. NO = se trata como anulación a tiempo.'],
    ['pagoOnline', 'NO', 'SI o NO. SI muestra el botón de pago online además de WhatsApp. Requiere linkPago.'],
    ['linkPago', '', 'Enlace de pago (por ejemplo Mercado Pago) para el abono. Solo se usa si pagoOnline = SI.'],
    ['instruccionesPago', d.instruccionesPago, 'Texto que ve el cliente para pagar el abono. No escribas aquí tu RUT ni tu cuenta si no quieres que sean públicos.'],
    ['tarifaConveniente', 'NO', 'SI o NO. SI aplica una tarifa por hora más baja de lunes a viernes en la franja convenienteDesde–convenienteHasta. Confirma el valor antes de activarla.'],
    ['precioEnsayoConveniente', d.precioEnsayoConveniente, 'Precio por hora de ensayo dentro de la franja conveniente (solo se aplica si es menor al precio normal).'],
    ['precioGrabacionConveniente', d.precioGrabacionConveniente, 'Precio por hora de grabación dentro de la franja conveniente (0 = no hay tarifa conveniente en el estudio).'],
    ['convenienteDesde', d.convenienteDesde, 'Hora de inicio de la franja conveniente (por defecto 9).'],
    ['convenienteHasta', d.convenienteHasta, 'Hora de término de la franja conveniente, no incluida (por defecto 14).'],
    ['msgRecordatorio', d.msgRecordatorio, 'Texto del recordatorio de WhatsApp (botón de un toque). {nombre} {banda} {servicio} {fecha} {hora} {fin} {codigo} {total} {abono} {saldo} {direccion} {negocio} {sitio} {horasAnulacion}. Se edita también desde el portal.'],
    ['msgConfirmacion', d.msgConfirmacion, 'Texto del mensaje de reserva confirmada.'],
    ['msgCobroAbono', d.msgCobroAbono, 'Texto para cobrar el abono pendiente.'],
    ['msgGracias', d.msgGracias, 'Texto de agradecimiento después de la sesión.'],
    ['msgResena', d.msgResena, 'Texto para pedir una reseña. {enlaceResena} lleva al formulario del sitio.'],
    ['msgDescarga', d.msgDescarga, 'Texto para enviar el enlace de descarga del material. {enlaceDescarga} es la carpeta de la banda.'],
    ['msgHonor', d.msgHonor, 'Texto de invitación al Cuadro de Honor. {enlaceHonor} lleva al formulario del sitio.'],
    ['waAutoActivo', 'NO', 'SI = el recordatorio del día anterior se envía solo por la API de WhatsApp Business (requiere cuenta de Meta, plantilla aprobada y token). Ver portal > Mensajes de WhatsApp.'],
    ['waPhoneId', '', 'ID del número de WhatsApp Business (en Meta, no es el teléfono).'],
    ['waPlantillaRecordatorio', '', 'Nombre de la plantilla de recordatorio aprobada por Meta.'],
    ['waIdioma', d.waIdioma, 'Código de idioma de la plantilla (es, es_CL…).'],
    ['waVersion', d.waVersion, 'Versión de la API Graph de Meta (por ejemplo v23.0). Meta retira versiones antiguas: si falla, revisa la vigente.'],
    ['reagendoSemanas', d.reagendoSemanas, 'Plazo máximo (semanas) para reagendar una reserva. Se muestra en el reglamento; el reagendado hoy se coordina por WhatsApp.'],
    ['reagendoCambios', d.reagendoCambios, 'Máximo de cambios por reserva. Se muestra en el reglamento.'],
    ['reglamento', d.reglamento, 'Reglamento interno que ve el cliente. ## = título de sección, - = viñeta. {horasAnulacion}, {retencionPorHora}, {reagendoSemanas}, {reagendoCambios}, {noAsisteCobroPorHora} y {minutosReserva} se reemplazan solos. Se edita también desde el portal.'],
    ['repartoSalaJC', d.repartoSalaJC, 'Sala de ensayo: % de Juan Carlos. Junto con repartoSalaJaime debe sumar 100.'],
    ['repartoSalaJaime', d.repartoSalaJaime, 'Sala de ensayo: % de Jaime.'],
    ['repartoEstudioJC', d.repartoEstudioJC, 'Estudio de grabación: % de Juan Carlos. Junto con repartoEstudioEstudio debe sumar 100.'],
    ['repartoEstudioEstudio', d.repartoEstudioEstudio, 'Estudio de grabación: % de Gabriela (el resto es de Juan Carlos).'],
    ['aporteLuzProAudix', d.aporteLuzProAudix, 'Lo que ProAudix aporta cada mes a la boleta de luz (valor por defecto; cada mes se puede cambiar en CostosMes).'],
    ['cajaChicaMensual', d.cajaChicaMensual, 'Caja chica que se aparta cada mes antes de repartir (valor por defecto).'],
    ['contabilidadFormal', 'NO', 'SI o NO. SI activa la contabilidad formal mensual: IVA, PPM, impuesto simulado y registro de compras (hoja Tributario). Actívala cuando inicies actividades en el SII.'],
    ['regimen', '14D3', '14D3 = Pro Pyme general (la empresa paga Primera Categoría) o 14D8 = Pro Pyme transparente (tributan los dueños). Confírmalo con tu contador.'],
    ['sitioUrl', '', 'Dirección pública del sitio, sin barra final. Ejemplo: https://rockerioproducciones.cl (sirve para armar los enlaces que compartes).'],
    ['tema', 'rockerio', 'Tema visual por defecto: rockerio, medianoche, vino, bosque, grafito, azufre, abismo, cobre, ciruela o carbon.'],
    ['temaAdmin', 'rockerio', 'Tema visual del portal de administración (mismas opciones que «tema»).'],
    ['presentacionTitulo', 'Mi enfoque', 'Título de la sección de presentación personal.'],
    ['presentacion', '', 'Tu presentación: visión y enfoque técnico y artístico. Separa párrafos con una línea en blanco. Vacío = la sección no se muestra. Se edita también desde el portal.'],
    ['correoCliente', 'SI', 'SI o NO. Envía un correo de confirmación al cliente (cuenta Gmail: máximo 100 correos al día).']
  ];
  sh.getRange(1, 1, 1, 3).setValues([['Clave', 'Valor', 'Nota']]).setFontWeight('bold');
  sh.getRange(2, 2, 200, 1).setNumberFormat('@');
  var existentes = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { existentes[String(r[0])] = true; });
  var nuevas = filas.filter(function (f) { return !existentes[f[0]]; });
  if (nuevas.length) {
    var fila = Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(fila, 1, nuevas.length, 3).setValues(nuevas);
  }
  sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 260); sh.setColumnWidth(3, 620);
  sh.setFrozenRows(1);
}

function prepararHorarios_(ss) {
  var sh = hoja_(ss, HOJAS.horarios);
  if (sh.getLastRow() > 1) return;
  var d = Reglas.CONFIG_POR_DEFECTO.horarios;
  var orden = [1, 2, 3, 4, 5, 6, 0];
  sh.getRange(1, 1, 1, 4).setValues([['Día', 'Bloque 1', 'Bloque 2', 'Cómo usarlo']]).setFontWeight('bold');
  sh.getRange(2, 2, 7, 2).setNumberFormat('@');
  var filas = orden.map(function (dow, i) {
    var b = d[dow].map(function (x) { return Reglas.horaTxt(x[0]) + '-' + Reglas.horaTxt(x[1]); });
    return [Reglas.DIAS[dow], b[0] || '', b[1] || '', i === 0 ? 'Escribe HH:00-HH:00. Deja vacío un bloque para no usarlo. No cambies el orden de los días.' : ''];
  });
  sh.getRange(2, 1, 7, 4).setValues(filas);
  sh.setColumnWidth(1, 120); sh.setColumnWidth(2, 120); sh.setColumnWidth(3, 120); sh.setColumnWidth(4, 520);
  sh.setFrozenRows(1);
}

function prepararSimple_(ss, nombre, encabezado, filas, formatos) {
  var sh = hoja_(ss, nombre);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, encabezado.length).setValues([encabezado]).setFontWeight('bold');
    sh.setFrozenRows(1);
    Object.keys(formatos || {}).forEach(function (c) { sh.getRange(2, Number(c), 2000, 1).setNumberFormat(formatos[c]); });
    if (filas.length) sh.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
    sh.autoResizeColumns(1, encabezado.length);
  }
}

function prepararReservas_(ss) {
  var sh = hoja_(ss, HOJAS.reservas);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, ENCABEZADO_RESERVAS.length).setValues([ENCABEZADO_RESERVAS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, RES.creada, 5000, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    sh.getRange(2, RES.fecha, 5000, 1).setNumberFormat('yyyy-mm-dd');
    [RES.inicio, RES.fin, RES.telefono].forEach(function (c) { sh.getRange(2, c, 5000, 1).setNumberFormat('@'); });
    [RES.total, RES.abono, RES.saldo, RES.base, RES.extrasM, RES.videoM, RES.rawM, RES.retenido, RES.devolver].forEach(function (c) { sh.getRange(2, c, 5000, 1).setNumberFormat('$#,##0'); });
    sh.autoResizeColumns(1, ENCABEZADO_RESERVAS.length);
  }
  var regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build();
  sh.getRange(2, RES.estado, 5000, 1).setDataValidation(regla);
}

/** Catálogo base (fotos en assets/tienda). Precio '' = el dueño lo define desde el portal. */
var BASE_TIENDA = [
  ['Cuerdas', 'Alice 1ª (individual)', 'Cuerda suelta Alice, 1ª', '', 9, 'SI', 'assets/tienda/alice-1.jpg'],
  ['Cuerdas', 'Alice 2ª (individual)', 'Cuerda suelta Alice, 2ª', '', 10, 'SI', 'assets/tienda/alice-2.jpg'],
  ['Cuerdas', 'Alice 3ª (individual)', 'Cuerda suelta Alice, 3ª', '', 10, 'SI', 'assets/tienda/alice-3.jpg'],
  ['Cuerdas', 'Alice 4ª (individual)', 'Cuerda suelta Alice, 4ª', '', 10, 'SI', 'assets/tienda/alice-4.jpg'],
  ['Cuerdas', 'Alice 5ª (individual)', 'Cuerda suelta Alice, 5ª', '', 10, 'SI', 'assets/tienda/alice-5.jpg'],
  ['Cuerdas', 'Alice 6ª (individual)', 'Cuerda suelta Alice, 6ª', '', 7, 'SI', 'assets/tienda/alice-6.jpg'],
  ['Cuerdas', 'Ernie Ball Power Slinky 11-48', 'Set guitarra eléctrica (2220)', 12000, '', 'SI', 'assets/tienda/ernie-power.jpg'],
  ['Cuerdas', 'Ernie Ball Hybrid Slinky 9-46', 'Set guitarra eléctrica (2222)', 12000, '', 'SI', 'assets/tienda/ernie-hybrid.jpg'],
  ['Cuerdas', 'Ernie Ball Super Slinky 9-42', 'Set guitarra eléctrica (2223)', 12000, '', 'SI', 'assets/tienda/ernie-super.jpg'],
  ['Cuerdas', 'BlackSmith Electric Medium 11/49', 'Set guitarra eléctrica', '', '', 'SI', 'assets/tienda/blacksmith-1149.jpg'],
  ['Percusión', 'Baquetas de madera', 'Par de baquetas', '', '', 'SI', 'assets/tienda/baquetas-madera.jpg'],
  ['Percusión', 'Baquetas de plástico neón', 'Par, rosado y blanco', '', '', 'SI', 'assets/tienda/baquetas-neon.jpg'],
  ['Accesorios', 'Correa Fender', 'Strap de guitarra, roja o mostaza', 12000, 5, 'SI', 'assets/tienda/correas-fender.jpg'],
  ['Accesorios', 'Baterías 9V', 'Pilas para pedales y activos', '', 18, 'SI', ''],
  ['Accesorios', 'Strap locks', 'Set de 2 unidades', '', 23, 'SI', ''],
  ['Accesorios', 'Uñetas Gibson', 'Uñeta suelta', '', 18, 'SI', 'assets/tienda/unetas-gibson-fotos.jpg'],
  ['Accesorios', 'Uñetas Alice', '0.58 a 1.20 mm', 1000, 47, 'SI', 'assets/tienda/unetas-alice-fotos.jpg'],
  ['Accesorios', 'Uñetas Fender Heavy', 'Uñeta suelta', 1000, 42, 'SI', 'assets/tienda/unetas-fender-fotos.jpg']
];
var BASE_BEBESTIBLES = [
  ['Bebestibles', 'Agua mineral', 'Botella 600 cc', 1000, 11, 'SI', 'assets/tienda/beb-agua.jpg'],
  ['Bebestibles', 'Jugo', 'Botella 470 cc', 1000, 7, 'SI', 'assets/tienda/beb-jugo.jpg'],
  ['Bebestibles', 'Bebida', 'Lata 330 cc', 1000, 47, 'SI', 'assets/tienda/beb-bebida.jpg'],
  ['Bebestibles', 'Cerveza', 'Lata 330 cc', 1000, 76, 'SI', 'assets/tienda/beb-cerveza.jpg']
];

function prepararTienda_(ss) {
  var sh = hoja_(ss, HOJAS.tienda);
  if (sh.getLastRow() > 0) return;
  var enc = ['Categoría', 'Nombre', 'Detalle', 'Precio', 'Stock', 'Visible', 'Foto (ruta del sitio o enlace https)'];
  var filas = BASE_TIENDA.map(function (f) { return f.slice(); });
  filas = filas.map(function (f) { while (f.length < 7) f.push(''); return f; });
  sh.getRange(1, 1, 1, 7).setValues([enc]).setFontWeight('bold');
  if (filas.length) sh.getRange(2, 1, filas.length, 7).setValues(filas);
  sh.getRange(2, 4, 500, 1).setNumberFormat('$#,##0');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 340); sh.setColumnWidth(3, 330);
  sh.getRange('I1').setValue('Cómo usarla: Visible = SI muestra el producto en el sitio. Stock vacío = sin control de stock; 0 = agotado. Los productos se agregan desde el portal (Tienda de música).');
}

function prepararBebestibles_(ss) {
  var sh = hoja_(ss, HOJAS.bebestibles);
  if (sh.getLastRow() > 0) return;
  sh.getRange(1, 1, 1, 7).setValues([['Categoría', 'Nombre', 'Detalle', 'Precio', 'Stock', 'Visible', 'Foto (ruta del sitio o enlace https)']]).setFontWeight('bold');
  var base = BASE_BEBESTIBLES;
  sh.getRange(2, 1, base.length, 7).setValues(base);
  sh.getRange(2, 4, 500, 1).setNumberFormat('$#,##0');
  sh.setFrozenRows(1);
  sh.setColumnWidth(2, 300); sh.setColumnWidth(3, 300);
  sh.getRange('H1').setValue('Catálogo de bebestibles (se administra desde el portal o aquí). Stock vacío = sin control de stock; 0 = agotado.');
}

function prepararBalance_(ss) {
  var sh = hoja_(ss, HOJAS.balance);
  var mes = '$B$2&"-01"';
  var fechas = 'Reservas!$E:$E,">="&DATEVALUE(' + mes + '),Reservas!$E:$E,"<"&EDATE(DATEVALUE(' + mes + '),1)';
  var sf = function (col, servicio, estado) {
    return 'SUMIFS(Reservas!$' + col + ':$' + col + (servicio ? ',Reservas!$D:$D,"' + servicio + '"' : '') + ',Reservas!$C:$C,"' + estado + '",' + fechas + ')';
  };
  var ventasMes = function (colFecha, colCobro, cond) {
    var rango = colFecha + ',">="&DATEVALUE(' + mes + '),' + colFecha + ',"<"&EDATE(DATEVALUE(' + mes + '),1),' + colCobro + ',' + cond;
    return 'SUMIFS(Ventas!$E:$E,Ventas!$G:$G,"' + PAGO.EFECTIVO + '",' + rango + ')+SUMIFS(Ventas!$E:$E,Ventas!$G:$G,"' + PAGO.TRANSFERENCIA + '",' + rango + ')';
  };
  var anexoVentas = ventasMes('Ventas!$A:$A', 'Ventas!$J:$J', '""') + '+' + ventasMes('Ventas!$J:$J', 'Ventas!$J:$J', '"<>"');
  if (sh.getLastRow() > 0) { // hojas de versiones anteriores: la tienda pasa a ser un anexo que no suma
    sh.getRange('A11:C11').setValues([['(no se usa) Tienda y bebestibles', 'NO', 'Tienda y bebestibles son una cuenta aparte: nunca suman al balance']]);
    sh.getRange('A23:C24').setValues([['ANEXO · Tienda y bebestibles (cuenta aparte)', '=' + anexoVentas, 'Informativo: NO suma al balance ni a los impuestos. Ventas cobradas del mes.'], ['Ingresos brutos', '=B18+B21+B22', 'Sala + estudio + material en bruto (sin tienda ni bebestibles)']]);
    return;
  }
  var cn = function (clave, def) { return 'IFERROR(VALUE(INDEX(Configuracion!$B:$B,MATCH("' + clave + '",Configuracion!$A:$A,0))),' + def + ')'; };
  var costo = function (col, def) { return '=IFERROR(INDEX(CostosMes!$' + col + ':$' + col + ',MATCH($B$2,CostosMes!$A:$A,0)),' + def + ')'; };
  var si = function (celda, expr) { return '=IF($B$' + celda + '="SI",' + expr + ',0)'; };
  var filas = [
    /* 1 */ ['Mes (AAAA-MM)', '=YEAR(TODAY())&"-"&TEXT(MONTH(TODAY()),"00")', '← escribe otro mes, por ejemplo 2026-10'],
    /* 2 */ ['Mes usado (calculado)', '=IF(ISNUMBER($B$1),YEAR($B$1)&"-"&TEXT(MONTH($B$1),"00"),$B$1)', 'No lo cambies: se arma solo desde B1'],
    /* 3 */ ['QUÉ INGRESOS ENTRAN EN EL BALANCE', 'Incluir', 'Cambia SI / NO y todo se recalcula'],
    /* 4 */ ['Sala de ensayo (horas)', 'SI', 'Reservas Finalizadas'],
    /* 5 */ ['Equipo extra arrendado', 'SI', ''],
    /* 6 */ ['Video con GoPro', 'SI', ''],
    /* 7 */ ['Estudio de grabación', 'SI', 'Reservas Finalizadas'],
    /* 8 */ ['Material en bruto (100% Juan Carlos)', 'SI', ''],
    /* 9 */ ['Abonos retenidos por inasistencia', 'SI', 'Estado «No asiste»: se retiene el abono'],
    /* 10 */ ['Retenciones por anulación', 'SI', 'Estado «Anulada» con abono: se retiene lo que corresponde'],
    /* 11 */ ['(no se usa) Tienda y bebestibles', 'NO', 'Tienda y bebestibles son una cuenta aparte: nunca suman al balance'],
    /* 12 */ ['', '', ''],
    /* 13 */ ['INGRESOS DEL MES', '', ''],
    /* 14 */ ['Sala: horas de ensayo', si(4, sf('W', 'Ensayo', EST.FINALIZADA)), ''],
    /* 15 */ ['Sala: equipo extra', si(5, sf('X', 'Ensayo', EST.FINALIZADA)), ''],
    /* 16 */ ['Sala: video GoPro', si(6, sf('Y', 'Ensayo', EST.FINALIZADA)), 'Supuesto: el video GoPro va a la sala. Confirmar.'],
    /* 17 */ ['Sala: abonos retenidos', '=IF($B$9="SI",' + sf('AB', 'Ensayo', EST.NO_ASISTE) + ',0)+IF($B$10="SI",' + sf('AB', 'Ensayo', EST.ANULADA) + ',0)', 'Inasistencias y anulaciones de ensayo'],
    /* 18 */ ['Total sala', '=SUM(B14:B17)', ''],
    /* 19 */ ['Estudio: horas de grabación', si(7, sf('W', 'Grabación', EST.FINALIZADA)), ''],
    /* 20 */ ['Estudio: abonos retenidos', '=IF($B$9="SI",' + sf('AB', 'Grabación', EST.NO_ASISTE) + ',0)+IF($B$10="SI",' + sf('AB', 'Grabación', EST.ANULADA) + ',0)', ''],
    /* 21 */ ['Total estudio', '=B19+B20', ''],
    /* 22 */ ['Material en bruto', si(8, sf('Z', '', EST.FINALIZADA)), 'Va 100% a Juan Carlos'],
    /* 23 */ ['ANEXO · Tienda y bebestibles (cuenta aparte)', '=' + anexoVentas, 'Informativo: NO suma al balance ni a los impuestos. Ventas cobradas del mes.'],
    /* 24 */ ['Ingresos brutos', '=B18+B21+B22', 'Sala + estudio + material en bruto (sin tienda ni bebestibles)'],
    /* 25 */ ['IVA 19% incluido (referencial)', '=B24-B24/1.19', 'Confirmar con tu contador'],
    /* 26 */ ['Ingresos netos', '=B24/1.19', ''],
    /* 27 */ ['', '', ''],
    /* 28 */ ['COSTOS DE LA SALA', '', 'Se leen de CostosMes según el mes elegido'],
    /* 29 */ ['Luz total del mes (boleta)', costo('B', 0), 'Se toma de la hoja CostosMes (se ingresa desde el portal)'],
    /* 30 */ ['Aporte base de ProAudix a la luz', costo('C', cn('aporteLuzProAudix', 10000)), 'Por defecto viene de Configuración (aporteLuzProAudix); cada mes se ajusta en CostosMes'],
    /* 31 */ ['Luz que paga la sala', '=MAX(0,B29-B30)', 'Luz total menos el aporte de ProAudix'],
    /* 32 */ ['Caja chica del mes', costo('D', cn('cajaChicaMensual', 20000)), 'Por defecto viene de Configuración (cajaChicaMensual)'],
    /* 33 */ ['Otros gastos de sala', costo('E', 0), ''],
    /* 34 */ ['', '', ''],
    /* 35 */ ['REPARTO', 'Monto', 'Porcentaje'],
    /* 36 */ ['Utilidad de la sala', '=B18-B31-B32-B33', 'Total sala − luz que paga la sala − caja chica − otros'],
    /* 37 */ ['  Juan Carlos (sala)', '=B36*C37', '=' + cn('repartoSalaJC', 50) + '/100'],
    /* 38 */ ['  Jaime (sala)', '=B36*C38', '=' + cn('repartoSalaJaime', 50) + '/100'],
    /* 39 */ ['Utilidad del estudio', '=B21', 'Total estudio'],
    /* 40 */ ['  Gabriela (estudio)', '=B39*C40', '=' + cn('repartoEstudioEstudio', 60) + '/100'],
    /* 41 */ ['  Juan Carlos (estudio, ítem aparte)', '=B39*C41', '=' + cn('repartoEstudioJC', 40) + '/100'],
    /* 42 */ ['Material en bruto (100% Juan Carlos)', '=B22', ''],
    /* 43 */ ['', '', ''],
    /* 44 */ ['TOTAL JUAN CARLOS', '=B37+B41+B42', ''],
    /* 45 */ ['TOTAL JAIME', '=B38', ''],
    /* 46 */ ['TOTAL ESTUDIO', '=B40', ''],
    /* 47 */ ['', '', ''],
    /* 48 */ ['Las devoluciones por anulación (a transferir) no son ingreso: están en la hoja Reservas, columna «Abono a devolver».', '', '']
  ];
  sh.getRange(1, 1, filas.length, 3).setValues(filas);
  sh.getRange('B4:B11').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['SI', 'NO'], true).setAllowInvalid(false).build());
  ['B14:B26', 'B29:B33', 'B36:B46'].forEach(function (r) { sh.getRange(r).setNumberFormat('$#,##0'); });
  ['C37:C38', 'C40:C41'].forEach(function (r) { sh.getRange(r).setNumberFormat('0%'); });
  ['A3:C3', 'A13', 'A18:B18', 'A21:B21', 'A24:B24', 'A28', 'A35:C35', 'A44:B46'].forEach(function (r) { sh.getRange(r).setFontWeight('bold'); });
  sh.getRange('A48').setFontColor('#b91c1c').setWrap(true);
  sh.setColumnWidth(1, 330); sh.setColumnWidth(2, 140); sh.setColumnWidth(3, 400);
}

function ordenarHojas_(ss) {
  [HOJAS.reservas, HOJAS.config, HOJAS.horarios, HOJAS.bloqueos, HOJAS.inhabiles, HOJAS.clientes, HOJAS.planes, HOJAS.solicitudes, HOJAS.tienda, HOJAS.bebestibles, HOJAS.ventas, HOJAS.costos, HOJAS.compras, HOJAS.movimientos, HOJAS.sitio, HOJAS.historial, HOJAS.tributario, HOJAS.muestras, HOJAS.honor, HOJAS.resenas, HOJAS.balance]
    .forEach(function (nombre, i) {
      var sh = ss.getSheetByName(nombre);
      if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
    });
  ss.setActiveSheet(ss.getSheetByName(HOJAS.reservas));
}
