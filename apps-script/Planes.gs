/**
 * Planes mensuales: 4 sesiones de ensayo (plan8 = 4 x 2 h, plan12 = 4 x 3 h), pagados 100% por adelantado.
 * Se pueden vender de dos formas:
 *  - el cliente elige sus 4 sesiones en el sitio (reservarPlan_): quedan "Reservado (sin abono)" y pasan a
 *    "Reservado (con abono)" cuando marcas el plan como pagado;
 *  - tú lo vendes en el portal y vas agregando las sesiones una a una ("cuota 0 de 4").
 * Cada sesión es una fila normal de la hoja Reservas (con el código del plan), así entra sola al Balance.
 */

var PLAN_COLS = 11;
var PL = { codigo: 1, creado: 2, plan: 3, horas: 4, banda: 5, contacto: 6, telefono: 7, correo: 8, total: 9, pagado: 10, sesiones: 11 };

/* ---------- compra desde el sitio ---------- */

function reservarPlan_(sol) {
  if (sol && sol.web) return { ok: false, codigo: 'DATOS', error: 'Solicitud no válida.' };
  var cfg = getCfg_(), tel = Reglas.normalizarTelefono(sol.telefono);
  if (excedeTasa_(tel)) return { ok: false, codigo: 'TASA', error: 'Hiciste varias solicitudes seguidas. Escríbenos por WhatsApp.' };
  var ses = Array.isArray(sol.sesiones) ? sol.sesiones : [];
  var fechas = ses.map(function (s) { return String(s && s.fecha || ''); });
  if (!fechas.length || !fechas.every(Reglas.fechaValida)) return { ok: false, codigo: 'DATOS', error: 'Revisa las fechas de tus sesiones.' };
  fechas.sort();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, codigo: 'OCUPADO_SISTEMA', error: 'Hay mucha actividad en este momento. Intenta de nuevo en unos segundos.' };
  var v, codigo;
  try {
    liberarVencidas_(cfg);
    var dias = Math.min(60, Reglas.diasEntre(fechas[0], fechas[fechas.length - 1]) + 1);
    v = Reglas.validarPlan(cfg, ahoraChile_(), sol, ocupadasRango_(fechas[0], dias));
    if (!v.ok) return { ok: false, codigo: v.codigo, error: v.error };
    if (planesPendientesDe_(v.datos.telefono, cfg) >= 1) {
      return { ok: false, codigo: 'TASA', error: 'Ya tienes un plan pendiente de pago. Escríbenos por WhatsApp para confirmarlo.' };
    }
    codigo = siguienteCodigo_('PL');
    crearPlan_(cfg, v.plan, codigo, v.datos, false);
    v.sesiones.forEach(function (s, i) {
      crearSesionPlan_(cfg, v.plan, codigo, i + 1, v.datos, s.fecha, s.inicio, EST.SIN_ABONO);
    });
    registrarCliente_(v.datos);
  } finally {
    lock.releaseLock();
  }

  var texto = textoPlan_(cfg, v, codigo);
  avisarAdmin_('Nuevo plan pendiente de pago #' + codigo + ' · ' + v.datos.banda, texto + '\nTeléfono: +' + v.datos.telefono + '\nCorreo: ' + v.datos.correo +
    '\n\nCuando llegue el pago, márcalo como pagado en el portal (sección Planes mensuales).');
  return {
    ok: true, codigo: codigo,
    plan: { nombre: v.plan.nombre, precio: v.plan.precio },
    sesiones: v.sesiones,
    whatsapp: texto,
    pago: { instrucciones: cfg.instruccionesPago, transferencia: (cfg.pagoTransferencia && cfg.datosTransferencia) ? cfg.datosTransferencia : '',
      link: (cfg.pagoOnline && cfg.linkPago) ? cfg.linkPago : '', minutosReserva: cfg.minutosReserva, segundos: cfg.minutosReserva * 60 }
  };
}

function textoPlan_(cfg, v, codigo) {
  var l = ['Hola, quiero confirmar mi ' + v.plan.nombre.toLowerCase() + ' #' + codigo + '.', 'Banda: ' + v.datos.banda + ' (' + v.datos.nombre + ')'];
  v.sesiones.forEach(function (s, i) { l.push('Sesión ' + (i + 1) + ': ' + Reglas.fechaLarga(s.fecha) + ', de ' + Reglas.horaTxt(s.inicio) + ' a ' + Reglas.horaTxt(s.fin)); });
  l.push('Total del plan: ' + Reglas.clp(v.plan.precio) + ' (se paga completo por adelantado)');
  return l.join('\n');
}

function planesPendientesDe_(tel, cfg) {
  var sh = abrirBd_().getSheetByName(HOJAS.planes), n = sh.getLastRow(), cuenta = 0;
  if (n < 2) return 0;
  var limite = Date.now() - cfg.minutosReserva * 60000;
  sh.getRange(2, 1, n - 1, PLAN_COLS).getValues().forEach(function (r) {
    var creado = r[PL.creado - 1];
    if (String(r[PL.telefono - 1]) === tel && String(r[PL.pagado - 1]) !== 'SI' && creado instanceof Date && creado.getTime() > limite) cuenta++;
  });
  return cuenta;
}

