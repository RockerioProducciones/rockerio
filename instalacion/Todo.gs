/* ROCKERÍO · Servidor completo. Generado por scripts/empaquetar.sh. No lo edites aquí. */

/* ===== Reglas ===== */
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
    msgRecordatorio: "🤘 *¡Se viene tu sesión, {nombre}!*\n\n🎸 {negocio}\n📅 {fecha}\n⏰ {hora} a {fin} · {servicio}\n📍 {direccion}\n\nLlega 5 a 10 minutos antes y aprovechamos cada minuto de sala 🔊\n\nSi algo cambia, avísanos con {horasAnulacion} horas de anticipación: así otra banda toma el horario y la agenda sigue girando para todos 🙌\n\n¡Nos vemos en el ruido! 🤘",
    msgConfirmacion: "🤘 *¡Reserva confirmada, {nombre}!*\n\n🎟️ Código #{codigo}\n🎸 {servicio}\n📅 {fecha}\n⏰ {hora} a {fin}\n📍 {direccion}\n\n💵 El saldo ({saldo}) lo pagas en sala el día de tu sesión.\n\nSi surge un cambio, escríbenos con tiempo y reorganizamos la agenda, así también le damos espacio a otras bandas 🙌\n\n¡Prepárense para sonar fuerte! 🔥",
    msgCobroAbono: "🎸 *Tu horario está guardado, {nombre}*\n\n🎟️ Reserva #{codigo}\n📅 {fecha} · {hora} a {fin}\n🎶 {servicio}\n\nPara dejarla confirmada solo falta el abono de *{abono}*. Cuando lo hagas, mándanos el comprobante por aquí y quedas listo 🤘\n\nY si cambiaron los planes, avísanos no más: liberamos el horario para otra banda y la agenda sigue fluyendo para todos 🙌",
    msgGracias: "🎸 *¡Gracias por tocar en {negocio}, {nombre}!*\n\nEsperamos que la sesión haya quedado épica 🔥 Cuando quieran volver, reservar con un poco de anticipación nos ayuda a tener espacio para todas las bandas.\n\nY si te das un minuto para dejarnos una reseña, nos ayuda un mundo: {sitio} 🤘",
    msgResena: "⭐ *¿Cómo les fue, {nombre}?*\n\n¡Qué bueno haber tenido a *{banda}* en {negocio}! 🤘 Tu opinión ayuda a otras bandas a decidirse y a nosotros a seguir mejorando.\n\nDéjala aquí, toma un minuto: {enlaceResena}\n\n¡Mil gracias! 🙌",
    msgDescarga: "🎧 *¡Ya está listo el material de {banda}!*\n\nDescárgalo aquí: {enlaceDescarga}\n\nSi algo no abre o necesitas otro formato, escríbenos y lo resolvemos al tiro. ¡Ojalá lo disfruten harto! 🤘🔥",
    msgHonor: "🏆 *{banda} merece estar en el muro*\n\nHola {nombre} 🤘 ¡Nos encantó tener a {banda} en {negocio}! Queremos mostrarlos en nuestro *Cuadro de Honor*, el espacio donde brillan las bandas que pasan por aquí.\n\nSi se animan, es un formulario cortito: {enlaceHonor}\n\n¡Gracias por la buena onda! 🎸",
    waAutoActivo: false,          // SI = el recordatorio del día anterior se envía solo por la API de WhatsApp Business (requiere cuenta Meta)
    waPhoneId: '',                // ID del número de WhatsApp Business (no es el teléfono)
    waPlantillaRecordatorio: '',  // nombre de la plantilla de recordatorio aprobada por Meta
    waIdioma: 'es',               // código de idioma de la plantilla (es, es_CL…)
    waVersion: 'v23.0',           // versión de la API Graph de Meta
    reagendoSemanas: 2,           // plazo máximo para reagendar una reserva (semanas). Se muestra en el reglamento
    reagendoCambios: 2,           // máximo de cambios por reserva. Se muestra en el reglamento
    reglamento: "Para garantizar la mejor experiencia, fluidez en la agenda y el cuidado de los equipos, compartimos nuestras condiciones de servicio.\n\n## 📅 Reservas, reagendamientos y anulaciones\n- Confirmación: el abono confirma la fecha y hora en nuestra agenda.\n- Cambios: puedes reagendar o anular con al menos {horasAnulacion} horas de anticipación.\n- Flexibilidad: reagendamos en un plazo máximo de {reagendoSemanas} semanas (máximo {reagendoCambios} cambios por reserva).\n- Anulación: la devolución se realiza vía transferencia, descontando {retencionPorHora} por cada hora abonada (cargo por comisión de la plataforma).\n- Si estás atrasado o no puedes asistir, avísanos con tiempo para buscar una solución dentro de lo posible.\n- El abono confirma tu reserva.\n- El horario queda tomado {minutosReserva} minutos mientras se realiza el abono; si no llega, se libera solo.\n- Si la reserva queda en estado «No asiste» se retienen {noAsisteCobroPorHora} por cada hora reservada (el abono) y la reserva queda cerrada, por la seriedad y el mantenimiento de la agenda.\n\n## 🎟️ Planes mensuales\n- Un plan es un pack de 4 reservas: opción de 8 horas (4 ensayos de 2 horas) u opción de 12 horas (4 ensayos de 3 horas).\n- Al validar tu pago se ingresan tus 4 reservas, idealmente dentro del mes en curso o del siguiente.\n- Cambios: igual que en ensayo y grabación, con al menos {horasAnulacion} horas de anticipación. Si no avisas a tiempo, nos quedamos con el abono de {abonoPorHora} por cada hora solicitada.\n\n## ⏰ Horarios y puntualidad\n- Llegada: recomendamos llegar 5 a 10 minutos antes para preparar aspectos técnicos antes de tocar.\n- Salida: solicitamos desocupar la sala 5 minutos antes de terminar el bloque, en respeto a la banda siguiente.\n\n## 🚫 Normas dentro de la sala\n- Prohibido fumar y consumir líquidos dentro de la sala (para proteger los equipos y la higiene). Disponemos de espacio en el patio para compartir.\n- Mantener la puerta cerrada mientras estén tocando, para cuidar el entorno y la acústica.\n\n## 🎒 Cuidado de pertenencias y espacios\n- Revisa todas tus pertenencias antes de retirarte. No nos hacemos responsables por pérdidas.\n- Mantenemos el orden y aseo constante en salas, estudio de grabación y áreas comunes.\n- Contamos con estacionamiento exterior (sujeto a disponibilidad).\n\n## 🔒 Protección de datos personales\n- Qué datos pedimos: nombre, nombre de la banda, teléfono o WhatsApp, correo electrónico y, si quieres, un comentario. Los usamos solo para gestionar tu reserva, avisarte de cambios, recordarte tu sesión, cobrar o devolver abonos y, si lo pides, entregarte tu material.\n- Qué no hacemos: no vendemos ni cedemos tus datos a terceros, ni los usamos para publicidad. Tampoco te escribimos con ofertas que no pediste.\n- Con quién se comparten: solo con los servicios que hacen posible la reserva (por ejemplo almacenamiento y correo de Google, WhatsApp y, si usas el pago en línea, Mercado Pago), que los tratan únicamente para ese fin. El pago con tarjeta lo procesa Mercado Pago: nosotros nunca vemos ni guardamos los datos de tu tarjeta.\n- Quién puede verlos: solo el equipo de {negocio}. Tu teléfono y correo no se muestran en el sitio ni a otras bandas.\n- Cuánto tiempo: los conservamos mientras sean necesarios para atender tu reserva y cumplir obligaciones administrativas y tributarias; después los eliminamos o anonimizamos.\n- Publicaciones: reseñas, Cuadro de Honor, fotos, videos o audios de tu sesión se publican solo con tu autorización y puedes pedir que los retiremos cuando quieras.\n- Tus derechos: puedes pedir acceso, corrección, eliminación u oposición al uso de tus datos, o retirar tu consentimiento, escribiéndonos por WhatsApp o al correo de contacto de este sitio. Respondemos a la brevedad.\n- Seguridad: usamos cuentas protegidas, acceso restringido al administrador y conexiones cifradas. Si ocurriera un incidente que afecte tus datos, te informaremos.\n- Este sitio no usa cookies de publicidad ni de seguimiento. Actuamos conforme a la normativa chilena de protección de datos personales (Ley N° 19.628 y su actualización, Ley N° 21.719).\n\nNuestra misión es entregarte la mejor experiencia para ti y tu banda. ¡Mantengamos siempre un ambiente de respeto y buena onda entre todos, así disfrutamos de la música! 🤘🔥",   // texto del reglamento; ## = título, - = viñeta; {horasAnulacion} etc. se reemplazan solos
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

  var CLAUSULA_DATOS = "## 🔒 Protección de datos personales\n- Qué datos pedimos: nombre, nombre de la banda, teléfono o WhatsApp, correo electrónico y, si quieres, un comentario. Los usamos solo para gestionar tu reserva, avisarte de cambios, recordarte tu sesión, cobrar o devolver abonos y, si lo pides, entregarte tu material.\n- Qué no hacemos: no vendemos ni cedemos tus datos a terceros, ni los usamos para publicidad. Tampoco te escribimos con ofertas que no pediste.\n- Con quién se comparten: solo con los servicios que hacen posible la reserva (por ejemplo almacenamiento y correo de Google, WhatsApp y, si usas el pago en línea, Mercado Pago), que los tratan únicamente para ese fin. El pago con tarjeta lo procesa Mercado Pago: nosotros nunca vemos ni guardamos los datos de tu tarjeta.\n- Quién puede verlos: solo el equipo de {negocio}. Tu teléfono y correo no se muestran en el sitio ni a otras bandas.\n- Cuánto tiempo: los conservamos mientras sean necesarios para atender tu reserva y cumplir obligaciones administrativas y tributarias; después los eliminamos o anonimizamos.\n- Publicaciones: reseñas, Cuadro de Honor, fotos, videos o audios de tu sesión se publican solo con tu autorización y puedes pedir que los retiremos cuando quieras.\n- Tus derechos: puedes pedir acceso, corrección, eliminación u oposición al uso de tus datos, o retirar tu consentimiento, escribiéndonos por WhatsApp o al correo de contacto de este sitio. Respondemos a la brevedad.\n- Seguridad: usamos cuentas protegidas, acceso restringido al administrador y conexiones cifradas. Si ocurriera un incidente que afecte tus datos, te informaremos.\n- Este sitio no usa cookies de publicidad ni de seguimiento. Actuamos conforme a la normativa chilena de protección de datos personales (Ley N° 19.628 y su actualización, Ley N° 21.719).";
  return {
    CLAUSULA_DATOS: CLAUSULA_DATOS, TZ: TZ, SERVICIOS: SERVICIOS, DIAS: DIAS, CONFIG_POR_DEFECTO: CONFIG_POR_DEFECTO,
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

/* ===== Code ===== */
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
  cobro: 36, medioPago: 37, cortesia: 38, fechaPago: 39,
  pago: 40, pagoFecha: 41, pagoId: 42, comision: 43
};
var ENCABEZADO_RESERVAS = ['Código', 'Creada', 'Estado', 'Servicio', 'Fecha', 'Inicio', 'Fin', 'Horas', 'Banda', 'Contacto',
  'Teléfono', 'Correo', 'Equipo extra', 'Video', 'Material en bruto', 'Total', 'Abono', 'Saldo',
  'Baterista zurdo', 'Micrófonos de voz', 'Comentarios', 'ID del evento',
  'Monto horas', 'Monto extras', 'Monto video', 'Monto material bruto', 'Abono recibido', 'Abono retenido', 'Abono a devolver', 'Plan', 'Recordatorio WhatsApp', 'Reagendos', 'Ajuste (descuento)', 'Nota del ajuste', 'Montos originales',
  'Cobro (POR COBRAR si el saldo quedó pendiente)', 'Medio de pago del saldo', 'Cortesía o canje', 'Fecha de pago del saldo',
  'Verificación de pago (COMPROBANTE / PAGO EN LÍNEA)', 'Fecha del pago o comprobante', 'ID del pago en línea', 'Comisión de la pasarela'];

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
var PAGO_COMPROBANTE = 'COMPROBANTE';
var PAGO_ONLINE = 'PAGO EN LÍNEA';
var HORAS_MAX_COMPROBANTE = 12;
var MAX_PENDIENTES_POR_TELEFONO = 3;
var MAX_SOLICITUDES_POR_HORA = 6;

