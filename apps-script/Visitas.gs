/**
 * Estadísticas de visitas del sitio (anónimas).
 * El sitio envía una vez por visita: ciudad/región aproximadas (por la red del visitante), sección, dispositivo y origen.
 * NO se guarda IP, ni identificadores, ni nombres. Se conservan 400 días.
 */
var HOJA_VISITAS = 'Visitas';
var ENCABEZADO_VISITAS = ['Fecha', 'Hora', 'País', 'Región', 'Ciudad', 'Sección', 'Dispositivo', 'Origen', 'Visita'];
var SECCIONES_VISITAS_ = ['inicio', 'reservar', 'nosotros', 'ficha', 'planes', 'galeria', 'opiniones', 'proaudix', 'contacto', 'tienda', 'bandas', 'vivo', 'cotizar', 'reglamento'];

function hojaVisitas_() {
  var ss = abrirBd_(), sh = ss.getSheetByName(HOJA_VISITAS);
  if (!sh) { sh = ss.insertSheet(HOJA_VISITAS); sh.getRange(1, 1, 1, ENCABEZADO_VISITAS.length).setValues([ENCABEZADO_VISITAS]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
/** Nombre de región en español (los servicios de ubicación la entregan a veces en inglés o con otro formato). */
function regionChile_(t) {
  var x = String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var tabla = [['arica', 'Arica y Parinacota'], ['tarapaca', 'Tarapacá'], ['antofagasta', 'Antofagasta'], ['atacama', 'Atacama'], ['coquimbo', 'Coquimbo'], ['valparaiso', 'Valparaíso'], ['metropolitan', 'Región Metropolitana'], ['santiago', 'Región Metropolitana'], ['higgins', "O'Higgins"], ['maule', 'Maule'], ['nuble', 'Ñuble'], ['biobio', 'Biobío'], ['bio bio', 'Biobío'], ['araucania', 'La Araucanía'], ['los rios', 'Los Ríos'], ['los lagos', 'Los Lagos'], ['aysen', 'Aysén'], ['magallanes', 'Magallanes']];
  for (var i = 0; i < tabla.length; i++) if (x.indexOf(tabla[i][0]) >= 0) return tabla[i][1];
  return String(t || '');
}
function lugarVisita_(t) { t = String(t || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'\-]/g, '').replace(/\s+/g, ' ').trim(); return t.slice(0, 40); }

/** Registro de una visita (acción pública «visita»). Siempre responde ok para no entorpecer al visitante. */
function registrarVisita_(sol) {
  try {
    if (!getCfg_().visitasActivo) return { ok: true };
    if (limiteGlobal_('visita', 4000)) return { ok: true };
    var ah = ahoraChile_();
    var sec = SECCIONES_VISITAS_.indexOf(String(sol.seccion)) >= 0 ? String(sol.seccion) : 'inicio';
    var disp = ['Móvil', 'Tablet', 'Escritorio'].indexOf(String(sol.dispositivo)) >= 0 ? String(sol.dispositivo) : 'Escritorio';
    var org = ['Directo', 'Instagram', 'Facebook', 'Google', 'WhatsApp', 'YouTube', 'Otro'].indexOf(String(sol.origen)) >= 0 ? String(sol.origen) : 'Otro';
    var pais = lugarVisita_(sol.pais) || 'Sin dato', region = lugarVisita_(sol.region), ciudad = lugarVisita_(sol.ciudad);
    if (/^chile$/i.test(pais)) { pais = 'Chile'; region = lugarVisita_(regionChile_(region)); }
    hojaVisitas_().appendRow([ah.fecha, Math.floor(ah.hora), pais, region || 'Sin dato', ciudad || 'Sin dato', sec, disp, org, sol.vista ? 'Vista' : (sol.nueva ? 'Nueva' : 'Recurrente')]);
    if (Math.random() < 0.01) podarVisitas_();
  } catch (e) { console.error(e && e.stack || e); }
  return { ok: true };
}
/** Borra lo anterior a 400 días (las filas están en orden de fecha). */
function podarVisitas_() {
  var sh = hojaVisitas_(), n = sh.getLastRow(); if (n < 2) return;
  var lim = Reglas.sumarDias(ahoraChile_().fecha, -400), f = sh.getRange(2, 1, n - 1, 1).getValues(), k = 0;
  while (k < f.length && aFechaIso_(f[k][0]) < lim) k++;
  if (k > 0) sh.deleteRows(2, k);
}

/** Reporte para el portal: últimos «dias» días (7, 30, 90 o 365). */
function adminVisitas(dias) {
  exigirAdmin_();
  dias = [7, 30, 90, 365].indexOf(Number(dias)) >= 0 ? Number(dias) : 30;
  var ah = ahoraChile_(), hoy = ah.fecha, desde = Reglas.sumarDias(hoy, -(dias - 1));
  var sh = hojaVisitas_(), n = sh.getLastRow(), filas = n > 1 ? sh.getRange(2, 1, n - 1, ENCABEZADO_VISITAS.length).getValues() : [];
  var o = { dias: dias, desde: desde, hoy: hoy, activo: !!getCfg_().visitasActivo, total: 0, vistas: 0, visitasHoy: 0, nuevas: 0, serie: [], porRegion: {}, porCiudad: {}, porPais: {}, porSeccion: {}, porDispositivo: {}, porOrigen: {}, porHora: [], primera: '' };
  for (var h = 0; h < 24; h++) o.porHora.push(0);
  var dia = {}; for (var i = 0; i < dias; i++) dia[Reglas.sumarDias(desde, i)] = 0;
  var suma = function (m, k) { m[k] = (m[k] || 0) + 1; };
  if (filas.length) o.primera = aFechaIso_(filas[0][0]);
  filas.forEach(function (r) {
    var f = aFechaIso_(r[0]); if (f < desde || f > hoy) return;
    suma(o.porSeccion, r[5]); o.vistas++;
    if (r[8] === 'Vista') return; // las vistas de otras secciones no cuentan como visita
    o.total++; dia[f]++; if (f === hoy) o.visitasHoy++;
    if (r[8] === 'Nueva') o.nuevas++;
    suma(o.porPais, r[2]); suma(o.porRegion, r[3]); suma(o.porCiudad, r[4] + (r[3] && r[3] !== 'Sin dato' ? ' · ' + r[3] : '')); suma(o.porDispositivo, r[6]); suma(o.porOrigen, r[7]);
    var hh = Number(r[1]); if (hh >= 0 && hh < 24) o.porHora[hh]++;
  });
  Object.keys(dia).sort().forEach(function (f) { o.serie.push([f, dia[f]]); });
  ['porRegion', 'porCiudad', 'porPais', 'porSeccion', 'porDispositivo', 'porOrigen'].forEach(function (k) {
    o[k] = Object.keys(o[k]).map(function (x) { return [x, o[k][x]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, k === 'porCiudad' ? 15 : 12);
  });
  return o;
}
