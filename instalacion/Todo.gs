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
    // Mensajes de WhatsApp (plantillas). {nombre} {banda} {servicio} {fecha} {hora} {fin} {codigo} {total} {abono} {saldo} {direccion} {negocio} {sitio} {horasAnulacion}
    msgRecordatorio: "Hola {nombre} 👋 Te recordamos tu reserva en {negocio}: {servicio} el {fecha}, de {hora} a {fin}. Dirección: {direccion}. Recomendamos llegar 5 a 10 minutos antes. Si necesitas cambiarla, avísanos con al menos {horasAnulacion} horas de anticipación. ¡Nos vemos! 🤘",
    msgConfirmacion: "Hola {nombre} 🤘 ¡Recibimos tu abono! Tu reserva #{codigo} quedó confirmada: {servicio} el {fecha}, de {hora} a {fin}. Saldo a pagar en el estudio: {saldo}. Dirección: {direccion}.",
    msgCobroAbono: "Hola {nombre}, tu reserva #{codigo} ({servicio} el {fecha}, de {hora} a {fin}) está pendiente de abono de {abono}. Cuando lo hagas, envíanos el comprobante por aquí para confirmarla. Si no recibimos el abono a tiempo, el horario se libera.",
    msgGracias: "Hola {nombre}, ¡gracias por venir a {negocio}! 🎸 Esperamos que la sesión haya sido genial. Si puedes, déjanos una reseña en nuestro sitio: {sitio}",
    waAutoActivo: false,          // SI = el recordatorio del día anterior se envía solo por la API de WhatsApp Business (requiere cuenta Meta)
    waPhoneId: '',                // ID del número de WhatsApp Business (no es el teléfono)
    waPlantillaRecordatorio: '',  // nombre de la plantilla de recordatorio aprobada por Meta
    waIdioma: 'es',               // código de idioma de la plantilla (es, es_CL…)
    waVersion: 'v23.0',           // versión de la API Graph de Meta
    reagendoSemanas: 2,           // plazo máximo para reagendar una reserva (semanas). Se muestra en el reglamento
    reagendoCambios: 2,           // máximo de cambios por reserva. Se muestra en el reglamento
    reglamento: "Para garantizar la mejor experiencia, fluidez en la agenda y el cuidado de los equipos, compartimos nuestras condiciones de servicio.\n\n## 📅 Reservas, reagendamientos y anulaciones\n- Confirmación: el abono confirma la fecha y hora en nuestra agenda.\n- Cambios: puedes reagendar o anular con al menos {horasAnulacion} horas de anticipación.\n- Flexibilidad: reagendamos en un plazo máximo de {reagendoSemanas} semanas (máximo {reagendoCambios} cambios por reserva).\n- Anulación: la devolución se realiza vía transferencia, descontando {retencionPorHora} por cada hora abonada (cargo por comisión de la plataforma).\n- Si estás atrasado o no puedes asistir, avísanos con tiempo para buscar una solución dentro de lo posible.\n- El horario queda tomado {minutosReserva} minutos mientras se realiza el abono; si no llega, se libera solo.\n\n## 🎟️ Planes mensuales\n- Un plan es un pack de 4 reservas: opción de 8 horas (4 ensayos de 2 horas) u opción de 12 horas (4 ensayos de 3 horas).\n- Al validar tu pago se ingresan tus 4 reservas, idealmente dentro del mes en curso o del siguiente.\n- Cambios: igual que en ensayo y grabación, con al menos {horasAnulacion} horas de anticipación. Si no avisas a tiempo, nos quedamos con el abono de {abonoPorHora} por cada hora solicitada.\n\n## ⏰ Horarios y puntualidad\n- Llegada: recomendamos llegar 5 a 10 minutos antes para preparar aspectos técnicos antes de tocar.\n- Salida: solicitamos desocupar la sala 5 minutos antes de terminar el bloque, en respeto a la banda siguiente.\n\n## 🚫 Normas dentro de la sala\n- Prohibido fumar y consumir líquidos dentro de la sala (para proteger los equipos y la higiene). Disponemos de espacio en el patio para compartir.\n- Mantener la puerta cerrada mientras estén tocando, para cuidar el entorno y la acústica.\n\n## 🎒 Cuidado de pertenencias y espacios\n- Revisa todas tus pertenencias antes de retirarte. No nos hacemos responsables por pérdidas.\n- Mantenemos el orden y aseo constante en salas, estudio de grabación y áreas comunes.\n- Contamos con estacionamiento exterior (sujeto a disponibilidad).\n\nNuestra misión es entregarte la mejor experiencia para ti y tu banda. ¡Mantengamos siempre un ambiente de respeto y buena onda entre todos, así disfrutamos de la música! 🤘🔥",   // texto del reglamento; ## = título, - = viñeta; {horasAnulacion} etc. se reemplazan solos
    contabilidadFormal: false,    // SI = activa la contabilidad formal (IVA, PPM, impuesto simulado, compras)
    regimen: '14D3',              // 14D3 (Pro Pyme general) o 14D8 (Pro Pyme transparente)
    sitioUrl: '',                 // dirección pública del sitio (para armar los enlaces de socios)
    tema: 'carbon',               // tema visual por defecto (ver js/tema.js)
    presentacionTitulo: 'Mi enfoque',
    presentacion: '',             // vacío = la sección Producción muestra un texto base
    // Textos de la portada y secciones visibles del sitio
    heroTitulo: 'Tu banda suena aquí', heroTexto: 'Sala de ensayo y estudio de grabación en Quinta Normal, Santiago.',
    verProduccion: true, verFicha: true, verPlanes: true, verGaleria: true, verEvaluaciones: true, verProaudix: true, verContacto: true, verTienda: true, verHonor: true, verCotizar: true, verReglamento: true,
    // Contacto y redes (enlaces https://; vacío = no se muestra)
    sitioWeb: '', redInstagram: '', redFacebook: '', redYoutube: '', redTiktok: '', redSpotify: '', mapsUrl: '',
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

    escalaGrabacion: '2:30,3:60,4:120,5:180',   // horas:minutos de grabación incluida en el ensayo
    pagoTransferencia: true,      // SI = se muestran los datos de transferencia al terminar la reserva
    datosTransferencia: '',       // texto público con los datos para transferir (vacío = se envían por WhatsApp)
    anulacionTardiaRetiene: true, // anular con menos de horasAnulacion: se retiene todo el abono (como no asistir)
    pagoOnline: false,            // SI = se ofrece el botón de pago online (Mercado Pago) con linkPago
    linkPago: '',
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
    ['msgRecordatorio', 'msgConfirmacion', 'msgCobroAbono', 'msgGracias'].forEach(function (k) { c[k] = aTexto(raw[k], d[k]) || d[k]; });
    c.waAutoActivo = aBool(raw.waAutoActivo, d.waAutoActivo);
    ['waPhoneId', 'waPlantillaRecordatorio', 'waIdioma', 'waVersion'].forEach(function (k) { c[k] = aTexto(raw[k], d[k]); });
    c.reglamento = aTexto(raw.reglamento, d.reglamento) || d.reglamento;
    c.contabilidadFormal = aBool(raw.contabilidadFormal, d.contabilidadFormal);
    c.regimen = String(aTexto(raw.regimen, d.regimen)).toUpperCase().replace(/[^A-Z0-9]/g, '') === '14D8' ? '14D8' : '14D3';
    c.sitioUrl = aTexto(raw.sitioUrl, d.sitioUrl).replace(/\/+$/, '');
    c.tema = aTexto(raw.tema, d.tema) || d.tema;
    c.presentacionTitulo = aTexto(raw.presentacionTitulo, d.presentacionTitulo) || d.presentacionTitulo;
    c.presentacion = aTexto(raw.presentacion, d.presentacion);
    ['sitioWeb', 'redInstagram', 'redFacebook', 'redYoutube', 'redTiktok', 'redSpotify', 'mapsUrl', 'enlacesExtra', 'proaudixWeb', 'proaudixInstagram', 'proaudixFacebook', 'proaudixYoutube', 'proaudixEnlaces'].forEach(function (k) { c[k] = aTexto(raw[k], d[k]); });
    c.heroTitulo = aTexto(raw.heroTitulo, d.heroTitulo) || d.heroTitulo; c.heroTexto = aTexto(raw.heroTexto, d.heroTexto) || d.heroTexto;
    ['verProduccion', 'verFicha', 'verPlanes', 'verGaleria', 'verEvaluaciones', 'verProaudix', 'verContacto', 'verTienda', 'verHonor', 'verCotizar', 'verReglamento'].forEach(function (k) { c[k] = aBool(raw[k], d[k]); });
    c.proaudixTexto = aTexto(raw.proaudixTexto, d.proaudixTexto) || d.proaudixTexto;
    c.proaudixWhatsapp = String(aTexto(raw.proaudixWhatsapp, d.proaudixWhatsapp)).replace(/\D/g, '');
    ['precioEnsayoHora', 'precioGrabacionHora', 'precioExtraEquipo', 'precioVideo', 'precioRaw', 'abonoPorHora',
      'plan8', 'plan12', 'ensayoMinHoras', 'ensayoMaxHoras', 'grabacionMinHoras', 'grabacionMaxHoras', 'addonsMinHoras',
      'anticipacionMinHoras', 'anticipacionMaxDias', 'planMaxDias', 'minutosReserva', 'horasAnulacion', 'retencionPorHora', 'precioEnsayoConveniente', 'precioGrabacionConveniente', 'convenienteDesde', 'convenienteHasta', 'reagendoSemanas', 'reagendoCambios', 'repartoSalaJC', 'repartoSalaJaime', 'repartoEstudioJC', 'repartoEstudioEstudio', 'aporteLuzProAudix', 'cajaChicaMensual'
    ].forEach(function (k) { c[k] = aNumero(raw[k], d[k]); });
    c.minutosReserva = Math.max(5, Math.min(180, Math.round(c.minutosReserva) || d.minutosReserva));
    c.extraModo = String(aTexto(raw.extraModo, d.extraModo)).toLowerCase() === 'sesion' ? 'sesion' : 'hora';
    c.escalaGrabacion = aTexto(raw.escalaGrabacion, d.escalaGrabacion);
    c.escala = parseEscala(c.escalaGrabacion);
    c.pagoTransferencia = aBool(raw.pagoTransferencia, d.pagoTransferencia);
    c.datosTransferencia = aTexto(raw.datosTransferencia, d.datosTransferencia);
    c.anulacionTardiaRetiene = aBool(raw.anulacionTardiaRetiene, d.anulacionTardiaRetiene);
    c.pagoOnline = aBool(raw.pagoOnline, d.pagoOnline);
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
  balance: 'Balance'
};