/* ====================================================================
 *  PUNTOS DE ENTRADA DEL SITIO WEB
 * ==================================================================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.admin === '1') return paginaAdmin_(p.confirmar);
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
    if (e && e.parameter && e.parameter.mp) return json_(mpWebhook_(e.parameter, sol)); // aviso de Mercado Pago
    if (cuerpo.length > 8000 && sol.accion !== 'honor') return json_({ ok: false, codigo: 'DATOS', error: 'Solicitud demasiado grande.' });
    switch (sol.accion) {
      case 'reservar': return json_(reservar_(sol));
      case 'pagado': return json_(marcarComprobante_(sol));
      case 'mp_pagar': return json_(mpCrearPago_(sol));
      case 'mp_verificar': return json_(mpVerificarCliente_(sol));
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
  delete c.correoAdmin; delete c.waAutoActivo; delete c.waPhoneId; delete c.waPlantillaRecordatorio; delete c.waIdioma; delete c.waVersion; delete c.datosTransferencia; delete c.linkPago; delete c.instruccionesPago;
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

/** Enlace para abrir una reserva en el portal y confirmarla (solo funciona con la cuenta de administración). */
function urlGestion_(cfg, codigo) {
  var base = String(cfg.sitioUrl || 'https://rockerioproducciones.cl').replace(/\/+$/, '');
  return (/^https:\/\//.test(base) && /^RP-\d{3,8}(-\d)?$/.test(String(codigo || ''))) ? base + '/admin/?c=' + codigo : '';
}
function enlaceGestion_(cfg, codigo, prefijo) {
  var u = urlGestion_(cfg, codigo);
  return u ? prefijo + u : '';
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
  if (limiteGlobal_('reservar', 60)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Escríbenos por WhatsApp.' };
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
      whatsapp: Reglas.resumenTexto(cfg, v, codigo) + enlaceGestion_(cfg, codigo, '\n\n— Solo administración: '),
      pago: { mp: mpDisponible_(cfg), instrucciones: cfg.instruccionesPago, transferencia: (cfg.pagoTransferencia && cfg.datosTransferencia) ? cfg.datosTransferencia : '', link: (cfg.pagoOnline && cfg.linkPago) ? cfg.linkPago : '', minutosReserva: cfg.minutosReserva, segundos: cfg.minutosReserva * 60 }
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
  var d = v.datos, c = v.calculo;
  var detalle = [
    ['Servicio', Reglas.SERVICIOS[d.servicio]],
    ['Fecha', Reglas.fechaLarga(d.fecha)],
    ['Horario', Reglas.horaTxt(d.inicio) + ' a ' + Reglas.horaTxt(v.fin)],
    ['Banda', d.banda]
  ];
  if (d.extras) detalle.push(['Equipo extra', d.extras]);
  if (d.video) detalle.push(['Video GoPro', 'Sí']);
  if (d.raw) detalle.push(['Material en bruto', 'Sí']);
  detalle.push(['Total', Reglas.clp(c.total)], ['Abono para confirmar', Reglas.clp(c.abono)], ['Saldo en sala', Reglas.clp(c.saldo)]);
  // Al administrador: con botones para confirmar el abono y escribirle al cliente.
  try {
    if (cfg.correoAdmin) {
      var filasAdm = detalle.concat([['Contacto', d.nombre], ['WhatsApp', '+' + d.telefono], ['Correo', d.correo || '—']]);
      if (d.comentario) filasAdm.push(['Comentarios', d.comentario]);
      enviarCorreo_(cfg, cfg.correoAdmin, 'Nueva reserva #' + codigo + ' · ' + d.banda, {
        preheader: d.banda + ' reservó ' + Reglas.fechaLarga(d.fecha) + ' · abono pendiente', titulo: 'Nueva reserva por abonar', codigo: codigo,
        parrafos: ['Entró una reserva desde el sitio y está esperando el abono. Cuando llegue el comprobante, confírmala con un toque.'],
        filas: filasAdm,
        boton: { texto: 'Confirmar abono', url: urlGestion_(cfg, codigo) },
        boton2: { texto: 'Escribirle por WhatsApp', url: enlaceWaCliente_(d.telefono, 'Hola ' + d.nombre + ' 🤘 Vimos tu reserva #' + codigo + ' en ' + cfg.nombreNegocio + '. ') },
        notas: ['El botón de confirmar te pide iniciar sesión con la cuenta de administración. También puedes cambiar el estado desde el portal o la hoja Reservas.']
      });
    }
  } catch (err) { console.error('Correo al administrador: ' + err); }
  // Al cliente.
  try {
    if (cfg.correoCliente && d.correo) {
      var pagos = [];
      if (cfg.instruccionesPago) pagos.push(cfg.instruccionesPago);
      if (cfg.pagoTransferencia && cfg.datosTransferencia) pagos.push('Transferencia:\n' + cfg.datosTransferencia);
      var wa = cfg.whatsapp ? 'https://wa.me/' + String(cfg.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola 🤘 te mando el comprobante de mi reserva #' + codigo + ' (' + d.banda + ').') : '';
      var o = {
        preheader: 'Tu horario queda guardado ' + cfg.minutosReserva + ' minutos mientras abonas', titulo: '¡Recibimos tu reserva!', codigo: codigo,
        saludo: 'Hola ' + d.nombre + ' 🤘',
        parrafos: ['Te guardamos el horario ' + cfg.minutosReserva + ' minutos para que puedas abonar y dejar todo confirmado. Si no alcanzas, no pasa nada: el horario se libera para otra banda y puedes volver a reservar cuando quieras.'],
        filas: detalle,
        notas: ['Si necesitas cambiar o anular, avísanos por WhatsApp con al menos ' + cfg.horasAnulacion + ' horas de anticipación: así otra banda puede tomar ese espacio y la agenda sigue fluyendo para todos. ¡Gracias por la buena onda!']
      };
      if (pagos.length) o.caja = pagos.join('\n\n');
      if (cfg.pagoOnline && urlSegura_(cfg.linkPago)) o.boton = { texto: 'Pagar el abono', url: cfg.linkPago };
      if (wa) { if (o.boton) o.boton2 = { texto: 'Enviar comprobante', url: wa }; else o.boton = { texto: 'Enviar comprobante por WhatsApp', url: wa }; }
      enviarCorreo_(cfg, d.correo, 'Tu reserva #' + codigo + ' en ' + cfg.nombreNegocio, o, { replyTo: cfg.correoAdmin || '' });
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
    if (String(r[RES.pago - 1]) === PAGO_COMPROBANTE) {
      // El cliente dijo que ya pagó: el horario se guarda hasta que lo valides (con un tope, para que nadie lo retenga sin pagar).
      var desde = r[RES.pagoFecha - 1];
      if (desde instanceof Date && desde.getTime() > Date.now() - HORAS_MAX_COMPROBANTE * 3600000) return;
      avisarAdmin_('Se liberó un horario con comprobante SIN validar · ' + r[RES.codigo - 1], 'La reserva ' + r[RES.codigo - 1] + ' (' + r[RES.banda - 1] + ', ' + r[RES.fecha - 1] + ') llevaba más de ' + HORAS_MAX_COMPROBANTE + ' horas con comprobante sin validar y el horario se liberó. Si el pago es real, reagéndala desde el portal.');
    }
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

/** Si el horario de una reserva sin evento ya lo ocupa otra reserva o bloqueo, devuelve el detalle ('' si está libre). */
function choqueAlReactivar_(r) {
  var fecha = aFechaIso_(r[RES.fecha - 1]), ini = aHora_(r[RES.inicio - 1]), n = Number(r[RES.horas - 1]) || 0;
  if (!fecha || ini === null || !n) return '';
  var cod = String(r[RES.codigo - 1] || '');
  var otras = reservasVigentesEn_(fecha, cod).filter(function (x) { return x.ini < ini + n && x.fin > ini; });
  if (otras.length) return otras[0].banda + ' (' + Reglas.horaTxt(otras[0].ini) + ' a ' + Reglas.horaTxt(otras[0].fin) + ')';
  var oc = ocupadasRango_(fecha, 1)[fecha] || [];
  for (var h = ini; h < ini + n; h++) if (oc.indexOf(h) >= 0) return 'horario ocupado o bloqueado a las ' + h + ':00';
  return '';
}

function sincronizarEstado_(sh, f) {
  var r = sh.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
  var estado = estadoNorm_(r[RES.estado - 1]);
  if (!r[RES.codigo - 1]) return;
  var cal = getCalendar_();
  var servicio = String(r[RES.servicio - 1]) === ETIQUETA_SERVICIO.grabacion ? 'grabacion' : 'ensayo';
  var evento = r[RES.evento - 1] ? obtenerEvento_(cal, r[RES.evento - 1]) : null;

  // Una reserva liberada (anulada) NO puede reactivarse si otra tomó su horario: se evita el choque.
  if (!evento && ESTADOS_QUE_OCUPAN.indexOf(estado) >= 0) {
    var choque = choqueAlReactivar_(r);
    if (choque) {
      sh.getRange(f, RES.estado).setValue(EST.ANULADA); estado = EST.ANULADA; r[RES.estado - 1] = EST.ANULADA;
      avisarAdmin_('No se pudo reactivar la reserva ' + r[RES.codigo - 1] + ' (' + r[RES.banda - 1] + ')', 'Su horario ya lo tiene otra reserva: ' + choque + '. Se dejó Anulada para no duplicar el horario. Reagéndala a otro horario desde el portal.');
    }
  }

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
  if (cache.get('esq8')) return;
  try {
    var sh = ss.getSheetByName(HOJAS.reservas);
    if (sh) {
      if (sh.getMaxColumns() < RES.comision) sh.insertColumnsAfter(sh.getMaxColumns(), RES.comision - sh.getMaxColumns());
      [[RES.reagendos, 'Reagendos'], [RES.ajuste, 'Ajuste (descuento)'], [RES.notaAjuste, 'Nota del ajuste'], [RES.original, 'Montos originales'], [RES.cobro, ENCABEZADO_RESERVAS[RES.cobro - 1]], [RES.medioPago, ENCABEZADO_RESERVAS[RES.medioPago - 1]], [RES.cortesia, ENCABEZADO_RESERVAS[RES.cortesia - 1]], [RES.fechaPago, ENCABEZADO_RESERVAS[RES.fechaPago - 1]], [RES.pago, ENCABEZADO_RESERVAS[RES.pago - 1]], [RES.pagoFecha, ENCABEZADO_RESERVAS[RES.pagoFecha - 1]], [RES.pagoId, ENCABEZADO_RESERVAS[RES.pagoId - 1]], [RES.comision, ENCABEZADO_RESERVAS[RES.comision - 1]]].forEach(function (c) {
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
    migrarMensajes_();
    cache.put('esq8', '1', 21600);
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
    ['mpActivo', 'NO', 'SI = botón «Pagar con Mercado Pago» con confirmación automática. Requiere el token de Mercado Pago guardado en el script (ver GUIA).'],
    ['mpComisionPct', d.mpComisionPct, 'Comisión estimada de Mercado Pago en % (solo si Mercado Pago no informa la real). La comisión de cada pago se anota sola como gasto.'],
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

/* ===== AdminApi ===== */
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

function paginaAdmin_(confirmar) {
  try {
    exigirAdmin_();
  } catch (e) {
    return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:2rem">Acceso denegado. Inicia sesión con la cuenta de administración.</p>')
      .setTitle('Acceso denegado');
  }
  var salida = HtmlService.createHtmlOutputFromFile('Admin').setTitle('Rockerío · Administración')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  if (/^RP-\d{3,8}(-\d)?$/.test(String(confirmar || ''))) salida.append('<script>window.CONFIRMAR_COD=' + JSON.stringify(String(confirmar)) + ';if(window.cargarJor)cargarJor();</script>');
  return salida;
}

/** Cuando es true, adminResumen() no arma el resumen completo (lo usan las acciones rápidas de «Reservas y jornadas»). */
var LIGERO_ = false;
var RAPIDAS_ = ['adminAgregarAdicional','adminCambiarEstado', 'adminReagendar', 'adminAjustarReserva', 'adminMarcarCobro', 'adminMarcarCortesia', 'adminAjustarRetencion', 'adminGuardarEnlace', 'adminEliminarReserva', 'adminCuadrarReservas', 'adminDesbloquear'];
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
  var rAct = sh.getRange(celda.getRow(), 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0];
  if (ESTADOS_QUE_OCUPAN.indexOf(estadoNorm_(rAct[RES.estado - 1])) < 0 && ESTADOS_QUE_OCUPAN.indexOf(estado) >= 0) {
    var choque = choqueAlReactivar_(rAct);
    if (choque) throw new Error('CHOQUE: ese horario ya lo tiene ' + choque + '. Usa «Reagendar» para moverla a otro horario libre.');
  }
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
    var hechos = Number(r[RES.reagendos - 1]) || 0, max = Number(cfg.reagendoCambios) || 2;
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
    archivos = archivos.filter(function (a) { return /^Respaldo /.test(a.getName()); });
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
      if (!d) return;
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
  sh.getRange(2, 1, n - 1, 10).getValues().forEach(function (r) {
    if (!r[0]) return;
    var nom = String(r[8] || ''), ape = String(r[9] || '');
    out.push({ telefono: String(r[0]), correo: String(r[1] || ''), banda: String(r[2] || ''), contacto: (nom || ape) ? (nom + ' ' + ape).trim() : String(r[3] || ''),
      nombre: nom || String(r[3] || ''), apellido: ape, reservas: Number(r[4]) || 0, enlace: String(r[7] || '') });
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
  var cfg = getCfg_(), servicio = p.servicio === 'grabacion' ? 'grabacion' : 'ensayo', horas = Math.max(1, Math.min(24, Number(p.horas) || 1));
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
  var servicio = p.servicio === 'grabacion' ? 'grabacion' : 'ensayo';
  var fecha = String(p.fecha || ''), inicio = Number(p.inicio), horas = Number(p.horas);
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
      if (choca.length) throw new Error('CHOQUE: ese horario ya está ocupado o bloqueado (' + choca.join(', ') + ').');
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
    sh.appendRow(fila);
    var f = sh.getLastRow();
    sh.getRange(f, RES.telefono).setNumberFormat('@').setValue(tel);
    if (estado !== EST.SIN_ABONO) sincronizarEstado_(sh, f);
    if (pago === 'completo' && !p.codigoEditar) { sh.getRange(f, RES.cobro, 1, 2).setValues([['', medioPago]]); sh.getRange(f, RES.fechaPago).setValue(fechaHora_(ahoraChile_().fecha, 0)); }
    registrarCliente_({ telefono: tel, correo: correo, banda: banda, nombre: nombre });
    return { ok: true, codigo: codigo };
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
  cl.forEach(function (c) { porTel[c.telefono] = { telefono: c.telefono, correo: c.correo, banda: c.banda, contacto: c.contacto, nombre: c.nombre, apellido: c.apellido, enlace: c.enlace, jornadas: 0, finalizadas: 0, gastado: 0, ultima: '', proxima: '' }; });
  reservas.forEach(function (r) {
    var c = porTel[r.telefono] || (porTel[r.telefono] = { telefono: r.telefono, correo: r.correo, banda: r.banda, contacto: r.contacto, enlace: '', jornadas: 0, finalizadas: 0, gastado: 0, ultima: '', proxima: '' });
    if (r.estado === EST.ANULADA) return;
    c.jornadas++;
    if (r.estado === EST.FINALIZADA) { c.finalizadas++; c.gastado += r.total; }
    if (r.fecha && r.fecha < hoy && r.estado !== EST.SIN_ABONO && (!c.ultima || r.fecha > c.ultima)) c.ultima = r.fecha;
    if (r.fecha && r.fecha >= hoy && (!c.proxima || r.fecha < c.proxima)) c.proxima = r.fecha;
  });
  var clientes = Object.keys(porTel).map(function (t) { return porTel[t]; }).sort(function (a, b) { return b.jornadas - a.jornadas || (a.banda < b.banda ? -1 : 1); });
  return { hoy: hoy, reservas: reservas, bloqueos: bloqueos, inhabiles: inhabiles, clientes: clientes, estados: ESTADOS, wa: waDatos_(), maxReag: getCfg_().reagendoCambios, precios: { raw: getCfg_().precioRaw, video: getCfg_().precioVideo } };
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
  var t0 = Date.now();
  function paso(n, fn) { var t = Date.now(); console.log('→ ' + n + ' …'); try { var r = fn(); console.log('✔ ' + n + ' (' + (Date.now() - t) + ' ms)' + (r === undefined ? '' : ' · ' + r)); } catch (e) { console.log('✖ ' + n + ': ' + (e && e.message || e)); } }
  paso('propiedades', function () { return Object.keys(PropertiesService.getScriptProperties().getProperties()).length + ' claves'; });
  paso('caché', function () { CacheService.getScriptCache().get('prueba'); });
  var ss = null;
  paso('abrir la hoja de datos', function () { ss = abrirBd_(); return ss.getName(); });
  if (!ss) return;
  paso('lista de pestañas', function () { return ss.getSheets().map(function (s) { return s.getName() + ' ' + s.getLastRow() + '×' + s.getLastColumn(); }).join(' | '); });
  ss.getSheets().forEach(function (s) {
    paso('leer «' + s.getName() + '»', function () { var f = Math.min(s.getLastRow(), 3000), c = s.getLastColumn(); return f && c ? s.getRange(1, 1, f, c).getValues().length + ' filas' : 'vacía'; });
  });
  paso('configuración (getCfg_)', function () { return Object.keys(getCfg_()).length + ' claves'; });
  paso('calendario', function () { return getCalendar_().getName(); });
  paso('candado libre', function () { var l = LockService.getScriptLock(); var ok = l.tryLock(3000); if (ok) l.releaseLock(); return ok ? 'libre' : 'OCUPADO por otra ejecución'; });
  paso('carpeta de respaldos', function () { return carpetaRespaldos_().getName(); });
  console.log('Total: ' + (Date.now() - t0) + ' ms');
}

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

/* ===== Contenido ===== */
/**
 * Contenido que alimenta el sitio: muestras de audio, cuadro de honor, reseñas y cotizaciones.
 * Todo lo que envía el público queda PENDIENTE hasta que tú lo apruebas en el portal.
 */

var ESTADOS_MOD = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
var ESTADOS_SOL = ['NUEVA', 'COTIZADA', 'ACEPTADA', 'RECHAZADA', 'CERRADA'];
var TIPOS_SOL = { plan8: 'Plan mensual de 8 horas', plan12: 'Plan mensual de 12 horas', produccion: 'Producción musical', otro: 'Otra consulta' };
var TIPOS_MUESTRA = ['Micrófono', 'Canción', 'Ensayo', 'Comparador', 'Otro'];
var REDES_HONOR = ['Instagram', 'YouTube', 'TikTok', 'Facebook', 'Spotify', 'Bandcamp', 'SoundCloud', 'X', 'Sitio web'];

/* ---------- limpieza y validación (funciones puras, con pruebas en tests/contenido.test.js) ---------- */

function limpiar_(v, max) {
  return String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function urlHttps_(v) {
  var s = String(v || '').trim();
  return /^https:\/\/[^\s<>"'\\]{4,400}$/.test(s) ? s : '';
}
function ytUrl_(v) {
  var s = String(v || '').trim();
  var m = /^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})(?:[?&#]\S*)?$/.exec(s);
  return m ? 'https://www.youtube.com/watch?v=' + m[1] : '';
}
function instagram_(v) {
  var s = String(v || '').trim();
  var m = /^(?:https:\/\/(?:www\.)?instagram\.com\/)?@?([\w.]{1,30})\/?(?:\?\S*)?$/.exec(s);
  return m ? 'https://instagram.com/' + m[1] : '';
}

/** Hasta 3 redes elegidas por la banda: [{r:'TikTok', u:'https://…'}]. Devuelve {lista, error}. */
function redesHonor_(v) {
  var arr = v;
  if (typeof v === 'string') { try { arr = JSON.parse(v || '[]'); } catch (e) { return { lista: [], error: 'Revisa las redes sociales.' }; } }
  if (!Array.isArray(arr)) return { lista: [], error: '' };
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var x = arr[i] || {}, r = String(x.r || ''), u = String(x.u || '').trim();
    if (!u) continue;
    if (out.length >= 3) return { lista: [], error: 'Puedes agregar hasta 3 redes.' };
    if (REDES_HONOR.indexOf(r) < 0) return { lista: [], error: 'Red social no válida.' };
    var url = r === 'Instagram' ? instagram_(u) : r === 'YouTube' ? urlHttps_(u) : urlHttps_(u);
    if (!url) return { lista: [], error: 'El enlace de ' + r + ' no es válido (debe empezar con https://' + (r === 'Instagram' ? ' o ser @usuario' : '') + ').' };
    out.push({ r: r, u: url });
  }
  return { lista: out, error: '' };
}

/** Tope de envíos por hora para un tipo de formulario (protege la hoja de spam). Devuelve true si se excedió. */
function limiteGlobal_(clave, max) {
  var cache = CacheService.getScriptCache(), k = 'lim_' + clave;
  var n = Number(cache.get(k) || 0) + 1;
  cache.put(k, String(n), 3600);
  return n > max;
}

function clienteExiste_(tel) {
  var sh = abrirBd_().getSheetByName(HOJAS.clientes);
  if (sh.getLastRow() < 2) return false;
  var h = sh.createTextFinder(tel).matchEntireCell(true).findNext();
  return !!h && h.getColumn() === 1;
}

function filaPorTexto_(sh, texto, columna) {
  if (sh.getLastRow() < 2) return 0;
  var h = sh.createTextFinder(String(texto)).matchEntireCell(true).findNext();
  return h && h.getColumn() === columna ? h.getRow() : 0;
}

/* ---------- envíos del público ---------- */

function registrarHonor_(sol) {
  if (sol.web) return { ok: false, codigo: 'DATOS', error: 'Solicitud no válida.' };
  if (limiteGlobal_('honor', 20)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Intenta más tarde.' };
  var banda = limpiar_(sol.banda, 60), tel = Reglas.normalizarTelefono(sol.telefono), correo = limpiar_(sol.correo, 120).toLowerCase();
  var logo = String(sol.logo || '').trim() ? urlHttps_(sol.logo) : '', enlace = String(sol.enlace || '').trim() ? urlHttps_(sol.enlace) : '';
  var yt = String(sol.youtube || '').trim() ? ytUrl_(sol.youtube) : '', ig = String(sol.instagram || '').trim() ? instagram_(sol.instagram) : '';
  var resena = limpiar_(sol.resena, 500), genero = limpiar_(sol.genero, 60), formacion = limpiar_(sol.formacion, 120);
  var rd = redesHonor_(sol.redes), ultimo = String(sol.ultimo || '').trim() ? urlHttps_(sol.ultimo) : '';
  var e = null;
  if (banda.length < 2) e = 'Escribe el nombre de tu banda o proyecto.';
  else if (!Reglas.telefonoValido(tel)) e = 'Revisa tu teléfono.';
  else if (!Reglas.correoValido(correo)) e = 'Revisa tu correo.';
  else if (String(sol.logo || '').trim() && !logo) e = 'El logo debe ser un enlace que empiece con https://';
  else if (String(sol.enlace || '').trim() && !enlace) e = 'El enlace debe empezar con https://';
  else if (String(sol.youtube || '').trim() && !yt) e = 'El enlace de YouTube no es válido.';
  else if (String(sol.instagram || '').trim() && !ig) e = 'El Instagram no es válido (usa @usuario o el enlace).';
  else if (rd.error) e = rd.error;
  else if (String(sol.ultimo || '').trim() && !ultimo) e = 'El enlace de tu último trabajo debe empezar con https://';
  else if (resena.length < 10) e = 'Cuéntanos algo de tu banda (mínimo 10 caracteres).';
  if (e) return { ok: false, codigo: 'DATOS', error: e };
  if (String(sol.logoB64 || '').trim()) {
    try { logo = guardarLogo_(sol.logoB64, banda); } catch (er) { return { ok: false, codigo: 'DATOS', error: String(er.message || er) }; }
  }

  var res = null;
  conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.honor), n = sh.getLastRow();
    if (n > 1) {
      var hay = sh.getRange(2, 1, n - 1, 4).getValues().some(function (r) { return String(r[1]) === 'PENDIENTE' && String(r[3]) === tel; });
      if (hay) { res = { ok: false, codigo: 'DUPLICADA', error: 'Ya tienes una solicitud en revisión.' }; return; }
    }
    sh.appendRow([new Date(), 'PENDIENTE', textoSeguro_(banda), tel, textoSeguro_(correo), logo, ig, enlace, yt, textoSeguro_(resena), textoSeguro_(genero), textoSeguro_(formacion), rd.lista.length ? JSON.stringify(rd.lista) : '', ultimo]);
    res = { ok: true, mensaje: '¡Gracias! Revisaremos tu información y la publicaremos pronto.' };
  });
  if (res.ok) avisarAdmin_('Nueva solicitud para el cuadro de honor: ' + banda, 'Banda: ' + banda + '\nTeléfono: +' + tel + '\n\nApruébala en el portal de administración.');
  return res;
}

function registrarResena_(sol) {
  if (sol.web) return { ok: false, codigo: 'DATOS', error: 'Solicitud no válida.' };
  if (limiteGlobal_('resena', 30)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Intenta más tarde.' };
  var codigo = limpiar_(sol.codigo, 20).toUpperCase(), tel = Reglas.normalizarTelefono(sol.telefono);
  var nombre = limpiar_(sol.nombre, 40), estrellas = Number(sol.estrellas), comentario = limpiar_(sol.comentario, 400);
  if (!/^(RP|PL)-\d{3,8}(-\d)?$/.test(codigo)) return { ok: false, codigo: 'DATOS', error: 'Revisa el código de tu reserva (ejemplo: RP-1001).' };
  if (!(estrellas >= 1 && estrellas <= 5 && estrellas === Math.floor(estrellas))) return { ok: false, codigo: 'DATOS', error: 'Elige de 1 a 5 estrellas.' };
  if (nombre.length < 2) return { ok: false, codigo: 'DATOS', error: 'Escribe tu nombre.' };
  var ss = abrirBd_(), shR = ss.getSheetByName(HOJAS.reservas), f = filaPorTexto_(shR, codigo, RES.codigo);
  var fila = f ? shR.getRange(f, 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0] : null;
  var estado = fila ? estadoNorm_(fila[RES.estado - 1]) : '';
  if (!fila || String(fila[RES.telefono - 1]) !== tel || estado !== EST.FINALIZADA) {
    return { ok: false, codigo: 'NO_RESERVA', error: 'No encontramos una reserva finalizada con ese código y teléfono.' };
  }
  var res = null;
  conBloqueo_(function () {
    var sh = ss.getSheetByName(HOJAS.resenas);
    if (filaPorTexto_(sh, codigo, 3)) { res = { ok: false, codigo: 'DUPLICADA', error: 'Esa reserva ya tiene una reseña. ¡Gracias!' }; return; }
    sh.appendRow([new Date(), 'PENDIENTE', codigo, textoSeguro_(String(fila[RES.banda - 1])), textoSeguro_(nombre), tel, estrellas, textoSeguro_(comentario)]);
    res = { ok: true, mensaje: '¡Gracias por tu opinión! La publicaremos una vez revisada.' };
  });
  if (res.ok) avisarAdmin_('Nueva reseña (' + estrellas + ' estrellas)', 'Reserva ' + codigo + '\n' + comentario + '\n\nApruébala en el portal de administración.');
  return res;
}

function registrarCotizacion_(sol) {
  if (sol.web) return { ok: false, codigo: 'DATOS', error: 'Solicitud no válida.' };
  if (limiteGlobal_('cotizacion', 30)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Escríbenos por WhatsApp.' };
  var tipo = TIPOS_SOL[sol.tipo] ? sol.tipo : '', nombre = limpiar_(sol.nombre, 60), tel = Reglas.normalizarTelefono(sol.telefono);
  var correo = limpiar_(sol.correo, 120).toLowerCase(), mensaje = limpiar_(sol.mensaje, 600);
  var e = null;
  if (!tipo) e = 'Elige qué quieres cotizar.';
  else if (nombre.length < 2) e = 'Escribe tu nombre.';
  else if (!Reglas.telefonoValido(tel)) e = 'Revisa tu teléfono.';
  else if (!Reglas.correoValido(correo)) e = 'Revisa tu correo.';
  else if (mensaje.length < 5) e = 'Cuéntanos brevemente lo que necesitas.';
  if (e) return { ok: false, codigo: 'DATOS', error: e };
  conBloqueo_(function () {
    abrirBd_().getSheetByName(HOJAS.solicitudes).appendRow([new Date(), 'NUEVA', TIPOS_SOL[tipo], textoSeguro_(nombre), tel, textoSeguro_(correo), textoSeguro_(mensaje), '', '']);
  });
  avisarAdmin_('Nueva cotización: ' + TIPOS_SOL[tipo], nombre + ' · +' + tel + '\n' + mensaje + '\n\nResponde desde el portal de administración.');
  return { ok: true, mensaje: '¡Recibido! Te responderemos con tu cotización por WhatsApp o correo.' };
}

function avisarAdmin_(asunto, cuerpo, boton) {
  try {
    var cfg = getCfg_(), a = cfg.correoAdmin;
    if (!a) return;
    var partes = String(cuerpo || '').split(/\n{2,}/).map(function (x) { return x.trim(); }).filter(String);
    var o = { preheader: asunto, titulo: String(asunto).replace(/^[^\wÁÉÍÓÚÜÑáéíóúüñ¿¡]+/, '').slice(0, 90), parrafos: partes };
    if (boton && urlSegura_(boton.url)) o.boton = boton;
    enviarCorreo_(cfg, a, asunto, o);
  } catch (err) { console.error('Aviso al administrador: ' + err); }
}

/* ---------- lectura pública (solo lo aprobado) ---------- */

function contenidoPublico_() {
  var cache = CacheService.getScriptCache(), c = cache.get('contenido');
  if (c) return JSON.parse(c);
  var ss = abrirBd_(), out = { muestras: [], honor: [], resenas: [], promedio: 0, totalResenas: 0 };

  var grupos = {}, sm = ss.getSheetByName(HOJAS.muestras);
  if (sm.getLastRow() > 1) {
    sm.getRange(2, 1, sm.getLastRow() - 1, 6).getValues().forEach(function (r) {
      if (!Reglas.aBool(r[5], false) || !r[0] || !r[3]) return;
      var k = r[1] + '|' + r[0];
      if (!grupos[k]) { grupos[k] = { grupo: String(r[0]), tipo: String(r[1] || 'Otro'), descripcion: '', items: [] }; out.muestras.push(grupos[k]); }
      if (r[4] && !grupos[k].descripcion) grupos[k].descripcion = String(r[4]);
      grupos[k].items.push({ etiqueta: String(r[2] || ''), enlace: String(r[3]) });
    });
  }
  var sh = ss.getSheetByName(HOJAS.honor);
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues().forEach(function (r) {
      if (String(r[1]) !== 'APROBADA') return;
      var rd = []; try { rd = JSON.parse(String(r[12] || '[]')); } catch (e) { rd = []; }
      out.honor.push({ banda: String(r[2]), logo: String(r[5]), instagram: String(r[6]), enlace: String(r[7]), youtube: String(r[8]), resena: String(r[9]), genero: String(r[10] || ''), formacion: String(r[11] || ''), redes: rd, ultimo: String(r[13] || '') });
    });
  }
  var sr = ss.getSheetByName(HOJAS.resenas), suma = 0;
  if (sr.getLastRow() > 1) {
    sr.getRange(2, 1, sr.getLastRow() - 1, 8).getValues().forEach(function (r) {
      if (String(r[1]) !== 'APROBADA') return;
      suma += Number(r[6]); out.totalResenas++;
      out.resenas.push({ banda: String(r[3]), nombre: String(r[4]), estrellas: Number(r[6]), comentario: String(r[7] || '') });
    });
  }
  out.resenas.reverse();
  out.resenas = out.resenas.slice(0, 30);
  out.promedio = out.totalResenas ? Math.round(suma / out.totalResenas * 10) / 10 : 0;
  try { cache.put('contenido', JSON.stringify(out), 120); } catch (e) { /* sin caché */ }
  return out;
}

/* ---------- panel de administración ---------- */

function limpiarCacheContenido_() { CacheService.getScriptCache().remove('contenido'); }

function leerModeracion_(nombreHoja, ncols, mapa) {
  var sh = abrirBd_().getSheetByName(nombreHoja), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, ncols).getValues().forEach(function (r, i) { var o = mapa(r); o.fila = i + 2; out.push(o); });
  return out.reverse();
}

function leerHonor_() {
  return leerModeracion_(HOJAS.honor, 14, function (r) {
    return { estado: String(r[1]), banda: String(r[2]), telefono: String(r[3]), correo: String(r[4]), logo: String(r[5]), instagram: String(r[6]), enlace: String(r[7]), youtube: String(r[8]), resena: String(r[9]), genero: String(r[10] || ''), formacion: String(r[11] || ''), redes: String(r[12] || ''), ultimo: String(r[13] || '') };
  });
}
function leerResenas_() {
  return leerModeracion_(HOJAS.resenas, 8, function (r) {
    return { estado: String(r[1]), codigo: String(r[2]), banda: String(r[3]), nombre: String(r[4]), estrellas: Number(r[6]), comentario: String(r[7] || '') };
  });
}
function leerSolicitudes_() {
  var cfg = getCfg_();
  return leerModeracion_(HOJAS.solicitudes, 9, function (r) {
    var o = { estado: String(r[1]), tipo: String(r[2]), nombre: String(r[3]), telefono: String(r[4]), correo: String(r[5]), mensaje: String(r[6]),
      monto: r[7] === '' ? '' : Reglas.aNumero(r[7], ''), detalle: String(r[8] || '') };
    o.texto = textoCotizacion_(cfg, o);
    return o;
  });
}
function leerMuestras_() {
  var sh = abrirBd_().getSheetByName(HOJAS.muestras), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 6).getValues().forEach(function (r, i) {
    if (r[0] === '' && r[3] === '') return;
    out.push({ fila: i + 2, grupo: String(r[0]), tipo: String(r[1]), etiqueta: String(r[2]), enlace: String(r[3]), descripcion: String(r[4] || ''), visible: Reglas.aBool(r[5], false) });
  });
  return out;
}

function textoCotizacion_(cfg, o) {
  var l = ['Hola ' + o.nombre + ', te enviamos tu cotización de ' + o.tipo.toLowerCase() + ' en ' + cfg.nombreNegocio + '.'];
  if (o.monto !== '') l.push('Valor: ' + Reglas.clp(o.monto));
  if (o.detalle) l.push(o.detalle);
  l.push('Si tienes dudas o quieres ajustar algo, escríbenos por aquí y lo vemos juntos. ¡Gracias por considerarnos! 🤘');
  return l.join('\n');
}

function correoCotizacion_(cfg, o) {
  var filas = [['Servicio', o.tipo]];
  if (o.monto !== '') filas.push(['Valor', Reglas.clp(o.monto)]);
  var wa = cfg.whatsapp ? 'https://wa.me/' + String(cfg.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola 🤘 vi mi cotización de ' + o.tipo.toLowerCase() + '.') : '';
  var c = { preheader: 'Tu cotización de ' + o.tipo.toLowerCase(), titulo: 'Tu cotización', saludo: 'Hola ' + o.nombre + ' 🤘',
    parrafos: ['Gracias por escribirnos. Aquí va la cotización de ' + o.tipo.toLowerCase() + ' que nos pediste.'], filas: filas,
    notas: ['Si tienes dudas o quieres ajustar algo, respóndenos este correo o escríbenos por WhatsApp y lo vemos juntos. ¡Gracias por considerarnos!'] };
  if (o.detalle) c.caja = o.detalle;
  if (wa) c.boton = { texto: 'Hablemos por WhatsApp', url: wa };
  return c;
}

function adminModerar(hoja, fila, estado) {
  exigirAdmin_();
  var nombre = hoja === 'honor' ? HOJAS.honor : hoja === 'resena' ? HOJAS.resenas : '';
  if (!nombre || ESTADOS_MOD.indexOf(estado) < 0) throw new Error('Datos no válidos.');
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(nombre);
    sh.getRange(filaProducto_(sh, fila), 2).setValue(estado);
    limpiarCacheContenido_();
    return adminResumen();
  });
}

function adminSolicitud(fila, estado, monto, detalle) {
  exigirAdmin_();
  if (ESTADOS_SOL.indexOf(estado) < 0) throw new Error('Estado no válido.');
  monto = String(monto === null || monto === undefined ? '' : monto).trim();
  if (monto !== '' && !(Number(monto) >= 0)) throw new Error('Monto inválido.');
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.solicitudes), f = filaProducto_(sh, fila);
    sh.getRange(f, 2).setValue(estado);
    sh.getRange(f, 8, 1, 2).setValues([[monto === '' ? '' : Number(monto), textoSeguro_(String(detalle || '').slice(0, 600))]]);
    return adminResumen();
  });
}

function adminCotizacionCorreo(fila) {
  exigirAdmin_();
  var sh = abrirBd_().getSheetByName(HOJAS.solicitudes), f = filaProducto_(sh, fila), cfg = getCfg_();
  var r = sh.getRange(f, 1, 1, 9).getValues()[0];
  var o = { nombre: String(r[3]), tipo: String(r[2]), monto: r[7] === '' ? '' : Reglas.aNumero(r[7], ''), detalle: String(r[8] || '') };
  if (o.monto === '') throw new Error('Escribe el monto antes de enviar la cotización.');
  if (!enviarCorreo_(cfg, String(r[5]), 'Cotización · ' + o.tipo + ' · ' + cfg.nombreNegocio, correoCotizacion_(cfg, o), { replyTo: cfg.correoAdmin || '' })) throw new Error('No se pudo enviar el correo. Revisa la dirección del cliente.');
  if (String(r[1]) === 'NUEVA') sh.getRange(f, 2).setValue('COTIZADA');
  return adminResumen();
}

/** p = {fila (vacío = nueva), grupo, tipo, etiqueta, enlace, descripcion, visible} */
function adminGuardarMuestra(p) {
  exigirAdmin_();
  var grupo = limpiar_(p.grupo, 80), enlace = String(p.enlace || '').trim();
  if (!grupo) throw new Error('Escribe el nombre del micrófono, canción o ensayo.');
  if (!/^https:\/\/\S{4,400}$/.test(enlace) && !/^audio\/[\w\-. \/]{1,150}$/.test(enlace)) throw new Error('El enlace debe empezar con https:// (Drive, YouTube o SoundCloud) o ser una ruta audio/archivo.mp3.');
  var tipo = TIPOS_MUESTRA.indexOf(p.tipo) >= 0 ? p.tipo : 'Otro';
  var fila = [textoSeguro_(grupo), tipo, textoSeguro_(limpiar_(p.etiqueta, 60)), enlace, textoSeguro_(limpiar_(p.descripcion, 300)), p.visible ? 'SI' : 'NO'];
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.muestras);
    if (p.fila) sh.getRange(filaProducto_(sh, p.fila), 1, 1, 6).setValues([fila]); else sh.appendRow(fila);
    limpiarCacheContenido_();
    return adminResumen();
  });
}

/** Comparador A/B/C: una canción en tres versiones. d = {titulo, descripcion, bruto, mezclada, master}. Reemplaza la canción si ya existía. */
function adminGuardarComparador(d) {
  exigirAdmin_();
  var titulo = limpiar_(d.titulo, 80);
  if (!titulo) throw new Error('Escribe el nombre de la canción.');
  var vers = [['En bruto', d.bruto], ['Mezclada', d.mezclada], ['Masterizada', d.master]];
  vers.forEach(function (v) {
    var e = String(v[1] || '').trim();
    if (!/^https:\/\/\S{4,400}$/.test(e) && !/^audio\/[\w\-. \/]{1,150}$/.test(e)) throw new Error('Falta el enlace de la versión «' + v[0] + '» (debe empezar con https://).');
  });
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.muestras), n = sh.getLastRow();
    for (var i = n; i >= 2; i--) { var r = sh.getRange(i, 1, 1, 2).getValues()[0]; if (String(r[1]) === 'Comparador' && String(r[0]) === titulo) sh.deleteRow(i); }
    vers.forEach(function (v) { sh.appendRow([textoSeguro_(titulo), 'Comparador', v[0], String(v[1]).trim(), textoSeguro_(limpiar_(d.descripcion, 300)), 'SI']); });
    limpiarCacheContenido_();
    return adminResumen();
  });
}

