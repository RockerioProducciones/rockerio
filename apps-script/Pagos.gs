/* ====================================================================
 *  PAGOS DEL ABONO
 *   1) «Ya pagué»: el cliente avisa que envió el comprobante. El horario queda guardado
 *      (hasta HORAS_MAX_COMPROBANTE) y te llega un aviso para validarlo.
 *   2) Mercado Pago: el cliente paga en línea y la reserva se confirma sola.
 *      La comisión de cada pago se anota como gasto, así el balance muestra lo que realmente entra.
 *  El token de Mercado Pago NO va en la hoja ni en el sitio: solo en las propiedades del script (MP_ACCESS_TOKEN).
 * ==================================================================== */
/* (PAGO_COMPROBANTE, PAGO_ONLINE y HORAS_MAX_COMPROBANTE están definidas en Code.gs) */

function mpToken_() { return String(PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN') || '').trim(); }
function mpDisponible_(cfg) { return !!(cfg.mpActivo && mpToken_()); }

/** Código y teléfono del cliente → fila de la reserva (o null). */
function reservaDeCliente_(sol) {
  var codigo = String(sol && sol.codigo || '').toUpperCase().trim(), tel = Reglas.normalizarTelefono(sol && sol.telefono);
  if (!/^RP-\d{3,8}(-\d)?$/.test(codigo) || !Reglas.telefonoValido(tel)) return null;
  var sh = abrirBd_().getSheetByName(HOJAS.reservas);
  var celda = sh.getLastRow() > 1 ? sh.createTextFinder(codigo).matchEntireCell(true).findNext() : null;
  if (!celda || celda.getColumn() !== RES.codigo) return null;
  var f = celda.getRow(), r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
  if (Reglas.normalizarTelefono(r[RES.telefono - 1]) !== tel) return null;
  return { sh: sh, f: f, r: r, codigo: codigo, estado: estadoNorm_(r[RES.estado - 1]) };
}

/** El cliente avisa «ya envié el comprobante». */
function marcarComprobante_(sol) {
  if (sol && sol.web) return { ok: false, codigo: 'DATOS', error: 'Solicitud no válida.' };
  if (limiteGlobal_('pagado', 80)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Escríbenos por WhatsApp.' };
  var res = null, rf = null;
  conBloqueo_(function () {
    rf = reservaDeCliente_(sol);
    if (!rf) { res = { ok: false, codigo: 'NO_RESERVA', error: 'No encontramos esa reserva. Escríbenos por WhatsApp con tu comprobante.' }; return; }
    var cfg = getCfg_();
    if (rf.estado === EST.CON_ABONO || rf.estado === EST.FINALIZADA) { res = { ok: true, mensaje: 'Tu reserva ya está confirmada. ¡Nos vemos!' }; return; }
    if (rf.estado === EST.ANULADA) {
      res = { ok: false, codigo: 'VENCIDA', error: 'El horario se liberó por tiempo. Escríbenos por WhatsApp con tu comprobante y lo vemos de inmediato.' };
      avisarAdmin_('Pago de una reserva ya liberada · ' + rf.codigo, rf.r[RES.banda - 1] + ' dice que pagó la reserva ' + rf.codigo + ' (' + rf.r[RES.fecha - 1] + '), pero el horario ya se había liberado. Revisa si el horario sigue libre y reagéndala desde el portal.');
      return;
    }
    if (rf.estado !== EST.SIN_ABONO) { res = { ok: false, codigo: 'ESTADO', error: 'Esa reserva no admite este aviso.' }; return; }
    if (String(rf.r[RES.pago - 1]) !== PAGO_COMPROBANTE) {
      rf.sh.getRange(rf.f, RES.pago, 1, 2).setValues([[PAGO_COMPROBANTE, new Date()]]);
      rf.nuevo = true;
    }
    res = { ok: true, mensaje: '¡Recibido! Tu horario queda guardado mientras validamos tu pago. Te confirmamos por WhatsApp.' };
  });
  if (rf && rf.nuevo) {
    var r = rf.r;
    avisarAdmin_('💬 Comprobante por validar · ' + rf.codigo + ' · ' + r[RES.banda - 1],
      r[RES.contacto - 1] + ' (+' + r[RES.telefono - 1] + ') avisó que envió el comprobante del abono de ' + Reglas.clp(Number(r[RES.abono - 1]) || 0) + '.\n' +
      'Reserva ' + rf.codigo + ': ' + r[RES.servicio - 1] + ' el ' + aFechaIso_(r[RES.fecha - 1]) + '.\n\n' +
      'Revisa el comprobante en WhatsApp y confirma el abono en el portal (Reservas). El horario se guarda ' + HORAS_MAX_COMPROBANTE + ' horas.');
  }
  return res;
}

/* ---------------- Mercado Pago ---------------- */

function mpLlamar_(metodo, url, cuerpo) {
  var o = { method: metodo, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + mpToken_() }, contentType: 'application/json' };
  if (cuerpo) o.payload = JSON.stringify(cuerpo);
  var resp = UrlFetchApp.fetch(url, o), cod = resp.getResponseCode(), txt = resp.getContentText();
  var j; try { j = JSON.parse(txt); } catch (e) { j = {}; }
  if (cod < 200 || cod >= 300) { console.error('Mercado Pago ' + metodo + ' ' + url.replace(/\?.*/, '') + ' → ' + cod); throw new Error('mp'); }
  return j;
}

function mpSecreto_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('MP_SECRETO');
  if (!s) { s = Utilities.getUuid().replace(/-/g, ''); p.setProperty('MP_SECRETO', s); }
  return s;
}
function mpUrlAvisos_() {
  var p = PropertiesService.getScriptProperties(), base = p.getProperty('MP_URL_AVISOS') || '';
  if (!base) { try { base = ScriptApp.getService().getUrl(); } catch (e) { base = ''; } }
  return base ? base + (base.indexOf('?') < 0 ? '?' : '&') + 'mp=1&k=' + mpSecreto_() : '';
}

/** Crea el pago del abono y devuelve el enlace de Mercado Pago. */
function mpCrearPago_(sol) {
  var cfg = getCfg_();
  if (!mpDisponible_(cfg)) return { ok: false, codigo: 'MP_OFF', error: 'El pago en línea no está disponible. Usa la transferencia.' };
  if (limiteGlobal_('mp_crear', 80)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Escríbenos por WhatsApp.' };
  var rf = reservaDeCliente_(sol);
  if (!rf) return { ok: false, codigo: 'NO_RESERVA', error: 'No encontramos esa reserva.' };
  if (rf.estado === EST.CON_ABONO) return { ok: false, codigo: 'YA_PAGADA', error: 'Tu reserva ya está confirmada.' };
  if (rf.estado !== EST.SIN_ABONO) return { ok: false, codigo: 'VENCIDA', error: 'El horario se liberó por tiempo. Vuelve a reservar o escríbenos por WhatsApp.' };
  var abono = Math.round(Number(rf.r[RES.abono - 1]) || 0);
  if (!(abono > 0)) return { ok: false, codigo: 'DATOS', error: 'La reserva no tiene abono.' };
  var creada = rf.r[RES.creada - 1], vence = new Date(Math.max(Date.now() + 5 * 60000, (creada instanceof Date ? creada.getTime() : Date.now()) + cfg.minutosReserva * 60000));
  var sitio = cfg.sitioUrl || '', volver = function (q) { return sitio ? sitio + '/?pago=' + q + '&codigo=' + encodeURIComponent(rf.codigo) : undefined; };
  var cuerpo = {
    items: [{ id: rf.codigo, title: ('Abono reserva ' + rf.codigo + ' · ' + cfg.nombreNegocio).slice(0, 120), quantity: 1, unit_price: abono, currency_id: 'CLP' }],
    external_reference: rf.codigo,
    expires: true, expiration_date_to: Utilities.formatDate(vence, 'GMT', "yyyy-MM-dd'T'HH:mm:ss.000'Z'")
  };
  var na = mpUrlAvisos_(); if (na) cuerpo.notification_url = na;
  if (sitio) { cuerpo.back_urls = { success: volver('ok'), pending: volver('pendiente'), failure: volver('error') }; cuerpo.auto_return = 'approved'; }
  try {
    var p = mpLlamar_('post', 'https://api.mercadopago.com/checkout/preferences', cuerpo);
    if (!/^https:\/\/[a-z0-9.\-]*mercadopago\.[a-z.]+\//i.test(String(p.init_point || ''))) throw new Error('mp');
    return { ok: true, url: p.init_point };
  } catch (e) {
    return { ok: false, codigo: 'MP_ERROR', error: 'No pudimos abrir el pago en línea. Usa la transferencia o escríbenos por WhatsApp.' };
  }
}

/** Busca pagos aprobados de una reserva en Mercado Pago y, si corresponde, la confirma. Devuelve true si quedó confirmada. */
function mpConfirmarReserva_(codigo) {
  var lista = mpLlamar_('get', 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + encodeURIComponent(codigo));
  var pagos = (lista && lista.results) || [], ok = false;
  pagos.forEach(function (p) { if (mpAplicarPago_(p)) ok = true; });
  return ok;
}

/** Aplica un pago aprobado a su reserva (idempotente). Devuelve true si la reserva quedó confirmada por este pago. */
function mpAplicarPago_(p) {
  if (!p || p.status !== 'approved') return false;
  var codigo = String(p.external_reference || '');
  var hecho = false, aviso = null;
  conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas);
    var celda = sh.getLastRow() > 1 ? sh.createTextFinder(codigo).matchEntireCell(true).findNext() : null;
    if (!celda || celda.getColumn() !== RES.codigo) return;
    var f = celda.getRow(), r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0], estado = estadoNorm_(r[RES.estado - 1]);
    var id = String(p.id || '');
    if (!id || String(r[RES.pagoId - 1]) === id) { hecho = estado === EST.CON_ABONO; return; } // ya aplicado
    var abono = Number(r[RES.abono - 1]) || 0;
    if (!(Number(p.transaction_amount) >= abono)) { aviso = ['Pago de Mercado Pago menor al abono · ' + codigo, 'La reserva ' + codigo + ' recibió un pago de ' + Reglas.clp(Number(p.transaction_amount) || 0) + ' y el abono es ' + Reglas.clp(abono) + '. No se confirmó sola: revísala en el portal.']; return; }
    var cfg = getCfg_();
    var comision = 0;
    (p.fee_details || []).forEach(function (x) { comision += Number(x.amount) || 0; });
    var estimada = !(comision > 0);
    if (estimada) comision = Math.round(abono * (Number(cfg.mpComisionPct) || 0) / 100);
    comision = Math.round(comision);
    if (estado === EST.ANULADA) {
      sh.getRange(f, RES.pagoFecha, 1, 3).setValues([[new Date(), id, comision]]);
      aviso = ['💳 Pago recibido de una reserva ya liberada · ' + codigo, r[RES.banda - 1] + ' pagó ' + Reglas.clp(abono) + ' por Mercado Pago, pero el horario ya se había liberado. Reagéndala o devuelve el pago desde Mercado Pago.'];
      return;
    }
    if (estado !== EST.SIN_ABONO) return;
    sh.getRange(f, RES.estado).setValue(EST.CON_ABONO);
    sh.getRange(f, RES.pago, 1, 4).setValues([[PAGO_ONLINE, new Date(), id, comision]]);
    sincronizarEstado_(sh, f);
    if (comision > 0) {
      var mov = abrirBd_().getSheetByName(HOJAS.movimientos), movId = 'MOV-MP-' + id;
      if (!filaPorTexto_(mov, movId, 1)) mov.appendRow([movId, fechaHora_(ahoraChile_().fecha, 0), 'Gasto', String(r[RES.servicio - 1]) === ETIQUETA_SERVICIO.grabacion ? 'Estudio' : 'Sala', comision, 'Comisión Mercado Pago · ' + codigo + (estimada ? ' (estimada)' : '')]);
    }
    hecho = true;
    aviso = ['✅ Reserva ' + codigo + ' pagada por Mercado Pago · ' + r[RES.banda - 1], 'Abono de ' + Reglas.clp(abono) + ' recibido y reserva confirmada sola. Comisión de Mercado Pago: ' + Reglas.clp(comision) + (estimada ? ' (estimada)' : '') + ', anotada como gasto.'];
  });
  if (aviso) avisarAdmin_(aviso[0], aviso[1]);
  return hecho;
}