/** Posición (desde 1) de cada columna de la hoja Reservas. No cambies el orden. */
var RES = {
  codigo: 1, creada: 2, estado: 3, servicio: 4, fecha: 5, inicio: 6, fin: 7, horas: 8, banda: 9, contacto: 10,
  telefono: 11, correo: 12, extras: 13, video: 14, raw: 15, total: 16, abono: 17, saldo: 18,
  zurdo: 19, voces: 20, comentarios: 21, evento: 22,
  base: 23, extrasM: 24, videoM: 25, rawM: 26, abonoRecibido: 27, retenido: 28, devolver: 29, plan: 30, recordatorio: 31
};
var ENCABEZADO_RESERVAS = ['Código', 'Creada', 'Estado', 'Servicio', 'Fecha', 'Inicio', 'Fin', 'Horas', 'Banda', 'Contacto',
  'Teléfono', 'Correo', 'Equipo extra', 'Video', 'Material en bruto', 'Total', 'Abono', 'Saldo',
  'Baterista zurdo', 'Micrófonos de voz', 'Comentarios', 'ID del evento',
  'Monto horas', 'Monto extras', 'Monto video', 'Monto material bruto', 'Abono recibido', 'Abono retenido', 'Abono a devolver', 'Plan', 'Recordatorio WhatsApp'];

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
        return json_({ ok: true, config: configPublica_(), tienda: tiendaPublica_(), ahora: ahoraChile_() });
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
    if (!Reglas.aBool(r[5], false) || !r[1]) return;
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
 *  - No asiste: el abono recibido queda retenido.
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
    retenido = recibido ? abono : 0; devolver = 0;
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
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, Reglas.TZ, 'yyyy-MM-dd');
  var s = String(v || '').trim();
  return Reglas.fechaValida(s) ? s : '';
}