function adminEliminarComparador(titulo) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.muestras), n = sh.getLastRow();
    for (var i = n; i >= 2; i--) { var r = sh.getRange(i, 1, 1, 2).getValues()[0]; if (String(r[1]) === 'Comparador' && String(r[0]) === String(titulo)) sh.deleteRow(i); }
    limpiarCacheContenido_();
    return adminResumen();
  });
}

function adminEliminarMuestra(fila) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.muestras);
    sh.deleteRow(filaProducto_(sh, fila));
    limpiarCacheContenido_();
    return adminResumen();
  });
}

/** Guarda el reglamento (texto con varias líneas: ## título, - viñeta). Vacío = vuelve al texto por defecto. */
function adminGuardarReglamento(texto) {
  exigirAdmin_();
  var v = textoSeguro_(String(texto || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 6000));
  return conBloqueo_(function () { ponerConfig_({ reglamento: v }); return adminResumen(); });
}

function adminGuardarPresentacion(titulo, texto) {
  exigirAdmin_();
  var sh = abrirBd_().getSheetByName(HOJAS.config), n = sh.getLastRow();
  var claves = sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return String(r[0]); });
  [['presentacionTitulo', limpiar_(titulo, 80)], ['presentacion', String(texto || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 3000)]].forEach(function (par) {
    var i = claves.indexOf(par[0]), v = textoSeguro_(par[1]);
    if (i < 0) { sh.appendRow([par[0], v, '']); claves.push(par[0]); } else sh.getRange(i + 2, 2).setValue(v);
  });
  CacheService.getScriptCache().remove('cfgraw');
  return adminResumen();
}


/* ---------- archivos en Drive: logos de bandas y muestras de audio ---------- */
var CARPETA_LOGOS = 'Rockerío · Logos de bandas', CARPETA_AUDIOS = 'Rockerío · Muestras de audio';