function crearPlan_(cfg, plan, codigo, d, pagado) {
  var sh = abrirBd_().getSheetByName(HOJAS.planes);
  sh.appendRow([codigo, new Date(), plan.nombre, plan.horasPorSesion, textoSeguro_(d.banda), textoSeguro_(d.nombre), d.telefono, textoSeguro_(d.correo), plan.precio, pagado ? 'SI' : 'NO', '']);
  var f = sh.getLastRow();
  sh.getRange(f, PL.sesiones).setFormula('=COUNTIFS(Reservas!$AD:$AD,A' + f + ',Reservas!$C:$C,"<>' + EST.ANULADA + '")&" de 4"');
}

/** Crea una sesión del plan: evento en el calendario y fila en Reservas con el código del plan. */
function crearSesionPlan_(cfg, plan, codigoPlan, numero, d, fecha, inicio, estado) {
  var fin = inicio + plan.horasPorSesion, codigo = codigoPlan + '-' + numero, pagado = estado !== EST.SIN_ABONO;
  var evento = getCalendar_().createEvent(
    tituloEvento_(estado, d.banda, 'ensayo', plan.horasPorSesion, codigo),
    fechaHora_(fecha, inicio), fechaHora_(fecha, fin),
    { description: 'Sesión ' + numero + ' de ' + plan.sesiones + ' del ' + plan.nombre.toLowerCase() + ' #' + codigoPlan + '\nBanda: ' + d.banda + '\nContacto: ' + d.nombre + ' · +' + d.telefono, location: cfg.direccion }
  );
  evento.setColor(pagado ? CalendarApp.EventColor.GREEN : CalendarApp.EventColor.YELLOW);
  var fila = new Array(ENCABEZADO_RESERVAS.length);
  fila[RES.codigo - 1] = codigo; fila[RES.creada - 1] = new Date(); fila[RES.estado - 1] = estado;
  fila[RES.servicio - 1] = ETIQUETA_SERVICIO.ensayo; fila[RES.fecha - 1] = fechaHora_(fecha, 0);
  fila[RES.inicio - 1] = Reglas.horaTxt(inicio); fila[RES.fin - 1] = Reglas.horaTxt(fin); fila[RES.horas - 1] = plan.horasPorSesion;
  fila[RES.banda - 1] = textoSeguro_(d.banda); fila[RES.contacto - 1] = textoSeguro_(d.nombre); fila[RES.telefono - 1] = d.telefono; fila[RES.correo - 1] = textoSeguro_(d.correo);
  fila[RES.extras - 1] = 0; fila[RES.video - 1] = 'NO'; fila[RES.raw - 1] = 'NO';
  fila[RES.total - 1] = plan.porSesion; fila[RES.abono - 1] = plan.porSesion; fila[RES.saldo - 1] = 0;
  fila[RES.zurdo - 1] = 'NO'; fila[RES.voces - 1] = 0; fila[RES.comentarios - 1] = 'Sesión ' + numero + ' de ' + plan.sesiones;
  fila[RES.evento - 1] = evento.getId();
  fila[RES.base - 1] = plan.porSesion; fila[RES.extrasM - 1] = 0; fila[RES.videoM - 1] = 0; fila[RES.rawM - 1] = 0;
  fila[RES.abonoRecibido - 1] = pagado ? 'SI' : 'NO'; fila[RES.plan - 1] = codigoPlan;
  abrirBd_().getSheetByName(HOJAS.reservas).appendRow(fila);
}

/* ---------- portal de administración ---------- */

function leerPlanes_() {
  var ss = abrirBd_(), sp = ss.getSheetByName(HOJAS.planes), n = sp.getLastRow(), out = [];
  if (n < 2) return out;
  var ses = {}, sr = ss.getSheetByName(HOJAS.reservas), m = sr.getLastRow();
  if (m > 1) {
    sr.getRange(2, 1, m - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
      var pl = String(r[RES.plan - 1]);
      if (!pl) return;
      (ses[pl] = ses[pl] || []).push({ codigo: String(r[RES.codigo - 1]), fecha: aFechaIso_(r[RES.fecha - 1]), inicio: String(r[RES.inicio - 1]), fin: String(r[RES.fin - 1]), estado: estadoNorm_(r[RES.estado - 1]) });
    });
  }
  sp.getRange(2, 1, n - 1, PLAN_COLS).getValues().forEach(function (r) {
    if (!r[0]) return;
    var lista = (ses[String(r[0])] || []).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    out.push({
      codigo: String(r[0]), plan: String(r[2]), horas: Number(r[3]), banda: String(r[4]), contacto: String(r[5]), telefono: String(r[6]),
      correo: String(r[7]), total: Number(r[8]) || 0, pagado: String(r[9]) === 'SI', sesiones: lista,
      activas: lista.filter(function (x) { return x.estado !== EST.ANULADA; }).length
    });
  });
  return out.reverse();
}