/** Acepta 19, "19", "19:00", "19:30" (se toma la hora). Devuelve null si está vacío. */
function aHora_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return v < 1 ? Math.round(v * 24) : Math.floor(v);
  var m = /^\s*(\d{1,2})/.exec(String(v));
  return m ? Number(m[1]) : null;
}

/** Evita que un texto empiece con = + - @ y se ejecute como fórmula en la hoja. */
function textoSeguro_(v) {
  var s = String(v === null || v === undefined ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function abrirBd_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Falta ejecutar la función instalar().');
  return SpreadsheetApp.openById(id);
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
  prepararSimple_(ss, HOJAS.clientes, ['Teléfono', 'Correo', 'Banda', 'Contacto', 'Reservas', 'Primera reserva', 'Última reserva', 'Carpeta de material (Drive)', 'Nombre', 'Apellido'], [], { 1: '@', 6: 'yyyy-mm-dd', 7: 'yyyy-mm-dd' });
  prepararSimple_(ss, HOJAS.bloqueos, ['Fecha', 'Desde (hora)', 'Hasta (hora)', 'Motivo'], [], { 1: 'yyyy-mm-dd', 2: '@', 3: '@' });
  prepararTienda_(ss);
  prepararBebestibles_(ss);
  prepararSimple_(ss, HOJAS.ventas, ['Fecha', 'Producto', 'Cantidad', 'Precio unitario', 'Total', 'Tipo', 'Pago', 'Vendedor', 'Nota', 'Fecha de cobro', 'ID'], [], { 1: 'yyyy-mm-dd', 4: '$#,##0', 5: '$#,##0', 10: 'yyyy-mm-dd' });
  ss.getSheetByName(HOJAS.ventas).getRange(2, VT.pago, 5000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(PAGOS_VENTA.concat([PAGO.ANULADA]), true).setAllowInvalid(false).build());
  prepararSimple_(ss, HOJAS.costos, ['Mes (AAAA-MM)', 'Luz total (boleta)', 'Aporte ProAudix', 'Caja chica', 'Otros gastos de sala', 'Notas', 'Luz con factura a nombre del negocio (SI/NO)'], [], { 1: '@', 2: '$#,##0', 3: '$#,##0', 4: '$#,##0', 5: '$#,##0' });
  prepararSimple_(ss, HOJAS.compras, ['Fecha', 'Proveedor', 'RUT proveedor', 'Tipo de documento', 'N° documento', 'Descripción', 'Categoría', 'Neto', 'IVA', 'Total pagado'], [], { 1: 'yyyy-mm-dd', 3: '@', 5: '@', 8: '$#,##0', 9: '$#,##0', 10: '$#,##0' });
  prepararSimple_(ss, HOJAS.historial, ['Mes', 'Cerrado el', 'Ingresos brutos', 'Total sala', 'Total estudio', 'Material en bruto', 'Tienda y bebestibles', 'Luz que paga la sala', 'Utilidad de la sala', 'Juan Carlos', 'Jaime', 'Estudio', 'IVA a pagar', 'Remanente de IVA', 'PPM', 'Utilidad tributaria', 'Provisión impuesto 1ª categoría'], [], { 1: '@', 2: 'yyyy-mm-dd hh:mm' });
  prepararSimple_(ss, HOJAS.planes, ['Código', 'Creado', 'Plan', 'Horas por sesión', 'Banda', 'Contacto', 'Teléfono', 'Correo', 'Total', 'Pagado', 'Sesiones agendadas'], [], { 2: 'yyyy-mm-dd', 7: '@', 9: '$#,##0' });
  prepararSimple_(ss, HOJAS.muestras, ['Grupo (micrófono, canción o ensayo)', 'Tipo', 'Etiqueta', 'Enlace del audio', 'Descripción (solo la primera fila del grupo)', 'Visible'],
    [['Shure SM57', 'Micrófono', 'Caja', 'https://drive.google.com/file/d/ID_DEL_ARCHIVO/view', 'Escribe aquí qué es y para qué lo usas.', 'NO']], { 6: '@' });
  prepararSimple_(ss, HOJAS.honor, ['Fecha', 'Estado', 'Banda', 'Teléfono', 'Correo', 'Logo (URL)', 'Instagram', 'Enlace', 'YouTube', 'Reseña', 'Género', 'Formación'], [], { 1: 'yyyy-mm-dd', 4: '@' });
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
    ['msgGracias', d.msgGracias, 'Texto de agradecimiento y petición de reseña.'],
    ['waAutoActivo', 'NO', 'SI = el recordatorio del día anterior se envía solo por la API de WhatsApp Business (requiere cuenta de Meta, plantilla aprobada y token). Ver portal > Mensajes de WhatsApp.'],
    ['waPhoneId', '', 'ID del número de WhatsApp Business (en Meta, no es el teléfono).'],
    ['waPlantillaRecordatorio', '', 'Nombre de la plantilla de recordatorio aprobada por Meta.'],
    ['waIdioma', d.waIdioma, 'Código de idioma de la plantilla (es, es_CL…).'],
    ['waVersion', d.waVersion, 'Versión de la API Graph de Meta (por ejemplo v23.0). Meta retira versiones antiguas: si falla, revisa la vigente.'],
    ['reagendoSemanas', d.reagendoSemanas, 'Plazo máximo (semanas) para reagendar una reserva. Se muestra en el reglamento; el reagendado hoy se coordina por WhatsApp.'],
    ['reagendoCambios', d.reagendoCambios, 'Máximo de cambios por reserva. Se muestra en el reglamento.'],
    ['reglamento', d.reglamento, 'Reglamento interno que ve el cliente. ## = título de sección, - = viñeta. {horasAnulacion}, {retencionPorHora}, {reagendoSemanas}, {reagendoCambios} y {minutosReserva} se reemplazan solos. Se edita también desde el portal.'],
    ['repartoSalaJC', d.repartoSalaJC, 'Sala de ensayo: % de Juan Carlos. Junto con repartoSalaJaime debe sumar 100.'],
    ['repartoSalaJaime', d.repartoSalaJaime, 'Sala de ensayo: % de Jaime.'],
    ['repartoEstudioJC', d.repartoEstudioJC, 'Estudio de grabación: % de Juan Carlos. Junto con repartoEstudioEstudio debe sumar 100.'],
    ['repartoEstudioEstudio', d.repartoEstudioEstudio, 'Estudio de grabación: % que queda para el estudio.'],
    ['aporteLuzProAudix', d.aporteLuzProAudix, 'Lo que ProAudix aporta cada mes a la boleta de luz (valor por defecto; cada mes se puede cambiar en CostosMes).'],
    ['cajaChicaMensual', d.cajaChicaMensual, 'Caja chica que se aparta cada mes antes de repartir (valor por defecto).'],
    ['contabilidadFormal', 'NO', 'SI o NO. SI activa la contabilidad formal mensual: IVA, PPM, impuesto simulado y registro de compras (hoja Tributario). Actívala cuando inicies actividades en el SII.'],
    ['regimen', '14D3', '14D3 = Pro Pyme general (la empresa paga Primera Categoría) o 14D8 = Pro Pyme transparente (tributan los dueños). Confírmalo con tu contador.'],
    ['sitioUrl', '', 'Dirección pública del sitio, sin barra final. Ejemplo: https://rockerioproducciones.cl (sirve para armar los enlaces que compartes).'],
    ['tema', 'rockerio', 'Tema visual por defecto: rockerio, medianoche, vino, bosque, grafito, azufre, abismo, cobre, ciruela o carbon.'],
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
    /* 40 */ ['  Estudio', '=B39*C40', '=' + cn('repartoEstudioEstudio', 60) + '/100'],
    /* 41 */ ['  Juan Carlos (estudio)', '=B39*C41', '=' + cn('repartoEstudioJC', 40) + '/100'],
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
  [HOJAS.reservas, HOJAS.config, HOJAS.horarios, HOJAS.bloqueos, HOJAS.inhabiles, HOJAS.clientes, HOJAS.planes, HOJAS.solicitudes, HOJAS.tienda, HOJAS.bebestibles, HOJAS.ventas, HOJAS.costos, HOJAS.compras, HOJAS.historial, HOJAS.tributario, HOJAS.muestras, HOJAS.honor, HOJAS.resenas, HOJAS.balance]
    .forEach(function (nombre, i) {
      var sh = ss.getSheetByName(nombre);
      if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
    });
  ss.setActiveSheet(ss.getSheetByName(HOJAS.reservas));
}

/* ===== Admin ===== */
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
  var estado = estadoNorm_(p.estado) || EST.CON_ABONO;
  var extras = Math.max(0, Math.min(6, Number(p.extras) || 0));
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
    fila[RES.zurdo - 1] = 'NO'; fila[RES.voces - 1] = 0; fila[RES.comentarios - 1] = textoSeguro_('Reserva manual' + (p.comentario ? ' · ' + limpiar_(p.comentario, 300) : ''));
    fila[RES.evento - 1] = evento.getId();
    fila[RES.base - 1] = c.base; fila[RES.extrasM - 1] = c.extras; fila[RES.videoM - 1] = c.video; fila[RES.rawM - 1] = c.raw; fila[RES.abonoRecibido - 1] = 'NO';
    sh.appendRow(fila);
    var f = sh.getLastRow();
    sh.getRange(f, RES.telefono).setNumberFormat('@').setValue(tel);
    if (estado !== EST.SIN_ABONO) sincronizarEstado_(sh, f);
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
  return { hoy: hoy, reservas: reservas, bloqueos: bloqueos, inhabiles: inhabiles, clientes: clientes, estados: ESTADOS, wa: waDatos_() };
}