function carpetaDrive_(nombre) {
  var it = DriveApp.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nombre);
}
/** Decodifica base64 (con o sin prefijo data:) y valida el tamaño máximo en bytes. */
function decodificar_(b64, maxBytes) {
  var t = String(b64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!t || !/^[A-Za-z0-9+\/]+={0,2}$/.test(t)) throw new Error('El archivo no es válido.');
  if (t.length * 0.75 > maxBytes) throw new Error('El archivo es demasiado grande (máximo ' + Math.round(maxBytes / 1024) + ' KB).');
  return Utilities.base64Decode(t);
}
/** Reconoce imagen por sus primeros bytes (no confía en la extensión ni en lo que diga el navegador). */
function tipoImagen_(b) {
  var a = [0, 1, 2, 3, 8, 9, 10, 11].map(function (i) { return (b[i] === undefined ? 0 : b[i]) & 255; });
  if (a[0] === 0x89 && a[1] === 0x50 && a[2] === 0x4E && a[3] === 0x47) return ['image/png', 'png'];
  if (a[0] === 0xFF && a[1] === 0xD8 && a[2] === 0xFF) return ['image/jpeg', 'jpg'];
  if (a[0] === 0x52 && a[1] === 0x49 && a[2] === 0x46 && a[3] === 0x46 && a[4] === 0x57 && a[5] === 0x45 && a[6] === 0x42 && a[7] === 0x50) return ['image/webp', 'webp'];
  return null;
}
function tipoAudio_(b) {
  var g = function (i) { return (b[i] === undefined ? 0 : b[i]) & 255; };
  if (g(0) === 0x49 && g(1) === 0x44 && g(2) === 0x33) return ['audio/mpeg', 'mp3'];
  if (g(0) === 0xFF && (g(1) & 0xE0) === 0xE0) return ['audio/mpeg', 'mp3'];
  if (g(0) === 0x52 && g(1) === 0x49 && g(2) === 0x46 && g(3) === 0x46 && g(8) === 0x57 && g(9) === 0x41 && g(10) === 0x56 && g(11) === 0x45) return ['audio/wav', 'wav'];
  if (g(0) === 0x4F && g(1) === 0x67 && g(2) === 0x67 && g(3) === 0x53) return ['audio/ogg', 'ogg'];
  if (g(4) === 0x66 && g(5) === 0x74 && g(6) === 0x79 && g(7) === 0x70) return ['audio/mp4', 'm4a'];
  return null;
}
function guardarPublico_(carpeta, nombre, tipo, bytes) {
  var f = carpeta.createFile(Utilities.newBlob(bytes, tipo, nombre));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getId();
}
/** Guarda el logo que sube una banda (máx. 400 KB, PNG/JPG/WebP) y devuelve su enlace público. */
function guardarLogo_(b64, banda) {
  var bytes = decodificar_(b64, 400 * 1024), t = tipoImagen_(bytes);
  if (!t) throw new Error('El logo debe ser una imagen PNG, JPG o WebP.');
  var id = guardarPublico_(carpetaDrive_(CARPETA_LOGOS), 'logo-' + String(banda).replace(/[^\w\- ]/g, '').slice(0, 30) + '-' + Date.now() + '.' + t[1], t[0], bytes);
  return 'https://lh3.googleusercontent.com/d/' + id;
}

/** Sube un audio (mp3, wav, m4a, ogg; hasta 12 MB) a tu Drive y lo agrega como muestra visible. */
function adminSubirAudio(p) {
  exigirAdmin_();
  var bytes = decodificar_(p.b64, 12 * 1024 * 1024), t = tipoAudio_(bytes);
  if (!t) throw new Error('El archivo debe ser un audio mp3, wav, m4a u ogg.');
  var id = guardarPublico_(carpetaDrive_(CARPETA_AUDIOS), limpiar_(p.grupo, 40).replace(/[^\w\- ]/g, '') + '-' + limpiar_(p.etiqueta, 20).replace(/[^\w\- ]/g, '') + '-' + Date.now() + '.' + t[1], t[0], bytes);
  return adminGuardarMuestra({ fila: null, grupo: p.grupo, tipo: p.tipo, etiqueta: p.etiqueta, descripcion: p.descripcion, enlace: 'https://drive.google.com/file/d/' + id + '/view', visible: true });
}

/** Sube un audio a Drive y devuelve solo su enlace (para armar el comparador). */
function adminSubirArchivoAudio(p) {
  exigirAdmin_();
  var bytes = decodificar_(p.b64, 12 * 1024 * 1024), t = tipoAudio_(bytes);
  if (!t) throw new Error('El archivo debe ser un audio mp3, wav, m4a u ogg.');
  var id = guardarPublico_(carpetaDrive_(CARPETA_AUDIOS), limpiar_(p.grupo, 40).replace(/[^\w\- ]/g, '') + '-' + limpiar_(p.etiqueta, 20).replace(/[^\w\- ]/g, '') + '-' + Date.now() + '.' + t[1], t[0], bytes);
  return 'https://drive.google.com/file/d/' + id + '/view';
}

/** Edita los datos de una banda del cuadro de honor (y opcionalmente cambia el logo). */
function adminEditarHonor(fila, d) {
  exigirAdmin_();
  var banda = limpiar_(d.banda, 60);
  if (banda.length < 2) throw new Error('Escribe el nombre de la banda.');
  var logo = String(d.logo || '').trim() ? urlHttps_(d.logo) : '', enlace = String(d.enlace || '').trim() ? urlHttps_(d.enlace) : '';
  var yt = String(d.youtube || '').trim() ? ytUrl_(d.youtube) : '', ig = String(d.instagram || '').trim() ? instagram_(d.instagram) : '';
  if (String(d.logo || '').trim() && !logo) throw new Error('El logo debe ser un enlace https://');
  if (String(d.enlace || '').trim() && !enlace) throw new Error('El enlace debe empezar con https://');
  if (String(d.youtube || '').trim() && !yt) throw new Error('El enlace de YouTube no es válido.');
  if (String(d.instagram || '').trim() && !ig) throw new Error('El Instagram no es válido.');
  if (String(d.logoB64 || '').trim()) logo = guardarLogo_(d.logoB64, banda);
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.honor), f = filaProducto_(sh, fila);
    sh.getRange(f, 3).setValue(textoSeguro_(banda));
    sh.getRange(f, 6, 1, 7).setValues([[logo, ig, enlace, yt, textoSeguro_(limpiar_(d.resena, 500)), textoSeguro_(limpiar_(d.genero, 60)), textoSeguro_(limpiar_(d.formacion, 120))]]);
    limpiarCacheContenido_();
    return adminResumen();
  });
}
/** Agrega una banda al cuadro de honor directamente (queda aprobada y visible). d = {banda, genero, formacion, telefono?, correo?, instagram, enlace, youtube, logo, resena, logoB64?}. */
function adminAgregarHonor(d) {
  exigirAdmin_();
  var banda = limpiar_(d.banda, 60);
  if (banda.length < 2) throw new Error('Escribe el nombre de la banda.');
  var logo = String(d.logo || '').trim() ? urlHttps_(d.logo) : '', enlace = String(d.enlace || '').trim() ? urlHttps_(d.enlace) : '';
  var yt = String(d.youtube || '').trim() ? ytUrl_(d.youtube) : '', ig = String(d.instagram || '').trim() ? instagram_(d.instagram) : '';
  if (String(d.logo || '').trim() && !logo) throw new Error('El logo debe ser un enlace https://');
  if (String(d.enlace || '').trim() && !enlace) throw new Error('El enlace debe empezar con https://');
  if (String(d.youtube || '').trim() && !yt) throw new Error('El enlace de YouTube no es válido.');
  if (String(d.instagram || '').trim() && !ig) throw new Error('El Instagram no es válido.');
  var rd = redesHonor_(d.redes); if (rd.error) throw new Error(rd.error);
  var ultimo = String(d.ultimo || '').trim() ? urlHttps_(d.ultimo) : ''; if (String(d.ultimo || '').trim() && !ultimo) throw new Error('El enlace del último trabajo debe empezar con https://');
  var tel = String(d.telefono || '').trim() ? Reglas.normalizarTelefono(d.telefono) : '';
  if (tel && !Reglas.telefonoValido(tel)) throw new Error('Revisa el teléfono.');
  var correo = limpiar_(d.correo, 120).toLowerCase();
  if (correo && !Reglas.correoValido(correo)) throw new Error('Revisa el correo.');
  if (String(d.logoB64 || '').trim()) logo = guardarLogo_(d.logoB64, banda);
  return conBloqueo_(function () {
    abrirBd_().getSheetByName(HOJAS.honor).appendRow([new Date(), 'APROBADA', textoSeguro_(banda), tel, textoSeguro_(correo), logo, ig, enlace, yt, textoSeguro_(limpiar_(d.resena, 500)), textoSeguro_(limpiar_(d.genero, 60)), textoSeguro_(limpiar_(d.formacion, 120)), rd.lista.length ? JSON.stringify(rd.lista) : '', ultimo]);
    limpiarCacheContenido_();
    return adminResumen();
  });
}
function adminEliminarHonor(fila) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.honor); sh.deleteRow(filaProducto_(sh, fila));
    limpiarCacheContenido_();
    return adminResumen();
  });
}

/* ===== Planes ===== */
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
  if (limiteGlobal_('reservar', 60)) return { ok: false, codigo: 'TASA', error: 'Hay muchas solicitudes ahora. Escríbenos por WhatsApp.' };
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
      (ses[pl] = ses[pl] || []).push({ codigo: String(r[RES.codigo - 1]), fecha: aFechaIso_(r[RES.fecha - 1]), inicio: horaCelda_(r[RES.inicio - 1]), fin: horaCelda_(r[RES.fin - 1]), estado: estadoNorm_(r[RES.estado - 1]) });
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

/* ===== Ventas ===== */
/**
 * Tienda de música, bebestibles y sus ventas; costos mensuales y cierre de mes.
 * Cada venta tiene 3 estados de pago: Venta efectivo, Venta transferencia, Entregado en sesión (pago pendiente).
 * Todo queda en la hoja «Ventas» (nunca se borra); el Balance y los resúmenes se calculan desde ahí.
 */

var PAGO = { EFECTIVO: 'Venta efectivo', TRANSFERENCIA: 'Venta transferencia', PENDIENTE: 'Entregado en sesión (pago pendiente)', ANULADA: 'Anulada' };
var PAGOS_VENTA = [PAGO.EFECTIVO, PAGO.TRANSFERENCIA, PAGO.PENDIENTE];
var COLS_VENTAS = 11;
var VT = { fecha: 1, producto: 2, cantidad: 3, precio: 4, total: 5, tipo: 6, pago: 7, vendedor: 8, nota: 9, cobro: 10, id: 11 };
var ETIQUETA_TIPO = { musica: 'Música', bebestible: 'Bebestibles' };

function pagoNorm_(v) {
  var s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
  var todos = PAGOS_VENTA.concat([PAGO.ANULADA]);
  for (var i = 0; i < todos.length; i++) if (todos[i].toLowerCase() === s) return todos[i];
  return '';
}

function tipoCatalogo_(t) { return t === 'bebestible' ? 'bebestible' : 'musica'; }
function hojaCatalogo_(tipo) { return abrirBd_().getSheetByName(tipoCatalogo_(tipo) === 'bebestible' ? HOJAS.bebestibles : HOJAS.tienda); }

function leerProductos_(tipo) {
  var sh = hojaCatalogo_(tipo), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 7).getValues().forEach(function (r, i) {
    if (!r[1]) return;
    out.push({
      fila: i + 2, categoria: String(r[0] || ''), nombre: String(r[1]), detalle: String(r[2] || ''),
      precio: r[3] === '' ? '' : Reglas.aNumero(r[3], ''), stock: r[4] === '' ? '' : Reglas.aNumero(r[4], ''),
      visible: Reglas.aBool(r[5], false), foto: String(r[6] || '')
    });
  });
  return out;
}

/* ---------- catálogo (administrador) ---------- */

var CARPETA_PRODUCTOS = 'Rockerío · Fotos de productos';
function guardarFotoProducto_(b64, nombre) {
  var bytes = decodificar_(b64, 500 * 1024), t = tipoImagen_(bytes);
  if (!t) throw new Error('La foto debe ser una imagen PNG, JPG o WebP.');
  var id = guardarPublico_(carpetaDrive_(CARPETA_PRODUCTOS), 'prod-' + String(nombre).replace(/[^\w\- ]/g, '').slice(0, 30) + '-' + Date.now() + '.' + t[1], t[0], bytes);
  return 'https://lh3.googleusercontent.com/d/' + id;
}

/** p = {tipo, fila (vacío = nuevo), categoria, nombre, detalle, precio, stock, visible}. Precio y stock vacíos son válidos. */
function adminGuardarProducto(p) {
  exigirAdmin_();
  var nombre = limpiar_(p.nombre, 100);
  if (!nombre) throw new Error('El producto necesita un nombre.');
  var precio = String(p.precio === null || p.precio === undefined ? '' : p.precio).trim();
  var stock = String(p.stock === null || p.stock === undefined ? '' : p.stock).trim();
  if (precio !== '' && !(Number(precio) >= 0)) throw new Error('Precio inválido.');
  if (stock !== '' && !(Number(stock) >= 0 && Number(stock) % 1 === 0)) throw new Error('El stock debe ser un número entero.');
  var foto = String(p.foto || '').trim();
  if (foto && !fotoValida_(foto)) throw new Error('La foto debe ser una ruta del sitio (assets/…jpg) o un enlace https.');
  if (p.fotoB64) foto = guardarFotoProducto_(p.fotoB64, nombre); // foto subida desde el portal: se guarda en tu Drive
  var fila = [
    textoSeguro_(limpiar_(p.categoria, 40) || 'Otros'), textoSeguro_(nombre), textoSeguro_(limpiar_(p.detalle, 150)),
    precio === '' ? '' : Number(precio), stock === '' ? '' : Number(stock), p.visible ? 'SI' : 'NO', foto
  ];
  return conBloqueo_(function () {
    var sh = hojaCatalogo_(p.tipo);
    if (p.fila) sh.getRange(filaProducto_(sh, p.fila), 1, 1, 7).setValues([fila]); else sh.appendRow(fila);
    return adminResumen();
  });
}

/** Agrega al catálogo los productos base que falten (por nombre) y les pone foto si no tenían. No toca precios ni stock existentes. */
function adminCargarBase(tipo) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var base = tipoCatalogo_(tipo) === 'bebestible' ? BASE_BEBESTIBLES : BASE_TIENDA, sh = hojaCatalogo_(tipo), n = sh.getLastRow();
    var datos = n > 1 ? sh.getRange(2, 1, n - 1, 7).getValues() : [];
    base.forEach(function (b) {
      var i = -1;
      datos.forEach(function (r, k) { if (String(r[1]).toLowerCase() === b[1].toLowerCase() && String(r[2]).toLowerCase() === b[2].toLowerCase()) i = k; });
      if (i < 0) { sh.appendRow(b); datos.push(b.slice()); }
      else if (!datos[i][6]) sh.getRange(i + 2, 7).setValue(b[6]);
    });
    return adminResumen();
  });
}

function adminEliminarProducto(fila, tipo) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = hojaCatalogo_(tipo);
    sh.deleteRow(filaProducto_(sh, fila));
    return adminResumen();
  });
}

function adminReponer(fila, cantidad, tipo) {
  exigirAdmin_();
  cantidad = Number(cantidad);
  if (!(cantidad >= 1 && cantidad % 1 === 0)) throw new Error('Cantidad inválida.');
  return conBloqueo_(function () {
    var sh = hojaCatalogo_(tipo), f = filaProducto_(sh, fila), actual = sh.getRange(f, 5).getValue();
    sh.getRange(f, 5).setValue((actual === '' ? 0 : Number(actual)) + cantidad);
    return adminResumen();
  });
}

/* ---------- ventas ---------- */

function siguienteIdVenta_() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('CONTADOR_V') || 0) + 1;
  props.setProperty('CONTADOR_V', String(n));
  return 'V-' + (1000 + n);
}

/** Registra una venta: descuenta stock (si el producto lo lleva) y la anota. Debe llamarse dentro de conBloqueo_. */
/** Fecha de la venta: vacía = ahora. Con fecha (AAAA-MM-DD, no futura) se registra en esa fecha, para cargar el historial. */
function fechaVenta_(fecha) {
  if (!fecha) return new Date();
  fecha = String(fecha);
  if (!Reglas.fechaValida(fecha)) throw new Error('La fecha de la venta no es válida.');
  if (fecha > ahoraChile_().fecha) throw new Error('La fecha de la venta no puede ser futura.');
  return fechaHora_(fecha, 12);
}

function registrarVenta_(tipo, fila, cantidad, pago, vendedor, nota, fecha) {
  var fv = fechaVenta_(fecha);
  pago = pagoNorm_(pago);
  if (PAGOS_VENTA.indexOf(pago) < 0) throw new Error('Elige cómo se pagó: efectivo, transferencia o pago pendiente.');
  cantidad = Number(cantidad);
  if (!(cantidad >= 1 && cantidad <= 99 && cantidad % 1 === 0)) throw new Error('Cantidad inválida.');
  var sh = hojaCatalogo_(tipo), f = filaProducto_(sh, fila), r = sh.getRange(f, 1, 1, 6).getValues()[0];
  var precio = Reglas.aNumero(r[3], null);
  if (!r[1] || precio === null) throw new Error('Este producto no tiene precio. Defínelo antes de vender.');
  if (r[4] !== '') {
    var stock = Number(r[4]);
    if (stock < cantidad) throw new Error('Stock insuficiente: quedan ' + stock + '.');
    sh.getRange(f, 5).setValue(stock - cantidad);
  }
  var id = siguienteIdVenta_();
  abrirBd_().getSheetByName(HOJAS.ventas).appendRow([fv, textoSeguro_(String(r[1])), cantidad, precio, precio * cantidad,
    ETIQUETA_TIPO[tipoCatalogo_(tipo)], pago, textoSeguro_(limpiar_(vendedor, 40)), textoSeguro_(limpiar_(nota, 120)), '', id]);
  return id;
}

/** Registra un carrito completo (varios productos) con una sola forma de pago. Valida todo antes de descontar nada.
 *  items = [{fila, cantidad}]. Debe llamarse dentro de conBloqueo_. Devuelve los ids de venta. */
function registrarCarrito_(tipo, items, pago, vendedor, nota, fecha) {
  fechaVenta_(fecha);
  if (!items || !items.length) throw new Error('El carrito está vacío.');
  if (items.length > 40) throw new Error('Demasiados productos en una venta.');
  pago = pagoNorm_(pago);
  if (PAGOS_VENTA.indexOf(pago) < 0) throw new Error('Elige cómo se pagó: efectivo, transferencia o entregado en sala.');
  var sh = hojaCatalogo_(tipo), juntos = {};
  items.forEach(function (it) { var f = Number(it.fila); juntos[f] = (juntos[f] || 0) + Number(it.cantidad); });
  Object.keys(juntos).forEach(function (k) {
    var f = filaProducto_(sh, Number(k)), r = sh.getRange(f, 1, 1, 6).getValues()[0], c = juntos[k];
    if (!(c >= 1 && c <= 99 && c % 1 === 0)) throw new Error('Cantidad inválida.');
    if (!r[1] || Reglas.aNumero(r[3], null) === null) throw new Error('«' + r[1] + '» no tiene precio.');
    if (r[4] !== '' && Number(r[4]) < c) throw new Error('Stock insuficiente de «' + r[1] + '»: quedan ' + r[4] + '.');
  });
  return Object.keys(juntos).map(function (k) { return registrarVenta_(tipo, Number(k), juntos[k], pago, vendedor, nota, fecha); });
}

