/**
 * AJUSTES: editor de parámetros del portal.
 *
 * Todo lo que se puede configurar está listado en ESQUEMA (una línea por parámetro). Para agregar un parámetro nuevo:
 *  1) agrega su valor por defecto en js/reglas.js (CONFIG_POR_DEFECTO) y cópialo a apps-script/Reglas.gs;
 *  2) agrégalo a normalizarConfig si necesita limpieza especial;
 *  3) agrégalo aquí en ESQUEMA para que aparezca en el portal con su ayuda.
 * Los valores se guardan en la hoja «Configuracion» (columna B), que es la única fuente de verdad.
 */

/** [clave, etiqueta, tipo, grupo, ayuda, opciones o máximo]. Tipos: texto · pesos · num · sino · url · lista · tel */
var ESQUEMA = [
  ['nombreNegocio', 'Nombre del negocio', 'texto', 'Negocio', 'Aparece en el sitio y en los correos.'],
  ['whatsapp', 'WhatsApp', 'tel', 'Negocio', 'Con código de país, sin +. Ej.: 56912345678. A este número llegan las reservas.'],
  ['direccion', 'Dirección', 'texto', 'Negocio', 'Dirección del estudio.'],
  ['correoAdmin', 'Correo que recibe los avisos', 'texto', 'Negocio', 'Recibe un correo por cada reserva, plan o solicitud.'],

  ['precioEnsayoHora', 'Ensayo: precio por hora', 'pesos', 'Precios', 'Valor de una hora de sala de ensayo.'],
  ['precioGrabacionHora', 'Estudio: precio por hora', 'pesos', 'Precios', 'Valor de una hora de estudio de grabación.'],
  ['precioExtraEquipo', 'Equipo extra: precio', 'pesos', 'Precios', 'Arriendo de equipo adicional (según «modo de cobro»).'],
  ['extraModo', 'Equipo extra: modo de cobro', 'lista', 'Precios', 'hora = se cobra por cada hora; sesion = un cobro por sesión.', ['hora', 'sesion']],
  ['precioVideo', 'Video con GoPro', 'pesos', 'Precios', 'Adicional por video de la sesión.'],
  ['precioRaw', 'Material en bruto', 'pesos', 'Precios', 'Adicional por entrega del material sin mezclar.'],
  ['tarifaConveniente', 'Tarifa conveniente lun–vie: activada', 'sino', 'Precios', 'SI = se cobra el precio conveniente en la franja de abajo, de lunes a viernes.'],
  ['precioEnsayoConveniente', 'Tarifa conveniente: ensayo por hora', 'pesos', 'Precios', 'Debe ser menor al precio normal para aplicarse.'],
  ['precioGrabacionConveniente', 'Tarifa conveniente: estudio por hora', 'pesos', 'Precios', '0 = el estudio no tiene tarifa conveniente.'],
  ['convenienteDesde', 'Franja conveniente: desde (hora)', 'num', 'Precios', 'Por ejemplo 9.', 23],
  ['convenienteHasta', 'Franja conveniente: hasta (hora)', 'num', 'Precios', 'Por ejemplo 14 (la hora 14 ya no entra).', 24],
  ['abonoPorHora', 'Abono por hora', 'pesos', 'Precios', 'Lo que se abona por cada hora para confirmar la reserva.'],
  ['plan8', 'Plan mensual 8 horas', 'pesos', 'Precios', 'Precio total del plan de 8 horas (4 sesiones de 2 h).'],
  ['plan12', 'Plan mensual 12 horas', 'pesos', 'Precios', 'Precio total del plan de 12 horas (4 sesiones de 3 h).'],

  ['ensayoMinHoras', 'Ensayo: mínimo de horas', 'num', 'Reglas de reserva', 'Horas mínimas por reserva de ensayo.', 12],
  ['ensayoMaxHoras', 'Ensayo: máximo de horas', 'num', 'Reglas de reserva', 'Horas máximas por reserva de ensayo.', 12],
  ['grabacionMinHoras', 'Grabación: mínimo de horas', 'num', 'Reglas de reserva', 'Horas mínimas por reserva de estudio.', 12],
  ['grabacionMaxHoras', 'Grabación: máximo de horas', 'num', 'Reglas de reserva', 'Horas máximas por reserva de estudio.', 12],
  ['anticipacionMinHoras', 'Anticipación mínima (horas)', 'num', 'Reglas de reserva', 'Con cuántas horas de anticipación como mínimo se puede reservar.', 168],
  ['anticipacionMaxDias', 'Reservar hasta (días hacia adelante)', 'num', 'Reglas de reserva', 'Cuántos días hacia adelante muestra el calendario.', 120],
  ['planMaxDias', 'Sesiones de plan hasta (días)', 'num', 'Reglas de reserva', 'Hasta cuántos días hacia adelante se pueden agendar las 4 sesiones de un plan.', 180],
  ['minutosReserva', 'Minutos que se guarda el horario', 'num', 'Reglas de reserva', 'Tiempo que el horario queda tomado esperando el abono (5 a 180). Luego se libera solo.', 180],
  ['horasAnulacion', 'Horas mínimas para anular', 'num', 'Reglas de reserva', 'Anular con al menos estas horas devuelve el abono (menos la retención).', 168],
  ['noAsisteCobroPorHora', 'Cobro por «No asiste» (por hora reservada)', 'pesos', 'Reglas de reserva', 'Si el cliente no asiste, esta retención por cada hora reservada se da por cobrada y la reserva queda cerrada (entra al balance). Es por la seriedad de la agenda.'],
  ['retencionPorHora', 'Retención por hora al anular', 'pesos', 'Reglas de reserva', 'Lo que se retiene por hora cuando se anula a tiempo.'],
  ['reagendoSemanas', 'Reagendar: plazo máximo (semanas)', 'num', 'Reglas de reserva', 'Se muestra en el reglamento.', 12],
  ['reagendoCambios', 'Reagendar: máximo de cambios por reserva', 'num', 'Reglas de reserva', 'Se muestra en el reglamento.', 10],
  ['anulacionTardiaRetiene', 'Anulación tardía retiene todo el abono', 'sino', 'Reglas de reserva', 'SI = anular con menos horas de las mínimas pierde todo el abono.'],

  ['pagoTransferencia', 'Pago por transferencia', 'sino', 'Pagos', 'Muestra los datos de transferencia al terminar la reserva.'],
  ['datosTransferencia', 'Datos de transferencia', 'texto', 'Pagos', 'Texto público. Lo ve cualquiera: no pongas más de lo necesario.', 300],
  ['pagoOnline', 'Pago online', 'sino', 'Pagos', 'Muestra el botón de pago online (requiere el enlace de pago).'],
  ['linkPago', 'Enlace de pago online', 'url', 'Pagos', 'Enlace https (por ejemplo Mercado Pago).'],
  ['instruccionesPago', 'Instrucciones de pago', 'texto', 'Pagos', 'Texto que ve el cliente para pagar el abono.', 400],

  ['waAutoActivo', 'WhatsApp automático: recordatorio del día anterior', 'sino', 'WhatsApp', 'SI = se envía solo por la API de WhatsApp Business. Requiere cuenta de Meta, plantilla aprobada y token (ver «Mensajes de WhatsApp»).'],
  ['waPhoneId', 'WhatsApp Business: ID del número', 'texto', 'WhatsApp', 'Aparece en Meta (WhatsApp > Configuración de la API). No es el teléfono.', 25],
  ['waPlantillaRecordatorio', 'Nombre de la plantilla aprobada', 'texto', 'WhatsApp', 'Ej.: recordatorio_reserva. Parámetros: {{1}} nombre, {{2}} servicio, {{3}} fecha, {{4}} hora inicio, {{5}} hora término.', 60],
  ['waIdioma', 'Idioma de la plantilla', 'texto', 'WhatsApp', 'Ej.: es o es_CL.', 10],
  ['waVersion', 'Versión de la API de Meta', 'texto', 'WhatsApp', 'Ej.: v23.0. Si falla, revisa la versión vigente en Meta.', 10],
  ['reservasActivas', 'Reservas en línea activas', 'sino', 'Funciones', 'NO = el sitio deja de recibir reservas (por vacaciones, por ejemplo).'],
  ['correoCliente', 'Enviar correo de confirmación al cliente', 'sino', 'Funciones', 'Gmail permite 100 correos al día.'],
  ['avisoBanner', 'Aviso en el sitio', 'texto', 'Funciones', 'Franja roja arriba del sitio (vacío = sin aviso).', 200],
  ['tema', 'Tema visual por defecto', 'lista', 'Funciones', 'Estética completa del sitio (colores, letras y formas).', ['rockerio', 'medianoche', 'vino', 'bosque', 'grafito', 'azufre', 'abismo', 'cobre', 'ciruela', 'carbon']],
  ['temaAdmin', 'Tema del portal de administración', 'lista', 'Funciones', 'Estética completa de este portal, independiente del sitio.', ['rockerio', 'medianoche', 'vino', 'bosque', 'grafito', 'azufre', 'abismo', 'cobre', 'ciruela', 'carbon']],
  ['sitioUrl', 'Dirección del sitio', 'url', 'Funciones', 'Sirve para armar los enlaces de socios y agenda.'],

  ['heroTitulo', 'Portada: título', 'texto', 'Portada y secciones', 'Frase grande de la portada.', 60],
  ['heroTexto', 'Portada: texto', 'texto', 'Portada y secciones', 'Frase de apoyo bajo el título.', 160],
  ['verProduccion', 'Mostrar «Producción»', 'sino', 'Portada y secciones', 'Tu presentación y enfoque.'],
  ['verFicha', 'Mostrar «Ficha técnica»', 'sino', 'Portada y secciones', 'Equipos, micrófonos y backline.'],
  ['verPlanes', 'Mostrar «Planes mensuales»', 'sino', 'Portada y secciones', 'Permite a los clientes solicitar planes.'],
  ['verGaleria', 'Mostrar «Galería»', 'sino', 'Portada y secciones', 'Fotos y videos.'],
  ['verEvaluaciones', 'Mostrar «Evaluaciones»', 'sino', 'Portada y secciones', 'Opiniones de las bandas.'],
  ['verProaudix', 'Mostrar «ProAudix»', 'sino', 'Portada y secciones', 'Apartado de tu colega audiovisual.'],
  ['verContacto', 'Mostrar «Contacto»', 'sino', 'Portada y secciones', 'Dirección, redes y enlaces.'],
  ['verTienda', 'Mostrar «Tienda»', 'sino', 'Portada y secciones', 'Insumos y bebestibles.'],
  ['verHonor', 'Mostrar «Cuadro de honor»', 'sino', 'Portada y secciones', 'Bandas destacadas.'],
  ['verCotizar', 'Mostrar «Cotizar»', 'sino', 'Portada y secciones', 'Formulario de cotización.'],
  ['verReglamento', 'Mostrar «Reglamento»', 'sino', 'Portada y secciones', 'Reglamento interno.'],
  ['sitioWeb', 'Sitio web', 'url', 'Contacto y redes', 'Tu página web, si tienes.'],
  ['redInstagram', 'Instagram', 'url', 'Contacto y redes', 'Enlace completo, por ejemplo https://instagram.com/rockerio.'],
  ['redFacebook', 'Facebook', 'url', 'Contacto y redes', 'Enlace completo.'],
  ['redYoutube', 'YouTube', 'url', 'Contacto y redes', 'Enlace de tu canal.'],
  ['redTiktok', 'TikTok', 'url', 'Contacto y redes', 'Enlace de tu perfil.'],
  ['redSpotify', 'Spotify', 'url', 'Contacto y redes', 'Enlace de tu perfil o lista.'],
  ['redYoutubeMusic', 'YouTube Music (lista oficial)', 'url', 'Contacto y redes', 'Enlace de tu lista de YouTube Music.'],
  ['redTwitch', 'Twitch', 'url', 'Contacto y redes', 'Enlace de tu canal de transmisiones en vivo.'],
  ['redLinktree', 'Linktree', 'url', 'Contacto y redes', 'Enlace de tu Linktree con todos tus enlaces.'],
  ['correoContacto', 'Correo de contacto (se muestra en el sitio)', 'texto', 'Contacto y redes', 'Ej.: rockerioestudio@gmail.com. Es el que ven los clientes en Contacto.'],
  ['mapsUrl', 'Cómo llegar (Google Maps)', 'url', 'Contacto y redes', 'Enlace de Google Maps a la dirección del estudio.'],
  ['enlacesExtra', 'Otros enlaces de interés', 'enlaces', 'Contacto y redes', 'Una línea por enlace: Texto | https://enlace. Máximo 8.'],
  ['proaudixTexto', 'ProAudix: descripción', 'texto', 'ProAudix', 'Texto de presentación del apartado ProAudix.', 400],
  ['proaudixWhatsapp', 'ProAudix: WhatsApp', 'telopc', 'ProAudix', 'Con código de país, solo números (vacío = sin botón).'],
  ['proaudixWeb', 'ProAudix: sitio web', 'url', 'ProAudix', 'Enlace https://.'],
  ['proaudixInstagram', 'ProAudix: Instagram', 'url', 'ProAudix', 'Enlace https://.'],
  ['proaudixFacebook', 'ProAudix: Facebook', 'url', 'ProAudix', 'Enlace https://.'],
  ['proaudixYoutube', 'ProAudix: YouTube', 'url', 'ProAudix', 'Enlace https://.'],
  ['proaudixEnlaces', 'ProAudix: otros enlaces', 'enlaces', 'ProAudix', 'Una línea por enlace: Texto | https://enlace. Máximo 8.'],

  ['repartoSalaJC', 'Sala: % Juan Carlos', 'num', 'Reparto de ingresos', 'Sala de ensayo. Este % + el de Jaime deben sumar 100.', 100],
  ['repartoSalaJaime', 'Sala: % Jaime', 'num', 'Reparto de ingresos', 'Sala de ensayo. Debe sumar 100 con el de Juan Carlos.', 100],
  ['repartoEstudioJC', 'Estudio: % Juan Carlos (por defecto 40)', 'num', 'Reparto de ingresos', 'Horas de estudio de grabación. Debe sumar 100 con el de Gabriela.', 100],
  ['repartoEstudioEstudio', 'Estudio: % Gabriela (por defecto 60)', 'num', 'Reparto de ingresos', 'Horas de estudio de grabación. Debe sumar 100 con el de Juan Carlos.', 100],
  ['aporteLuzProAudix', 'Aporte mensual de ProAudix a la luz', 'pesos', 'Reparto de ingresos', 'Valor por defecto; cada mes puedes cambiarlo en «Costos del mes».'],
  ['cajaChicaMensual', 'Caja chica mensual', 'pesos', 'Reparto de ingresos', 'Valor por defecto; cada mes puedes cambiarlo en «Costos del mes».'],

  ['contabilidadFormal', 'Contabilidad formal', 'sino', 'Contabilidad', 'Activa IVA, PPM e impuesto simulado (ver sección Contabilidad formal).'],
  ['regimen', 'Régimen tributario', 'lista', 'Contabilidad', '14D3 = Pro Pyme general · 14D8 = Pro Pyme transparente.', ['14D3', '14D8']]
];