/* ===== Contenido ===== */
/**
 * Contenido que alimenta el sitio: muestras de audio, cuadro de honor, reseñas y cotizaciones.
 * Todo lo que envía el público queda PENDIENTE hasta que tú lo apruebas en el portal.
 */

var ESTADOS_MOD = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
var ESTADOS_SOL = ['NUEVA', 'COTIZADA', 'ACEPTADA', 'RECHAZADA', 'CERRADA'];
var TIPOS_SOL = { plan8: 'Plan mensual de 8 horas', plan12: 'Plan mensual de 12 horas', produccion: 'Producción musical', otro: 'Otra consulta' };
var TIPOS_MUESTRA = ['Micrófono', 'Canción', 'Ensayo', 'Otro'];

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
  var e = null;
  if (banda.length < 2) e = 'Escribe el nombre de tu banda o proyecto.';
  else if (!Reglas.telefonoValido(tel)) e = 'Revisa tu teléfono.';
  else if (!Reglas.correoValido(correo)) e = 'Revisa tu correo.';
  else if (String(sol.logo || '').trim() && !logo) e = 'El logo debe ser un enlace que empiece con https://';
  else if (String(sol.enlace || '').trim() && !enlace) e = 'El enlace debe empezar con https://';
  else if (String(sol.youtube || '').trim() && !yt) e = 'El enlace de YouTube no es válido.';
  else if (String(sol.instagram || '').trim() && !ig) e = 'El Instagram no es válido (usa @usuario o el enlace).';
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
    sh.appendRow([new Date(), 'PENDIENTE', textoSeguro_(banda), tel, textoSeguro_(correo), logo, ig, enlace, yt, textoSeguro_(resena), textoSeguro_(genero), textoSeguro_(formacion)]);
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

