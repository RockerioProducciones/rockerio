/**
 * WhatsApp.
 *
 * 1) PLANTILLAS: los textos de los mensajes (recordatorio, confirmación, cobro de abono, gracias) se editan en el portal.
 *    El portal arma un botón de un toque para cada reserva que abre WhatsApp con el mensaje ya escrito (gratis, sin cuenta especial).
 *
 * 2) ENVÍO AUTOMÁTICO (opcional, apagado por defecto): el recordatorio del día anterior se manda solo usando la API de
 *    WhatsApp Business (Meta). Requiere una cuenta de WhatsApp Business Platform, un número registrado, una plantilla de
 *    mensaje aprobada por Meta y un token. Los mensajes que inicia el negocio fuera de la ventana de 24 horas SOLO pueden
 *    enviarse con plantillas aprobadas, y Meta puede cobrar por conversación. El token se guarda en las propiedades del
 *    script (nunca en la hoja ni en GitHub).
 *
 *    Parámetros que recibe la plantilla de Meta, en este orden:
 *      {{1}} nombre · {{2}} servicio · {{3}} fecha · {{4}} hora de inicio · {{5}} hora de término
 *    Ejemplo de cuerpo para aprobar en Meta:
 *      "Hola {{1}}, te recordamos tu reserva de {{2}} el {{3}} de {{4}} a {{5}}. ¡Te esperamos!"
 */

var CLAVES_MENSAJES = ['msgRecordatorio', 'msgConfirmacion', 'msgCobroAbono', 'msgGracias'];

/** Guarda los textos de los mensajes. Vacío = vuelve al texto original. */
function adminGuardarMensajes(m) {
  exigirAdmin_();
  var salida = {};
  CLAVES_MENSAJES.forEach(function (k) {
    if (m && m[k] !== undefined) salida[k] = textoSeguro_(String(m[k]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1000));
  });
  return conBloqueo_(function () { ponerConfig_(salida); return adminResumen(); });
}

/** Guarda el token de la API de WhatsApp (solo escritura: nunca se vuelve a mostrar). Vacío = lo borra. */
function adminGuardarWaToken(token) {
  exigirAdmin_();
  token = String(token || '').trim();
  var props = PropertiesService.getScriptProperties();
  if (!token) { props.deleteProperty('WA_TOKEN'); return adminResumen(); }
  if (!/^[A-Za-z0-9_\-]{20,800}$/.test(token)) throw new Error('El token no parece válido. Cópialo completo desde Meta.');
  props.setProperty('WA_TOKEN', token);
  return adminResumen();
}

/** Valida los parámetros de la API antes de usarlos. */
function waConfigValida_(cfg) {
  if (!/^\d{5,25}$/.test(cfg.waPhoneId)) throw new Error('Falta el ID del número de WhatsApp Business (solo números).');
  if (!/^[a-z0-9_]{1,60}$/.test(cfg.waPlantillaRecordatorio)) throw new Error('Falta el nombre de la plantilla aprobada (minúsculas, números y _).');
  if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(cfg.waIdioma)) throw new Error('El idioma de la plantilla no es válido (por ejemplo es o es_CL).');
  if (!/^v\d{2}\.\d$/.test(cfg.waVersion)) throw new Error('La versión de la API no es válida (por ejemplo v23.0).');
  if (!PropertiesService.getScriptProperties().getProperty('WA_TOKEN')) throw new Error('Falta guardar el token de la API de WhatsApp.');
}