/** Pasa un valor del formulario a su forma guardada, o lanza un error entendible. */
function validarAjuste_(def, v) {
  var tipo = def[2], etq = def[1], v0 = String(v === null || v === undefined ? '' : v).trim();
  if (tipo === 'sino') return (v === true || /^(si|sí|true)$/i.test(v0)) ? 'SI' : 'NO';
  if (tipo === 'pesos' || tipo === 'num') {
    if (v0 === '' || !isFinite(Number(v0)) || Number(v0) < 0) throw new Error(etq + ': escribe un número (0 o más).');
    if (tipo === 'pesos' || def[5] !== undefined) { if (Number(v0) % 1 !== 0) throw new Error(etq + ': debe ser un número entero.'); }
    if (def[5] !== undefined && Number(v0) > def[5]) throw new Error(etq + ': el máximo es ' + def[5] + '.');
    return Number(v0);
  }
  if (tipo === 'lista') { if (def[5].indexOf(v0) < 0) throw new Error(etq + ': opción no válida.'); return v0; }
  if (tipo === 'url') { if (v0 === '') return ''; var u = urlHttps_(v0); if (!u) throw new Error(etq + ': debe ser un enlace que empiece con https://'); return u.replace(/\/+$/, ''); }
  if (tipo === 'telopc') { if (v0 === '') return ''; var t2 = Reglas.normalizarTelefono(v0); if (!/^\d{8,15}$/.test(t2)) throw new Error(etq + ': escríbelo con código de país, solo números.'); return t2; }
  if (tipo === 'enlaces') {
    var lineas = v0.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lineas.length > 8) throw new Error(etq + ': máximo 8 enlaces.');
    return lineas.map(function (l) {
      var p = l.split('|'); if (p.length < 2) throw new Error(etq + ': usa el formato Texto | https://enlace (línea «' + l.slice(0, 30) + '»).');
      var u = urlHttps_(p.slice(1).join('|').trim()); if (!u) throw new Error(etq + ': el enlace de «' + p[0].trim().slice(0, 30) + '» debe empezar con https://');
      return textoSeguro_(limpiar_(p[0], 40)) + ' | ' + u;
    }).join('\n');
  }
  if (tipo === 'tel') { var t = Reglas.normalizarTelefono(v0); if (!/^\d{8,15}$/.test(t)) throw new Error(etq + ': escríbelo con código de país, solo números.'); return t; }
  return textoSeguro_(limpiar_(v0, typeof def[5] === 'number' ? def[5] : 200));
}

