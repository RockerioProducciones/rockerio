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
    var foto2 = String(m.foto2 || '').trim() ? urlImagenSitio_(m.foto2) : '', foto3 = String(m.foto3 || '').trim() ? urlImagenSitio_(m.foto3) : '', audios = [];
    (Array.isArray(m.audios) ? m.audios : []).slice(0, 3).forEach(function (a) { a = a || {}; var en = String(a.enlace || '').trim(); if (enlaceAudioValido_(en)) audios.push({ etiqueta: limpiar_(a.etiqueta, 40), enlace: en }); });
    out.push({ nombre: nombre, foto: foto || '', foto2: foto2 || '', foto3: foto3 || '', uso: limpiar_(m.uso, 120), descripcion: limpiar_(m.descripcion, 400), audios: audios });
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
    registrarCambio_('Sitio · ' + parte, vacio ? 'Vuelto al contenido original' : 'Contenido editado', f ? sh.getRange(f, 2).getValue() : '', vacio ? '' : txt);
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
  registrarCambio_('Foto subida', limpiar_(p.nombre, 60), '', 'https://lh3.googleusercontent.com/d/' + id);
  return 'https://lh3.googleusercontent.com/d/' + id;
}

/** Datos para armar el editor: lo guardado y la dirección del sitio. El sitio publicado lo lee el navegador (no requiere permisos extra de Google). */
function adminSitioDatos() {
  exigirAdmin_();
  var cfg = getCfg_();
  return { sitio: leerSitio_(), base: String(cfg.sitioUrl || '').replace(/\/+$/, '') || 'https://rockerioproducciones.cl', tema: cfg.tema, html: '', ficha: null, galeria: null, playlist: null, microfonos: null, aviso: '' };
}