/** Envía la plantilla de recordatorio. params = [nombre, servicio, fecha, horaInicio, horaFin]. Lanza error si la API rechaza el envío. */
function enviarWhatsApp_(cfg, telefono, params) {
  waConfigValida_(cfg);
  var tel = Reglas.normalizarTelefono(telefono);
  if (!/^\d{8,15}$/.test(tel)) throw new Error('Teléfono inválido.');
  var resp = UrlFetchApp.fetch('https://graph.facebook.com/' + cfg.waVersion + '/' + cfg.waPhoneId + '/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + PropertiesService.getScriptProperties().getProperty('WA_TOKEN') },
    payload: JSON.stringify({
      messaging_product: 'whatsapp', to: tel, type: 'template',
      template: { name: cfg.waPlantillaRecordatorio, language: { code: cfg.waIdioma },
        components: [{ type: 'body', parameters: params.map(function (p) { return { type: 'text', text: String(p).slice(0, 200) }; }) }] }
    })
  });
  var codigo = resp.getResponseCode();
  if (codigo < 200 || codigo >= 300) {
    var detalle = ''; try { detalle = JSON.parse(resp.getContentText()).error.message; } catch (e) { detalle = resp.getContentText().slice(0, 150); }
    throw new Error('WhatsApp respondió ' + codigo + ': ' + String(detalle).slice(0, 200));
  }
}

function parametrosRecordatorio_(r) {
  return [r.contacto, String(r.servicio), Reglas.fechaLarga(r.fecha), r.inicio, r.fin];
}

/** Prueba el envío automático con tu propio número. */
function adminProbarWhatsApp(telefono) {
  exigirAdmin_();
  var cfg = getCfg_();
  try { enviarWhatsApp_(cfg, telefono, ['Prueba', 'Ensayo', Reglas.fechaLarga(ahoraChile_().fecha), '18:00', '20:00']); }
  catch (e) { throw new Error('No se pudo enviar: ' + (e.message || e)); }
  var r = adminResumen(); r.mensaje = 'Mensaje de prueba enviado.'; return r;
}

/**
 * Disparador diario (18:00): recordatorio por WhatsApp de las reservas confirmadas de mañana.
 * Solo actúa si waAutoActivo = SI. Cada reserva se marca para no repetir el envío.
 */
function enviarRecordatorios() {
  var cfg = getCfg_();
  if (!cfg.waAutoActivo) return;
  conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.reservas), n = sh.getLastRow();
    if (n < 2) return;
    var manana = Reglas.sumarDias(ahoraChile_().fecha, 1), fallos = [], enviados = 0;
    sh.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (f, i) {
      if (estadoNorm_(f[RES.estado - 1]) !== EST.CON_ABONO || aFechaIso_(f[RES.fecha - 1]) !== manana || f[RES.recordatorio - 1]) return;
      var celda = sh.getRange(i + 2, RES.recordatorio);
      try {
        enviarWhatsApp_(cfg, String(f[RES.telefono - 1]), parametrosRecordatorio_({ contacto: String(f[RES.contacto - 1]), servicio: String(f[RES.servicio - 1]),
          fecha: manana, inicio: String(f[RES.inicio - 1]), fin: String(f[RES.fin - 1]) }));
        celda.setValue('Enviado ' + Utilities.formatDate(new Date(), Reglas.TZ, 'yyyy-MM-dd HH:mm')); enviados++;
      } catch (e) {
        celda.setValue('ERROR: ' + String(e.message || e).slice(0, 120));
        fallos.push('#' + f[RES.codigo - 1] + ' ' + f[RES.banda - 1] + ': ' + (e.message || e));
      }
    });
    if (fallos.length) avisarAdmin_('No se pudieron enviar recordatorios de WhatsApp', 'Falló el envío automático de ' + fallos.length + ' recordatorio(s):\n\n' + fallos.join('\n') + '\n\nPuedes enviarlos a mano desde el portal (botón WhatsApp de cada reserva).');
  });
}

/** Datos que el portal necesita para armar los mensajes de WhatsApp (nunca incluye el token). */
function waDatos_() {
  var cfg = getCfg_();
  return { plantillas: { msgRecordatorio: cfg.msgRecordatorio, msgConfirmacion: cfg.msgConfirmacion, msgCobroAbono: cfg.msgCobroAbono, msgGracias: cfg.msgGracias },
    negocio: cfg.nombreNegocio, direccion: cfg.direccion, horasAnulacion: cfg.horasAnulacion, sitio: cfg.sitioUrl, auto: cfg.waAutoActivo,
    tieneToken: !!PropertiesService.getScriptProperties().getProperty('WA_TOKEN') };
}