/** Valores actuales de todos los parámetros, para mostrarlos en el portal. */
function leerAjustes_() {
  var cfg = getCfg_(), raw = leerConfigCruda_();
  return ESQUEMA.map(function (d) {
    var v = raw[d[0]] !== undefined && raw[d[0]] !== '' ? raw[d[0]] : cfg[d[0]];
    if (d[2] === 'sino') v = (v === true || String(v).toUpperCase() === 'SI') ? 'SI' : 'NO';
    return { clave: d[0], etiqueta: d[1], tipo: d[2], grupo: d[3], ayuda: d[4], opciones: d[2] === 'lista' ? d[5] : null, valor: v === undefined || v === null ? '' : String(v) };
  });
}

/** Escribe valores en la hoja Configuracion (agrega la fila si falta). */
function ponerConfig_(valores) {
  var sh = abrirBd_().getSheetByName(HOJAS.config), n = sh.getLastRow();
  var claves = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  Object.keys(valores).forEach(function (k) {
    var i = claves.indexOf(k);
    if (i < 0) { sh.appendRow([k, valores[k], '']); claves.push(k); } else sh.getRange(i + 2, 2).setValue(valores[k]);
  });
  CacheService.getScriptCache().remove('cfgraw');
}

/** Guarda los parámetros enviados por el portal ({clave: valor}). Valida todo antes de escribir nada. */
function adminGuardarAjustes(datos) {
  exigirAdmin_();
  var mapa = {}; ESQUEMA.forEach(function (d) { mapa[d[0]] = d; });
  var salida = {};
  Object.keys(datos || {}).forEach(function (k) { if (mapa[k]) salida[k] = validarAjuste_(mapa[k], datos[k]); });
  var get = function (k) { return salida[k] !== undefined ? salida[k] : getCfg_()[k]; };
  if (get('repartoSalaJC') + get('repartoSalaJaime') !== 100) throw new Error('En la sala, los porcentajes de Juan Carlos y Jaime deben sumar 100.');
  if (get('repartoEstudioJC') + get('repartoEstudioEstudio') !== 100) throw new Error('En el estudio, los porcentajes de Juan Carlos y de Gabriela deben sumar 100.');
  if (get('ensayoMinHoras') > get('ensayoMaxHoras') || get('grabacionMinHoras') > get('grabacionMaxHoras')) throw new Error('El mínimo de horas no puede ser mayor que el máximo.');
  if (get('minutosReserva') < 5 || get('minutosReserva') > 180) throw new Error('Los minutos que se guarda el horario deben estar entre 5 y 180.');
  return conBloqueo_(function () { ponerConfig_(salida); return adminResumen(); });
}