/** Cambia una venta «pendiente» a efectivo o transferencia. Debe llamarse dentro de conBloqueo_. */
function cobrarVenta_(id, pago, quien) {
  pago = pagoNorm_(pago);
  if (pago !== PAGO.EFECTIVO && pago !== PAGO.TRANSFERENCIA) throw new Error('Elige si se cobró en efectivo o por transferencia.');
  var sh = abrirBd_().getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
  if (!f) throw new Error('Venta no encontrada.');
  if (pagoNorm_(sh.getRange(f, VT.pago).getValue()) !== PAGO.PENDIENTE) throw new Error('Esa venta no estaba pendiente de pago.');
  var nota = String(sh.getRange(f, VT.nota).getValue() || '');
  sh.getRange(f, VT.pago).setValue(pago);
  sh.getRange(f, VT.cobro).setValue(new Date());
  sh.getRange(f, VT.nota).setValue(textoSeguro_(limpiar_((nota ? nota + ' · ' : '') + 'cobrado por ' + quien, 200)));
}

function leerVentas_() {
  var sh = abrirBd_().getSheetByName(HOJAS.ventas), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, COLS_VENTAS).getValues().forEach(function (r) {
    if (!r[VT.id - 1]) return;
    out.push({
      id: String(r[VT.id - 1]), fecha: aFechaIso_(r[VT.fecha - 1]), producto: String(r[VT.producto - 1]), cantidad: Number(r[VT.cantidad - 1]) || 0,
      precio: Number(r[VT.precio - 1]) || 0, total: Number(r[VT.total - 1]) || 0, tipo: String(r[VT.tipo - 1]), pago: pagoNorm_(r[VT.pago - 1]),
      vendedor: String(r[VT.vendedor - 1] || ''), nota: String(r[VT.nota - 1] || ''), cobro: aFechaIso_(r[VT.cobro - 1])
    });
  });
  return out.reverse(); // las más recientes primero
}

/**
 * Resumen de un mes (AAAA-MM). Función pura, con pruebas.
 * Lo cobrado cuenta en el mes en que se cobró (la fecha de cobro, o la de la venta si se pagó al momento).
 * Lo pendiente cuenta en el mes de la venta, y también se informa el total pendiente de todos los meses.
 */
function resumirVentas_(ventas, mes) {
  var r = { mes: mes, cobrado: 0, efectivo: 0, transferencia: 0, porCobrar: 0, pendienteTotal: 0, porTipo: {}, porVendedor: {}, meses: [] };
  var vistos = {};
  function suma(mapa, clave, campo, monto) { mapa[clave] = mapa[clave] || { cobrado: 0, porCobrar: 0 }; mapa[clave][campo] += monto; }
  ventas.forEach(function (v) {
    if (v.pago === PAGO.ANULADA) return;
    var m = (v.cobro || v.fecha).slice(0, 7);
    vistos[v.fecha.slice(0, 7)] = true; vistos[m] = true;
    if (v.pago === PAGO.PENDIENTE) {
      r.pendienteTotal += v.total;
      if (v.fecha.slice(0, 7) === mes) { r.porCobrar += v.total; suma(r.porTipo, v.tipo, 'porCobrar', v.total); suma(r.porVendedor, v.vendedor || '—', 'porCobrar', v.total); }
    } else if (m === mes) {
      r.cobrado += v.total;
      if (v.pago === PAGO.EFECTIVO) r.efectivo += v.total; else r.transferencia += v.total;
      suma(r.porTipo, v.tipo, 'cobrado', v.total); suma(r.porVendedor, v.vendedor || '—', 'cobrado', v.total);
    }
  });
  r.meses = Object.keys(vistos).sort().reverse();
  return r;
}

function mesActual_() { return ahoraChile_().fecha.slice(0, 7); }
function mesValido_(m) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || '')); }

/** Datos de ventas para mostrar: resumen del mes + historial de ese mes + todas las pendientes. */
function datosVentas_(mes) {
  mes = mesValido_(mes) ? mes : mesActual_();
  var todas = leerVentas_(), resumen = resumirVentas_(todas, mes);
  if (resumen.meses.indexOf(mes) < 0) resumen.meses.unshift(mes);
  return {
    resumen: resumen,
    ventas: todas.filter(function (v) { return (v.cobro || v.fecha).slice(0, 7) === mes || v.fecha.slice(0, 7) === mes; }).slice(0, 300),
    pendientes: todas.filter(function (v) { return v.pago === PAGO.PENDIENTE; })
  };
}

/* ---------- administrador: ventas ---------- */

function adminVender(tipo, fila, cantidad, pago, nota, fecha) {
  exigirAdmin_();
  return conBloqueo_(function () { registrarVenta_(tipo, fila, cantidad, pago, 'Administración', nota || '', fecha); return adminResumen(); });
}
/** Venta por carrito desde el portal: items = [{fila, cantidad}], pago = una de PAGOS_VENTA. */
function adminVenderCarrito(tipo, items, pago, nota, fecha) {
  exigirAdmin_();
  return conBloqueo_(function () { var ids = registrarCarrito_(tipo, items, pago, 'Administración', nota || '', fecha); var r = adminResumen(); r.idsVenta = ids; return r; });
}
function adminCobrar(id, pago) {
  exigirAdmin_();
  return conBloqueo_(function () { cobrarVenta_(id, pago, 'Administración'); return adminResumen(); });
}
/** Anula una venta (queda en el historial como «Anulada») y devuelve las unidades al stock. */
function adminAnularVenta(id) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var ss = abrirBd_(), sh = ss.getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
    if (!f) throw new Error('Venta no encontrada.');
    var r = sh.getRange(f, 1, 1, COLS_VENTAS).getValues()[0];
    if (pagoNorm_(r[VT.pago - 1]) === PAGO.ANULADA) throw new Error('Esa venta ya estaba anulada.');
    var tipo = String(r[VT.tipo - 1]) === ETIQUETA_TIPO.bebestible ? 'bebestible' : 'musica';
    var cat = hojaCatalogo_(tipo), n = cat.getLastRow();
    if (n > 1) cat.getRange(2, 1, n - 1, 5).getValues().some(function (p, i) {
      if (String(p[1]) !== String(r[VT.producto - 1]) || p[4] === '') return false;
      cat.getRange(i + 2, 5).setValue(Number(p[4]) + Number(r[VT.cantidad - 1]));
      return true;
    });
    sh.getRange(f, VT.pago).setValue(PAGO.ANULADA);
    return adminResumen();
  });
}

/** Ajusta el stock de un producto (por nombre) sumando `delta` unidades. Si el producto no lleva stock, no hace nada. */
function ajustarStockPorNombre_(tipo, nombre, delta) {
  var cat = hojaCatalogo_(tipo), n = cat.getLastRow();
  if (n > 1) cat.getRange(2, 1, n - 1, 5).getValues().some(function (p, i) {
    if (String(p[1]) !== String(nombre) || p[4] === '') return false;
    var nuevo = Number(p[4]) + delta; if (nuevo < 0) throw new Error('Stock insuficiente para ese cambio: quedan ' + p[4] + '.');
    cat.getRange(i + 2, 5).setValue(nuevo); return true;
  });
}

/** Corrige una venta mal ingresada: cantidad, forma de pago y nota. Ajusta el stock y el total. d = {cantidad, pago, nota}. */
function adminEditarVenta(id, d) {
  exigirAdmin_();
  d = d || {};
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
    if (!f) throw new Error('Venta no encontrada.');
    var r = sh.getRange(f, 1, 1, COLS_VENTAS).getValues()[0], pagoAnt = pagoNorm_(r[VT.pago - 1]);
    if (pagoAnt === PAGO.ANULADA) throw new Error('Esa venta está anulada; no se puede editar.');
    var cant = Number(d.cantidad), pago = pagoNorm_(d.pago);
    if (!(cant >= 1 && cant <= 99 && cant % 1 === 0)) throw new Error('Cantidad inválida.');
    if (PAGOS_VENTA.indexOf(pago) < 0) throw new Error('Elige cómo se pagó.');
    var tipo = String(r[VT.tipo - 1]) === ETIQUETA_TIPO.bebestible ? 'bebestible' : 'musica';
    var dif = cant - Number(r[VT.cantidad - 1]);
    if (dif !== 0) ajustarStockPorNombre_(tipo, r[VT.producto - 1], -dif);
    sh.getRange(f, VT.cantidad).setValue(cant);
    sh.getRange(f, VT.total).setValue(cant * (Number(r[VT.precio - 1]) || 0));
    sh.getRange(f, VT.pago).setValue(pago);
    if (pagoAnt === PAGO.PENDIENTE && pago !== PAGO.PENDIENTE) sh.getRange(f, VT.cobro).setValue(new Date());
    if (pago === PAGO.PENDIENTE) sh.getRange(f, VT.cobro).setValue('');
    sh.getRange(f, VT.nota).setValue(textoSeguro_(limpiar_(d.nota, 200)));
    if (d.fecha) sh.getRange(f, VT.fecha).setValue(fechaVenta_(d.fecha));
    return adminResumen();
  });
}

/** Elimina del todo una venta (por ejemplo, una duplicada). Si no estaba anulada, devuelve las unidades al stock. */
function adminEliminarVenta(id) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.ventas), f = filaPorTexto_(sh, id, VT.id);
    if (!f) throw new Error('Venta no encontrada.');
    var r = sh.getRange(f, 1, 1, COLS_VENTAS).getValues()[0];
    if (pagoNorm_(r[VT.pago - 1]) !== PAGO.ANULADA) ajustarStockPorNombre_(String(r[VT.tipo - 1]) === ETIQUETA_TIPO.bebestible ? 'bebestible' : 'musica', r[VT.producto - 1], Number(r[VT.cantidad - 1]) || 0);
    sh.deleteRow(f);
    return adminResumen();
  });
}

/* ---------- costos mensuales (luz, caja chica…) ---------- */

function leerCostos_() {
  var sh = abrirBd_().getSheetByName(HOJAS.costos), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 7).getValues().forEach(function (r) {
    if (!r[0]) return;
    out.push({ luzFactura: String(r[6]) === 'SI', mes: String(r[0]), luz: Number(r[1]) || 0, aporte: r[2] === '' ? '' : Number(r[2]), caja: r[3] === '' ? '' : Number(r[3]), otros: Number(r[4]) || 0, notas: String(r[5] || '') });
  });
  return out.sort(function (a, b) { return a.mes < b.mes ? 1 : -1; }).slice(0, 24);
}

/** c = {mes AAAA-MM, luz (boleta total), aporte, caja, otros, notas}. Guarda o reemplaza el mes; los demás meses no se tocan. */
function adminGuardarCostos(c) {
  exigirAdmin_();
  if (!mesValido_(c.mes)) throw new Error('El mes debe ser AAAA-MM, por ejemplo 2026-11.');
  var num = function (v, def) { v = String(v === null || v === undefined ? '' : v).trim(); if (v === '') return def; if (!(Number(v) >= 0)) throw new Error('Los montos deben ser números.'); return Number(v); };
  var fila = [String(c.mes), num(c.luz, 0), num(c.aporte, 10000), num(c.caja, 20000), num(c.otros, 0), textoSeguro_(limpiar_(c.notas, 200)), c.luzFactura ? 'SI' : 'NO'];
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.costos), f = filaPorTexto_(sh, c.mes, 1);
    if (f) sh.getRange(f, 1, 1, 7).setValues([fila]); else sh.appendRow(fila);
    SpreadsheetApp.flush();
    return adminResumen();
  });
}

/* ---------- cierre de mes (historial del balance) ---------- */

var CELDAS_CIERRE = ['B24', 'B18', 'B21', 'B22', 'B23', 'B31', 'B36', 'B44', 'B45', 'B46'];
var CELDAS_CIERRE_TRIB = ['B15', 'B16', 'B17', 'B25', 'B26']; // IVA a pagar, remanente, PPM, utilidad tributaria, provisión 1ª categoría

/** Guarda una «foto» del Balance de un mes (AAAA-MM) en la hoja HistorialBalance. Reemplaza la del mismo mes. */
function cerrarMes_(mes) {
  if (!mesValido_(mes)) throw new Error('Mes inválido.');
  var ss = abrirBd_(), b = ss.getSheetByName(HOJAS.balance), celda = b.getRange('B1'), formula = celda.getFormula(), valor = celda.getValue();
  var fila;
  try {
    celda.setValue("'" + mes);
    SpreadsheetApp.flush();
    var t = ss.getSheetByName(HOJAS.tributario);
    fila = [mes, new Date()].concat(CELDAS_CIERRE.map(function (c) { return b.getRange(c).getValue(); }), CELDAS_CIERRE_TRIB.map(function (c) { return t.getRange(c).getValue(); }));
  } finally {
    if (formula) celda.setFormula(formula); else celda.setValue(valor);
    SpreadsheetApp.flush();
  }
  var h = ss.getSheetByName(HOJAS.historial), f = filaPorTexto_(h, mes, 1);
  if (f) h.getRange(f, 1, 1, fila.length).setValues([fila]); else h.appendRow(fila);
}

/** Disparador del día 1 de cada mes: guarda el balance del mes que terminó. */
function cerrarMesAnterior() {
  cerrarMes_(Reglas.sumarDias(ahoraChile_().fecha.slice(0, 8) + '01', -1).slice(0, 7));
}

function leerHistorial_() {
  var sh = abrirBd_().getSheetByName(HOJAS.historial), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 17).getValues().forEach(function (r) {
    if (r[0]) out.push({ ivaPagar: Number(r[12]) || 0, remanente: Number(r[13]) || 0, ppm: Number(r[14]) || 0, utilidad: Number(r[15]) || 0, provision: Number(r[16]) || 0, mes: String(r[0]), brutos: Number(r[2]) || 0, sala: Number(r[3]) || 0, estudio: Number(r[4]) || 0, bruto: Number(r[5]) || 0, tienda: Number(r[6]) || 0, jc: Number(r[9]) || 0, jaime: Number(r[10]) || 0, est: Number(r[11]) || 0 });
  });
  return out.sort(function (a, b) { return a.mes < b.mes ? 1 : -1; }).slice(0, 24);
}

function adminCerrarMes(mes) {
  exigirAdmin_();
  return conBloqueo_(function () { cerrarMes_(mes); return adminResumen(); });
}

/* ===== Socios ===== */
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

/* ===== Contabilidad ===== */
/**
 * Contabilidad formal (simulación mensual para Chile): IVA (Formulario 29), PPM, Impuesto de Primera Categoría,
 * registro de compras y reserva de impuestos. Se enciende con el interruptor «contabilidadFormal» (portal > Sitio).
 * Es una ayuda informativa: no reemplaza la declaración ante el SII ni a un contador.
 */

var TRIB = { ventasBrutas: 9, ventasNetas: 10, ivaDebito: 11, ivaCredito: 12, ivaCreditoLuz: 13, remanenteAnt: 14, ivaPagar: 15, remanente: 16, ppm: 17, totalF29: 19,
  ingresosNetos: 22, gastoLuz: 23, gastoCompras: 24, utilidad: 25, idpc: 26, atribuida: 27, ppmCuenta: 28, provisionAbril: 29, reserva: 32, reservaPct: 33 };