function infoPlanDe_(fila, cfg) { return Reglas.planInfo(cfg, Number(fila[PL.horas - 1]) === 3 ? 'plan12' : 'plan8'); }

/** p = {tipo: plan8|plan12, banda, contacto, telefono, correo, pagado}. Crea el plan en 0 de 4 sesiones. */
function adminCrearPlan(p) {
  exigirAdmin_();
  var cfg = getCfg_(), plan = Reglas.planInfo(cfg, p.tipo);
  var d = { banda: limpiar_(p.banda, 60), nombre: limpiar_(p.contacto, 60), telefono: Reglas.normalizarTelefono(p.telefono), correo: limpiar_(p.correo, 120).toLowerCase() };
  if (!plan) throw new Error('Elige un plan.');
  if (d.banda.length < 2 || d.nombre.length < 2) throw new Error('Escribe la banda y el nombre del contacto.');
  if (!Reglas.telefonoValido(d.telefono)) throw new Error('Revisa el teléfono.');
  if (!Reglas.correoValido(d.correo)) throw new Error('Revisa el correo.');
  return conBloqueo_(function () {
    crearPlan_(cfg, plan, siguienteCodigo_('PL'), d, !!p.pagado);
    registrarCliente_(d);
    return adminResumen();
  });
}

function adminPlanPagado(codigo, pagado) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var ss = abrirBd_(), sp = ss.getSheetByName(HOJAS.planes), f = filaPorTexto_(sp, codigo, 1);
    if (!f) throw new Error('Plan no encontrado.');
    sp.getRange(f, PL.pagado).setValue(pagado ? 'SI' : 'NO');
    if (pagado) {
      var sr = ss.getSheetByName(HOJAS.reservas), m = sr.getLastRow();
      if (m > 1) {
        sr.getRange(2, 1, m - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r, i) {
          if (String(r[RES.plan - 1]) === String(codigo) && estadoNorm_(r[RES.estado - 1]) === EST.SIN_ABONO) {
            sr.getRange(i + 2, RES.estado).setValue(EST.CON_ABONO);
            sincronizarEstado_(sr, i + 2);
          }
        });
      }
    }
    return adminResumen();
  });
}

/** Horarios de inicio disponibles para agendar una sesión (sin límite de anticipación para el administrador). */
function adminDisponibilidad(fecha, horas) {
  exigirAdmin_();
  if (!Reglas.fechaValida(String(fecha))) throw new Error('Fecha inválida.');
  var cfg = cfgAdmin_(), r = Reglas.horasLibres(cfg, fecha, ocupadasRango_(fecha, 1)[fecha] || [], ahoraChile_());
  return { inicios: Reglas.inicios(r.libres, Number(horas) || 1) };
}

function cfgAdmin_() {
  var c = getCfg_();
  c.anticipacionMinHoras = 0; c.anticipacionMaxDias = 730; c.reservasActivas = true;
  return c;
}

function adminAgendarSesion(codigoPlan, fecha, inicio) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var ss = abrirBd_(), sp = ss.getSheetByName(HOJAS.planes), f = filaPorTexto_(sp, codigoPlan, 1);
    if (!f) throw new Error('Plan no encontrado.');
    var r = sp.getRange(f, 1, 1, PLAN_COLS).getValues()[0], cfg = getCfg_(), plan = infoPlanDe_(r, cfg);
    var actual = leerPlanes_().filter(function (x) { return x.codigo === String(codigoPlan); })[0];
    if (actual.activas >= plan.sesiones) throw new Error('Este plan ya tiene sus ' + plan.sesiones + ' sesiones.');
    var d = { banda: String(r[PL.banda - 1]), nombre: String(r[PL.contacto - 1]), telefono: String(r[PL.telefono - 1]), correo: String(r[PL.correo - 1]) };
    var v = Reglas.validarSolicitud(cfgAdmin_(), ahoraChile_(), {
      servicio: 'ensayo', fecha: String(fecha), inicio: Number(inicio), horas: plan.horasPorSesion, extras: 0, video: false, raw: false,
      banda: d.banda, nombre: d.nombre, telefono: d.telefono, correo: d.correo, tyc: true
    }, ocupadasRango_(String(fecha), 1)[String(fecha)] || []);
    if (!v.ok) throw new Error(v.error);
    var pagado = String(r[PL.pagado - 1]) === 'SI';
    crearSesionPlan_(cfg, plan, String(codigoPlan), actual.sesiones.length + 1, d, v.datos.fecha, v.datos.inicio, pagado ? EST.CON_ABONO : EST.SIN_ABONO);
    return adminResumen();
  });
}
