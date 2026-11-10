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