function prepararTributario_(ss) {
  var sh = hoja_(ss, HOJAS.tributario);
  // Encabezados nuevos en hojas de versiones anteriores
  var c = ss.getSheetByName(HOJAS.costos); if (c) c.getRange('G1').setValue('Luz con factura a nombre del negocio (SI/NO)').setFontWeight('bold');
  var h = ss.getSheetByName(HOJAS.historial); if (h) h.getRange('M1:Q1').setValues([['IVA a pagar', 'Remanente de IVA', 'PPM', 'Utilidad tributaria', 'Provisión impuesto 1ª categoría']]).setFontWeight('bold');
  if (sh.getLastRow() > 0) return;
  var cfg = function (k, def) { return 'IFERROR(INDEX(Configuracion!$B:$B,MATCH("' + k + '",Configuracion!$A:$A,0)),"' + def + '")'; };
  var mes = 'Balance!$B$2&"-01"';
  var enMes = function (col) { return col + ',">="&DATEVALUE(' + mes + '),' + col + ',"<"&EDATE(DATEVALUE(' + mes + '),1)'; };
  var luzFact = 'IFERROR(INDEX(CostosMes!$G:$G,MATCH(Balance!$B$2,CostosMes!$A:$A,0)),"NO")="SI"';
  var prev = 'YEAR(EDATE(DATEVALUE(' + mes + '),-1))&"-"&TEXT(MONTH(EDATE(DATEVALUE(' + mes + '),-1)),"00")';
  var on = '$B$1="SI"';
  var filas = [
    /* 1 */ ['Contabilidad formal', '=IF(' + cfg('contabilidadFormal', 'NO') + '="SI","SI","NO")', 'Se enciende en el portal (Sitio > Contabilidad formal). Apagada = todo en 0.'],
    /* 2 */ ['Mes', '=Balance!$B$2', 'Es el mes elegido en la hoja Balance (celda B1)'],
    /* 3 */ ['Régimen', '=IF(' + cfg('regimen', '14D3') + '="14D8","14D8","14D3")', '14D3 = Pro Pyme general · 14D8 = Pro Pyme transparente'],
    /* 4 */ ['Tasa de IVA', 0.19, 'Tasa general de IVA'],
    /* 5 */ ['Tasa de PPM', 0.00125, 'Referencia 2026: 14D3 con rebaja Ley 21.755 = 0,125%; 14D8 = 0,2%. CONFIRMA con tu contador y el SII.'],
    /* 6 */ ['Tasa de Impuesto de Primera Categoría', 0.125, 'Pro Pyme 14D3: 12,5% (2025–2027), 15% (2028), 25% desde 2029 según la ley vigente. CONFIRMA.'],
    /* 7 */ ['', '', ''],
    /* 8 */ ['IVA · FORMULARIO 29', 'Monto', 'Cómo se calcula'],
    /* 9 */ ['Ventas brutas del mes (con IVA)', '=IF(' + on + ',Balance!$B$24,0)', 'Ingresos brutos de la hoja Balance (respeta qué ingresos incluiste)'],
    /* 10 */ ['Ventas netas', '=ROUND(B9/(1+$B$4),0)', 'Ventas brutas ÷ 1,19'],
    /* 11 */ ['IVA débito fiscal', '=B9-B10', 'IVA cobrado a tus clientes: es del Fisco, no tuyo'],
    /* 12 */ ['IVA crédito: compras con factura', '=IF(' + on + ',SUMIFS(Compras!$I:$I,Compras!$D:$D,"Factura",' + enMes('Compras!$A:$A') + '),0)', 'Hoja Compras, solo documentos tipo Factura'],
    /* 13 */ ['IVA crédito: luz (si hay factura)', '=IF(AND(' + on + ',' + luzFact + '),Balance!$B$31-ROUND(Balance!$B$31/(1+$B$4),0),0)', 'Solo si en CostosMes marcaste «luz con factura» = SI'],
    /* 14 */ ['Remanente de IVA del mes anterior', '=IF(' + on + ',IFERROR(INDEX(HistorialBalance!$N:$N,MATCH(' + prev + ',HistorialBalance!$A:$A,0)),0),0)', 'Se toma del mes anterior cerrado en HistorialBalance'],
    /* 15 */ ['IVA a pagar', '=MAX(0,B11-B12-B13-B14)', 'Débito − crédito − remanente'],
    /* 16 */ ['Remanente de IVA para el mes siguiente', '=MAX(0,B12+B13+B14-B11)', 'Si el crédito supera al débito'],
    /* 17 */ ['PPM (pago provisional mensual)', '=IF(' + on + ',ROUND(B10*$B$5,0),0)', 'Ventas netas × tasa PPM. Es un pago a cuenta del impuesto anual'],
    /* 18 */ ['', '', ''],
    /* 19 */ ['TOTAL A PAGAR EN EL F29', '=B15+B17', 'IVA a pagar + PPM'],
    /* 20 */ ['', '', ''],
    /* 21 */ ['RENTA · IMPUESTO DE PRIMERA CATEGORÍA', 'Monto', 'Cómo se calcula'],
    /* 22 */ ['Ingresos netos del mes', '=B10', 'Pro Pyme: ingresos percibidos'],
    /* 23 */ ['Gasto luz deducible', '=IF(AND(' + on + ',' + luzFact + '),ROUND(Balance!$B$31/(1+$B$4),0),0)', 'Solo con factura a nombre del negocio'],
    /* 24 */ ['Compras y gastos con documento', '=IF(' + on + ',SUMIFS(Compras!$H:$H,Compras!$D:$D,"Factura",' + enMes('Compras!$A:$A') + ')+SUMIFS(Compras!$J:$J,Compras!$D:$D,"Boleta",' + enMes('Compras!$A:$A') + '),0)', 'Factura: neto · Boleta: total · Sin documento: NO se deduce'],
    /* 25 */ ['Utilidad tributaria del mes', '=IF(' + on + ',B22-B23-B24,0)', 'Ingresos netos − gastos deducibles. Caja chica y «otros» sin documento no se deducen'],
    /* 26 */ ['Impuesto de Primera Categoría (provisión, 14D3)', '=IF(AND(' + on + ',B3="14D3"),MAX(0,ROUND(B25*$B$6,0)),0)', 'Utilidad × tasa. Se paga en abril (Operación Renta)'],
    /* 27 */ ['Renta atribuida a los dueños (14D8)', '=IF(AND(' + on + ',B3="14D8"),MAX(0,B25),0)', 'En 14D8 la empresa no paga: tributan los dueños en su Global Complementario'],
    /* 28 */ ['PPM del mes (crédito contra el impuesto anual)', '=B17', ''],
    /* 29 */ ['Provisión pendiente para abril', '=MAX(0,B26-B28)', 'Impuesto − PPM (aproximación mensual)'],
    /* 30 */ ['', '', ''],
    /* 31 */ ['RESERVA DE IMPUESTOS', 'Monto', ''],
    /* 32 */ ['Reserva a guardar este mes', '=B15+B26', 'IVA a pagar + provisión de Primera Categoría'],
    /* 33 */ ['Como % de las ventas brutas', '=IF(B9=0,0,B32/B9)', ''],
    /* 34 */ ['', '', ''],
    /* 35 */ ['REPARTO DESPUÉS DE IMPUESTOS (estimado)', 'Antes', 'Después'],
    /* 36 */ ['Juan Carlos', '=Balance!$B$44', '=IF(' + on + ',ROUND(B36*(1-$B$33),0),B36)'],
    /* 37 */ ['Jaime', '=Balance!$B$45', '=IF(' + on + ',ROUND(B37*(1-$B$33),0),B37)'],
    /* 38 */ ['Estudio', '=Balance!$B$46', '=IF(' + on + ',ROUND(B38*(1-$B$33),0),B38)'],
    /* 39 */ ['El impuesto se reparte en proporción a lo que recibe cada uno. El Impuesto Global Complementario de cada persona NO está calculado: depende de sus otras rentas.', '', ''],
    /* 40 */ ['', '', ''],
    /* 41 */ ['Simulación informativa. No reemplaza la declaración ante el SII ni la asesoría de un contador.', '', '']
  ];
  sh.getRange(1, 1, filas.length, 3).setValues(filas);
  sh.getRange('B4:B6').setNumberFormat('0.000%').setBackground('#fff2cc');
  sh.getRange('B4').setNumberFormat('0%');
  ['B9:B17', 'B19', 'B22:B29', 'B32', 'B36:C38'].forEach(function (r) { sh.getRange(r).setNumberFormat('$#,##0'); });
  sh.getRange('B33').setNumberFormat('0.0%');
  ['A8:C8', 'A19:B19', 'A21:C21', 'A31:C31', 'A35:C35'].forEach(function (r) { sh.getRange(r).setFontWeight('bold'); });
  sh.getRange('A39').setFontColor('#b91c1c').setWrap(true); sh.getRange('A41').setFontColor('#b91c1c').setWrap(true);
  sh.setColumnWidth(1, 360); sh.setColumnWidth(2, 140); sh.setColumnWidth(3, 460);
}

/* ---------- datos para el portal ---------- */

function leerTributario_() {
  var sh = abrirBd_().getSheetByName(HOJAS.tributario), v = sh.getRange(1, 1, 41, 3).getValues(), o = {};
  Object.keys(TRIB).forEach(function (k) { o[k] = Number(v[TRIB[k] - 1][1]) || 0; });
  o.formal = String(v[0][1]) === 'SI'; o.mes = String(v[1][1]); o.regimen = String(v[2][1]);
  o.tasas = { iva: Number(v[3][1]) || 0, ppm: Number(v[4][1]) || 0, idpc: Number(v[5][1]) || 0 };
  o.reparto = [35, 36, 37].map(function (i) { return { nombre: String(v[i][0]), antes: Number(v[i][1]) || 0, despues: Number(v[i][2]) || 0 }; });
  return o;
}

var TIPOS_DOC = ['Factura', 'Boleta', 'Sin documento'];

function leerCompras_() {
  var sh = abrirBd_().getSheetByName(HOJAS.compras), n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 10).getValues().forEach(function (r, i) {
    var f = aFechaIso_(r[0]);
    if (f) out.push({ fila: i + 2, fecha: f, proveedor: String(r[1]), rut: String(r[2]), tipo: String(r[3]), numero: String(r[4]), detalle: String(r[5]), categoria: String(r[6]), neto: Number(r[7]) || 0, iva: Number(r[8]) || 0, total: Number(r[9]) || 0 });
  });
  return out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }).slice(0, 60);
}

/** c = {fecha, proveedor, rut, tipo, numero, detalle, categoria, total}. Con factura se separa el IVA; sin factura no hay crédito. */
function adminGuardarCompra(c) {
  exigirAdmin_();
  var fecha = String(c.fecha || '');
  if (!Reglas.fechaValida(fecha)) throw new Error('La fecha de la compra no es válida.');
  var tipo = TIPOS_DOC.indexOf(c.tipo) >= 0 ? c.tipo : '';
  if (!tipo) throw new Error('Elige el tipo de documento: factura, boleta o sin documento.');
  var total = Number(c.total);
  if (!(total > 0) || total % 1 !== 0) throw new Error('El total pagado debe ser un monto entero mayor a 0.');
  var neto = tipo === 'Factura' ? Math.round(total / 1.19) : total, iva = total - neto;
  var rut = limpiar_(c.rut, 14);
  if (rut && !/^[0-9kK.\-]{7,12}$/.test(rut)) throw new Error('El RUT del proveedor no parece válido.');
  var fila = [fechaHora_(fecha, 0), textoSeguro_(limpiar_(c.proveedor, 80)), textoSeguro_(rut), tipo, textoSeguro_(limpiar_(c.numero, 20)),
    textoSeguro_(limpiar_(c.detalle, 120)), textoSeguro_(limpiar_(c.categoria, 40) || 'Otros'), neto, iva, total];
  return conBloqueo_(function () { abrirBd_().getSheetByName(HOJAS.compras).appendRow(fila); SpreadsheetApp.flush(); return adminResumen(); });
}

function adminEliminarCompra(fila) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.compras);
    fila = Number(fila);
    if (!(fila >= 2 && fila <= sh.getLastRow())) throw new Error('Compra no encontrada.');
    sh.deleteRow(fila);
    return adminResumen();
  });
}

/* ====================================================================
 *  EXCEPCIONES CONTABLES: cobro pendiente, medio de pago, cortesía y otros ingresos/gastos
 * ==================================================================== */

var MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta'];

function filaReserva_(codigo) {
  var sh = abrirBd_().getSheetByName(HOJAS.reservas);
  var celda = sh.getLastRow() > 1 ? sh.createTextFinder(String(codigo)).matchEntireCell(true).findNext() : null;
  if (!celda || celda.getColumn() !== RES.codigo) throw new Error('No se encontró la reserva.');
  return { sh: sh, f: celda.getRow(), r: sh.getRange(celda.getRow(), 1, 1, ENCABEZADO_RESERVAS.length).getValues()[0] };
}

/** d = {cobro: 'POR COBRAR' | 'PAGADO', medio: Efectivo|Transferencia|Tarjeta}. El saldo se asumía pagado; así queda registrado si no. */
function adminMarcarCobro(codigo, d) {
  exigirAdmin_();
  d = d || {};
  var porCobrar = d.cobro === 'POR COBRAR', medio = String(d.medio || '');
  if (medio && MEDIOS_PAGO.indexOf(medio) < 0) throw new Error('Medio de pago no válido.');
  return conBloqueo_(function () {
    var x = filaReserva_(codigo), est = estadoNorm_(x.r[RES.estado - 1]);
    if (est === EST.ANULADA || est === EST.NO_ASISTE) throw new Error('Esta reserva ya está cerrada: no tiene saldo que cobrar.');
    if (x.r[RES.cortesia - 1] === 'SI') throw new Error('Es una cortesía: no tiene cobro.');
    x.sh.getRange(x.f, RES.cobro, 1, 4 - 2).setValues([[porCobrar ? 'POR COBRAR' : '', porCobrar ? '' : medio]]);
    x.sh.getRange(x.f, RES.fechaPago).setValue(porCobrar ? '' : fechaHora_(ahoraChile_().fecha, 0));
    return adminResumen();
  });
}

/** Marca (o quita) una cortesía o canje: la reserva queda en $0, se ve en el resumen y no suma ingreso. d = {quitar, nota, finalizar}. */
function adminMarcarCortesia(codigo, d) {
  exigirAdmin_();
  d = d || {};
  return conBloqueo_(function () {
    var nota = textoSeguro_(limpiar_(d.nota, 150));
    if (d.quitar) {
      var q = ajustarFila_(codigo, { descuento: 0, nota: '' });
      q.sh.getRange(q.f, RES.cortesia).setValue('');
    } else {
      var a = ajustarFila_(codigo, { totalFinal: 0, nota: 'Cortesía o canje' + (nota ? ': ' + nota : ''), finalizar: d.finalizar !== false });
      a.sh.getRange(a.f, RES.cortesia).setValue('SI');
      a.sh.getRange(a.f, RES.cobro, 1, 2).setValues([['', '']]);
    }
    return adminResumen();
  });
}

function leerMovimientos_() {
  var sh = abrirBd_().getSheetByName(HOJAS.movimientos), out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().forEach(function (r) {
    var f = aFechaIso_(r[1]); if (!f || !r[0]) return;
    out.push({ id: String(r[0]), fecha: f, tipo: String(r[2]), destino: String(r[3]), monto: Number(r[4]) || 0, nota: String(r[5] || '') });
  });
  return out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
}

/** m = {fecha, tipo: Ingreso|Gasto, destino: Sala|Estudio, monto, nota}. Entran al cierre del mes con los socios. */
function adminGuardarMovimiento(m) {
  exigirAdmin_();
  m = m || {};
  var fecha = String(m.fecha || ''); if (!Reglas.fechaValida(fecha)) throw new Error('La fecha no es válida.');
  var tipo = m.tipo === 'Ingreso' ? 'Ingreso' : m.tipo === 'Gasto' ? 'Gasto' : ''; if (!tipo) throw new Error('Elige si es ingreso o gasto.');
  var destino = m.destino === 'Estudio' ? 'Estudio' : m.destino === 'Sala' ? 'Sala' : ''; if (!destino) throw new Error('Elige a qué área corresponde: Sala o Estudio.');
  var monto = Math.round(Number(m.monto)); if (!(monto > 0)) throw new Error('El monto debe ser mayor a 0.');
  var nota = textoSeguro_(limpiar_(m.nota, 150)); if (!nota) throw new Error('Escribe una nota (por ejemplo «cable XLR» o «arriendo de parlante»).');
  return conBloqueo_(function () {
    abrirBd_().getSheetByName(HOJAS.movimientos).appendRow(['MOV-' + Utilities.getUuid().slice(0, 8), fechaHora_(fecha, 0), tipo, destino, monto, nota]);
    SpreadsheetApp.flush();
    return adminResumen();
  });
}

function adminEliminarMovimiento(id) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.movimientos), f = sh.getLastRow() > 1 ? filaPorTexto_(sh, id, 1) : 0;
    if (!f) throw new Error('Movimiento no encontrado.');
    sh.deleteRow(f);
    return adminResumen();
  });
}

/* ====================================================================
 *  VERIFICACIÓN DE INGRESOS: recalcula el mes desde las filas crudas y avisa de todo lo que pueda estar mal
 * ==================================================================== */

/** mes = AAAA-MM. Devuelve {mes, totales, checks:[{nivel: ok|aviso|error, titulo, detalle, lista}]}. Solo lectura. */
function adminVerificarIngresos(mes) {
  exigirAdmin_();
  mes = mesValido_(mes) ? mes : mesActual_();
  var R = rangoPeriodo_('mes', mes), cfg = getCfg_(), hoy = ahoraChile_().fecha, ss = abrirBd_(), fee = Number(cfg.noAsisteCobroPorHora) || 0;
  var res = adminResumenContable('mes', mes), checks = [];
  var sinFinalizar = [], sobrepago = [], sinMedio = [], retenDist = [], duplicadas = {}, dups = [], descuadre = [];
  var recomputado = 0, finalizadas = 0, sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    var f = aFechaIso_(r[RES.fecha - 1]); if (!f || f < R.desde || f > R.hasta) return;
    var est = estadoNorm_(r[RES.estado - 1]), total = Number(r[RES.total - 1]) || 0, abono = Number(r[RES.abono - 1]) || 0, h = Number(r[RES.horas - 1]) || 0;
    var item = { fecha: f, codigo: String(r[RES.codigo - 1]), banda: String(r[RES.banda - 1]), estado: est, total: total, abono: abono };
    if (est === EST.FINALIZADA) {
      finalizadas++; recomputado += total;
      var montos = sumaMontos_(r); if (montos !== total) descuadre.push({ fecha: f, codigo: item.codigo, banda: item.banda, total: total, montos: montos });
      if (abono > total && r[RES.cortesia - 1] !== 'SI') sobrepago.push(item);
      if (r[RES.cobro - 1] !== 'POR COBRAR' && r[RES.cortesia - 1] !== 'SI' && total > abono && MEDIOS_PAGO.indexOf(String(r[RES.medioPago - 1])) < 0) sinMedio.push(item);
      var k = f + '|' + horaCelda_(r[RES.inicio - 1]) + '|' + String(r[RES.servicio - 1]); (duplicadas[k] = duplicadas[k] || []).push(item);
    } else if (est === EST.NO_ASISTE) {
      var ret = Number(r[RES.retenido - 1]) || 0; recomputado += ret;
      if (ret !== fee * h) retenDist.push({ fecha: f, codigo: item.codigo, banda: item.banda, retenido: ret, esperado: fee * h });
    } else if (est === EST.ANULADA) {
      recomputado += Number(r[RES.retenido - 1]) || 0;
    } else if ((est === EST.CON_ABONO || est === EST.SIN_ABONO) && f < hoy) {
      sinFinalizar.push(item);
    }
  });
  Object.keys(duplicadas).forEach(function (k) { if (duplicadas[k].length > 1) dups = dups.concat(duplicadas[k]); });
  var dif = res.ingresosBrutos - recomputado;
  checks.push({ nivel: dif === 0 ? 'ok' : 'error', titulo: 'El resumen coincide con las reservas', detalle: 'Resumen contable: ' + Reglas.clp(res.ingresosBrutos) + ' · recalculado desde cada reserva: ' + Reglas.clp(recomputado) + (dif === 0 ? '' : ' · diferencia ' + Reglas.clp(dif)) });
  checks.push({ nivel: descuadre.length ? 'error' : 'ok', titulo: 'Total de cada reserva = montos que usa el balance', detalle: descuadre.length ? descuadre.length + ' reserva(s) no cuadran. Usa «Cuadrar» en el resumen contable.' : 'Todas cuadran.', lista: descuadre });
  checks.push({ nivel: sinFinalizar.length ? 'aviso' : 'ok', titulo: 'Reservas pasadas sin finalizar (no cuentan como ingreso)', detalle: sinFinalizar.length ? sinFinalizar.length + ' reserva(s) con fecha pasada siguen «Reservado». Finalízalas, márcalas «No asiste» o anúlalas.' : 'No hay reservas olvidadas.', lista: sinFinalizar });
  checks.push({ nivel: (res.deudas || []).length ? 'aviso' : 'ok', titulo: 'Saldos por cobrar', detalle: (res.deudas || []).length ? (res.deudas.length + ' deuda(s) por ' + Reglas.clp(res.deudas.reduce(function (a, x) { return a + x.saldo; }, 0)) + ' (el ingreso ya está contado en el mes de la sesión).') : 'No hay deudas.', lista: res.deudas || [] });
  checks.push({ nivel: sobrepago.length ? 'aviso' : 'ok', titulo: 'Abono mayor que el total de la reserva', detalle: sobrepago.length ? 'En estas reservas se recibió más abono que el valor contabilizado: ¿corresponde devolver o es de un plan pagado antes?' : 'Sin sobrepagos.', lista: sobrepago });
  checks.push({ nivel: sinMedio.length ? 'aviso' : 'ok', titulo: 'Saldos cobrados sin medio de pago', detalle: sinMedio.length ? 'Falta registrar si fue efectivo, transferencia o tarjeta (para cuadrar caja y banco).' : 'Todos tienen medio de pago.', lista: sinMedio });
  checks.push({ nivel: retenDist.length ? 'aviso' : 'ok', titulo: '«No asiste» con retención distinta a la tarifa', detalle: retenDist.length ? 'Tarifa vigente: ' + Reglas.clp(fee) + ' por hora. Revisa si fue un perdón o un cambio a propósito.' : 'Todas usan la tarifa vigente.', lista: retenDist });
  checks.push({ nivel: dups.length ? 'aviso' : 'ok', titulo: 'Posibles reservas duplicadas', detalle: dups.length ? 'Misma fecha, hora y servicio finalizados más de una vez.' : 'No hay duplicadas.', lista: dups });
  var ventas = leerVentas_(), vSinFecha = ventas.filter(function (v) { return !v.fecha; }).length, vViejas = ventas.filter(function (v) { return v.pago === PAGO.PENDIENTE && v.fecha && v.fecha < Reglas.sumarDias(hoy, -30); });
  checks.push({ nivel: vSinFecha || vViejas.length ? 'aviso' : 'ok', titulo: 'Ventas de tienda y bebestibles', detalle: (vSinFecha ? vSinFecha + ' venta(s) sin fecha. ' : '') + (vViejas.length ? vViejas.length + ' entregada(s) en sala sin cobrar hace más de 30 días.' : '') || 'Sin problemas.', lista: vViejas.map(function (v) { return { fecha: v.fecha, codigo: v.id, banda: v.producto, total: v.total }; }) });
  return { ok: true, mes: mes, totales: { ingresosBrutos: res.ingresosBrutos, recalculado: recomputado, finalizadas: finalizadas, diferencia: dif }, checks: checks };
}