/* ---------- horarios de atención ---------- */

/** Devuelve [[bloque1, bloque2] × 7 días] en el orden de la hoja (lunes a domingo). */
function leerHorarios_() {
  var sh = abrirBd_().getSheetByName(HOJAS.horarios);
  return sh.getRange(2, 1, 7, 3).getValues().map(function (r) { return { dia: String(r[0]), b1: String(r[1] || ''), b2: String(r[2] || '') }; });
}

function bloqueHorario_(txt, dia) {
  txt = String(txt || '').trim();
  if (!txt) return '';
  var m = /^(\d{1,2})(?::00)?\s*-\s*(\d{1,2})(?::00)?$/.exec(txt);
  if (!m || Number(m[1]) >= Number(m[2]) || Number(m[2]) > 24) throw new Error(dia + ': escribe el horario como 09:00-14:00 (entre 0 y 24 h).');
  return Reglas.horaTxt(Number(m[1])) + '-' + Reglas.horaTxt(Number(m[2]));
}

/** filas = [{b1, b2} × 7] en orden lunes a domingo. */
function adminGuardarHorarios(filas) {
  exigirAdmin_();
  if (!Array.isArray(filas) || filas.length !== 7) throw new Error('Faltan días en el horario.');
  var nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var valores = filas.map(function (f, i) {
    var a = bloqueHorario_(f.b1, nombres[i]), b = bloqueHorario_(f.b2, nombres[i]);
    if (a && b && Number(a.slice(0, 2)) > Number(b.slice(0, 2))) { var t = a; a = b; b = t; }
    return [a, b];
  });
  return conBloqueo_(function () {
    abrirBd_().getSheetByName(HOJAS.horarios).getRange(2, 2, 7, 2).setValues(valores);
    CacheService.getScriptCache().remove('cfgraw');
    return adminResumen();
  });
}

/* ---------- qué ingresos entran al balance ---------- */

/** Devuelve [{etiqueta, valor}] de las 8 casillas SI/NO de la hoja Balance (filas 4 a 11). */
function leerIngresosBalance_() {
  var sh = abrirBd_().getSheetByName(HOJAS.balance);
  return sh.getRange(4, 1, 8, 2).getValues().map(function (r, i) { return { fila: i + 4, etiqueta: String(r[0]), valor: String(r[1]) === 'SI' }; });
}

/** valores = [true/false × 8] en el mismo orden. */
function adminGuardarIngresos(valores) {
  exigirAdmin_();
  if (!Array.isArray(valores) || valores.length !== 8) throw new Error('Faltan casillas de ingresos.');
  return conBloqueo_(function () {
    abrirBd_().getSheetByName(HOJAS.balance).getRange(4, 2, 8, 1).setValues(valores.map(function (v) { return [v ? 'SI' : 'NO']; }));
    SpreadsheetApp.flush();
    return adminResumen();
  });
}
