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
function adminEliminarHonor(fila) {
  exigirAdmin_();
  return conBloqueo_(function () {
    var sh = abrirBd_().getSheetByName(HOJAS.honor); sh.deleteRow(filaProducto_(sh, fila));
    limpiarCacheContenido_();
    return adminResumen();
  });
}