function avisarAdmin_(asunto, cuerpo) {
  try {
    var a = getCfg_().correoAdmin;
    if (a) MailApp.sendEmail({ to: a, subject: asunto, body: cuerpo, name: 'Rockerío' });
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
    sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues().forEach(function (r) {
      if (String(r[1]) !== 'APROBADA') return;
      out.honor.push({ banda: String(r[2]), logo: String(r[5]), instagram: String(r[6]), enlace: String(r[7]), youtube: String(r[8]), resena: String(r[9]), genero: String(r[10] || ''), formacion: String(r[11] || '') });
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
  return leerModeracion_(HOJAS.honor, 12, function (r) {
    return { estado: String(r[1]), banda: String(r[2]), telefono: String(r[3]), correo: String(r[4]), logo: String(r[5]), instagram: String(r[6]), enlace: String(r[7]), youtube: String(r[8]), resena: String(r[9]), genero: String(r[10] || ''), formacion: String(r[11] || '') };
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
  l.push('Cualquier duda, escríbenos por aquí.');
  return l.join('\n');
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
  MailApp.sendEmail({ to: String(r[5]), subject: 'Cotización · ' + o.tipo + ' · ' + cfg.nombreNegocio, body: textoCotizacion_(cfg, o) + '\n\n' + cfg.nombreNegocio + '\n' + cfg.direccion, name: cfg.nombreNegocio, replyTo: cfg.correoAdmin || '' });
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
  var tel = String(d.telefono || '').trim() ? Reglas.normalizarTelefono(d.telefono) : '';
  if (tel && !Reglas.telefonoValido(tel)) throw new Error('Revisa el teléfono.');
  var correo = limpiar_(d.correo, 120).toLowerCase();
  if (correo && !Reglas.correoValido(correo)) throw new Error('Revisa el correo.');
  if (String(d.logoB64 || '').trim()) logo = guardarLogo_(d.logoB64, banda);
  return conBloqueo_(function () {
    abrirBd_().getSheetByName(HOJAS.honor).appendRow([new Date(), 'APROBADA', textoSeguro_(banda), tel, textoSeguro_(correo), logo, ig, enlace, yt, textoSeguro_(limpiar_(d.resena, 500)), textoSeguro_(limpiar_(d.genero, 60)), textoSeguro_(limpiar_(d.formacion, 120))]);
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
function registrarVenta_(tipo, fila, cantidad, pago, vendedor, nota) {
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
  abrirBd_().getSheetByName(HOJAS.ventas).appendRow([new Date(), textoSeguro_(String(r[1])), cantidad, precio, precio * cantidad,
    ETIQUETA_TIPO[tipoCatalogo_(tipo)], pago, textoSeguro_(limpiar_(vendedor, 40)), textoSeguro_(limpiar_(nota, 120)), '', id]);
  return id;
}

/** Registra un carrito completo (varios productos) con una sola forma de pago. Valida todo antes de descontar nada.
 *  items = [{fila, cantidad}]. Debe llamarse dentro de conBloqueo_. Devuelve los ids de venta. */
function registrarCarrito_(tipo, items, pago, vendedor, nota) {
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
  return Object.keys(juntos).map(function (k) { return registrarVenta_(tipo, Number(k), juntos[k], pago, vendedor, nota); });
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

function adminVender(tipo, fila, cantidad, pago, nota) {
  exigirAdmin_();
  return conBloqueo_(function () { registrarVenta_(tipo, fila, cantidad, pago, 'Administración', nota || ''); return adminResumen(); });
}
/** Venta por carrito desde el portal: items = [{fila, cantidad}], pago = una de PAGOS_VENTA. */
function adminVenderCarrito(tipo, items, pago, nota) {
  exigirAdmin_();
  return conBloqueo_(function () { var ids = registrarCarrito_(tipo, items, pago, 'Administración', nota || ''); var r = adminResumen(); r.idsVenta = ids; return r; });
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
  return Object.keys(t).map(function (k) { return { token: k, nombre: t[k].nombre, creado: t[k].creado || '' }; })
    .sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; });
}

function adminCrearSocio(nombre) {
  exigirAdmin_();
  nombre = limpiar_(nombre, 40);
  if (!nombre) throw new Error('Escribe el nombre del socio.');
  return conBloqueo_(function () {
    var t = leerTokens_();
    if (Object.keys(t).length >= 10) throw new Error('Máximo 10 enlaces de socios.');
    t[nuevoToken_()] = { nombre: nombre, creado: ahoraChile_().fecha };
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
    t[nuevoToken_()] = { nombre: datos.nombre, creado: ahoraChile_().fecha };
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

/** Devuelve el nombre del socio o '' si el token no vale. Frena a quien prueba tokens al azar. */
function socioDe_(token) {
  token = String(token || '');
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('tokmal') || 0) >= 40) return '';
  var t = leerTokens_(), ok = /^[a-f0-9]{64}$/.test(token) && t[token];
  if (!ok) { cache.put('tokmal', String(Number(cache.get('tokmal') || 0) + 1), 600); return ''; }
  return t[token].nombre;
}

function catalogoSocios_(tipo) {
  return leerProductos_(tipo).filter(function (p) { return p.visible && p.precio !== ''; })
    .map(function (p) { return { fila: p.fila, categoria: p.categoria, nombre: p.nombre, detalle: p.detalle, precio: p.precio, stock: p.stock, foto: fotoValida_(p.foto) }; });
}

/** Agenda de los próximos 30 días: solo banda, hora, servicio y estado. Sin teléfonos, correos ni montos. */
function agendaDetalle_() {
  var ss = abrirBd_(), hoy = ahoraChile_().fecha, fin = Reglas.sumarDias(hoy, 30), out = [];
  var sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    var f = aFechaIso_(r[RES.fecha - 1]), e = estadoNorm_(r[RES.estado - 1]);
    if (!r[RES.codigo - 1] || f < hoy || f > fin || e === EST.ANULADA) return;
    out.push({ fecha: f, inicio: String(r[RES.inicio - 1]), fin: String(r[RES.fin - 1]), servicio: String(r[RES.servicio - 1]), banda: String(r[RES.banda - 1]), estado: e });
  });
  var sb = ss.getSheetByName(HOJAS.bloqueos), m = sb.getLastRow();
  if (m > 1) sb.getRange(2, 1, m - 1, 4).getValues().forEach(function (r) {
    var f = aFechaIso_(r[0]);
    if (f && f >= hoy && f <= fin) out.push({ fecha: f, inicio: String(r[1] || ''), fin: String(r[2] || ''), servicio: 'Bloqueo', banda: String(r[3] || 'No disponible'), estado: 'Bloqueo' });
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
  var v = datosVentas_(mes);
  return { ok: true, socio: nombre, ahora: ahoraChile_(), agenda: agendaDetalle_(), musica: catalogoSocios_('musica'), bebestibles: catalogoSocios_('bebestible'),
    resumen: v.resumen, ventas: v.ventas, pendientes: v.pendientes, general: resumenGeneral_(mes) };
}

function sociosVender_(sol) {
  var nombre = socioDe_(sol.t);
  if (!nombre) return { ok: false, codigo: 'ENLACE', error: 'Enlace no válido.' };
  if (limiteGlobal_('socios_venta', 200)) return { ok: false, codigo: 'TASA', error: 'Demasiadas ventas seguidas. Intenta más tarde.' };
  try {
    var id = conBloqueo_(function () { return registrarVenta_(tipoCatalogo_(sol.tipo), sol.fila, sol.cantidad, sol.pago, nombre, sol.nota); });
    return { ok: true, id: id };
  } catch (e) { return { ok: false, codigo: 'DATOS', error: String(e.message || e) }; }
}

/** Venta por carrito desde el enlace de socios: sol = {t, tipo, items:[{fila,cantidad}], pago, nota}. */
function sociosCarrito_(sol) {
  var nombre = socioDe_(sol.t);
  if (!nombre) return { ok: false, codigo: 'ENLACE', error: 'Enlace no válido.' };
  if (limiteGlobal_('socios_venta', 200)) return { ok: false, codigo: 'TASA', error: 'Demasiadas ventas seguidas. Intenta más tarde.' };
  try {
    var ids = conBloqueo_(function () { return registrarCarrito_(tipoCatalogo_(sol.tipo), sol.items, sol.pago, nombre, sol.nota); });
    return { ok: true, ids: ids };
  } catch (e) { return { ok: false, codigo: 'DATOS', error: String(e.message || e) }; }
}

function sociosCobrar_(sol) {
  var nombre = socioDe_(sol.t);
  if (!nombre) return { ok: false, codigo: 'ENLACE', error: 'Enlace no válido.' };
  try {
    conBloqueo_(function () { cobrarVenta_(String(sol.id || ''), sol.pago, nombre); });
    return { ok: true };
  } catch (e) { return { ok: false, codigo: 'DATOS', error: String(e.message || e) }; }
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
  ['tema', 'Tema visual por defecto', 'lista', 'Funciones', 'Colores del sitio.', ['rockerio', 'medianoche', 'vino', 'bosque', 'grafito', 'azufre', 'abismo', 'cobre', 'ciruela', 'carbon']],
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
  ['repartoEstudioJC', 'Estudio: % Juan Carlos', 'num', 'Reparto de ingresos', 'Estudio de grabación. Debe sumar 100 con el del estudio.', 100],
  ['repartoEstudioEstudio', 'Estudio: % que queda al estudio', 'num', 'Reparto de ingresos', 'Estudio de grabación. Debe sumar 100 con el de Juan Carlos.', 100],
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
  if (get('repartoEstudioJC') + get('repartoEstudioEstudio') !== 100) throw new Error('En el estudio, los porcentajes de Juan Carlos y del estudio deben sumar 100.');
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