/* ====================================================================
 *  RESUMEN CONTABLE POR PERÍODO (semana o mes) — para cerrar con los socios
 * ==================================================================== */

function rangoPeriodo_(periodo, ref) {
  var hoy = ahoraChile_().fecha;
  if (periodo === 'semana') {
    var f = Reglas.fechaValida(ref) ? ref : hoy;
    var dow = new Date(f + 'T12:00:00Z').getUTCDay(); // 0 = domingo
    var lunes = Reglas.sumarDias(f, -((dow + 6) % 7));
    return { periodo: 'semana', desde: lunes, hasta: Reglas.sumarDias(lunes, 6), ref: lunes };
  }
  var m = mesValido_(ref) ? ref : mesActual_();
  var y = Number(m.slice(0, 4)), mm = Number(m.slice(5, 7)), ult = new Date(Date.UTC(y, mm, 0)).getUTCDate();
  return { periodo: 'mes', desde: m + '-01', hasta: m + '-' + (ult < 10 ? '0' : '') + ult, ref: m };
}

/** periodo = 'semana' | 'mes'; ref = fecha (semana) o AAAA-MM (mes). Devuelve todos los números del período. */
function adminResumenContable(periodo, ref) {
  exigirAdmin_();
  var cfg = getCfg_(), R = rangoPeriodo_(periodo, ref), ss = abrirBd_();
  var fee = Number(cfg.noAsisteCobroPorHora) || 0;
  var sala = { sesiones: 0, horas: 0, base: 0, extras: 0, video: 0, retenidos: 0, total: 0 };
  var estudio = { sesiones: 0, horas: 0, base: 0, retenidos: 0, total: 0 };
  var arr = { unidades: 0, monto: 0 }, bruto = { sesiones: 0, monto: 0 };
  var noa = { n: 0, horas: 0, cobro: 0, abonoRetenido: 0, porCobrar: 0, lista: [] };
  var anu = { n: 0, retenido: 0, devolver: 0 };
  var proy = { sesiones: 0, monto: 0, horas: 0 };
  var detalle = [], porDia = {};
  var deudas = [], cortesias = { n: 0, valor: 0, lista: [] }, medios = { Efectivo: 0, Transferencia: 0, Tarjeta: 0, sinRegistrar: 0, porCobrar: 0, abonos: 0 };
  var sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    var f = aFechaIso_(r[RES.fecha - 1]);
    if (f && r[RES.cobro - 1] === 'POR COBRAR' && [EST.ANULADA, EST.NO_ASISTE].indexOf(estadoNorm_(r[RES.estado - 1])) < 0) {
      deudas.push({ fecha: f, codigo: String(r[RES.codigo - 1]), banda: String(r[RES.banda - 1]), cliente: String(r[RES.contacto - 1]), telefono: String(r[RES.telefono - 1]), estado: estadoNorm_(r[RES.estado - 1]), saldo: Math.max(0, (Number(r[RES.total - 1]) || 0) - (Number(r[RES.abono - 1]) || 0)) });
    }
    if (!f || f < R.desde || f > R.hasta) return;
    var estado = estadoNorm_(r[RES.estado - 1]), ens = /ensayo/i.test(String(r[RES.servicio - 1]));
    var h = Number(r[RES.horas - 1]) || 0, base = Number(r[RES.base - 1]) || 0, ex = Number(r[RES.extrasM - 1]) || 0, vi = Number(r[RES.videoM - 1]) || 0, rw = Number(r[RES.rawM - 1]) || 0;
    var ret = Number(r[RES.retenido - 1]) || 0, dev = Number(r[RES.devolver - 1]) || 0, abono = Number(r[RES.abono - 1]) || 0;
    var recibido = String(r[RES.abonoRecibido - 1]).toUpperCase() === 'SI';
    var fila = { fecha: f, codigo: String(r[RES.codigo - 1]), banda: String(r[RES.banda - 1]), cliente: String(r[RES.contacto - 1]), servicio: ens ? 'Ensayo' : 'Grabación', horas: h, estado: estado, base: base, extras: ex, video: vi, raw: rw, total: 0, retenido: ret };
    if (estado === EST.FINALIZADA) {
      var o = ens ? sala : estudio;
      o.sesiones++; o.horas += h; o.base += base;
      if (ens) { sala.extras += ex; sala.video += vi; arr.unidades += Number(r[RES.extras - 1]) || 0; arr.monto += ex; }
      else { arr.unidades += Number(r[RES.extras - 1]) || 0; arr.monto += ex; }
      bruto.sesiones += rw > 0 ? 1 : 0; bruto.monto += rw;
      fila.total = base + ex + vi + rw; fila.cortesia = r[RES.cortesia - 1] === 'SI'; detalle.push(fila);
      if (fila.cortesia) { cortesias.n++; cortesias.valor += totalOriginal_(r); cortesias.lista.push({ fecha: f, codigo: fila.codigo, banda: fila.banda, cliente: fila.cliente, valor: totalOriginal_(r), nota: String(r[RES.notaAjuste - 1] || '') }); }
      else {
        var totR = Number(r[RES.total - 1]) || 0, saldoR = Math.max(0, totR - abono);
        medios.abonos += recibido ? Math.min(abono, totR) : 0;
        if (r[RES.cobro - 1] === 'POR COBRAR') medios.porCobrar += saldoR;
        else if (MEDIOS_PAGO.indexOf(String(r[RES.medioPago - 1])) >= 0) medios[String(r[RES.medioPago - 1])] += saldoR;
        else medios.sinRegistrar += saldoR;
      }
      porDia[f] = (porDia[f] || 0) + fila.total;
    } else if (estado === EST.NO_ASISTE) {
      var cobro = Number(r[RES.retenido - 1]) || fee * h, porCobrar = 0;
      noa.n++; noa.horas += h; noa.cobro += cobro; noa.abonoRetenido += cobro; noa.porCobrar += porCobrar;
      (ens ? sala : estudio).retenidos += cobro; (ens ? sala : estudio).total += cobro;
      fila.total = cobro; fila.porCobrar = porCobrar; noa.lista.push(fila); detalle.push(fila);
      porDia[f] = (porDia[f] || 0) + cobro;
    } else if (estado === EST.ANULADA) {
      anu.n++; anu.retenido += ret; anu.devolver += dev;
      (ens ? sala : estudio).retenidos += ret; (ens ? sala : estudio).total += ret;
      fila.total = ret; detalle.push(fila);
    } else if (estado === EST.CON_ABONO || estado === EST.SIN_ABONO) {
      proy.sesiones++; proy.horas += h; proy.monto += Number(r[RES.total - 1]) || 0;
    }
  });
  sala.total += sala.base + sala.extras + sala.video; estudio.total += estudio.base;
  // ventas de tienda y bebestibles (por fecha de cobro)
  var ventas = leerVentas_(), tiendas = {};
  ['musica', 'bebestible'].forEach(function (t) { tiendas[t] = { cobrado: 0, efectivo: 0, transferencia: 0, porCobrar: 0, unidades: 0, productos: {}, detalle: [] }; });
  ventas.forEach(function (v) {
    if (v.pago === PAGO.ANULADA || !tiendas[v.tipo]) return;
    var o = tiendas[v.tipo], fc = v.cobro || v.fecha;
    if (v.pago === PAGO.PENDIENTE) { if (v.fecha >= R.desde && v.fecha <= R.hasta) o.porCobrar += v.total; return; }
    if (fc < R.desde || fc > R.hasta) return;
    o.cobrado += v.total; o.unidades += v.cantidad;
    if (v.pago === PAGO.EFECTIVO) o.efectivo += v.total; else o.transferencia += v.total;
    var p = o.productos[v.producto] = o.productos[v.producto] || { nombre: v.producto, unidades: 0, total: 0 };
    p.unidades += v.cantidad; p.total += v.total;
    o.detalle.push({ fecha: fc, producto: v.producto, cantidad: v.cantidad, total: v.total, pago: v.pago, vendedor: v.vendedor });
  });
  var salidaTienda = function (o) { o.productos = Object.keys(o.productos).map(function (k) { return o.productos[k]; }).sort(function (a, b) { return b.total - a.total; }); o.detalle = o.detalle.slice(0, 200); return o; };
  var out = {
    ok: true, periodo: R.periodo, desde: R.desde, hasta: R.hasta, ref: R.ref,
    semAnt: Reglas.sumarDias(R.desde, -7), semSig: Reglas.sumarDias(R.desde, 7),
    sala: sala, estudio: estudio, arriendos: arr, bruto: bruto, noAsiste: noa, anuladas: anu, proyectado: proy, tarifaNoAsiste: fee,
    musica: salidaTienda(tiendas.musica), bebestibles: salidaTienda(tiendas.bebestible),
    detalle: detalle.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }),
    porDia: Object.keys(porDia).sort().map(function (k) { return { fecha: k, total: porDia[k] }; })
  };
  out.descuadres = descuadres_().slice(0, 100);
  out.deudas = deudas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }); out.cortesias = cortesias; out.medios = medios;
  var movs = leerMovimientos_().filter(function (x) { return x.fecha >= R.desde && x.fecha <= R.hasta; });
  var mv = { lista: movs, ingresoSala: 0, gastoSala: 0, ingresoEstudio: 0, gastoEstudio: 0 };
  movs.forEach(function (x) { mv[(x.tipo === 'Ingreso' ? 'ingreso' : 'gasto') + x.destino] += x.monto; });
  out.movimientos = mv;
  out.ingresosBrutos = sala.total + estudio.total + bruto.monto;
  if (R.periodo === 'mes') {
    var c = null; leerCostos_().forEach(function (x) { if (x.mes === R.ref) c = x; });
    var luz = c ? c.luz : 0, aporte = c && c.aporte !== '' ? c.aporte : Number(cfg.aporteLuzProAudix) || 0, caja = c && c.caja !== '' ? c.caja : Number(cfg.cajaChicaMensual) || 0, otros = c ? c.otros : 0;
    var luzSala = Math.max(0, luz - aporte), utilSala = sala.total - luzSala - caja - otros + mv.ingresoSala - mv.gastoSala, utilEst = estudio.total + mv.ingresoEstudio - mv.gastoEstudio;
    out.mes = {
      movSala: mv.ingresoSala - mv.gastoSala, movEstudio: mv.ingresoEstudio - mv.gastoEstudio, boletaIngresada: !!(c && c.luz > 0), luz: luz, aporte: aporte, luzSala: luzSala, caja: caja, otros: otros, notas: c ? c.notas : '',
      utilidadSala: utilSala, salaJC: utilSala * cfg.repartoSalaJC / 100, salaJaime: utilSala * cfg.repartoSalaJaime / 100,
      utilidadEstudio: utilEst, estudioEstudio: utilEst * cfg.repartoEstudioEstudio / 100, estudioJC: utilEst * cfg.repartoEstudioJC / 100,
      brutoJC: bruto.monto,
      pct: { salaJC: cfg.repartoSalaJC, salaJaime: cfg.repartoSalaJaime, estudioEstudio: cfg.repartoEstudioEstudio, estudioJC: cfg.repartoEstudioJC }
    };
    out.mes.totalJC = out.mes.salaJC + out.mes.estudioJC + bruto.monto; out.mes.totalJaime = out.mes.salaJaime; out.mes.totalEstudio = out.mes.estudioEstudio; out.mes.totalGabriela = out.mes.estudioEstudio; out.mes.estudioJCTotal = out.mes.estudioJC;
    out.meses = [];
    var yy = Number(R.ref.slice(0, 4)), mx = Number(R.ref.slice(5, 7));
    for (var k = 0; k < 12; k++) { var d = new Date(Date.UTC(yy, mx - 1 - k, 1)); out.meses.push(d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2)); }
  }
  return out;
}

/* ===== Ajustes ===== */
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
  ['mpActivo', 'Pago con Mercado Pago (confirma solo)', 'sino', 'Pagos', 'SI = botón «Pagar con Mercado Pago»: al pagar, la reserva se confirma sola. Requiere guardar el token de Mercado Pago (ver guía).'],
  ['mpComisionPct', 'Comisión estimada de Mercado Pago (%)', 'num', 'Pagos', 'Solo se usa si Mercado Pago no informa la comisión real de un pago.'],
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

/* ===== WhatsApp ===== */
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

/** Textos anteriores de fábrica: si los tenías sin editar, pasan solos al estilo nuevo. Los que editaste tú no se tocan. */
var MENSAJES_ANTERIORES_ = {
 "msgRecordatorio": "Hola {nombre} 👋 Te escribimos para recordarte tu reserva en {negocio}: {servicio} el {fecha}, de {hora} a {fin}. Nos encuentras en {direccion}. Si puedes llegar 5 a 10 minutos antes, aprovechamos al máximo tu tiempo en sala 🎸 Y si algo cambia y necesitas mover la hora, avísanos con {horasAnulacion} horas de anticipación: así podemos ofrecer ese espacio a otra banda y mantener la agenda ordenada para todos. ¡Gracias por ayudarnos, nos vemos pronto! 🤘",
 "msgConfirmacion": "Hola {nombre} 🤘 ¡Gracias por tu abono! Tu reserva #{codigo} quedó confirmada: {servicio} el {fecha}, de {hora} a {fin}. El saldo ({saldo}) lo pagas en el estudio el día de tu sesión. Estamos en {direccion}. Si surge cualquier cambio, escríbenos por aquí con tiempo; así podemos reorganizar la agenda y darle espacio a otras bandas. ¡Nos vemos pronto! 🎶",
 "msgCobroAbono": "Hola {nombre} 😊 Te dejamos guardado el horario de tu reserva #{codigo} ({servicio} el {fecha}, de {hora} a {fin}). Para dejarla confirmada solo falta el abono de {abono}; cuando lo hagas, mándanos el comprobante por aquí y listo. Y si cambiaron tus planes, no te preocupes: avísanos y liberamos el horario para otra banda, así la agenda sigue fluyendo para todos. ¡Gracias! 🤘",
 "msgGracias": "Hola {nombre} 🎸 ¡Gracias por venir a {negocio}! Esperamos que la sesión haya estado genial. Cuando quieran volver, reservar con un poco de anticipación nos ayuda a mantener la agenda fluida y a tener espacio para todas las bandas. Y si te das un minuto para dejarnos una reseña, nos ayuda un mundo: {sitio} 🤘",
 "msgResena": "Hola {nombre} 🤘 ¡Qué bueno haber tenido a {banda} en {negocio}! Si tienes un minutito, cuéntanos cómo les fue: tu opinión ayuda a otras bandas a decidirse y a nosotros a mejorar. Puedes dejarla aquí: {enlaceResena} ¡Mil gracias! 🙌",
 "msgDescarga": "Hola {nombre} 🎧 ¡Ya está listo el material de {banda}! Lo puedes descargar aquí: {enlaceDescarga} Si algo no abre o necesitas otro formato, escríbenos y lo resolvemos. ¡Ojalá lo disfruten harto! 🤘",
 "msgHonor": "Hola {nombre} 🤘 ¡Nos encantó tener a {banda} en {negocio}! Nos gustaría que formaran parte de nuestro Cuadro de Honor, un espacio para mostrar a las bandas que pasan por aquí. Si se animan, es un formulario cortito: {enlaceHonor} ¡Gracias por la buena onda!"
};

var CLAVES_MENSAJES = ['msgRecordatorio', 'msgConfirmacion', 'msgCobroAbono', 'msgGracias', 'msgResena', 'msgDescarga', 'msgHonor'];

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
          fecha: manana, inicio: horaCelda_(f[RES.inicio - 1]), fin: horaCelda_(f[RES.fin - 1]) }));
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
/** Pasa al texto nuevo los mensajes que seguían idénticos al original anterior (una sola vez). */
function migrarMensajes_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('MSG_ESTILO') === 'rock1') return;
  var raw = leerConfigCruda_(), nuevos = {}, d = Reglas.CONFIG_POR_DEFECTO;
  CLAVES_MENSAJES.forEach(function (k) { if (raw[k] !== undefined && String(raw[k]).trim() === String(MENSAJES_ANTERIORES_[k]).trim()) nuevos[k] = d[k]; });
  if (Object.keys(nuevos).length) ponerConfig_(nuevos);
  p.setProperty('MSG_ESTILO', 'rock1');
}

function waDatos_() {
  var cfg = getCfg_();
  var def = Reglas.CONFIG_POR_DEFECTO, originales = {}; CLAVES_MENSAJES.forEach(function (k) { originales[k] = def[k]; });
  return { originales: originales, plantillas: { msgRecordatorio: cfg.msgRecordatorio, msgConfirmacion: cfg.msgConfirmacion, msgCobroAbono: cfg.msgCobroAbono, msgGracias: cfg.msgGracias, msgResena: cfg.msgResena, msgDescarga: cfg.msgDescarga, msgHonor: cfg.msgHonor },
    negocio: cfg.nombreNegocio, direccion: cfg.direccion, horasAnulacion: cfg.horasAnulacion, sitio: cfg.sitioUrl, auto: cfg.waAutoActivo,
    tieneToken: !!PropertiesService.getScriptProperties().getProperty('WA_TOKEN') };
}

/* ===== Sitio ===== */
/**
 * EDITOR DEL SITIO WEB: textos, fotos, ficha técnica, galería y playlist que ve el público.
 *
 * Lo editable NO está fijo en este código: el portal lee el sitio publicado y ofrece editar todo elemento marcado con
 * data-ed (texto) o data-ed-foto (imagen) en index.html. Si cambia el diseño del sitio, el editor cambia con él.
 * Los cambios se guardan en la hoja «Sitio» (una fila por parte, en JSON) y el sitio los aplica encima de lo original;
 * borrar una parte devuelve el sitio a su contenido original.
 */