/** Aviso (webhook) de Mercado Pago: no se confía en lo que llega; se consulta el pago directamente a Mercado Pago. */
function mpWebhook_(par, sol) {
  try {
    if (!mpToken_() || String(par.k || '') !== String(PropertiesService.getScriptProperties().getProperty('MP_SECRETO') || '-')) return { ok: false };
    if (limiteGlobal_('mp_aviso', 400)) return { ok: false };
    var tipo = String(par.type || par.topic || (sol && sol.type) || ''), id = String(par['data.id'] || par.id || (sol && sol.data && sol.data.id) || '');
    if (tipo !== 'payment' || !/^\d{3,20}$/.test(id)) return { ok: true };
    mpAplicarPago_(mpLlamar_('get', 'https://api.mercadopago.com/v1/payments/' + id));
  } catch (e) { console.error('Aviso de Mercado Pago: ' + (e && e.message)); }
  return { ok: true };
}

/** El cliente vuelve del pago: confirmamos sin esperar el aviso. */
function mpVerificarCliente_(sol) {
  var cfg = getCfg_();
  if (!mpDisponible_(cfg)) return { ok: false, codigo: 'MP_OFF' };
  if (limiteGlobal_('mp_verif', 200)) return { ok: false, codigo: 'TASA' };
  var rf = reservaDeCliente_(sol);
  if (!rf) return { ok: false, codigo: 'NO_RESERVA' };
  if (rf.estado === EST.CON_ABONO) return { ok: true, confirmada: true };
  try { return { ok: true, confirmada: mpConfirmarReserva_(rf.codigo) }; } catch (e) { return { ok: false, codigo: 'MP_ERROR' }; }
}

/** Portal: revisa en Mercado Pago si una reserva ya fue pagada. */
function adminVerificarPagoMP(codigo) {
  exigirAdmin_();
  if (!mpToken_()) throw new Error('Mercado Pago no está configurado todavía.');
  var ok = mpConfirmarReserva_(String(codigo));
  if (!ok) throw new Error('Mercado Pago no tiene un pago aprobado para esa reserva.');
  return adminResumen();
}

/** Ejecútala UNA vez desde el editor (botón ▶) para autorizar la conexión con Mercado Pago. */
function autorizarMercadoPago() {
  var r = UrlFetchApp.fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: 'Bearer ' + mpToken_() }, muteHttpExceptions: true });
  console.log('Mercado Pago respondió: ' + r.getResponseCode() + (r.getResponseCode() === 200 ? ' (token válido)' : ' (revisa el token)'));
}
