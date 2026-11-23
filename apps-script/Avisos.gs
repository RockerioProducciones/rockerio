/* ---------- Avisos automáticos por correo al administrador (solo leen; no cambian ningún dato) ---------- */

var AVISO_HORAS_SIN_ABONO = 24; // reserva sin abono con más de estas horas desde que se creó
var AVISO_DIAS_PLAN = 3;        // plan sin pagar con más de estos días

function clpTxt_(n) { return '$' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

/**
 * Cada mañana (9:00): si hay reservas sin abono viejas o planes sin pagar, manda UN correo con la lista.
 * Si no hay nada pendiente no envía nada.
 */
function avisoPorAbonar() {
  var cfg = getCfg_(), a = cfg.correoAdmin || PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!a) return 'Sin correo de administración.';
  var hoy = ahoraChile_().fecha, ahora = Date.now(), lineas = [];
  var sh = abrirBd_().getSheetByName(HOJAS.reservas), n = sh.getLastRow(), planes = {};
  if (n > 1) sh.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    if (estadoNorm_(r[RES.estado - 1]) !== EST.SIN_ABONO) return;
    var fch = aFechaIso_(r[RES.fecha - 1]); if (!fch || fch < hoy) return;
    var cre = r[RES.creada - 1], horas = (cre instanceof Date) ? Math.floor((ahora - cre.getTime()) / 3600000) : 0;
    var plan = String(r[RES.plan - 1]);
    if (plan) { planes[plan] = Math.max(planes[plan] || 0, Math.floor(horas / 24)); return; }
    if (horas >= AVISO_HORAS_SIN_ABONO) lineas.push({ h: horas, t: '• ' + r[RES.banda - 1] + ' · ' + fch + ' ' + horaCelda_(r[RES.inicio - 1]) + '–' + horaCelda_(r[RES.fin - 1]) + ' · ' + r[RES.codigo - 1] + ' · sin abono hace ' + (horas >= 48 ? Math.floor(horas / 24) + ' días' : horas + ' h') });
  });
  var lp = Object.keys(planes).filter(function (k) { return planes[k] >= AVISO_DIAS_PLAN; }).map(function (k) { return '• Plan ' + k + ' · sin pagar hace ' + planes[k] + ' días'; });
  if (!lineas.length && !lp.length) return 'Nada pendiente.';
  lineas.sort(function (x, y) { return y.h - x.h; });
  var cuerpo = 'Hay horarios guardados que siguen sin pago:\n\n' + (lineas.length ? 'RESERVAS\n' + lineas.map(function (x) { return x.t; }).join('\n') + '\n\n' : '') + (lp.length ? 'PLANES MENSUALES\n' + lp.join('\n') + '\n\n' : '') +
    'Revisa tus transferencias y, en el portal, confirma el pago, mantén el horario o anula para liberarlo.';
  MailApp.sendEmail({ to: a, subject: 'Rockerío · ' + (lineas.length + lp.length) + ' pendiente(s) de pago', body: cuerpo, name: cfg.nombreNegocio || 'Rockerío' });
  return 'Aviso enviado.';
}

/** Cada lunes (8:00): resumen de la semana anterior con los ingresos de cada cuenta por separado. */
function resumenSemanal() {
  var cfg = getCfg_(), a = cfg.correoAdmin || PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!a) return 'Sin correo de administración.';
  var hoy = ahoraChile_().fecha, ref = Reglas.sumarDias(hoy, -7);
  var o = resumenContable_('semana', ref), mus = o.musica || {}, beb = o.bebestibles || {}, desc = (o.descuadres || []).length;
  var l = ['Semana del ' + o.desde + ' al ' + o.hasta, '',
    'CUENTAS (cada una por separado)',
    '• Sala de ensayo: ' + clpTxt_(o.sala.total) + ' (' + o.sala.sesiones + ' sesiones)',
    '• Estudio de grabación: ' + clpTxt_(o.estudio.total) + ' (' + o.estudio.sesiones + ' sesiones)',
    '• Tienda de música: ' + clpTxt_(mus.cobrado) + ' cobrado' + (mus.porCobrar ? ' · por cobrar ' + clpTxt_(mus.porCobrar) : ''),
    '• Bebestibles: ' + clpTxt_(beb.cobrado) + ' cobrado' + (beb.porCobrar ? ' · por cobrar ' + clpTxt_(beb.porCobrar) : ''), '',
    'Reservas: ' + (o.deudas || []).length + ' con saldo por cobrar · ' + (o.anuladas ? o.anuladas.n : 0) + ' anuladas'];
  if (desc) l.push('', '⚠ Hay ' + desc + ' descuadre(s) para revisar en Balance → Verificar.');
  l.push('', 'Detalle completo en el portal, pestaña Balance.');
  MailApp.sendEmail({ to: a, subject: 'Rockerío · resumen semanal ' + o.desde, body: l.join('\n'), name: cfg.nombreNegocio || 'Rockerío' });
  return 'Resumen enviado.';
}

/** Crea (una sola vez) los dos avisos programados. No duplica si ya existen. */
function asegurarAvisos_() {
  var hay = {}; ScriptApp.getProjectTriggers().forEach(function (t) { hay[t.getHandlerFunction()] = true; });
  if (!hay.avisoPorAbonar) ScriptApp.newTrigger('avisoPorAbonar').timeBased().everyDays(1).atHour(9).create();
  if (!hay.resumenSemanal) ScriptApp.newTrigger('resumenSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
}