var SITIO_PARTES = ['textos', 'fotos', 'ficha', 'galeria', 'playlist', 'microfonos'];
var SITIO_MAX_CELDA = 45000;
var CARPETA_SITIO = 'Rockerío · Fotos del sitio';

/* ---------- validación (funciones puras; pruebas en tests/sitio.test.js) ---------- */

function clave_(k) { return /^[a-zA-Z0-9_.-]{1,40}$/.test(String(k)) ? String(k) : ''; }

/** Texto largo: conserva saltos de línea (hasta 1500 caracteres) y quita caracteres de control. */
function textoLargo_(v, max) {
  return String(v === null || v === undefined ? '' : v).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max || 1500);
}

/** Imagen del sitio: ruta del propio sitio (assets/…) o enlace https. Cualquier otra cosa se descarta. */
function urlImagenSitio_(v) {
  var s = String(v || '').trim();
  if (/^assets\/[\w\/.\-]{1,120}$/.test(s) && s.indexOf('..') < 0) return s;
  return /^https:\/\/[^\s<>"'\\]{4,400}$/.test(s) ? s : '';
}

function limpiarTextosSitio_(o) {
  var out = {}, n = 0;
  Object.keys(o && typeof o === 'object' ? o : {}).forEach(function (k) {
    var c = clave_(k), v = textoLargo_(o[k], 1500);
    if (c && v && n < 120) { out[c] = v; n++; }
  });
  return out;
}

function limpiarFotosSitio_(o) {
  var out = {}, n = 0;
  Object.keys(o && typeof o === 'object' ? o : {}).forEach(function (k) {
    var c = clave_(k), u = urlImagenSitio_(o[k]);
    if (c && u && n < 40) { out[c] = u; n++; }
  });
  return out;
}

function fotoItem_(f) {
  f = f || {};
  var src = urlImagenSitio_(f.src); if (!src) return null;
  return { src: src, titulo: limpiar_(f.titulo, 80), descripcion: limpiar_(f.descripcion, 220), alt: limpiar_(f.alt || f.titulo, 120) };
}

function limpiarGaleriaSitio_(arr) {
  var out = [];
  (Array.isArray(arr) ? arr : []).slice(0, 60).forEach(function (f) {
    f = f || {};
    if (String(f.video || '').trim()) {
      var yt = ytUrl_(f.video);
      if (yt) out.push({ video: yt, titulo: limpiar_(f.titulo, 80), descripcion: limpiar_(f.descripcion, 220), alt: limpiar_(f.alt || f.titulo, 120) });
      return;
    }
    var it = fotoItem_(f); if (it) out.push(it);
  });
  return out;
}

function limpiarFichaSitio_(arr) {
  var out = [];
  (Array.isArray(arr) ? arr : []).slice(0, 12).forEach(function (s, i) {
    s = s || {};
    var titulo = limpiar_(s.titulo, 80); if (!titulo) return;
    var sec = { id: String(s.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || ('sec' + (i + 1)), icono: limpiar_(s.icono, 6), titulo: titulo, resumen: limpiar_(s.resumen, 300), stats: [], fotos: [], bloques: [] };
    (Array.isArray(s.stats) ? s.stats : []).slice(0, 6).forEach(function (t) {
      if (Array.isArray(t) && (t[1] || t[2])) sec.stats.push([limpiar_(t[0], 6), limpiar_(t[1], 24), limpiar_(t[2], 40)]);
    });
    (Array.isArray(s.fotos) ? s.fotos : []).slice(0, 16).forEach(function (f) { var it = fotoItem_(f); if (it) sec.fotos.push({ src: it.src, titulo: it.titulo, descripcion: it.descripcion }); });
    (Array.isArray(s.bloques) ? s.bloques : []).slice(0, 12).forEach(function (b) {
      b = b || {}; var items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).map(function (x) { return limpiar_(x, 300); }).filter(String);
      if (limpiar_(b.titulo, 80) || items.length) sec.bloques.push({ titulo: limpiar_(b.titulo, 80), items: items });
    });
    if (s.mics) sec.mics = true;
    if (s.escucha) sec.escucha = true;
    out.push(sec);
  });
  return out;
}

function limpiarPlaylistSitio_(o) {
  o = o || {};
  var u = urlHttps_(o.url);
  if (u && !/[?&]list=[\w-]+/.test(u)) u = '';
  return u ? { url: u, titulo: limpiar_(o.titulo, 80), texto: limpiar_(o.texto, 200) } : {};
}

/** Catálogo de micrófonos: nombre, foto, uso y descripción. El audio de cada uno va en «Muestras de audio» con el mismo nombre. */
function limpiarMicsSitio_(arr) {
  var out = [];
  (Array.isArray(arr) ? arr : []).slice(0, 60).forEach(function (m) {
    m = m || {};
    var nombre = limpiar_(m.nombre, 80); if (!nombre) return;
    var foto = String(m.foto || '').trim() ? urlImagenSitio_(m.foto) : '';
    var muestras = [];
    (Array.isArray(m.muestras) ? m.muestras : []).slice(0, 4).forEach(function (x) {
      var enlace = String((x && x.enlace) || '').trim();
      if (/^https:\/\/[^\s"'<>]{4,400}$/.test(enlace)) muestras.push({ etiqueta: limpiar_(x.etiqueta, 60), enlace: enlace });
    });
    out.push({ nombre: nombre, marca: limpiar_(m.marca, 40), modelo: limpiar_(m.modelo, 60), tipo: limpiar_(m.tipo, 40), patron: limpiar_(m.patron, 40), foto: foto || '',
      uso: limpiar_(m.uso, 120), descripcion: limpiar_(m.descripcion, 360), muestras: muestras });
  });
  return out;
}

function validarParteSitio_(parte, valor) {
  switch (parte) {
    case 'textos': return limpiarTextosSitio_(valor);
    case 'fotos': return limpiarFotosSitio_(valor);
    case 'ficha': return limpiarFichaSitio_(valor);
    case 'galeria': return limpiarGaleriaSitio_(valor);
    case 'playlist': return limpiarPlaylistSitio_(valor);
    case 'microfonos': return limpiarMicsSitio_(valor);
  }
  throw new Error('Parte del sitio no válida.');
}

/* ---------- almacenamiento ---------- */

function hojaSitio_() {
  var ss = abrirBd_(), sh = ss.getSheetByName(HOJAS.sitio);
  if (!sh) { sh = ss.insertSheet(HOJAS.sitio); sh.getRange(1, 1, 1, 3).setValues([['Parte', 'Contenido (JSON)', 'Actualizado']]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}

/** Lee todo lo guardado: {textos, fotos, ficha, galeria, playlist}; lo que no esté guardado no aparece (= original). */
function leerSitio_() {
  var sh = hojaSitio_(), n = sh.getLastRow(), out = {};
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) {
    var k = String(r[0]); if (SITIO_PARTES.indexOf(k) < 0 || !r[1]) return;
    try { out[k] = JSON.parse(String(r[1])); } catch (e) { /* fila dañada: se ignora y el sitio usa el original */ }
  });
  return out;
}

/** Lo que recibe el sitio público (con caché corto). */
function sitioPublico_() {
  var cache = CacheService.getScriptCache(), c = cache.get('sitio');
  if (c) { try { return JSON.parse(c); } catch (e) { /* se recalcula */ } }
  var s = leerSitio_(), txt = JSON.stringify(s);
  if (txt.length < 90000) cache.put('sitio', txt, 300);
  return s;
}

/** Guarda una parte. valor vacío ({} o []) = vuelve al contenido original del sitio. */
function adminGuardarSitio(parte, valor) {
  exigirAdmin_();
  if (typeof valor === 'string') { try { valor = JSON.parse(valor); } catch (e) { throw new Error('No se pudo leer lo que enviaste.'); } }
  var limpio = validarParteSitio_(String(parte), valor), vacio = Array.isArray(limpio) ? !limpio.length : !Object.keys(limpio).length;
  var txt = JSON.stringify(limpio);
  if (txt.length > SITIO_MAX_CELDA) throw new Error('Es demasiado contenido para guardar de una vez. Quita algunas fotos o textos.');
  return conBloqueo_(function () {
    var sh = hojaSitio_(), f = sh.getLastRow() > 1 ? filaPorTexto_(sh, parte, 1) : 0;
    if (vacio) { if (f) sh.deleteRow(f); }
    else if (f) sh.getRange(f, 2, 1, 2).setValues([[txt, fechaHora_(ahoraChile_().fecha, 0)]]);
    else sh.appendRow([parte, txt, fechaHora_(ahoraChile_().fecha, 0)]);
    CacheService.getScriptCache().remove('sitio');
    return leerSitio_();
  });
}

/** Sube una foto del sitio a tu Drive (hasta 1,5 MB, PNG/JPG/WebP) y devuelve su enlace público. */
function adminSubirImagenSitio(p) {
  exigirAdmin_();
  var bytes = decodificar_(p && p.b64, 1536 * 1024), t = tipoImagen_(bytes);
  if (!t) throw new Error('La foto debe ser PNG, JPG o WebP.');
  var id = guardarPublico_(carpetaDrive_(CARPETA_SITIO), 'sitio-' + limpiar_(p.nombre, 30).replace(/[^\w\- ]/g, '') + '-' + Date.now() + '.' + t[1], t[0], bytes);
  return 'https://lh3.googleusercontent.com/d/' + id;
}

/** Datos para armar el editor: lo guardado y la dirección del sitio. El sitio publicado lo lee el navegador (no requiere permisos extra de Google). */
function adminSitioDatos() {
  exigirAdmin_();
  var cfg = getCfg_();
  return { sitio: leerSitio_(), base: String(cfg.sitioUrl || '').replace(/\/+$/, '') || 'https://rockerioproducciones.cl', tema: cfg.tema, html: '', ficha: null, galeria: null, playlist: null, microfonos: null, aviso: '' };
}

/* ===== Pagos ===== */
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
      'Revisa el comprobante en WhatsApp y confirma el abono con un toque. El horario se guarda ' + HORAS_MAX_COMPROBANTE + ' horas.',
      { texto: 'Confirmar abono', url: urlGestion_(getCfg_(), rf.codigo) });
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

/* ===== Correo ===== */
/* ====================================================================
 *  CORREOS CON LA IDENTIDAD DE ROCKERÍO
 *  Un solo molde (logo, colores, botón) para todos los correos. Siempre se envía también la versión en texto
 *  simple, por si el programa de correo no muestra HTML.
 *  o = { preheader, titulo, saludo, parrafos: [], filas: [[etiqueta, valor]], caja: 'texto en recuadro',
 *        boton: { texto, url }, boton2: { texto, url }, notas: [], codigo }
 * ==================================================================== */
var CORREO_COL = { fondo: '#09090a', tarjeta: '#141416', borde: '#2a2a2e', oro: '#E39A2D', texto: '#ece8e1', suave: '#a8a39a', rojo: '#d8434b' };

function htmlSeg_(t) {
  return String(t === undefined || t === null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function urlSegura_(u) { u = String(u || ''); return /^(https:\/\/|mailto:)[^\s"'<>]+$/.test(u) ? u : ''; }
function baseSitio_(cfg) { return String(cfg.sitioUrl || 'https://rockerioproducciones.cl').replace(/\/+$/, ''); }

function correoTexto_(cfg, o) {
  var l = [];
  if (o.titulo) l.push(String(o.titulo).toUpperCase(), '');
  if (o.saludo) l.push(o.saludo, '');
  (o.parrafos || []).forEach(function (p) { l.push(p, ''); });
  (o.filas || []).forEach(function (f) { l.push(f[0] + ': ' + f[1]); });
  if ((o.filas || []).length) l.push('');
  if (o.caja) l.push(o.caja, '');
  [o.boton, o.boton2].forEach(function (b) { if (b && urlSegura_(b.url)) l.push(b.texto + ': ' + b.url, ''); });
  (o.notas || []).forEach(function (n) { l.push(n, ''); });
  l.push('— ' + cfg.nombreNegocio, cfg.direccion || '');
  return l.join('\n');
}

function correoHtml_(cfg, o) {
  var C = CORREO_COL, base = baseSitio_(cfg), e = htmlSeg_;
  var logo = base + '/assets/logo-horizontal-dorado.png';
  var fuenteTit = "Impact,'Arial Narrow Bold','Arial Black',Arial,sans-serif", fuente = "'Segoe UI',Helvetica,Arial,sans-serif";
  function boton(b, claro) {
    if (!b || !urlSegura_(b.url)) return '';
    return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 8px 8px 0;display:inline-block"><tr><td bgcolor="' + (claro ? C.oro : C.tarjeta) + '" style="border-radius:6px;border:2px solid ' + C.oro + '">' +
      '<a href="' + e(b.url) + '" style="display:inline-block;padding:13px 24px;font:800 15px ' + fuente + ';letter-spacing:.04em;text-transform:uppercase;color:' + (claro ? '#0a0a0b' : C.oro) + ';text-decoration:none">' + e(b.texto) + '</a></td></tr></table>';
  }
  var cuerpo = '';
  if (o.titulo) cuerpo += '<h1 style="margin:0 0 6px;font:400 30px/1.05 ' + fuenteTit + ';letter-spacing:.03em;text-transform:uppercase;color:' + C.oro + '">' + e(o.titulo) + '</h1>';
  if (o.codigo) cuerpo += '<div style="display:inline-block;margin:2px 0 14px;padding:4px 12px;border:1px solid ' + C.oro + ';border-radius:99px;font:700 13px ' + fuente + ';letter-spacing:.12em;color:' + C.oro + '">RESERVA #' + e(o.codigo) + '</div>';
  if (o.saludo) cuerpo += '<p style="margin:12px 0;font:700 17px/1.5 ' + fuente + ';color:' + C.texto + '">' + e(o.saludo) + '</p>';
  (o.parrafos || []).forEach(function (p) { cuerpo += '<p style="margin:12px 0;font:15px/1.65 ' + fuente + ';color:' + C.texto + '">' + e(p).replace(/\n/g, '<br>') + '</p>'; });
  if ((o.filas || []).length) {
    cuerpo += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid ' + C.borde + '">';
    o.filas.forEach(function (f) {
      cuerpo += '<tr><td style="padding:10px 0;border-bottom:1px solid ' + C.borde + ';font:700 12px ' + fuente + ';letter-spacing:.1em;text-transform:uppercase;color:' + C.suave + ';width:38%;vertical-align:top">' + e(f[0]) + '</td>' +
        '<td style="padding:10px 0;border-bottom:1px solid ' + C.borde + ';font:600 15px/1.4 ' + fuente + ';color:' + C.texto + ';vertical-align:top">' + e(f[1]).replace(/\n/g, '<br>') + '</td></tr>';
    });
    cuerpo += '</table>';
  }
  if (o.caja) cuerpo += '<div style="margin:16px 0;padding:14px 16px;background:#0d0d0f;border-left:4px solid ' + C.oro + ';border-radius:4px;font:14px/1.6 ' + fuente + ';color:' + C.texto + '">' + e(o.caja).replace(/\n/g, '<br>') + '</div>';
  var b1 = boton(o.boton, true), b2 = boton(o.boton2, false);
  if (b1 || b2) cuerpo += '<div style="margin:18px 0 8px">' + b1 + b2 + '</div>';
  (o.notas || []).forEach(function (n) { cuerpo += '<p style="margin:12px 0;font:13px/1.6 ' + fuente + ';color:' + C.suave + '">' + e(n).replace(/\n/g, '<br>') + '</p>'; });

  var ig = urlSegura_(cfg.redInstagram), wa = cfg.whatsapp ? 'https://wa.me/' + String(cfg.whatsapp).replace(/\D/g, '') : '';
  var pie = '<a href="' + e(base) + '" style="color:' + C.oro + ';text-decoration:none;font-weight:700">' + e(base.replace(/^https:\/\//, '')) + '</a>' +
    (ig ? ' &nbsp;·&nbsp; <a href="' + e(ig) + '" style="color:' + C.oro + ';text-decoration:none">Instagram</a>' : '') +
    (wa ? ' &nbsp;·&nbsp; <a href="' + e(wa) + '" style="color:' + C.oro + ';text-decoration:none">WhatsApp</a>' : '');
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>' +
    '<body style="margin:0;padding:0;background:' + C.fondo + '" bgcolor="' + C.fondo + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + C.fondo + '">' + e(o.preheader || o.titulo || '') + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + C.fondo + '" style="background:' + C.fondo + '"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:' + C.tarjeta + ';border:1px solid ' + C.borde + ';border-radius:10px;overflow:hidden">' +
    '<tr><td height="5" bgcolor="' + C.oro + '" style="background:' + C.oro + ';font-size:0;line-height:0">&nbsp;</td></tr>' +
    '<tr><td align="center" bgcolor="#000000" style="background:#000000;padding:26px 20px 20px"><a href="' + e(base) + '"><img src="' + e(logo) + '" width="230" alt="' + e(cfg.nombreNegocio) + '" style="display:block;border:0;max-width:230px;height:auto"></a>' +
    '<div style="margin-top:12px;font:700 11px ' + fuente + ';letter-spacing:.28em;text-transform:uppercase;color:' + C.suave + '">Sala de ensayo · Estudio de grabación</div></td></tr>' +
    '<tr><td style="padding:28px 28px 8px">' + cuerpo + '</td></tr>' +
    '<tr><td style="padding:8px 28px 26px"><div style="border-top:1px solid ' + C.borde + ';padding-top:16px;font:13px/1.7 ' + fuente + ';color:' + C.suave + ';text-align:center">' +
    '<div style="font:400 18px ' + fuenteTit + ';letter-spacing:.06em;text-transform:uppercase;color:' + C.texto + '">¡Que suene fuerte! 🤘</div>' +
    '<div style="margin-top:6px">' + e(cfg.nombreNegocio) + (cfg.direccion ? ' · ' + e(cfg.direccion) : '') + '</div><div style="margin-top:4px">' + pie + '</div></div></td></tr>' +
    '</table></td></tr></table></body></html>';
}

/** Envía un correo con el molde de Rockerío (HTML + texto). Devuelve true si salió. */
function enviarCorreo_(cfg, para, asunto, o, extra) {
  try {
    var op = { to: para, subject: asunto, body: correoTexto_(cfg, o), htmlBody: correoHtml_(cfg, o), name: cfg.nombreNegocio };
    if (extra && extra.replyTo) op.replyTo = extra.replyTo;
    MailApp.sendEmail(op);
    return true;
  } catch (err) { console.error('Correo «' + asunto + '»: ' + err); return false; }
}

/** Enlace de WhatsApp al cliente, con un mensaje escrito. */
function enlaceWaCliente_(tel, texto) {
  var t = String(tel || '').replace(/\D/g, '');
  return t.length >= 8 ? 'https://wa.me/' + t + '?text=' + encodeURIComponent(texto || '') : '';
}
