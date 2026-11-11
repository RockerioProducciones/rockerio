/*
 * Reglas de negocio de Rockerío Producciones.
 *
 * Este archivo se usa en DOS lugares y debe ser idéntico en ambos:
 *   - js/reglas.js              (el navegador, para mostrar precios y horarios)
 *   - apps-script/Reglas.gs     (el servidor, que tiene la última palabra)
 * Para comprobarlo:  sh scripts/verificar.sh
 *
 * No depende de nada externo. Todas las fechas viajan como texto AAAA-MM-DD y las
 * horas como números enteros (19 = 19:00), siempre en hora de Chile.
 */
var Reglas = (function () {
  'use strict';

  var TZ = 'America/Santiago';
  var SERVICIOS = { ensayo: 'Sala de ensayo', grabacion: 'Estudio de grabación' };
  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  /* Valores iniciales. En producción mandan los de la hoja "Configuracion". */
  var CONFIG_POR_DEFECTO = {
    nombreNegocio: 'Rockerío Producciones',
    whatsapp: '56963402567',
    direccion: 'José Joaquín Pérez #4547, Quinta Normal, Santiago',
    correoAdmin: '',
    reservasActivas: true,
    avisoBanner: '',
    // Reparto de la utilidad (porcentajes; cada par suma 100). Lo usa la hoja Balance.
    repartoSalaJC: 50,            // sala de ensayo: % de Juan Carlos
    repartoSalaJaime: 50,         // sala de ensayo: % de Jaime
    repartoEstudioJC: 40,         // estudio de grabación: % de Juan Carlos
    repartoEstudioEstudio: 60,    // estudio de grabación: % que queda para el estudio
    aporteLuzProAudix: 10000,     // lo que ProAudix pone cada mes de la boleta de luz
    cajaChicaMensual: 20000,      // caja chica que se aparta cada mes antes de repartir
    // Tarifa conveniente: precio por hora más bajo de lunes a viernes dentro de una franja (por defecto 09:00 a 14:00)
    tarifaConveniente: false,     // SI = se aplica. Confirma el valor antes de activarla
    precioEnsayoConveniente: 12000,    // $ por hora de ensayo dentro de la franja (solo se aplica si es menor al precio normal)
    precioGrabacionConveniente: 0,     // $ por hora de grabación dentro de la franja (0 = sin tarifa conveniente en el estudio)
    convenienteDesde: 9,          // hora de inicio de la franja
    convenienteHasta: 14,         // hora de término de la franja (no incluida)
    // Mensajes de WhatsApp (plantillas). {nombre} {banda} {servicio} {fecha} {hora} {fin} {codigo} {total} {abono} {saldo} {direccion} {negocio} {sitio} {horasAnulacion} {enlaceDescarga} {enlaceResena} {enlaceHonor}
    msgRecordatorio: "Hola {nombre} 👋 Te escribimos para recordarte tu reserva en {negocio}: {servicio} el {fecha}, de {hora} a {fin}. Nos encuentras en {direccion}. Si puedes llegar 5 a 10 minutos antes, aprovechamos al máximo tu tiempo en sala 🎸 Y si algo cambia y necesitas mover la hora, avísanos con {horasAnulacion} horas de anticipación: así podemos ofrecer ese espacio a otra banda y mantener la agenda ordenada para todos. ¡Gracias por ayudarnos, nos vemos pronto! 🤘",
    msgConfirmacion: "Hola {nombre} 🤘 ¡Gracias por tu abono! Tu reserva #{codigo} quedó confirmada: {servicio} el {fecha}, de {hora} a {fin}. El saldo ({saldo}) lo pagas en el estudio el día de tu sesión. Estamos en {direccion}. Si surge cualquier cambio, escríbenos por aquí con tiempo; así podemos reorganizar la agenda y darle espacio a otras bandas. ¡Nos vemos pronto! 🎶",
    msgCobroAbono: "Hola {nombre} 😊 Te dejamos guardado el horario de tu reserva #{codigo} ({servicio} el {fecha}, de {hora} a {fin}). Para dejarla confirmada solo falta el abono de {abono}; cuando lo hagas, mándanos el comprobante por aquí y listo. Y si cambiaron tus planes, no te preocupes: avísanos y liberamos el horario para otra banda, así la agenda sigue fluyendo para todos. ¡Gracias! 🤘",
    msgGracias: "Hola {nombre} 🎸 ¡Gracias por venir a {negocio}! Esperamos que la sesión haya estado genial. Cuando quieran volver, reservar con un poco de anticipación nos ayuda a mantener la agenda fluida y a tener espacio para todas las bandas. Y si te das un minuto para dejarnos una reseña, nos ayuda un mundo: {sitio} 🤘",
    msgResena: "Hola {nombre} 🤘 ¡Qué bueno haber tenido a {banda} en {negocio}! Si tienes un minutito, cuéntanos cómo les fue: tu opinión ayuda a otras bandas a decidirse y a nosotros a mejorar. Puedes dejarla aquí: {enlaceResena} ¡Mil gracias! 🙌",
    msgDescarga: "Hola {nombre} 🎧 ¡Ya está listo el material de {banda}! Lo puedes descargar aquí: {enlaceDescarga} Si algo no abre o necesitas otro formato, escríbenos y lo resolvemos. ¡Ojalá lo disfruten harto! 🤘",
    msgHonor: "Hola {nombre} 🤘 ¡Nos encantó tener a {banda} en {negocio}! Nos gustaría que formaran parte de nuestro Cuadro de Honor, un espacio para mostrar a las bandas que pasan por aquí. Si se animan, es un formulario cortito: {enlaceHonor} ¡Gracias por la buena onda!",
    waAutoActivo: false,          // SI = el recordatorio del día anterior se envía solo por la API de WhatsApp Business (requiere cuenta Meta)
    waPhoneId: '',                // ID del número de WhatsApp Business (no es el teléfono)
    waPlantillaRecordatorio: '',  // nombre de la plantilla de recordatorio aprobada por Meta
    waIdioma: 'es',               // código de idioma de la plantilla (es, es_CL…)
    waVersion: 'v23.0',           // versión de la API Graph de Meta
    reagendoSemanas: 2,           // plazo máximo para reagendar una reserva (semanas). Se muestra en el reglamento
    reagendoCambios: 2,           // máximo de cambios por reserva. Se muestra en el reglamento
    reglamento: "Para garantizar la mejor experiencia, fluidez en la agenda y el cuidado de los equipos, compartimos nuestras condiciones de servicio.\n\n## 📅 Reservas, reagendamientos y anulaciones\n- Confirmación: el abono confirma la fecha y hora en nuestra agenda.\n- Cambios: puedes reagendar o anular con al menos {horasAnulacion} horas de anticipación.\n- Flexibilidad: reagendamos en un plazo máximo de {reagendoSemanas} semanas (máximo {reagendoCambios} cambios por reserva).\n- Anulación: la devolución se realiza vía transferencia, descontando {retencionPorHora} por cada hora abonada (cargo por comisión de la plataforma).\n- Si estás atrasado o no puedes asistir, avísanos con tiempo para buscar una solución dentro de lo posible.\n- El abono confirma tu reserva.\n- El horario queda tomado {minutosReserva} minutos mientras se realiza el abono; si no llega, se libera solo.\n- Si la reserva queda en estado «No asiste» se retienen {noAsisteCobroPorHora} por cada hora reservada (el abono) y la reserva queda cerrada, por la seriedad y el mantenimiento de la agenda.\n\n## 🎟️ Planes mensuales\n- Un plan es un pack de 4 reservas: opción de 8 horas (4 ensayos de 2 horas) u opción de 12 horas (4 ensayos de 3 horas).\n- Al validar tu pago se ingresan tus 4 reservas, idealmente dentro del mes en curso o del siguiente.\n- Cambios: igual que en ensayo y grabación, con al menos {horasAnulacion} horas de anticipación. Si no avisas a tiempo, nos quedamos con el abono de {abonoPorHora} por cada hora solicitada.\n\n## ⏰ Horarios y puntualidad\n- Llegada: recomendamos llegar 5 a 10 minutos antes para preparar aspectos técnicos antes de tocar.\n- Salida: solicitamos desocupar la sala 5 minutos antes de terminar el bloque, en respeto a la banda siguiente.\n\n## 🚫 Normas dentro de la sala\n- Prohibido fumar y consumir líquidos dentro de la sala (para proteger los equipos y la higiene). Disponemos de espacio en el patio para compartir.\n- Mantener la puerta cerrada mientras estén tocando, para cuidar el entorno y la acústica.\n\n## 🎒 Cuidado de pertenencias y espacios\n- Revisa todas tus pertenencias antes de retirarte. No nos hacemos responsables por pérdidas.\n- Mantenemos el orden y aseo constante en salas, estudio de grabación y áreas comunes.\n- Contamos con estacionamiento exterior (sujeto a disponibilidad).\n\nNuestra misión es entregarte la mejor experiencia para ti y tu banda. ¡Mantengamos siempre un ambiente de respeto y buena onda entre todos, así disfrutamos de la música! 🤘🔥",   // texto del reglamento; ## = título, - = viñeta; {horasAnulacion} etc. se reemplazan solos
    contabilidadFormal: false,    // SI = activa la contabilidad formal (IVA, PPM, impuesto simulado, compras)
    regimen: '14D3',              // 14D3 (Pro Pyme general) o 14D8 (Pro Pyme transparente)
    sitioUrl: '',                 // dirección pública del sitio (para armar los enlaces de socios)
    temaAdmin: 'rockerio',        // tema del portal de administración
    tema: 'carbon',               // tema visual por defecto (ver js/tema.js)
    presentacionTitulo: 'Mi enfoque',
    presentacion: '',             // vacío = la sección Producción muestra un texto base
    // Textos de la portada y secciones visibles del sitio
    heroTitulo: 'Tu banda suena aquí', heroTexto: 'Sala de ensayo y estudio de grabación en Quinta Normal, Santiago.',
    verProduccion: true, verFicha: true, verPlanes: true, verGaleria: true, verEvaluaciones: true, verProaudix: true, verContacto: true, verTienda: true, verHonor: true, verCotizar: true, verReglamento: true,
    // Contacto y redes (enlaces https://; vacío = no se muestra)
    sitioWeb: '', redInstagram: 'https://instagram.com/rockerio_producciones', redFacebook: '', redYoutube: '', redTiktok: '', redSpotify: '', redYoutubeMusic: 'https://music.youtube.com/playlist?list=PLVvxu7INRfmo', redTwitch: '', redLinktree: '', correoContacto: 'rockerioestudio@gmail.com', mapsUrl: '',
    enlacesExtra: '',             // una línea por enlace: «Texto | https://…»
    // Apartado ProAudix (colega audiovisual)
    proaudixTexto: 'ProAudix es el espacio matriz e infraestructura integral donde desarrollamos y albergamos las operaciones de Rockerío Producciones SpA. La tienda de insumos y los bebestibles del estudio los atiende ProAudix.',
    proaudixWeb: '', proaudixInstagram: '', proaudixFacebook: '', proaudixYoutube: '', proaudixWhatsapp: '', proaudixEnlaces: '',

    precioEnsayoHora: 15000,
    precioGrabacionHora: 30000,
    precioExtraEquipo: 3000,
    extraModo: 'hora',            // 'hora' = por cada hora, 'sesion' = una vez por sesión
    precioVideo: 20000,
    precioRaw: 10000,
    abonoPorHora: 5000,
    plan8: 112000,
    plan12: 168000,

    ensayoMinHoras: 1,
    ensayoMaxHoras: 5,
    grabacionMinHoras: 1,
    grabacionMaxHoras: 5,
    addonsMinHoras: 2,            // video y material en bruto desde estas horas

    anticipacionMinHoras: 4,
    anticipacionMaxDias: 21,      // se puede reservar desde hoy hasta 21 días después
    planMaxDias: 35,              // los planes mensuales pueden agendar sus 4 sesiones hasta 35 días adelante
    minutosReserva: 20,           // minutos que el horario queda tomado esperando el abono; luego se libera solo (5 a 180)
    horasAnulacion: 24,
    retencionPorHora: 1000,
    noAsisteCobroPorHora: 5000,   // «No asiste»: se cobra por CADA hora reservada, haya abono o no

    escalaGrabacion: '2:30,3:60,4:120,5:180',   // horas:minutos de grabación incluida en el ensayo
    pagoTransferencia: true,      // SI = se muestran los datos de transferencia al terminar la reserva
    datosTransferencia: '',       // texto público con los datos para transferir (vacío = se envían por WhatsApp)
    anulacionTardiaRetiene: true, // anular con menos de horasAnulacion: se retiene todo el abono (como no asistir)
    pagoOnline: false,            // SI = se ofrece el botón de pago online (Mercado Pago) con linkPago
    linkPago: '',
    mpActivo: false,              // SI = el cliente puede pagar el abono con Mercado Pago y la reserva se confirma sola (requiere el token en las propiedades del script)
    mpComisionPct: 3.5,           // % estimado de comisión de Mercado Pago (solo se usa si Mercado Pago no informa la comisión real)
    instruccionesPago: 'Te enviaremos los datos de transferencia por WhatsApp para confirmar tu reserva.',
    correoCliente: true,

    horarios: {
      0: [[11, 22]],
      1: [[9, 14], [17, 23]],
      2: [[9, 14], [17, 23]],
      3: [[9, 14], [17, 23]],
      4: [[9, 14], [17, 22]],
      5: [[9, 14], [17, 23]],
      6: [[10, 22]]
    },
    diasInhabiles: []
  };

  /* ---------- utilidades ---------- */

  function aNumero(v, def) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (v === null || v === undefined || v === '') return def;
    var s = String(v).replace(/[^\d-]/g, '');
    if (s === '' || s === '-') return def;
    var n = parseInt(s, 10);
    return isFinite(n) ? n : def;
  }

  function aBool(v, def) {
    if (typeof v === 'boolean') return v;
    if (v === null || v === undefined || v === '') return def;
    var s = String(v).trim().toLowerCase();
    if (s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'x') return true;
    if (s === 'no' || s === 'false' || s === '0') return false;
    return def;
  }

  function aTexto(v, def) {
    if (v === null || v === undefined) return def;
    return String(v).trim();
  }

  function clp(n) {
    var s = String(Math.round(Number(n) || 0));
    return '$' + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function horaTxt(h) { return dos(h) + ':00'; }

  function fechaValida(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.getUTCFullYear() === +p[0] && d.getUTCMonth() === +p[1] - 1 && d.getUTCDate() === +p[2];
  }

  function diaSemana(iso) {
    var p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }

  function naivo(iso, hora) {
    var p = iso.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2], hora || 0, 0, 0);
  }

  function diasEntre(desde, hasta) {
    return Math.round((naivo(hasta, 0) - naivo(desde, 0)) / 86400000);
  }

  function sumarDias(iso, n) {
    var d = new Date(naivo(iso, 0) + n * 86400000);
    return d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
  }

  function fechaLarga(iso) {
    var p = iso.split('-');
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return DIAS[diaSemana(iso)] + ' ' + (+p[2]) + ' de ' + meses[+p[1] - 1];
  }

  /** "09:00-14:00", "9 a 14" -> [9, 14]. Los minutos se ignoran: la agenda trabaja por hora. */
  function parseBloque(texto) {
    var m = /^\s*(\d{1,2})(?::\d{2})?\s*(?:-|–|a|hasta)\s*(\d{1,2})(?::\d{2})?\s*$/i.exec(String(texto || ''));
    if (!m) return null;
    var a = +m[1], b = +m[2];
    if (a < 0 || b > 24 || a >= b) return null;
    return [a, b];
  }

  function parseEscala(texto) {
    var out = {};
    String(texto || '').split(',').forEach(function (par) {
      var m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(par);
      if (m) out[+m[1]] = +m[2];
    });
    return out;
  }

  /** Convierte los valores crudos de la hoja en una configuración tipada y completa. */
  function normalizarConfig(raw) {
    raw = raw || {};
    var d = CONFIG_POR_DEFECTO;
    var c = {};
    c.nombreNegocio = aTexto(raw.nombreNegocio, d.nombreNegocio) || d.nombreNegocio;
    c.whatsapp = String(aTexto(raw.whatsapp, d.whatsapp)).replace(/\D/g, '') || d.whatsapp;
    c.direccion = aTexto(raw.direccion, d.direccion);
    c.correoAdmin = aTexto(raw.correoAdmin, d.correoAdmin);
    c.reservasActivas = aBool(raw.reservasActivas, d.reservasActivas);
    c.avisoBanner = aTexto(raw.avisoBanner, d.avisoBanner);
    c.tarifaConveniente = aBool(raw.tarifaConveniente, d.tarifaConveniente);
    ['msgRecordatorio', 'msgConfirmacion', 'msgCobroAbono', 'msgGracias', 'msgResena', 'msgDescarga', 'msgHonor'].forEach(function (k) { c[k] = aTexto(raw[k], d[k]) || d[k]; });
    c.waAutoActivo = aBool(raw.waAutoActivo, d.waAutoActivo);
    ['waPhoneId', 'waPlantillaRecordatorio', 'waIdioma', 'waVersion'].forEach(function (k) { c[k] = aTexto(raw[k], d[k]); });
    c.reglamento = aTexto(raw.reglamento, d.reglamento) || d.reglamento;
    c.contabilidadFormal = aBool(raw.contabilidadFormal, d.contabilidadFormal);
    c.regimen = String(aTexto(raw.regimen, d.regimen)).toUpperCase().replace(/[^A-Z0-9]/g, '') === '14D8' ? '14D8' : '14D3';
    c.sitioUrl = aTexto(raw.sitioUrl, d.sitioUrl).replace(/\/+$/, '');
    c.tema = aTexto(raw.tema, d.tema) || d.tema;
    c.presentacionTitulo = aTexto(raw.presentacionTitulo, d.presentacionTitulo) || d.presentacionTitulo;
    c.presentacion = aTexto(raw.presentacion, d.presentacion);
    ['sitioWeb', 'redInstagram', 'redFacebook', 'redYoutube', 'redTiktok', 'redSpotify', 'redYoutubeMusic', 'redTwitch', 'redLinktree', 'correoContacto', 'mapsUrl', 'enlacesExtra', 'proaudixWeb', 'proaudixInstagram', 'proaudixFacebook', 'proaudixYoutube', 'proaudixEnlaces'].forEach(function (k) { c[k] = aTexto(raw[k], d[k]); });
    c.heroTitulo = aTexto(raw.heroTitulo, d.heroTitulo) || d.heroTitulo; c.heroTexto = aTexto(raw.heroTexto, d.heroTexto) || d.heroTexto;
    ['verProduccion', 'verFicha', 'verPlanes', 'verGaleria', 'verEvaluaciones', 'verProaudix', 'verContacto', 'verTienda', 'verHonor', 'verCotizar', 'verReglamento'].forEach(function (k) { c[k] = aBool(raw[k], d[k]); });
    c.proaudixTexto = aTexto(raw.proaudixTexto, d.proaudixTexto) || d.proaudixTexto;
    c.proaudixWhatsapp = String(aTexto(raw.proaudixWhatsapp, d.proaudixWhatsapp)).replace(/\D/g, '');
    ['precioEnsayoHora', 'precioGrabacionHora', 'precioExtraEquipo', 'precioVideo', 'precioRaw', 'abonoPorHora',
      'plan8', 'plan12', 'ensayoMinHoras', 'ensayoMaxHoras', 'grabacionMinHoras', 'grabacionMaxHoras', 'addonsMinHoras',
      'anticipacionMinHoras', 'anticipacionMaxDias', 'planMaxDias', 'minutosReserva', 'horasAnulacion', 'retencionPorHora', 'noAsisteCobroPorHora', 'precioEnsayoConveniente', 'precioGrabacionConveniente', 'convenienteDesde', 'convenienteHasta', 'reagendoSemanas', 'reagendoCambios', 'repartoSalaJC', 'repartoSalaJaime', 'repartoEstudioJC', 'repartoEstudioEstudio', 'aporteLuzProAudix', 'cajaChicaMensual'
    ].forEach(function (k) { c[k] = aNumero(raw[k], d[k]); });
    c.minutosReserva = Math.max(5, Math.min(180, Math.round(c.minutosReserva) || d.minutosReserva));
    c.extraModo = String(aTexto(raw.extraModo, d.extraModo)).toLowerCase() === 'sesion' ? 'sesion' : 'hora';
    c.escalaGrabacion = aTexto(raw.escalaGrabacion, d.escalaGrabacion);
    c.escala = parseEscala(c.escalaGrabacion);
    c.pagoTransferencia = aBool(raw.pagoTransferencia, d.pagoTransferencia);
    c.datosTransferencia = aTexto(raw.datosTransferencia, d.datosTransferencia);
    c.anulacionTardiaRetiene = aBool(raw.anulacionTardiaRetiene, d.anulacionTardiaRetiene);
    c.pagoOnline = aBool(raw.pagoOnline, d.pagoOnline);
    c.mpActivo = aBool(raw.mpActivo, d.mpActivo);
    c.mpComisionPct = Math.max(0, Math.min(15, aNumero(raw.mpComisionPct, d.mpComisionPct)));
    c.linkPago = aTexto(raw.linkPago, d.linkPago);
    c.instruccionesPago = aTexto(raw.instruccionesPago, d.instruccionesPago);
    c.correoCliente = aBool(raw.correoCliente, d.correoCliente);

    c.horarios = {};
    for (var i = 0; i < 7; i++) {
      var fuente = raw.horarios && raw.horarios[i] !== undefined ? raw.horarios[i] : d.horarios[i];
      var bloques = [];
      (fuente || []).forEach(function (b) {
        var par = Array.isArray(b) ? b : parseBloque(b);
        if (par && par[0] < par[1]) bloques.push([+par[0], +par[1]]);
      });
      c.horarios[i] = bloques;
    }
    c.diasInhabiles = (raw.diasInhabiles || d.diasInhabiles || []).filter(fechaValida);
    return c;
  }

  /* ---------- precios ---------- */

  function limitesHoras(cfg, servicio) {
    return servicio === 'grabacion'
      ? { min: cfg.grabacionMinHoras, max: cfg.grabacionMaxHoras }
      : { min: cfg.ensayoMinHoras, max: cfg.ensayoMaxHoras };
  }

  function addonsPermitidos(cfg, servicio, horas) {
    return servicio === 'ensayo' && horas >= cfg.addonsMinHoras;
  }

  /** Total = precio x horas + extras + video + material en bruto. Abono = abonoPorHora x horas. */
  /**
   * Cuántas de las horas pedidas caen en la franja de tarifa conveniente (lunes a viernes, convenienteDesde a convenienteHasta)
   * y a qué precio por hora. Si la tarifa está apagada, no tiene precio o no es menor que la normal: 0 horas.
   */
  function tarifaConveniente(cfg, servicio, fecha, inicio, horas) {
    var normal = servicio === 'grabacion' ? cfg.precioGrabacionHora : cfg.precioEnsayoHora;
    var precio = servicio === 'grabacion' ? cfg.precioGrabacionConveniente : cfg.precioEnsayoConveniente;
    var res = { horas: 0, precio: precio, normal: normal };
    if (!cfg.tarifaConveniente || !(precio > 0) || !(precio < normal) || !fecha || inicio === undefined || inicio === null) return res;
    var dia = diaSemana(fecha);
    if (dia < 1 || dia > 5) return res;
    for (var h = +inicio; h < +inicio + (+horas || 0); h++) if (h >= cfg.convenienteDesde && h < cfg.convenienteHasta) res.horas++;
    return res;
  }

  function calcularPrecio(cfg, p) {
    var horas = +p.horas || 0;
    var porHora = p.servicio === 'grabacion' ? cfg.precioGrabacionHora : cfg.precioEnsayoHora;
    var tc = tarifaConveniente(cfg, p.servicio, p.fecha, p.inicio, horas);
    var base = porHora * (horas - tc.horas) + tc.precio * tc.horas;
    var extras = 0, video = 0, raw = 0;
    if (p.servicio === 'ensayo') {
      var n = Math.max(0, Math.min(6, +p.extras || 0));
      extras = n * cfg.precioExtraEquipo * (cfg.extraModo === 'hora' ? horas : 1);
    }
    if (addonsPermitidos(cfg, p.servicio, horas)) {
      video = p.video ? cfg.precioVideo : 0;
      raw = p.raw ? cfg.precioRaw : 0;
    }
    var total = base + extras + video + raw;
    var abono = Math.min(total, cfg.abonoPorHora * horas);
    return { base: base, extras: extras, video: video, raw: raw, total: total, abono: abono, saldo: total - abono, horasConveniente: tc.horas, ahorro: (porHora - tc.precio) * tc.horas };
  }

  /** Minutos de grabación que se regalan según las horas de ensayo (0 si no aplica). */
  function grabacionIncluidaMin(cfg, servicio, horas) {
    if (servicio !== 'ensayo') return 0;
    var mejor = 0, mejorH = 0;
    Object.keys(cfg.escala || {}).forEach(function (k) {
      var h = +k;
      if (h <= horas && h >= mejorH) { mejorH = h; mejor = cfg.escala[k]; }
    });
    var claves = Object.keys(cfg.escala || {}).map(Number), maxH = claves.length ? Math.max.apply(null, claves) : 0;
    if (maxH && horas > maxH) mejor += 60 * (horas - maxH); // más allá de la escala: +1 hora de grabación por cada hora extra
    return mejor;
  }

  /** Reemplaza {clave} por su valor en una plantilla de mensaje; las claves desconocidas se dejan tal cual. */
  function llenarPlantilla(texto, valores) {
    return String(texto || '').replace(/\{(\w+)\}/g, function (m, k) { return valores && valores[k] !== undefined && valores[k] !== null ? String(valores[k]) : m; });
  }

  function minutosTxt(min) {
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), r = min % 60;
    return h + (h === 1 ? ' hora' : ' horas') + (r ? ' ' + r + ' min' : '');
  }

  /* ---------- agenda ---------- */

  function horasAbiertas(cfg, iso) {
    if (cfg.diasInhabiles.indexOf(iso) >= 0) return [];
    var out = [];
    (cfg.horarios[diaSemana(iso)] || []).forEach(function (b) {
      for (var h = b[0]; h < b[1]; h++) if (out.indexOf(h) < 0) out.push(h);
    });
    return out.sort(function (a, b) { return a - b; });
  }

  /**
   * ahora = { fecha: 'AAAA-MM-DD', hora: 14.5 }  (hora de Chile)
   * ocupadas = horas del día ya tomadas por reservas, bloqueos o eventos.
   */
  function horasLibres(cfg, iso, ocupadas, ahora) {
    var abiertas = horasAbiertas(cfg, iso);
    var dias = diasEntre(ahora.fecha, iso);
    if (dias < 0 || dias > cfg.anticipacionMaxDias) return { abiertas: abiertas, libres: [] };
    var minimo = naivo(ahora.fecha, 0) + ahora.hora * 3600000 + cfg.anticipacionMinHoras * 3600000;
    var libres = abiertas.filter(function (h) {
      return ocupadas.indexOf(h) < 0 && naivo(iso, h) >= minimo;
    });
    return { abiertas: abiertas, libres: libres };
  }

  /** Horas de inicio posibles para un bloque continuo de `horas` horas. */
  function inicios(libres, horas) {
    var set = {};
    libres.forEach(function (h) { set[h] = true; });
    return libres.filter(function (s) {
      for (var k = 0; k < horas; k++) if (!set[s + k]) return false;
      return true;
    });
  }

  /* ---------- validación de datos ---------- */

  function limpiar(v, max) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function normalizarTelefono(v) {
    var s = String(v || '').replace(/\D/g, '');
    if (s.length === 9 && s.charAt(0) === '9') s = '56' + s;
    return s;
  }

  function telefonoValido(s) { return /^\d{8,15}$/.test(s); }
  function correoValido(s) { return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s) && s.length <= 254; }

  /* ---------- planes mensuales ---------- */

  /** Un plan son 4 sesiones de ensayo: plan8 = 4 x 2 h, plan12 = 4 x 3 h. Se paga 100% por adelantado. */
  function planInfo(cfg, tipo) {
    var h = tipo === 'plan12' ? 3 : (tipo === 'plan8' ? 2 : 0);
    if (!h) return null;
    var precio = tipo === 'plan12' ? cfg.plan12 : cfg.plan8;
    return { tipo: tipo, nombre: 'Plan mensual de ' + (h * 4) + ' horas', sesiones: 4, horasPorSesion: h, precio: precio, porSesion: Math.round(precio / 4) };
  }

  /** Último día que puede agendarse un plan: fin del mes siguiente al actual (el plan se usa en el mes en curso o el próximo). */
  function finPlan(hoyIso) {
    var y = +hoyIso.slice(0, 4), m = +hoyIso.slice(5, 7) + 1; // mes siguiente
    if (m > 12) { m = 1; y++; }
    var ult = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return y + '-' + dos(m) + '-' + dos(ult);
  }
  function diasPlan(hoyIso) { return diasEntre(hoyIso, finPlan(hoyIso)); }

  /** Valida un plan completo: sus 4 sesiones (días distintos, libres y dentro del plazo de planes) y los datos. */
  function validarPlan(cfg, ahora, sol, ocupadasPorFecha) {
    var plan = planInfo(cfg, sol && sol.tipo);
    if (!plan) return { ok: false, codigo: 'DATOS', error: 'Elige un plan.' };
    var ses = Array.isArray(sol.sesiones) ? sol.sesiones : [];
    if (ses.length !== plan.sesiones) return { ok: false, codigo: 'DATOS', error: 'Elige las ' + plan.sesiones + ' sesiones de tu plan.' };
    var cfgP = {};
    for (var k in cfg) cfgP[k] = cfg[k];
    cfgP.anticipacionMaxDias = diasPlan(ahora.fecha);
    var vistos = {}, out = [], datos = null;
    for (var i = 0; i < ses.length; i++) {
      var f = limpiar(ses[i] && ses[i].fecha, 10);
      if (vistos[f]) return { ok: false, codigo: 'DATOS', error: 'Elige cuatro días distintos.' };
      vistos[f] = true;
      var r = validarSolicitud(cfgP, ahora, {
        servicio: 'ensayo', fecha: f, inicio: ses[i].inicio, horas: plan.horasPorSesion, extras: 0, video: false, raw: false,
        banda: sol.banda, nombre: sol.nombre, telefono: sol.telefono, correo: sol.correo, comentario: sol.comentario, tyc: sol.tyc
      }, (ocupadasPorFecha || {})[f] || []);
      if (!r.ok) return { ok: false, codigo: r.codigo, error: 'Sesión ' + (i + 1) + ': ' + r.error };
      out.push({ fecha: f, inicio: r.datos.inicio, fin: r.fin });
      datos = r.datos;
    }
    out.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    return { ok: true, plan: plan, datos: datos, sesiones: out };
  }

  /** Devuelve { ok, error, datos } con los datos ya limpios. */
  function validarDatos(sol) {
    var d = {
      servicio: sol.servicio === 'grabacion' ? 'grabacion' : (sol.servicio === 'ensayo' ? 'ensayo' : ''),
      fecha: limpiar(sol.fecha, 10),
      inicio: Number(sol.inicio),
      horas: Number(sol.horas),
      extras: Math.max(0, Math.min(6, parseInt(sol.extras, 10) || 0)),
      video: sol.video === true || sol.video === 'true',
      raw: sol.raw === true || sol.raw === 'true',
      banda: limpiar(sol.banda, 60),
      nombre: limpiar(sol.nombre, 60),
      telefono: normalizarTelefono(sol.telefono),
      correo: limpiar(sol.correo, 120).toLowerCase(),
      zurdo: sol.zurdo === true || sol.zurdo === 'true',
      voces: Math.max(0, Math.min(8, parseInt(sol.voces, 10) || 0)),
      comentario: limpiar(sol.comentario, 500),
      tyc: sol.tyc === true || sol.tyc === 'true'
    };
    var e = null;
    if (!d.servicio) e = 'Elige el servicio.';
    else if (!fechaValida(d.fecha)) e = 'La fecha no es válida.';
    else if (!(d.horas >= 1 && d.horas === Math.floor(d.horas))) e = 'La duración no es válida.';
    else if (!(d.inicio >= 0 && d.inicio < 24 && d.inicio === Math.floor(d.inicio))) e = 'La hora de inicio no es válida.';
    else if (d.banda.length < 2) e = 'Escribe el nombre de la banda o proyecto.';
    else if (d.nombre.length < 2) e = 'Escribe tu nombre.';
    else if (!telefonoValido(d.telefono)) e = 'Revisa tu teléfono. Ejemplo: +56 9 1234 5678.';
    else if (!correoValido(d.correo)) e = 'Revisa tu correo electrónico.';
    else if (!d.tyc) e = 'Debes aceptar las condiciones de servicio.';
    return e ? { ok: false, error: e } : { ok: true, datos: d };
  }

  /**
   * Valida una solicitud completa contra la agenda. Es lo que ejecuta el servidor.
   * Devuelve { ok:false, error, codigo } o { ok:true, datos, calculo, fin, grabacionMin }.
   */
  function validarSolicitud(cfg, ahora, sol, ocupadas) {
    if (!cfg.reservasActivas) {
      return { ok: false, codigo: 'PAUSADO', error: 'Las reservas en línea están pausadas. Escríbenos por WhatsApp.' };
    }
    var v = validarDatos(sol);
    if (!v.ok) return { ok: false, codigo: 'DATOS', error: v.error };
    var d = v.datos;
    var lim = limitesHoras(cfg, d.servicio);
    if (d.horas < lim.min || d.horas > lim.max) {
      return { ok: false, codigo: 'DURACION', error: 'Este servicio se reserva entre ' + lim.min + ' y ' + lim.max + ' horas.' };
    }
    var r = horasLibres(cfg, d.fecha, ocupadas || [], ahora);
    if (r.abiertas.length === 0) {
      return { ok: false, codigo: 'CERRADO', error: 'Ese día no hay atención en línea.' };
    }
    if (inicios(r.libres, d.horas).indexOf(d.inicio) < 0) {
      return { ok: false, codigo: 'OCUPADO', error: 'Ese horario ya no está disponible. Elige otro.' };
    }
    if (d.servicio !== 'ensayo') d.extras = 0;
    var calculo = calcularPrecio(cfg, d);
    if (!addonsPermitidos(cfg, d.servicio, d.horas)) { d.video = false; d.raw = false; }
    return {
      ok: true,
      datos: d,
      calculo: calculo,
      fin: d.inicio + d.horas,
      grabacionMin: grabacionIncluidaMin(cfg, d.servicio, d.horas)
    };
  }

  /* ---------- mensajes ---------- */

  function resumenTexto(cfg, r, codigo) {
    var d = r.datos, c = r.calculo;
    var l = [];
    l.push('Hola, quiero confirmar mi reserva' + (codigo ? ' #' + codigo : '') + '.');
    l.push('Servicio: ' + SERVICIOS[d.servicio]);
    l.push('Fecha: ' + fechaLarga(d.fecha) + ', de ' + horaTxt(d.inicio) + ' a ' + horaTxt(r.fin));
    l.push('Banda: ' + d.banda + ' (' + d.nombre + ')');
    if (d.extras) l.push('Equipo extra: ' + d.extras);
    if (d.video) l.push('Video GoPro: sí');
    if (d.raw) l.push('Material en bruto: sí');
    if (c.horasConveniente) l.push('Tarifa conveniente de lunes a viernes aplicada en ' + c.horasConveniente + (c.horasConveniente === 1 ? ' hora' : ' horas'));
    if (r.grabacionMin) l.push('Incluye ' + minutosTxt(r.grabacionMin) + ' de grabación');
    l.push('Total: ' + clp(c.total) + ' | Abono: ' + clp(c.abono) + ' | Saldo en sala: ' + clp(c.saldo));
    return l.join('\n');
  }

  /** Hora actual de Chile como { fecha, hora }. Solo para el navegador y las pruebas. */
  function ahoraChile(fecha) {
    var partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(fecha || new Date());
    var o = {};
    partes.forEach(function (p) { o[p.type] = p.value; });
    return { fecha: o.year + '-' + o.month + '-' + o.day, hora: (+o.hour) + (+o.minute) / 60 };
  }

  return {
    TZ: TZ, SERVICIOS: SERVICIOS, DIAS: DIAS, CONFIG_POR_DEFECTO: CONFIG_POR_DEFECTO,
    aNumero: aNumero, aBool: aBool, clp: clp, horaTxt: horaTxt, fechaValida: fechaValida, diaSemana: diaSemana,
    diasEntre: diasEntre, sumarDias: sumarDias, fechaLarga: fechaLarga, parseBloque: parseBloque, parseEscala: parseEscala,
    normalizarConfig: normalizarConfig, limitesHoras: limitesHoras, addonsPermitidos: addonsPermitidos,
    calcularPrecio: calcularPrecio, grabacionIncluidaMin: grabacionIncluidaMin, llenarPlantilla: llenarPlantilla, tarifaConveniente: tarifaConveniente, minutosTxt: minutosTxt,
    horasAbiertas: horasAbiertas, horasLibres: horasLibres, inicios: inicios, planInfo: planInfo, validarPlan: validarPlan, finPlan: finPlan, diasPlan: diasPlan,
    normalizarTelefono: normalizarTelefono, correoValido: correoValido, telefonoValido: telefonoValido,
    validarDatos: validarDatos, validarSolicitud: validarSolicitud, resumenTexto: resumenTexto, ahoraChile: ahoraChile
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = Reglas; }
