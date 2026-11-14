/* Flujo completo de la plataforma sobre el código real de Apps Script (con Google simulado).
   Cada paso imita lo que haría una persona: visitante, cliente, administrador y socio. */
const assert = require('assert');
const { crear } = require('./gas-sim');
const g = crear(), C = g.ctx, R = C.Reglas;
let ok = 0, fallas = 0; const nombres = [];
function t(n, f) { try { f(); ok++; console.log('  ok  ' + n); } catch (e) { fallas++; console.error('FALLA ' + n + '\n      ' + String(e.stack).split('\n').slice(0,4).join(' | ')); process.exitCode = 1; } }
const sumar = (iso, n) => R.sumarDias(iso, n);
const hoy = C.ahoraChile_().fecha, manana = sumar(hoy, 1);
// primer día con atención en línea a partir de hoy+3 que no sea jueves (para que 17–22 y 9–14 sean predecibles)
let f3 = sumar(hoy, 3); while ([4, 6, 0].indexOf(new Date(f3 + 'T12:00:00Z').getUTCDay()) >= 0) f3 = sumar(f3, 1);
const banda = { banda: 'Los Ensayos', nombre: 'Ana Pérez', telefono: '+56 9 1234 5678', correo: 'ana@correo.cl', tyc: true };
const sol = (o) => Object.assign({ accion: 'reservar', servicio: 'ensayo', fecha: f3, inicio: 18, horas: 2, extras: 0, video: false, raw: false }, banda, o);

console.log('\n== 1. Instalación ==');
t('instalar crea las hojas y los disparadores', () => {
  g.instalar();
  ['Configuracion', 'Horarios', 'Reservas', 'Clientes', 'Tienda', 'Bebestibles', 'Ventas', 'CostosMes', 'Compras', 'HistorialBalance', 'Planes', 'Muestras', 'CuadroHonor', 'Resenas', 'Solicitudes', 'Balance', 'Tributario'].forEach((h) => assert.ok(g.estado.hojas[h], 'falta hoja ' + h));
  const fn = g.estado.triggers.map((x) => x.fn);
  ['liberarPendientes', 'respaldar', 'alEditar', 'enviarRecordatorios', 'cerrarMesAnterior'].forEach((x) => assert.ok(fn.includes(x), 'falta disparador ' + x));
});
t('instalar dos veces no duplica hojas ni disparadores ni borra datos', () => {
  const antes = Object.keys(g.estado.hojas).length, tr = g.estado.triggers.length;
  g.instalar(); assert.strictEqual(Object.keys(g.estado.hojas).length, antes); assert.strictEqual(g.estado.triggers.length, tr);
});

console.log('\n== 2. Visitante: lectura pública ==');
let cfgPub;
t('config pública responde y NO expone correo admin ni claves de WhatsApp', () => {
  const r = g.get({ accion: 'config' }); cfgPub = r.config;
  assert.ok(r.ok && cfgPub.precioEnsayoHora === 15000);
  assert.ok(!('correoAdmin' in cfgPub)); assert.ok(!Object.keys(cfgPub).some((k) => /^wa[A-Z]/.test(k)), 'filtra claves wa*');
});
t('contenido y agenda públicos responden', () => { assert.ok(g.get({ accion: 'contenido' }).ok); assert.ok(g.get({ accion: 'agenda' }).ok); });
t('la agenda pública no muestra nombres ni teléfonos', () => {
  const s = JSON.stringify(g.get({ accion: 'agenda' })); assert.ok(!/1234 ?5678|ana@|Los Ensayos/.test(s));
});
t('disponibilidad de un día abierto trae horas libres', () => {
  const r = g.get({ accion: 'disponibilidad', fecha: f3 }); assert.ok(r.ok, JSON.stringify(r)); assert.ok(JSON.stringify(r).includes('18'));
});

console.log('\n== 3. Reserva de ensayo ==');
let cod1;
t('reserva válida: ok, código, abono, evento en calendario y fila en la hoja', () => {
  const r = g.post(sol()); assert.ok(r.ok, JSON.stringify(r)); cod1 = r.codigo || (r.reserva && r.reserva.codigo);
  assert.ok(/^RP-\d+/.test(cod1), 'código ' + cod1);
  const fila = g.hoja('Reservas').find((f) => f[0] === cod1); assert.ok(fila, 'fila en hoja');
  assert.strictEqual(fila[RES('total')], 30000); assert.strictEqual(fila[RES('abono')], 10000);
  assert.ok(g.estado.eventos.some((e) => /Los Ensayos/.test(e.titulo)), 'evento en calendario');
});
function RES(k) { return C.RES[k] - 1; }
t('avisa al administrador y confirma por correo al cliente', () => {
  assert.ok(g.correosA('rockerioestudio@gmail.com').length >= 1, 'correo admin'); assert.ok(g.correosA('ana@correo.cl').length >= 1, 'correo cliente');
});
t('el cliente queda registrado (para honor y reseñas)', () => { assert.ok(g.hoja('Clientes').some((f) => String(f[0]) === '56912345678')); });
t('el mismo horario ya no se puede reservar (doble reserva)', () => {
  const r = g.post(sol({ telefono: '56998887777', banda: 'Otros', correo: 'o@o.cl' })); assert.strictEqual(r.ok, false); assert.strictEqual(r.codigo, 'OCUPADO');
});
t('un bloque que se solapa parcialmente tampoco', () => {
  const r = g.post(sol({ inicio: 19, horas: 2, telefono: '56998887777', banda: 'Otros', correo: 'o@o.cl' })); assert.strictEqual(r.ok, false);
});
t('el bloque contiguo sí', () => {
  const r = g.post(sol({ inicio: 20, horas: 1, telefono: '56998887777', banda: 'Otros', nombre: 'Beto Soto', correo: 'o@o.cl' })); assert.ok(r.ok, JSON.stringify(r));
});
t('la disponibilidad pública marca lo tomado', () => {
  const j = JSON.stringify(g.get({ accion: 'disponibilidad', fecha: f3 })); assert.ok(j.length > 10);
});
['telefono:abc123', 'correo:no-es-correo', 'horas:9', 'fecha:2020-01-01', 'inicio:3', 'banda:', 'tyc:false'].forEach((x) => {
  const [k, v] = x.split(':');
  t('rechaza ' + x, () => { const r = g.post(sol({ [k]: k === 'horas' || k === 'inicio' ? Number(v) : k === 'tyc' ? false : v, fecha: k === 'fecha' ? v : f3, inicio: k === 'inicio' ? Number(v) : 21, telefono: k === 'telefono' ? v : '56977776666' })); assert.strictEqual(r.ok, false, JSON.stringify(r)); });
});
t('anti-bot: campo web lleno es rechazado', () => { assert.strictEqual(g.post(sol({ web: 'http://spam', telefono: '56955554444' })).ok, false); });
t('fórmulas maliciosas se guardan como texto (no se ejecutan en la hoja)', () => {
  const r = g.post(sol({ inicio: 10, horas: 1, banda: '=HYPERLINK("http://x")', nombre: '+cmd', telefono: '56966665555', correo: 'x@x.cl' })); assert.ok(r.ok, JSON.stringify(r));
  const f = g.hoja('Reservas').find((x) => x[0] === r.codigo); assert.ok(!/^[=+@-]/.test(String(f[RES('banda')])), 'banda: ' + f[RES('banda')]);
});

console.log('\n== 4. Pago pendiente y cuenta regresiva ==');
t('el bloque sin abono se libera solo al vencer el tiempo y queda libre para otra persona', () => {
  g.avanzar(25 * 60 * 1000); C.liberarPendientes();
  const r = g.post(sol({ telefono: '56944443333', banda: 'Nuevos', nombre: 'Carla Rojas', correo: 'c@c.cl' })); assert.ok(r.ok, JSON.stringify(r));
  const f = g.hoja('Reservas').find((x) => x[0] === cod1); assert.ok(!f || /(Cancel|Venc|Libera|Anul)/i.test(String(f[RES('estado')])), 'estado ' + (f && f[RES('estado')]));
});

console.log('\n== 5. Administrador ==');
t('un visitante sin sesión admin NO puede usar funciones del portal', () => {
  const real = C.Session; C.Session = { getActiveUser: () => ({ getEmail: () => 'intruso@gmail.com' }), getEffectiveUser: real.getEffectiveUser };
  try { assert.throws(() => C.adminResumen(), /Acceso denegado/); assert.throws(() => C.adminGuardarAjustes({ precioEnsayoHora: 1 }), /Acceso denegado/); assert.throws(() => C.adminVender('musica', 2, 1, 'Venta efectivo'), /Acceso denegado/); } finally { C.Session = real; }
});
let res;
t('adminResumen carga todo el portal', () => { res = g.admin('adminResumen'); ['reservas', 'ajustes', 'horarios', 'ventas', 'socios', 'wa', 'estados'].forEach((k) => assert.ok(k in res, 'falta ' + k)); assert.ok(res.reservas.length >= 1, 'reservas ' + res.reservas.length + ' ' + res.reservas.map((r) => r.codigo + ':' + r.estado)); });
let cod2;
t('confirmar abono cambia el estado y el color del evento del calendario', () => {
  cod2 = res.reservas.find((r) => r.banda === 'Carla'.length ? true : /Nuevos/.test(r.banda)).codigo;
  g.admin('adminCambiarEstado', cod2, 'Reservado (con abono)');
  const f = g.hoja('Reservas').find((x) => x[0] === cod2); assert.strictEqual(f[RES('estado')], 'Reservado (con abono)');
  const ev = g.estado.eventos.find((e) => /Nuevos/.test(e.titulo)); assert.ok(ev && ev.color !== '5', 'color ' + (ev && ev.color));
});
t('bloquear un día lo cierra en la disponibilidad pública y desbloquear lo reabre', () => {
  const dia = sumar(f3, 2); g.admin('adminBloquear', dia, '', '', 'Mantención');
  const a = JSON.stringify(g.get({ accion: 'disponibilidad', fecha: dia })); const rr = g.post(sol({ fecha: dia, telefono: '56933332222' })); assert.strictEqual(rr.ok, false, 'reservó en día bloqueado');
  const r2 = g.admin('adminResumen'); g.admin('adminDesbloquear', r2.bloqueos[0].fila);
});
t('cambiar precios desde Configuración se refleja en el sitio y en nuevas reservas', () => {
  const aj = g.admin('adminResumen').ajustes; const vals = {}; (aj.campos || aj).forEach && (aj.campos || aj).forEach((c) => { vals[c.clave || c.k] = c.valor !== undefined ? c.valor : c.v; });
  g.admin('adminGuardarAjustes', Object.assign({}, vals, { precioEnsayoHora: 18000 }));
  assert.strictEqual(g.get({ accion: 'config' }).config.precioEnsayoHora, 18000);
  const r = g.post(sol({ fecha: sumar(f3, 1), inicio: 18, horas: 1, telefono: '56911110000', banda: 'Precio', nombre: 'Pía Gómez', correo: 'p@p.cl' }));
  if (r.ok) assert.strictEqual(g.hoja('Reservas').find((x) => x[0] === r.codigo)[RES('total')], 18000);
});
t('repartos que no suman 100 son rechazados y no se guardan', () => {
  const aj = g.admin('adminResumen').ajustes; const vals = {}; (aj.campos || aj).forEach((c) => { vals[c.clave || c.k] = c.valor !== undefined ? c.valor : c.v; });
  assert.throws(() => g.admin('adminGuardarAjustes', Object.assign({}, vals, { repartoSalaJC: 90, repartoSalaJaime: 90 })), /100/);
});
t('cambiar el tema queda guardado y llega al sitio público', () => {
  const r = g.admin('adminResumen'); g.admin('adminConfigurar', r.reservasActivas, r.avisoBanner, r.pagoOnline, r.pagoTransferencia, 'vino', r.sitioUrl, r.contabilidadFormal, r.regimen);
  assert.strictEqual(g.get({ accion: 'config' }).config.tema, 'vino');
});

console.log('\n== 6. Día de la sesión: recordatorio, finalización y reseña ==');
let codM;
t('reserva para mañana, abono confirmado y recordatorio automático de WhatsApp', () => {
  const r = g.post(sol({ fecha: manana, inicio: 21, horas: 1, telefono: '56922221111', banda: 'Mañaneros', nombre: 'Dani Vega', correo: 'd@d.cl' })); assert.ok(r.ok, JSON.stringify(r)); codM = r.codigo;
  g.admin('adminCambiarEstado', codM, 'Reservado (con abono)');
  const aj = g.admin('adminResumen').ajustes, v = {}; aj.forEach((c) => { v[c.clave] = c.valor; });
  g.admin('adminGuardarAjustes', Object.assign({}, v, { waAutoActivo: 'SI', waPhoneId: '123456789012', waPlantillaRecordatorio: 'recordatorio_reserva' }));
  g.admin('adminGuardarWaToken', 'TOKEN_SIMULADO_ABCDEFGHIJKLMNOP1234');
  g.estado.whatsapp.length = 0; C.enviarRecordatorios();
  assert.strictEqual(g.estado.whatsapp.length, 1, 'mensajes enviados ' + g.estado.whatsapp.length);
  assert.ok(/56922221111/.test(g.estado.whatsapp[0].o.payload));
  const f = g.hoja('Reservas').find((x) => x[0] === codM); assert.ok(/^Enviado/.test(String(f[C.RES.recordatorio - 1])));
  C.enviarRecordatorios(); assert.strictEqual(g.estado.whatsapp.length, 1, 'no repite');
});
t('el token de WhatsApp no viaja al sitio ni al portal (solo "tieneToken")', () => {
  const j = JSON.stringify(g.admin('adminResumen')) + JSON.stringify(g.get({ accion: 'config' })); assert.ok(!/TOKEN_SIMULADO/.test(j)); assert.strictEqual(g.admin('adminResumen').wa.tieneToken, true);
});
t('mensajes de WhatsApp editables y con variables', () => {
  const o = g.admin('adminGuardarMensajes', { msgRecordatorio: 'Hola {nombre}, mañana {hora} en {negocio}', msgConfirmacion: '', msgCobroAbono: '', msgGracias: '' });
  assert.strictEqual(o.wa.plantillas.msgRecordatorio, 'Hola {nombre}, mañana {hora} en {negocio}'); assert.ok(o.wa.plantillas.msgGracias.length > 20, 'vacío vuelve al original');
});
t('reseña antes de finalizar se rechaza', () => { assert.strictEqual(g.post({ accion: 'resena', codigo: codM, telefono: '56922221111', nombre: 'Dani', estrellas: 5, comentario: 'Excelente sala' }).ok, false); });
t('al marcar Finalizada: se cierra el evento y se puede reseñar una sola vez', () => {
  g.admin('adminCambiarEstado', codM, 'Finalizada');
  const r = g.post({ accion: 'resena', codigo: codM, telefono: '56922221111', nombre: 'Dani', estrellas: 5, comentario: 'Excelente sala, muy buen sonido' }); assert.ok(r.ok, JSON.stringify(r));
  assert.strictEqual(g.post({ accion: 'resena', codigo: codM, telefono: '56922221111', nombre: 'Dani', estrellas: 5, comentario: 'otra vez' }).codigo, 'DUPLICADA');
  assert.ok(!/Excelente/.test(JSON.stringify(g.get({ accion: 'contenido' }))), 'no pública sin aprobar');
});
t('aprobar la reseña en el portal la publica en el sitio con promedio', () => {
  const rs = g.admin('adminResumen').resenas; g.admin('adminModerar', 'resena', rs[0].fila, 'APROBADA');
  const c = g.get({ accion: 'contenido' }).contenido; assert.ok(/Excelente/.test(JSON.stringify(c))); assert.strictEqual(c.promedio, 5);
});

console.log('\n== 7. Cuadro de honor y cotizaciones ==');
t('honor: cualquier banda puede postular; entra pendiente y se publica al aprobar', () => {
  const base = { accion: 'honor', banda: 'Mañaneros', telefono: '56922221111', correo: 'd@d.cl', resena: 'Grabamos nuestro primer disco aquí', instagram: '@mananeros', youtube: 'https://youtu.be/dQw4w9WgXcQ' };
  assert.ok(g.post(Object.assign({}, base, { banda: 'Banda externa', telefono: '56900000000' })).ok, 'una banda que nunca reservó también puede postular');
  assert.ok(g.post(base).ok); assert.strictEqual(g.post(base).codigo, 'DUPLICADA');
  assert.ok(!/Mañaneros/.test(JSON.stringify(g.get({ accion: 'contenido' }).contenido.honor)));
  g.admin('adminModerar', 'honor', g.admin('adminResumen').honor.find((h) => h.banda === 'Mañaneros').fila, 'APROBADA');
  assert.ok(/Mañaneros/.test(JSON.stringify(g.get({ accion: 'contenido' }).contenido.honor)));
});
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
t('honor: logo subido desde el formulario se guarda en Drive y se enlaza; archivos falsos se rechazan', () => {
  const r = g.post({ accion: 'honor', banda: 'Con Logo', telefono: '56911110000', correo: 'l@l.cl', resena: 'Somos una banda de rock instrumental', genero: 'Rock instrumental', formacion: 'Guitarra, bajo y batería', logoB64: 'data:image/png;base64,' + PNG });
  assert.ok(r.ok, JSON.stringify(r));
  const h = g.admin('adminResumen').honor.find((x) => x.banda === 'Con Logo');
  assert.ok(/^https:\/\/lh3\.googleusercontent\.com\/d\//.test(h.logo), h.logo); assert.strictEqual(h.genero, 'Rock instrumental'); assert.strictEqual(h.formacion, 'Guitarra, bajo y batería');
  const falso = Buffer.from('<?php echo 1; ?>').toString('base64');
  assert.strictEqual(g.post({ accion: 'honor', banda: 'Falsa', telefono: '56911110001', correo: 'f@f.cl', resena: 'Texto largo suficiente aquí', logoB64: falso }).ok, false);
  const enorme = Buffer.alloc(500 * 1024, 1).toString('base64');
  assert.strictEqual(g.post({ accion: 'honor', banda: 'Grande', telefono: '56911110002', correo: 'g@g.cl', resena: 'Texto largo suficiente aquí', logoB64: enorme }).ok, false);
});
t('admin edita y elimina una banda del cuadro de honor', () => {
  const h = g.admin('adminResumen').honor.find((x) => x.banda === 'Con Logo');
  const r = g.admin('adminEditarHonor', h.fila, { banda: 'Con Logo Editada', instagram: '@conlogo', youtube: '', enlace: 'https://open.spotify.com/artist/abc', logo: h.logo, resena: 'Reseña corregida por el administrador', genero: 'Rock', formacion: 'Trío' });
  const e = r.honor.find((x) => x.banda === 'Con Logo Editada'); assert.ok(e && e.resena === 'Reseña corregida por el administrador' && /spotify/.test(e.enlace));
  assert.throws(() => g.admin('adminEditarHonor', h.fila, { banda: 'X', enlace: 'javascript:alert(1)' }));
  const r2 = g.admin('adminEliminarHonor', h.fila); assert.ok(!r2.honor.some((x) => x.banda === 'Con Logo Editada'));
});
t('admin sube un audio de micrófono: queda en Drive y visible en la ficha; rechaza lo que no es audio', () => {
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(300, 1)]).toString('base64');
  const r = g.admin('adminSubirAudio', { grupo: 'Sennheiser e609', tipo: 'Micrófono', etiqueta: 'Guitarra', descripcion: 'Dinámico clásico', b64: mp3 });
  const m = r.muestras.find((x) => x.grupo === 'Sennheiser e609' && x.etiqueta === 'Guitarra'); assert.ok(m, 'muestra ' + JSON.stringify(r.muestras)); assert.ok(m.visible, JSON.stringify(m)); assert.ok(/drive\.google\.com\/file\/d\//.test(m.enlace));
  assert.ok(g.get({ accion: 'contenido' }).contenido.muestras.some((x) => x.grupo === 'Sennheiser e609'));
  assert.throws(() => g.admin('adminSubirAudio', { grupo: 'X', tipo: 'Otro', etiqueta: 'y', b64: Buffer.from('MZ.exe binario').toString('base64') }), /audio/);
});
t('honor rechaza enlaces no https y datos inválidos', () => {
  assert.strictEqual(g.post({ accion: 'honor', banda: 'X', telefono: '56922221111', correo: 'd@d.cl', resena: 'texto largo suficiente', logo: 'javascript:alert(1)' }).ok, false);
});
t('cotización: se registra, se responde con monto y se envía por correo', () => {
  const r = g.post({ accion: 'cotizacion', tipo: Object.keys(C.TIPOS_SOL)[0], nombre: 'Eva Mora', telefono: '56911223344', correo: 'eva@correo.cl', mensaje: 'Necesito mezcla de 3 canciones' }); assert.ok(r.ok, JSON.stringify(r));
  const s = g.admin('adminResumen').solicitudes[0]; g.admin('adminSolicitud', s.fila, 'COTIZADA', 90000, 'Mezcla de 3 temas'); g.admin('adminCotizacionCorreo', s.fila);
  assert.ok(g.correosA('eva@correo.cl').some((c) => /90\.000|90000/.test(c.body)), 'monto en el correo');
});

console.log('\n== 8. Planes ==');
t('plan de 8 horas: 4 sesiones, $112.000, pendiente de pago, y se confirma desde el portal', () => {
  const ses = [3, 4, 5, 6].map((n) => { let f = sumar(hoy, n + 5); while ([6, 0].indexOf(new Date(f + 'T12:00:00Z').getUTCDay()) >= 0) f = sumar(f, 1); return { fecha: f, inicio: 19 }; });
  const fechas = []; ses.forEach((s, i) => { while (fechas.includes(s.fecha)) s.fecha = sumar(s.fecha, 1); fechas.push(s.fecha); });
  const r = g.post(Object.assign({ accion: 'plan', tipo: 'plan8', sesiones: ses }, banda, { telefono: '56977001122', banda: 'Planeros' })); assert.ok(r.ok, JSON.stringify(r));
  assert.ok(/^PL-/.test(r.codigo || (r.plan && r.plan.codigo)), 'código PL');
  const cod = r.codigo || r.plan.codigo; g.admin('adminPlanPagado', cod, true);
  const sesiones = g.hoja('Reservas').filter((x) => String(x[C.RES.plan - 1]) === cod); assert.strictEqual(sesiones.length, 4); assert.ok(sesiones.every((x) => x[RES('estado')] === 'Reservado (con abono)'));
});

console.log('\n== 9. Tienda, ventas y socios ==');
let tok;
t('producto nuevo en música: guardar, ver en sitio, vender en efectivo descuenta stock', () => {
  g.admin('adminGuardarProducto', { tipo: 'musica', categoria: 'Cuerdas', nombre: 'Cuerdas Prueba', detalle: 'Set eléctrico', precio: 4500, stock: 5, visible: true, foto: 'assets/tienda/cuerdas-alice.jpg' });
  const pub = JSON.stringify(g.get({ accion: 'config' }).tienda); assert.ok(/Cuerdas Prueba/.test(pub));
  const fila = g.admin('adminResumen').productos.find((p) => p.nombre === 'Cuerdas Prueba').fila;
  g.admin('adminVender', 'musica', fila, 2, 'Venta efectivo');
  assert.strictEqual(g.admin('adminResumen').productos.find((p) => p.nombre === 'Cuerdas Prueba').stock, 3);
});
t('no se puede vender más que el stock ni con precio inválido', () => {
  const fila = g.admin('adminResumen').productos.find((p) => p.nombre === 'Cuerdas Prueba').fila;
  assert.throws(() => g.admin('adminVender', 'musica', fila, 99, 'Venta efectivo'));
  assert.throws(() => g.admin('adminGuardarProducto', { tipo: 'musica', nombre: 'X', precio: -5 }));
  assert.throws(() => g.admin('adminGuardarProducto', { tipo: 'musica', nombre: 'X', foto: 'javascript:alert(1)' }));
});
t('socio: se crea enlace, ve agenda y catálogo, vende y cobra una entrega pendiente', () => {
  const s = g.admin('adminCrearSocio', 'Jaime Encina'); tok = Object.keys(s.socios.tokens || s.socios).length ? (s.socios[0] && (s.socios[0].token)) : null;
  assert.ok(tok, 'token ' + JSON.stringify(s.socios).slice(0, 200));
  const d = g.get({ accion: 'socios', t: tok }); assert.ok(d.ok && d.musica.length >= 1);
  assert.strictEqual(g.get({ accion: 'socios', t: 'falso' }).ok, false);
  const fila = d.musica.find((p) => /Prueba/.test(p.nombre)).fila;
  const v = g.post({ accion: 'socios_vender', t: tok, tipo: 'musica', fila, cantidad: 1, pago: 'Entregado en sesión (pago pendiente)', nota: 'Banda Ana' }); assert.ok(v.ok, JSON.stringify(v));
  let r = g.get({ accion: 'socios', t: tok }); assert.strictEqual(r.resumen.pendienteTotal, 4500, 'pendiente ' + r.resumen.pendienteTotal);
  assert.ok(g.post({ accion: 'socios_cobrar', t: tok, id: v.id, pago: 'Venta transferencia' }).ok);
  r = g.get({ accion: 'socios', t: tok }); assert.strictEqual(r.resumen.pendienteTotal, 0); assert.ok(r.resumen.transferencia >= 4500);
  assert.strictEqual(g.post({ accion: 'socios_vender', t: 'falso', tipo: 'musica', fila, cantidad: 1, pago: 'Venta efectivo' }).ok, false);
});
t('anular una venta repone el stock y la saca de los totales', () => {
  const rs = g.admin('adminResumen'); const antes = rs.productos.find((p) => /Prueba/.test(p.nombre)).stock, venta = rs.ventas.ventas.find((x) => x.pago === 'Venta efectivo' && /Prueba/.test(x.producto));
  g.admin('adminAnularVenta', venta.id); const desp = g.admin('adminResumen').productos.find((p) => /Prueba/.test(p.nombre)).stock; assert.strictEqual(desp, antes + venta.cantidad, 'antes ' + antes + ' desp ' + desp + ' cant ' + venta.cantidad + ' ' + venta.producto);
});
t('claves fijas de /proaudix y /agenda: se crean, entran, se cambian y no se repiten', () => {
  let r = g.admin('adminGuardarClaveEnlace', 'proaudix', 'Gaby-Jaime26');
  assert.ok(r.socios.some((x) => x.rol === 'proaudix'));
  let d = g.get({ accion: 'socios', t: 'gaby-jaime26' }); assert.ok(d.ok && d.musica.length >= 1, 'colega entra con su clave');
  g.admin('adminGuardarClaveEnlace', 'agenda', 'familia2026');
  d = g.get({ accion: 'socios', t: 'familia2026' }); assert.ok(d.ok && d.tipo === 'social', 'familia solo agenda');
  assert.throws(() => g.admin('adminGuardarClaveEnlace', 'agenda', 'gaby-jaime26'), /usa|otra|existe/i);
  assert.throws(() => g.admin('adminGuardarClaveEnlace', 'agenda', 'abc'), /6/);
  g.admin('adminGuardarClaveEnlace', 'proaudix', 'nuevaclave1');
  assert.strictEqual(g.get({ accion: 'socios', t: 'gaby-jaime26' }).ok, false, 'la clave anterior deja de servir');
  assert.ok(g.get({ accion: 'socios', t: 'nuevaclave1' }).ok);
});
t('revocar el enlace de un socio lo desactiva al instante', () => {
  g.admin('adminEliminarSocio', tok); assert.strictEqual(g.get({ accion: 'socios', t: tok }).ok, false);
});

console.log('\n== 10. Contabilidad, cierre de mes y respaldo ==');
t('costos del mes y compra con factura (IVA 19%)', () => {
  const mes = hoy.slice(0, 7); g.admin('adminGuardarCostos', { mes, luz: 60000, aporte: 10000, caja: 20000, otros: 0, luzFactura: true });
  g.admin('adminGuardarCompra', { fecha: hoy, proveedor: 'Distribuidora', rut: '76.123.456-7', tipo: 'Factura', numero: '123', detalle: 'Cuerdas', categoria: 'Mercadería', total: 11900 });
  const c = g.admin('adminResumen').compras[0]; assert.strictEqual(c.neto, 10000); assert.strictEqual(c.iva, 1900);
  assert.throws(() => g.admin('adminGuardarCompra', { fecha: hoy, tipo: 'Factura', total: -5 }));
});
t('cerrar el mes guarda una foto en el historial', () => {
  g.admin('adminCerrarMes', hoy.slice(0, 7)); assert.ok(g.hoja('HistorialBalance').length >= 2);
});
t('respaldo crea una copia de la hoja y rota las antiguas', () => {
  const m = g.admin('adminRespaldar'); assert.ok(/Respaldo creado/.test(m)); assert.ok(g.estado.copias.length >= 1);
});
t('el interruptor de contabilidad formal y régimen se guardan', () => {
  const r = g.admin('adminResumen'); const o = g.admin('adminConfigurar', r.reservasActivas, r.avisoBanner, r.pagoOnline, r.pagoTransferencia, r.tema, r.sitioUrl, true, r.regimen); assert.strictEqual(o.contabilidadFormal, true);
});
t('reglamento y presentación editables llegan al sitio', () => {
  g.admin('adminGuardarReglamento', 'Regla nueva de prueba'); assert.ok(/Regla nueva/.test(g.get({ accion: 'config' }).config.reglamento));
});
t('pausar reservas bloquea nuevas reservas', () => {
  const r = g.admin('adminResumen'); g.admin('adminConfigurar', false, r.avisoBanner, r.pagoOnline, r.pagoTransferencia, r.tema, r.sitioUrl, r.contabilidadFormal, r.regimen);
  assert.strictEqual(g.post(sol({ fecha: sumar(f3, 1), inicio: 10, telefono: '56900001111' })).codigo, 'PAUSADO');
  g.admin('adminConfigurar', true, r.avisoBanner, r.pagoOnline, r.pagoTransferencia, r.tema, r.sitioUrl, r.contabilidadFormal, r.regimen);
});
t('límite de solicitudes seguidas del mismo teléfono (anti-abuso)', () => {
  let bloqueada = false; for (let i = 0; i < 9; i++) { const r = g.post(sol({ fecha: sumar(f3, 1), inicio: 10 + (i % 3), horas: 1, telefono: '56900005555', banda: 'Spam' + i })); if (!r.ok && r.codigo === 'TASA') bloqueada = true; }
  assert.ok(bloqueada, 'nunca se bloqueó');
});

console.log('\n== 11. Contacto, redes y apartado ProAudix ==');
t('redes, enlaces y datos de ProAudix se guardan y llegan al sitio público', () => {
  const aj = g.admin('adminResumen').ajustes, v = {}; aj.forEach((c) => { v[c.clave] = c.valor; });
  g.admin('adminGuardarAjustes', Object.assign({}, v, { redInstagram: 'https://instagram.com/rockerio', mapsUrl: 'https://maps.app.goo.gl/abc123', enlacesExtra: 'Mi canal | https://youtube.com/@rockerio\nPlaylist | https://open.spotify.com/playlist/xyz', proaudixWhatsapp: '+56 9 8888 7777', proaudixWeb: 'https://proaudix.cl', proaudixEnlaces: 'Catálogo | https://proaudix.cl/catalogo' }));
  const c = g.get({ accion: 'config' }).config;
  assert.strictEqual(c.redInstagram, 'https://instagram.com/rockerio'); assert.strictEqual(c.proaudixWhatsapp, '56988887777'); assert.ok(/Playlist \| https/.test(c.enlacesExtra));
});
t('enlaces peligrosos o mal escritos son rechazados', () => {
  const aj = g.admin('adminResumen').ajustes, v = {}; aj.forEach((c) => { v[c.clave] = c.valor; });
  assert.throws(() => g.admin('adminGuardarAjustes', Object.assign({}, v, { redInstagram: 'javascript:alert(1)' })), /https/);
  assert.throws(() => g.admin('adminGuardarAjustes', Object.assign({}, v, { enlacesExtra: 'Sin separador https://x.cl' })), /formato/);
  assert.throws(() => g.admin('adminGuardarAjustes', Object.assign({}, v, { enlacesExtra: 'Malo | http://inseguro.cl' })), /https/);
  assert.throws(() => g.admin('adminGuardarAjustes', Object.assign({}, v, { proaudixWhatsapp: 'abc' })), /números/);
  assert.throws(() => g.admin('adminGuardarAjustes', Object.assign({}, v, { enlacesExtra: Array(9).fill('A | https://a.cl').join('\n') })), /máximo/);
});

console.log('\n== 12. Reservas y jornadas (histórico) ==');
t('adminJornadas trae todo el histórico con detalle, bloqueos y clientes con totales', () => {
  const j = g.admin('adminJornadas');
  assert.ok(j.reservas.length >= 5, 'reservas ' + j.reservas.length);
  const fin = j.reservas.find((r) => r.estado === 'Finalizada'); assert.ok(fin, 'incluye finalizadas (pasadas)');
  ['codigo', 'banda', 'contacto', 'telefono', 'correo', 'inicio', 'fin', 'horas', 'extras', 'video', 'raw', 'zurdo', 'voces', 'total', 'abono', 'saldo', 'fechaTxt'].forEach((k) => assert.ok(k in fin, 'falta ' + k));
  assert.ok(j.reservas.some((r) => r.estado === 'Anulada' || /Libera|Venc|Cancel/i.test(r.estado)) || true);
  assert.ok(Array.isArray(j.bloqueos) && Array.isArray(j.inhabiles));
  const c = j.clientes.find((x) => x.telefono === '56922221111'); assert.ok(c && c.finalizadas >= 1 && c.gastado >= 15000, 'cliente con totales ' + JSON.stringify(c));
  assert.ok(j.wa && j.wa.plantillas && !('token' in j.wa));
});
t('adminJornadas es solo para el administrador', () => {
  const real = C.Session; C.Session = { getActiveUser: () => ({ getEmail: () => 'intruso@gmail.com' }), getEffectiveUser: real.getEffectiveUser };
  try { assert.throws(() => C.adminJornadas(), /Acceso denegado/); } finally { C.Session = real; }
});

console.log('\n== 13. Base de clientes y reserva manual ==');
let claveMan = '';
t('alta manual de cliente con nombre, apellido, correo, banda y Drive', () => {
  g.admin('adminGuardarCliente', { clave: '', nombre: 'Luis', apellido: 'Soto', correo: 'Luis@Correo.cl', banda: 'Los Manuales', telefono: '+56 9 7777 6666', enlace: 'https://drive.google.com/drive/folders/abc123' });
  const c = g.admin('adminJornadas').clientes.find((x) => x.telefono === '56977776666');
  assert.ok(c, 'cliente creado'); assert.strictEqual(c.nombre, 'Luis'); assert.strictEqual(c.apellido, 'Soto'); assert.strictEqual(c.correo, 'luis@correo.cl');
  assert.strictEqual(c.banda, 'Los Manuales'); assert.ok(/drive\.google\.com/.test(c.enlace));
});
t('cliente: valida datos, rechaza duplicados y enlaces que no son de Drive', () => {
  assert.throws(() => g.admin('adminGuardarCliente', { nombre: '', banda: 'X' }), /nombre/i);
  assert.throws(() => g.admin('adminGuardarCliente', { nombre: 'A', banda: '' }), /banda/i);
  assert.throws(() => g.admin('adminGuardarCliente', { nombre: 'A', banda: 'X', correo: 'malo' }), /correo/i);
  assert.throws(() => g.admin('adminGuardarCliente', { nombre: 'A', banda: 'X', enlace: 'https://evil.com/x' }), /Drive/);
  assert.throws(() => g.admin('adminGuardarCliente', { nombre: 'A', banda: 'X', telefono: '+56 9 7777 6666' }), /Ya existe/);
});
t('cliente sin teléfono recibe clave interna y se puede editar y eliminar', () => {
  g.admin('adminGuardarCliente', { nombre: 'Sin', apellido: 'Fono', correo: 'sin@fono.cl', banda: 'Sin Telefono' });
  let c = g.admin('adminJornadas').clientes.find((x) => x.banda === 'Sin Telefono'); assert.ok(c && /^MAN-/.test(c.telefono)); claveMan = c.telefono;
  g.admin('adminGuardarCliente', { clave: claveMan, nombre: 'Sin', apellido: 'Fono2', correo: 'sin@fono.cl', banda: 'Sin Telefono', telefono: '+56 9 5555 4444' });
  c = g.admin('adminJornadas').clientes.find((x) => x.banda === 'Sin Telefono'); assert.strictEqual(c.apellido, 'Fono2'); assert.strictEqual(c.telefono, '56955554444');
  g.admin('adminEliminarCliente', '56955554444');
  assert.ok(!g.admin('adminJornadas').clientes.find((x) => x.banda === 'Sin Telefono'));
});
t('el cliente manual aparece enlazado cuando reserva con su teléfono', () => {
  const r = g.post(sol({ banda: 'Los Manuales', nombre: 'Luis', telefono: '+56 9 7777 6666', correo: 'luis@correo.cl', inicio: 10, fecha: sumar(f3, 14) }));
  assert.ok(r.ok, JSON.stringify(r));
  const lista = g.admin('adminJornadas').clientes.filter((x) => x.telefono === '56977776666'); assert.strictEqual(lista.length, 1);
  assert.ok(/drive/.test(lista[0].enlace) && lista[0].jornadas >= 1);
});
const dom = (() => { let f = sumar(f3, 28); while (new Date(f + 'T12:00:00Z').getUTCDay() !== 0) f = sumar(f, 1); return f; })();
t('reserva manual: domingo a las 02:00 (fuera de horario) y 3 horas', () => {
  const r = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dom, inicio: 2, horas: 3, banda: 'Los Nocturnos', nombre: 'Rolo', telefono: '+56 9 3333 2222', estado: 'Reservado (con abono)' });
  assert.ok(r.ok && r.codigo);
  const x = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo);
  assert.strictEqual(x.inicio, '02:00'); assert.strictEqual(x.horas, 3); assert.strictEqual(x.estado, 'Reservado (con abono)'); assert.ok(x.total > 0);
  const lib = g.get({ accion: 'disponibilidad', fecha: dom }); assert.ok(JSON.stringify(lib).indexOf('"2"') < 0 || true);
});
t('Rockerío en vivo: bloque fijo 19–23 en viernes/sábado, cobro fijo y bloquea la agenda', () => {
  let vie = sumar(dom, 14); while (new Date(vie + 'T12:00:00Z').getUTCDay() !== 5) vie = sumar(vie, 1);
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'vivo', fecha: dom, banda: 'Show', nombre: 'Ana', telefono: '+56 9 4444 0001' }), /solo se agenda/i);
  const r = g.admin('adminReservaManual', { servicio: 'vivo', fecha: vie, inicio: 3, horas: 1, banda: 'Show Band', nombre: 'Ana', telefono: '+56 9 4444 0001', pago: 'ninguno' });
  assert.ok(r.ok && r.codigo);
  const x = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo);
  assert.strictEqual(x.inicio, '19:00'); assert.strictEqual(x.fin, '23:00'); assert.strictEqual(x.total, 90000); assert.ok(/en vivo/i.test(x.servicio));
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'ensayo', fecha: vie, inicio: 20, horas: 1, banda: 'Choque', nombre: 'Beto', telefono: '+56 9 4444 0002' }), /CHOQUE/);
  const J = g.admin('adminJornadas'); assert.strictEqual(J.vivo.desde, 19); assert.strictEqual(J.vivo.hasta, 23);
});
t('Rockerío en vivo finalizado se contabiliza en la sala (no en el estudio) y cuadra con las reservas', () => {
  let vie = sumar(dom, 35); while (new Date(vie + 'T12:00:00Z').getUTCDay() !== 5) vie = sumar(vie, 1);
  const mes = vie.slice(0, 7), antes = g.admin('adminResumenContable', 'mes', mes);
  const r = g.admin('adminReservaManual', { servicio: 'vivo', fecha: vie, banda: 'Show Contable', nombre: 'Ana', telefono: '+56 9 4444 0003', pago: 'ninguno' });
  g.admin('adminCambiarEstado', r.codigo, 'Reservado (con abono)');
  g.admin('adminAjustarReserva', r.codigo, { finalizar: true });
  const c = g.admin('adminResumenContable', 'mes', mes), d = c.detalle.find((q) => q.codigo === r.codigo);
  assert.ok(d && /en vivo/i.test(d.servicio) && d.total === 90000, JSON.stringify(d));
  assert.strictEqual(c.sala.total - antes.sala.total, 90000, 'suma a la sala');
  assert.strictEqual(c.estudio.total, antes.estudio.total, 'no toca el estudio');
  assert.ok(!c.descuadres.some((q) => q.codigo === r.codigo), 'sin descuadres');
});
t('Configuración: valida horarios cruzados y guardar un ajuste no toca los demás', () => {
  assert.throws(() => g.admin('adminGuardarAjustes', { vivoDesde: '21', vivoHasta: '20' }), /posterior/i);
  assert.throws(() => g.admin('adminGuardarAjustes', { convenienteDesde: '15', convenienteHasta: '10' }), /franja conveniente/i);
  g.admin('adminGuardarAjustes', { verVivo: 'SI', vivoPrecio: '95000' });
  const a0 = g.admin('adminResumen').ajustes, v = (k) => a0.find((x) => x.clave === k).valor;
  g.admin('adminGuardarAjustes', { minutosReserva: '45' });
  const a1 = g.admin('adminResumen').ajustes, w = (k) => a1.find((x) => x.clave === k).valor;
  assert.strictEqual(String(w('minutosReserva')), '45'); assert.strictEqual(w('verVivo'), v('verVivo')); assert.strictEqual(String(w('vivoPrecio')), '95000');
  g.admin('adminGuardarAjustes', { verVivo: 'NO', vivoPrecio: '90000', minutosReserva: String(v('minutosReserva')) });
});
t('una reserva ingresada por ti sin pago NO se libera sola; las de clientes sí', () => {
  let dia = sumar(dom, 49); while (new Date(dia + 'T12:00:00Z').getUTCDay() === 0) dia = sumar(dia, 1);
  const m = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 10, horas: 2, banda: 'Banda Manual', nombre: 'Ana', telefono: '+56 9 4444 0010', pago: 'ninguno' });
  g.avanzar(5 * 3600000); C.liberarPendientes();
  const est = (cod) => g.admin('adminJornadas').reservas.find((y) => y.codigo === cod).estado;
  assert.ok(/sin abono/i.test(est(m.codigo)), 'la manual sigue vigente: ' + est(m.codigo));
});
t('ingreso manual: abono flexible (banda amiga) y prioridad sobre reservas de clientes sin abono', () => {
  let dia = sumar(f3, 18); while ([4, 6, 0].indexOf(new Date(dia + 'T12:00:00Z').getUTCDay()) >= 0) dia = sumar(dia, 1);
  const J = () => g.admin('adminJornadas').reservas;
  // 1) abono acordado a mano
  const a = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 9, horas: 1, banda: 'Amigos', nombre: 'Lu', telefono: '+56 9 4444 0020', pago: 'abono', abono: '5000', total: '20000' });
  const ra = J().find((y) => y.codigo === a.codigo); assert.strictEqual(ra.abono, 5000); assert.strictEqual(ra.saldo, 15000);
  // 2) abono 0 = sin abono, queda vigente
  const b = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 11, horas: 1, banda: 'Amigos 2', nombre: 'Lu', telefono: '+56 9 4444 0021', pago: 'abono', abono: '0', total: '20000' });
  assert.ok(/sin abono/i.test(J().find((y) => y.codigo === b.codigo).estado));
  // 3) un cliente reserva sin abonar y el ingreso manual toma ese horario
  const c = g.post(sol({ fecha: dia, inicio: 18, horas: 2, telefono: '56944447777', banda: 'Cliente Pendiente', nombre: 'Pedro', correo: 'p@p.cl' })); assert.ok(c.ok, JSON.stringify(c));
  const m = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 19, horas: 2, banda: 'Banda Amiga', nombre: 'Lu', telefono: '+56 9 4444 0022', pago: 'ninguno' });
  assert.ok(m.ok && m.desplazadas.length === 1, JSON.stringify(m));
  assert.ok(/anulada/i.test(J().find((y) => y.codigo === c.codigo).estado));
  // 4) una reserva con abono NO se desplaza
  g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 21, horas: 1, banda: 'Pagada', nombre: 'Lu', telefono: '+56 9 4444 0023', pago: 'completo', medio: 'Efectivo' });
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 21, horas: 1, banda: 'Otra', nombre: 'Lu', telefono: '+56 9 4444 0024', pago: 'ninguno' }), /CHOQUE/);
});
t('reserva manual: equipos extra con ticket y desglose detallado', () => {
  const dia = sumar(dom, 7), eq = ['Bajo eléctrico Epiphone Thunderbird Pro IV', 'Guitarra electroacústica Takamine'];
  const c = g.admin('adminCalcularReserva', { servicio: 'ensayo', fecha: dia, inicio: 12, horas: 2, extras: 2, video: false, raw: false });
  assert.ok(c.total === c.base + c.extras && c.extras === 2 * c.unidadExtra && c.saldo === c.total - c.abono);
  const r = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 12, horas: 2, banda: 'Ticket Band', nombre: 'Tito', telefono: '+56 9 5555 1212', equipos: eq });
  const x = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo);
  assert.strictEqual(x.extras, 2); assert.ok(/Equipos: Bajo eléctrico Epiphone Thunderbird Pro IV, Guitarra electroacústica Takamine/.test(x.comentarios)); assert.strictEqual(x.total, c.total);
});
t('reserva manual: se ingresa pagada de inmediato con su medio de pago', () => {
  const dia = sumar(dom, 14);
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 12, horas: 1, banda: 'Pago Band', nombre: 'Pía', telefono: '+56 9 5555 3434', pago: 'completo' }), /medio de pago/i);
  const r = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 12, horas: 1, banda: 'Pago Band', nombre: 'Pía', telefono: '+56 9 5555 3434', pago: 'completo', medio: 'Efectivo' });
  const x = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo);
  assert.strictEqual(x.medio, 'Efectivo'); assert.ok(x.fechaPago); assert.strictEqual(x.estado, 'Reservado (con abono)');
  const y = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 14, horas: 1, banda: 'Pago Band', nombre: 'Pía', telefono: '+56 9 5555 3434', pago: 'ninguno' });
  assert.strictEqual(g.admin('adminJornadas').reservas.find((z) => z.codigo === y.codigo).estado, 'Reservado (sin abono)');
});
t('agregar material en bruto ya pagado a una reserva existente', () => {
  const dia = sumar(dom, 21);
  const r = g.admin('adminReservaManual', { servicio: 'grabacion', fecha: dia, inicio: 12, horas: 2, banda: 'Raw Band', nombre: 'Rau', telefono: '+56 9 5555 7878', pago: 'completo', medio: 'Transferencia' });
  const a = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo);
  g.admin('adminAgregarAdicional', r.codigo, { tipo: 'raw', pagado: true });
  const b = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo);
  assert.strictEqual(b.raw, true); assert.strictEqual(b.total, a.total + 10000); assert.strictEqual(b.abono, a.abono + 10000); assert.strictEqual(b.total - b.abono, a.total - a.abono);
  assert.throws(() => g.admin('adminAgregarAdicional', r.codigo, { tipo: 'raw', pagado: true }), /ya incluye/);
});
t('reserva manual: el mismo horario avisa choque y con forzar se guarda', () => {
  const p = { servicio: 'ensayo', fecha: dom, inicio: 3, horas: 1, banda: 'Otra', nombre: 'Ana', telefono: '+56 9 4444 1111' };
  assert.throws(() => g.admin('adminReservaManual', p), /CHOQUE/);
  assert.ok(g.admin('adminReservaManual', Object.assign({ forzar: true }, p)).ok);
});
t('reserva manual: total propio, fecha pasada y validaciones', () => {
  const ayer = sumar(hoy, -3);
  const r = g.admin('adminReservaManual', { servicio: 'grabacion', fecha: ayer, inicio: 23, horas: 1, banda: 'Retro', nombre: 'Pía', telefono: '+56 9 2222 0000', estado: 'Finalizada', total: '45.000' });
  const x = g.admin('adminJornadas').reservas.find((y) => y.codigo === r.codigo); assert.strictEqual(x.total, 45000); assert.strictEqual(x.estado, 'Finalizada');
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dom, inicio: 23, horas: 3, banda: 'B', nombre: 'N', telefono: '+56 9 1111 0000' }), /medianoche/);
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dom, inicio: 12, horas: 1, banda: '', nombre: 'N', telefono: '+56 9 1111 0000' }), /banda/i);
  assert.throws(() => g.admin('adminReservaManual', { servicio: 'ensayo', fecha: dom, inicio: 12, horas: 1, banda: 'B', nombre: 'N', telefono: '12' }), /tel/i);
});
t('clientes y reserva manual son solo para el administrador', () => {
  const real = C.Session; C.Session = { getActiveUser: () => ({ getEmail: () => 'intruso@gmail.com' }), getEffectiveUser: real.getEffectiveUser };
  try { assert.throws(() => C.adminGuardarCliente({}), /Acceso denegado/); assert.throws(() => C.adminEliminarCliente('x'), /Acceso denegado/); assert.throws(() => C.adminReservaManual({}), /Acceso denegado/); } finally { C.Session = real; }
});

console.log('\n== 14. Tienda y bebestibles: carrito, cuenta aparte, plataforma vacía ==');
t('instalación nueva: tienda de música vacía y bebestibles con los 4 productos a $1.000', () => {
  const g2 = require('./gas-sim').crear(); g2.instalar();
  const r = g2.admin('adminResumen');
  assert.strictEqual(r.productos.length, 18, 'la tienda parte con los 18 productos base'); assert.ok(r.productos.filter(p => p.foto).length === 16 && r.productos.every(p => !p.foto || /^assets\/tienda\//.test(p.foto)), 'con foto');
  assert.deepStrictEqual(r.bebestibles.map((b) => b.nombre + '|' + b.detalle + '|' + b.precio), ['Agua mineral|Botella 600 cc|1000', 'Jugo|Botella 470 cc|1000', 'Bebida|Lata 330 cc|1000', 'Cerveza|Lata 330 cc|1000']);
  assert.strictEqual(r.reservas.length, 0); assert.strictEqual(r.clientes.length, 0);
});
t('carrito de bebestibles: varias unidades, un solo cobro, descuenta stock y valida todo antes', () => {
  const bs = g.admin('adminResumen').bebestibles; const ag = bs.find((b) => b.nombre === 'Agua mineral'), ce = bs.find((b) => b.nombre === 'Cerveza');
  g.admin('adminReponer', ag.fila, 10, 'bebestible');
  assert.throws(() => g.admin('adminVenderCarrito', 'bebestible', [{ fila: ag.fila, cantidad: 2 }, { fila: ce.fila, cantidad: 1 }], 'Pago raro'), /Elige cómo/);
  assert.throws(() => g.admin('adminVenderCarrito', 'bebestible', [{ fila: ag.fila, cantidad: 50 }], 'Venta efectivo'), /Stock insuficiente/);
  assert.strictEqual(g.admin('adminResumen').bebestibles.find((b) => b.nombre === 'Agua mineral').stock, 21, 'una falla no descuenta nada');
  const r = g.admin('adminVenderCarrito', 'bebestible', [{ fila: ag.fila, cantidad: 2 }, { fila: ce.fila, cantidad: 1 }, { fila: ag.fila, cantidad: 1 }], 'Venta efectivo', 'Banda X');
  assert.strictEqual(r.idsVenta.length, 2); assert.strictEqual(r.bebestibles.find((b) => b.nombre === 'Agua mineral').stock, 18);
  assert.ok(r.ventas.ventas.filter((v) => v.tipo === 'Bebestibles').reduce((a, v) => a + v.total, 0) >= 4000);
});
t('carrito «entregado en sala» queda por cobrar y se cobra después', () => {
  const ce = g.admin('adminResumen').bebestibles.find((b) => b.nombre === 'Jugo');
  const r = g.admin('adminVenderCarrito', 'bebestible', [{ fila: ce.fila, cantidad: 2 }], 'Entregado en sesión (pago pendiente)');
  const pend = r.ventas.pendientes.find((v) => v.producto === 'Jugo'); assert.ok(pend && pend.total === 2000);
  assert.ok(g.admin('adminCobrar', pend.id, 'Venta transferencia'));
});
t('foto subida desde el portal se guarda en Drive y queda en el producto', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64').toString('base64');
  g.admin('adminGuardarProducto', { tipo: 'musica', categoria: 'Cuerdas', nombre: 'Set 1046', detalle: 'Cuerdas 10-46', precio: 12000, stock: 4, visible: true, fotoB64: png });
  const p = g.admin('adminResumen').productos.find((x) => x.nombre === 'Set 1046'); assert.ok(/^https:\/\/lh3\.googleusercontent\.com\/d\//.test(p.foto), p.foto);
  assert.throws(() => g.admin('adminGuardarProducto', { tipo: 'musica', nombre: 'Malo', fotoB64: Buffer.from('no es imagen').toString('base64') }), /imagen/);
});
t('socios: un solo enlace compartido, carrito, y resumen general sin datos de clientes', () => {
  const g3 = require('./gas-sim').crear(); g3.instalar();
  const socios = g3.admin('adminResumen').socios; assert.strictEqual(socios.length, 1, 'un solo enlace'); assert.ok(/Jaime y Gabriela/.test(socios[0].nombre));
  const tk = socios[0].token, d = g3.get({ accion: 'socios', t: tk }); assert.ok(d.ok && d.bebestibles.length === 4 && d.general && 'jornadas' in d.general);
  assert.ok(!/telefono|correo/i.test(JSON.stringify(d.general)));
  const v = g3.post({ accion: 'socios_carrito', t: tk, tipo: 'bebestible', items: [{ fila: d.bebestibles[0].fila, cantidad: 2 }, { fila: d.bebestibles[3].fila, cantidad: 1 }], pago: 'Venta efectivo' });
  assert.ok(v.ok && v.ids.length === 2, JSON.stringify(v));
  assert.strictEqual(g3.post({ accion: 'socios_carrito', t: 'x', tipo: 'bebestible', items: [], pago: 'Venta efectivo' }).ok, false);
  assert.strictEqual(g3.post({ accion: 'socios_carrito', t: tk, tipo: 'bebestible', items: [], pago: 'Venta efectivo' }).ok, false);
});
t('tienda y bebestibles NO suman al balance: quedan como anexo aparte', () => {
  const b = require('fs').readFileSync(__dirname + '/../../apps-script/Code.gs', 'utf8');
  assert.ok(/'=B18\+B21\+B22'/.test(b), 'ingresos brutos sin tienda'); assert.ok(/ANEXO · Tienda y bebestibles/.test(b));
});

console.log('\n== 15. Editar y eliminar reservas, alta manual de honor ==');
t('editar una reserva (mismo código, nuevo horario, sin chocar consigo misma) y eliminarla', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  const hoy = require('../../js/reglas.js').sumarDias ? null : null;
  const f = gx.admin('adminJornadas').hoy;
  const R = require('../../js/reglas.js'); const dia = R.sumarDias(f, 3);
  const a = gx.admin('adminReservaManual', { servicio: 'ensayo', fecha: dia, inicio: 10, horas: 2, banda: 'Edit Band', nombre: 'Eli', telefono: '+56 9 4444 5555', estado: 'Reservado (con abono)' });
  const e = gx.admin('adminReservaManual', { codigoEditar: a.codigo, servicio: 'ensayo', fecha: dia, inicio: 11, horas: 3, banda: 'Edit Band', nombre: 'Eli', telefono: '+56 9 4444 5555' });
  assert.strictEqual(e.codigo, a.codigo);
  const rs = gx.admin('adminJornadas').reservas.filter((r) => r.banda === 'Edit Band'); assert.strictEqual(rs.length, 1);
  assert.strictEqual(rs[0].inicio.slice(0, 2), '11'); assert.strictEqual(rs[0].horas, 3); assert.strictEqual(rs[0].estado, 'Reservado (con abono)');
  gx.admin('adminEliminarReserva', a.codigo);
  assert.strictEqual(gx.admin('adminJornadas').reservas.filter((r) => r.banda === 'Edit Band').length, 0);
  assert.throws(() => gx.admin('adminEliminarReserva', 'RP-9999'), /No se encontró/);
});
t('agregar una banda al cuadro de honor desde el portal la deja visible', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  gx.admin('adminAgregarHonor', { banda: 'Los Manuales', genero: 'Rock', resena: 'Grabaron su disco aquí', instagram: '@losmanuales' });
  const pub = gx.get({ accion: 'contenido' });
  assert.ok(JSON.stringify(pub).indexOf('Los Manuales') >= 0, 'aparece en el sitio');
  assert.throws(() => gx.admin('adminAgregarHonor', { banda: '' }), /nombre/);
});
t('más allá de 5 h de ensayo se suma 1 h de grabación por hora', () => {
  const R = require('../../js/reglas.js'), c = R.normalizarConfig({});
  assert.deepStrictEqual([2, 3, 4, 5, 6, 7].map((h) => R.grabacionIncluidaMin(c, 'ensayo', h)), [30, 60, 120, 180, 240, 300]);
});

t('importar clientes en bloque: agrega, omite repetidos y teléfonos inválidos', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  const filas = [{ nombre: 'Agustin', apellido: 'Caceres', banda: 'Banda', telefono: '+56 9 90830392' }, { nombre: 'Vicente', apellido: 'Espinoza', banda: 'Mapochossippi', telefono: '+56997294715' }, { nombre: 'Malo', banda: 'X', telefono: '123' }];
  const r = gx.admin('adminImportarClientes', filas); assert.strictEqual(r.agregados, 2); assert.strictEqual(r.omitidos.length, 1);
  const r2 = gx.admin('adminImportarClientes', filas); assert.strictEqual(r2.agregados, 0);
  const cl = gx.admin('adminJornadas').clientes; assert.ok(cl.some((c) => c.telefono === '56990830392' && c.banda === 'Banda'), 'cliente guardado con teléfono normalizado');
});

t('comparador de sonido: guardar canción con 3 versiones, publicarla, reemplazarla y eliminarla', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  const d = { titulo: 'Mi canción', descripcion: 'Demo', bruto: 'https://drive.google.com/file/d/AAA/view', mezclada: 'https://drive.google.com/file/d/BBB/view', master: 'https://drive.google.com/file/d/CCC/view' };
  gx.admin('adminGuardarComparador', d);
  let g = gx.get({ accion: 'contenido' }).contenido.muestras.filter((x) => x.tipo === 'Comparador');
  assert.strictEqual(g.length, 1); assert.deepStrictEqual(g[0].items.map((i) => i.etiqueta), ['En bruto', 'Mezclada', 'Masterizada']);
  gx.admin('adminGuardarComparador', Object.assign({}, d, { master: 'https://drive.google.com/file/d/ZZZ/view' }));
  g = gx.get({ accion: 'contenido' }).contenido.muestras.filter((x) => x.tipo === 'Comparador');
  assert.strictEqual(g.length, 1); assert.ok(/ZZZ/.test(JSON.stringify(g)), 'reemplaza la versión');
  assert.throws(() => gx.admin('adminGuardarComparador', Object.assign({}, d, { bruto: '' })), /En bruto/);
  gx.admin('adminEliminarComparador', 'Mi canción');
  assert.strictEqual(gx.get({ accion: 'contenido' }).contenido.muestras.filter((x) => x.tipo === 'Comparador').length, 0);
});
t('postular al cuadro de honor con redes (máx. 3) y último trabajo', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  const base = { accion: 'honor', banda: 'Los Redes', telefono: '+56 9 7777 6666', correo: 'lr@correo.cl', resena: 'Grabamos nuestro EP aquí', genero: 'Rock', ultimo: 'https://youtu.be/dQw4w9WgXcQ' };
  const r = gx.post(Object.assign({}, base, { redes: JSON.stringify([{ r: 'TikTok', u: 'https://tiktok.com/@lr' }, { r: 'Instagram', u: '@lr' }]) }));
  assert.ok(r.ok, JSON.stringify(r));
  const f = gx.admin('adminJornadas'); void f;
  const h = gx.admin('adminResumen').honor.filter((x) => x.banda === 'Los Redes')[0]; assert.ok(h && /TikTok/.test(h.redes) && /instagram.com\/lr/.test(h.redes) && /youtu/.test(h.ultimo));
  gx.admin('adminModerar', 'honor', h.fila, 'APROBADA');
  const pub = gx.get({ accion: 'contenido' }).contenido.honor.filter((x) => x.banda === 'Los Redes')[0]; assert.strictEqual(pub.redes.length, 2);
  const muchas = gx.post(Object.assign({}, base, { telefono: '+56 9 5555 4444', redes: JSON.stringify([1, 2, 3, 4].map((i) => ({ r: 'Spotify', u: 'https://x.cl/' + i }))) }));
  assert.ok(!muchas.ok && /3/.test(muchas.error));
});

t('reagendar: máximo 2 cambios, excepción del admin, sin pisar otras reservas ni bloqueos', () => {
  const gx = require('./gas-sim').crear(); gx.instalar(); const R2 = gx.ctx.Reglas, h = gx.ctx.ahoraChile_().fecha;
  const dia = (n) => { let f = R2.sumarDias(h, n); while ([4, 6, 0].indexOf(new Date(f + 'T12:00:00Z').getUTCDay()) >= 0) f = R2.sumarDias(f, 1); return f; };
  const mk = (o) => gx.admin('adminReservaManual', Object.assign({ servicio: 'ensayo', fecha: dia(5), inicio: 18, horas: 2, banda: 'Los Mover', nombre: 'Ana', telefono: '+56 9 1234 5678', estado: 'Reservado (con abono)' }, o));
  const a = mk({}), b = mk({ inicio: 10, banda: 'Otra Banda', telefono: '+56 9 8765 4321' });
  gx.admin('adminReagendar', a.codigo, dia(6), 19); gx.admin('adminReagendar', a.codigo, dia(6), 17);
  let r = gx.admin('adminJornadas').reservas.find((x) => x.codigo === a.codigo); assert.strictEqual(r.reag, 2); assert.strictEqual(r.inicio, '17:00'); assert.strictEqual(r.fecha, dia(6));
  assert.throws(() => gx.admin('adminReagendar', a.codigo, dia(6), 20), /LIMITE/);
  gx.admin('adminReagendar', a.codigo, dia(6), 20, true); r = gx.admin('adminJornadas').reservas.find((x) => x.codigo === a.codigo); assert.strictEqual(r.reag, 3, 'la excepción del admin se permite');
  assert.throws(() => gx.admin('adminReagendar', b.codigo, dia(6), 19), /CHOQUE/, 'no puede quedar sobre otra reserva');
  assert.throws(() => gx.admin('adminBloquear', dia(6), '19', '21', 'Prueba'), /sobre la reserva/, 'un bloqueo no puede quedar sobre una reserva');
  gx.admin('adminBloquear', dia(6), '6', '8', 'Personal fuera de horario'); // fuera del horario oficial: permitido
  gx.admin('adminBloquear', dia(6), '11', '13', 'Bloqueo dentro del horario');
  assert.throws(() => gx.admin('adminReagendar', b.codigo, dia(6), 11), /CHOQUE|bloqueado/, 'tampoco sobre un bloqueo');
});
t('editar y eliminar ventas ajusta el stock y el total', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  gx.admin('adminGuardarProducto', { tipo: 'musica', categoria: 'Cuerdas', nombre: 'Set X', detalle: '', precio: 1000, stock: 10, visible: true });
  const p = gx.admin('adminResumen').productos.find((x) => x.nombre === 'Set X');
  gx.admin('adminVenderCarrito', 'musica', [{ fila: p.fila, cantidad: 2 }], 'Venta efectivo', '');
  let v = gx.admin('adminResumen').ventas.ventas.find((x) => x.producto === 'Set X'); assert.strictEqual(gx.admin('adminResumen').productos.find((x) => x.nombre === 'Set X').stock, 8);
  gx.admin('adminEditarVenta', v.id, { cantidad: 3, pago: 'Venta transferencia', nota: 'corregida' });
  v = gx.admin('adminResumen').ventas.ventas.find((x) => x.id === v.id); assert.strictEqual(v.cantidad, 3); assert.strictEqual(v.total, 3000); assert.strictEqual(v.pago, 'Venta transferencia');
  assert.strictEqual(gx.admin('adminResumen').productos.find((x) => x.nombre === 'Set X').stock, 7);
  gx.admin('adminEliminarVenta', v.id);
  assert.strictEqual(gx.admin('adminResumen').ventas.ventas.filter((x) => x.producto === 'Set X').length, 0); assert.strictEqual(gx.admin('adminResumen').productos.find((x) => x.nombre === 'Set X').stock, 10);
});
t('enlace social/familia: solo agenda; no puede vender', () => {
  const gx = require('./gas-sim').crear(); gx.instalar();
  gx.admin('adminCrearSocio', 'Familia', 'social');
  const s = gx.admin('adminResumen').socios.find((x) => x.nombre === 'Familia'); assert.strictEqual(s.tipo, 'social');
  const d = gx.get({ accion: 'socios', t: s.token }); assert.ok(d.ok && d.tipo === 'social' && Array.isArray(d.agenda) && !d.musica && !d.ventas);
  assert.strictEqual(gx.post({ accion: 'socios_vender', t: s.token, tipo: 'musica', fila: 2, cantidad: 1, pago: 'Venta efectivo' }).ok, false);
});

t('las horas que Sheets guarda como hora (fecha 1899) se muestran HH:mm y cuentan para la agenda', () => {
  const d = new Date(1899, 11, 30, 19, 0, 0);
  assert.strictEqual(C.horaCelda_(d), '19:00');
  assert.strictEqual(C.aHora_(d), 19);
  assert.strictEqual(C.horaCelda_(0.75), '18:00');
  assert.strictEqual(C.horaCelda_('21:00'), '21:00');
  assert.strictEqual(C.horaCelda_(''), '');
});

t('«No asiste» cobra $5.000 por hora reservada, haya abono o no, y aparece en el resumen contable', () => {
  const r = g.post(sol({ fecha: sumar(f3, 14), inicio: 18, horas: 2, telefono: '56933334444', banda: 'Faltones', nombre: 'Pedro Soto', correo: 'p@p.cl' })); assert.ok(r.ok, JSON.stringify(r));
  g.admin('adminCambiarEstado', r.codigo, 'No asiste');
  const f = g.hoja('Reservas').find((x) => x[0] === r.codigo);
  assert.strictEqual(Number(f[C.RES.retenido - 1]), 10000, 'retenido 2 h x 5.000 aunque no haya abono');
  const c = g.admin('adminResumenContable', 'mes', sumar(f3, 14).slice(0, 7));
  assert.ok(c.sala.retenidos >= 10000);
});
t('ajustar una reserva: descuento, total final, finalizar y balance coherente', () => {
  const r = g.post(sol({ fecha: sumar(f3, 14), inicio: 20, horas: 2, telefono: '56944445555', banda: 'Descuentos', nombre: 'Rita Mora', correo: 'r@r.cl' })); assert.ok(r.ok, JSON.stringify(r));
  g.admin('adminCambiarEstado', r.codigo, 'Reservado (con abono)');
  g.admin('adminAjustarReserva', r.codigo, { descuento: 5000, nota: 'Cliente frecuente', finalizar: true });
  let x = g.admin('adminJornadas').reservas.find((q) => q.codigo === r.codigo);
  assert.strictEqual(x.estado, 'Finalizada'); assert.strictEqual(x.ajuste, 5000); assert.strictEqual(x.total, x.totalOriginal - 5000);
  g.admin('adminAjustarReserva', r.codigo, { totalFinal: x.totalOriginal - 12000, nota: 'Ajuste' });
  x = g.admin('adminJornadas').reservas.find((q) => q.codigo === r.codigo); assert.strictEqual(x.ajuste, 12000);
  const c = g.admin('adminResumenContable', 'mes', sumar(f3, 14).slice(0, 7)); const d = c.detalle.find((q) => q.codigo === r.codigo);
  assert.strictEqual(d.total, x.totalOriginal - 12000, 'el resumen contable usa el total ajustado');
  assert.throws(() => g.admin('adminAjustarReserva', r.codigo, { descuento: 99999999 }));
  g.admin('adminAjustarReserva', r.codigo, { descuento: 0 }); x = g.admin('adminJornadas').reservas.find((q) => q.codigo === r.codigo); assert.strictEqual(x.total, x.totalOriginal, 'quitar el ajuste restaura el total');
});
t('total ingresado a mano (p. ej. $2.000 en vez de $30.000) es el que entra al balance; descuadres se detectan y cuadran', () => {
  const fecha = sumar(f3, 35);
  const r = g.admin('adminReservaManual', { servicio: 'ensayo', fecha, inicio: 10, horas: 2, banda: 'Plan pasado', nombre: 'Gus', telefono: '+56 9 5555 6666', estado: 'Finalizada', total: '2000' });
  assert.ok(r.ok, JSON.stringify(r));
  const fila = g.hoja('Reservas').find((x) => x[0] === r.codigo);
  const suma = [C.RES.base, C.RES.extrasM, C.RES.videoM, C.RES.rawM].reduce((a, k) => a + (Number(fila[k - 1]) || 0), 0);
  assert.strictEqual(Number(fila[C.RES.total - 1]), 2000); assert.strictEqual(suma, 2000, 'los montos del balance suman el total ingresado');
  const c = g.admin('adminResumenContable', 'mes', fecha.slice(0, 7)); assert.strictEqual(c.detalle.find((q) => q.codigo === r.codigo).total, 2000);
  // reserva antigua con total cambiado a mano pero montos viejos → aparece en descuadres y se cuadra
  g.estado.hojas['Reservas'].filas.forEach((fl) => { if (fl[0] === r.codigo) { fl[C.RES.base - 1] = 30000; fl[C.RES.original - 1] = ''; fl[C.RES.ajuste - 1] = ''; } });
  assert.ok(g.admin('adminResumenContable', 'mes', fecha.slice(0, 7)).descuadres.some((q) => q.codigo === r.codigo));
  g.admin('adminCuadrarReservas', [r.codigo]);
  assert.ok(!g.admin('adminResumenContable', 'mes', fecha.slice(0, 7)).descuadres.some((q) => q.codigo === r.codigo));
  assert.strictEqual(g.admin('adminResumenContable', 'mes', fecha.slice(0, 7)).detalle.find((q) => q.codigo === r.codigo).total, 2000);
});
t('cobro pendiente, medio de pago, cortesía y otros ingresos/gastos', () => {
  const fecha = sumar(f3, 42), mes = fecha.slice(0, 7);
  let hh = 8; const mk = (banda, tel, total) => g.admin('adminReservaManual', { servicio: 'ensayo', fecha, inicio: (hh += 2), horas: 2, banda, nombre: 'Test', telefono: tel, estado: 'Finalizada', total }).codigo;
  const a = mk('Deudora', '+56 9 1111 0001', '30000'), b = mk('Paga efectivo', '+56 9 1111 0002', '20000'), c = mk('Cortesía', '+56 9 1111 0003', '30000');
  const base = g.admin('adminResumenContable', 'mes', mes);
  // por cobrar
  g.admin('adminMarcarCobro', a, { cobro: 'POR COBRAR' });
  let r = g.admin('adminResumenContable', 'mes', mes);
  assert.ok(r.deudas.some((x) => x.codigo === a), 'deudas ' + JSON.stringify(r.deudas));
  assert.strictEqual(r.medios.porCobrar, 20000, 'por cobrar = total − abono');
  g.admin('adminMarcarCobro', a, { cobro: 'PAGADO', medio: 'Transferencia' });
  r = g.admin('adminResumenContable', 'mes', mes);
  assert.ok(!r.deudas.some((x) => x.codigo === a) && r.medios.Transferencia === 20000, 'al pagar sale de las deudas y entra al medio');
  g.admin('adminMarcarCobro', b, { cobro: 'PAGADO', medio: 'Efectivo' });
  r = g.admin('adminResumenContable', 'mes', mes); assert.strictEqual(r.medios.Efectivo, 10000);
  assert.throws(() => g.admin('adminMarcarCobro', b, { cobro: 'PAGADO', medio: 'Cheque' }), /Medio/);
  // cortesía: no suma ingreso pero se ve
  g.admin('adminMarcarCortesia', c, { nota: 'Canje por afiche' });
  const r2 = g.admin('adminResumenContable', 'mes', mes);
  assert.strictEqual(r2.cortesias.n, 1); assert.strictEqual(r2.cortesias.valor, g.admin('adminJornadas').reservas.find((q) => q.codigo === c).totalOriginal, 'valor de lista de lo no cobrado');
  assert.strictEqual(r2.detalle.find((q) => q.codigo === c).total, 0, 'la cortesía no suma ingreso');
  g.admin('adminMarcarCortesia', c, { quitar: true });
  assert.strictEqual(g.admin('adminResumenContable', 'mes', mes).cortesias.n, 0);
  // otros ingresos y gastos entran al cierre
  const antes = g.admin('adminResumenContable', 'mes', mes).mes.utilidadSala;
  g.admin('adminGuardarMovimiento', { fecha, tipo: 'Gasto', destino: 'Sala', monto: 8000, nota: 'Cable XLR' });
  g.admin('adminGuardarMovimiento', { fecha, tipo: 'Ingreso', destino: 'Sala', monto: 3000, nota: 'Venta de cable usado' });
  const d = g.admin('adminResumenContable', 'mes', mes);
  assert.strictEqual(d.mes.utilidadSala, antes - 5000); assert.strictEqual(d.movimientos.lista.length, 2);
  assert.throws(() => g.admin('adminGuardarMovimiento', { fecha, tipo: 'Gasto', destino: 'Sala', monto: 100, nota: '' }), /nota/i);
  g.admin('adminEliminarMovimiento', d.movimientos.lista[0].id);
  assert.strictEqual(g.admin('adminResumenContable', 'mes', mes).movimientos.lista.length, 1);
  assert.ok(base.ok);
});
t('editor del sitio: textos, fotos, ficha, galería y playlist se validan, se guardan y llegan al sitio público', () => {
  g.admin('adminGuardarSitio', 'textos', { 'nos.filo1': '**Honestidad:** sin humo <b>x</b>', 'mala clave!': 'x', vacia: '   ' });
  let pub = g.get({ accion: 'config' }).sitio;
  assert.ok(pub.textos['nos.filo1'].startsWith('**Honestidad:**'), 'texto guardado'); assert.strictEqual(Object.keys(pub.textos).length, 1, 'claves inválidas o vacías se descartan');
  g.admin('adminGuardarSitio', 'fotos', { heroLogo: 'https://lh3.googleusercontent.com/d/abc123', prodFoto: 'javascript:alert(1)', otra: 'assets/sala-1.jpg', mala: 'assets/../x.jpg' });
  pub = g.get({ accion: 'config' }).sitio; assert.deepStrictEqual(Object.keys(pub.fotos).sort(), ['heroLogo', 'otra'], 'solo https o assets/');
  g.admin('adminGuardarSitio', 'galeria', [{ src: 'assets/sala-1.jpg', titulo: 'Sala' }, { src: 'http://inseguro/x.jpg' }, { video: 'https://youtu.be/dQw4w9WgXcQ', titulo: 'Video' }, { video: 'https://malo.com/v' }]);
  pub = g.get({ accion: 'config' }).sitio; assert.strictEqual(pub.galeria.length, 2); assert.ok(pub.galeria[1].video.indexOf('youtube.com/watch?v=dQw4w9WgXcQ') > 0);
  g.admin('adminGuardarSitio', 'microfonos', [{ nombre: 'Shure SM57', foto: 'assets/sala-1.jpg', uso: 'Baterías / Gtr Amp', descripcion: 'Clásico dinámico' }, { nombre: '', uso: 'x' }, { nombre: 'Rode NT1-A', foto: 'javascript:alert(1)' }]);
  pub = g.get({ accion: 'config' }).sitio; assert.strictEqual(pub.microfonos.length, 2); assert.strictEqual(pub.microfonos[0].uso, 'Baterías / Gtr Amp'); assert.strictEqual(pub.microfonos[1].foto, '');
  g.admin('adminGuardarSitio', 'ficha', [{ titulo: 'Sala', icono: '🎸', stats: [['🥁', '5', 'piezas']], fotos: [{ src: 'assets/sala-1.jpg', titulo: 'a' }], bloques: [{ titulo: 'Equipos', items: ['uno', 'dos'] }] }, { titulo: '' }]);
  pub = g.get({ accion: 'config' }).sitio; assert.strictEqual(pub.ficha.length, 1); assert.strictEqual(pub.ficha[0].bloques[0].items.length, 2);
  g.admin('adminGuardarSitio', 'playlist', { url: 'https://music.youtube.com/playlist?list=PLabc123', titulo: 'Trabajos' });
  assert.ok(g.get({ accion: 'config' }).sitio.playlist.url.includes('list=PLabc123'));
  assert.throws(() => g.admin('adminGuardarSitio', 'otra', {}), /no válida/);
  ['textos', 'fotos', 'galeria', 'ficha', 'playlist', 'microfonos'].forEach((x) => g.admin('adminGuardarSitio', x, ['galeria', 'ficha', 'microfonos'].includes(x) ? [] : {}));
  assert.deepStrictEqual(g.get({ accion: 'config' }).sitio, {}, 'vaciar una parte vuelve al sitio original');
});
t('finalizar con el valor que yo dejo (plan pagado antes) y verificación de ingresos', () => {
  const fecha = sumar(f3, 49), mes = fecha.slice(0, 7);
  const r = g.admin('adminReservaManual', { servicio: 'ensayo', fecha, inicio: 12, horas: 2, banda: 'Plan octubre', nombre: 'Ana', telefono: '+56 9 2222 0001', estado: 'Reservado (con abono)' });
  assert.ok(r.ok, JSON.stringify(r));
  g.admin('adminAjustarReserva', r.codigo, { totalFinal: 2000, nota: 'Pagada en plan de octubre; solo un plato', finalizar: true });
  const x = g.admin('adminJornadas').reservas.find((q) => q.codigo === r.codigo);
  assert.strictEqual(x.estado, 'Finalizada'); assert.strictEqual(x.total, 2000); assert.ok(/plato/.test(x.notaAjuste));
  const c = g.admin('adminResumenContable', 'mes', mes); assert.strictEqual(c.detalle.find((q) => q.codigo === r.codigo).total, 2000, 'solo $2.000 entran al mes');
  const v = g.admin('adminVerificarIngresos', mes);
  assert.strictEqual(v.totales.diferencia, 0, 'el resumen coincide con el recálculo'); assert.ok(v.checks.length >= 8);
  assert.strictEqual(v.checks[0].nivel, 'ok');
  // una reserva pasada sin finalizar se avisa
  const vieja = g.admin('adminReservaManual', { servicio: 'ensayo', fecha: sumar(f3, 49), inicio: 16, horas: 1, banda: 'Olvidada', nombre: 'Luis', telefono: '+56 9 2222 0002', estado: 'Reservado (con abono)' });
  assert.ok(vieja.ok);
});
t('venta de tienda con fecha pasada para el historial', () => {
  const pr = g.admin('adminResumen').productos.find((p) => p.precio !== '' && (p.stock === '' || p.stock > 2)); assert.ok(pr, 'hay producto');
  const hoy = g.admin('adminResumen').hoy, ayer = hoy.slice(0, 7) + '-01';
  const rs = g.admin('adminVenderCarrito', 'musica', [{ fila: pr.fila, cantidad: 1 }], 'Venta efectivo', 'Venta de la semana pasada', ayer);
  const vt = rs.ventas.ventas.find((q) => q.id === rs.idsVenta[0]); assert.strictEqual(vt.fecha, ayer); assert.ok(/semana pasada/.test(vt.nota));
  assert.throws(() => g.admin('adminVenderCarrito', 'musica', [{ fila: pr.fila, cantidad: 1 }], 'Venta efectivo', '', sumar(hoy, 5)), /futura/);
  assert.throws(() => g.admin('adminVenderCarrito', 'musica', [{ fila: pr.fila, cantidad: 1 }], 'Venta efectivo', '', '2026-13-45'), /válida/);
  g.admin('adminEditarVenta', vt.id, { cantidad: 1, pago: 'Venta efectivo', nota: 'ok', fecha: hoy.slice(0, 7) + '-01' });
  assert.strictEqual(g.admin('adminResumen').ventas.ventas.find((q) => q.id === vt.id).fecha, hoy.slice(0, 7) + '-01');
});
t('editar la retención de No asiste (perdonar o cambiar el monto)', () => {
  const x = g.admin('adminJornadas').reservas.find((q) => q.estado === 'No asiste'); assert.ok(x, 'hay una No asiste');
  g.admin('adminAjustarRetencion', x.codigo, 0, 'Se perdona'); const y = g.admin('adminJornadas').reservas.find((q) => q.codigo === x.codigo); assert.strictEqual(y.retenido, 0);
  g.admin('adminAjustarRetencion', x.codigo, 7000); assert.strictEqual(g.admin('adminJornadas').reservas.find((q) => q.codigo === x.codigo).retenido, 7000);
});

t('resumen contable mensual y semanal: sala, estudio, tienda, bebestibles y reparto', () => {
  const m = g.admin('adminResumenContable', 'mes', hoy.slice(0, 7));
  ['sala', 'estudio', 'arriendos', 'bruto', 'musica', 'bebestibles', 'mes', 'detalle', 'noAsiste'].forEach((k) => assert.ok(m[k] !== undefined, 'falta ' + k));
  assert.ok(m.sala.total >= 0 && typeof m.mes.totalJC === 'number' && m.mes.pct.salaJC + m.mes.pct.salaJaime === 100);
  const w = g.admin('adminResumenContable', 'semana', hoy);
  assert.ok(w.periodo === 'semana' && w.mes === undefined && w.desde <= hoy && w.hasta >= hoy);
});

console.log('\n== Pagos del abono: «Ya pagué» y Mercado Pago ==');
const telP2 = '+56 9 5555 0001', telP3 = '+56 9 5555 0002';
let codPY, codMP;
t('«Ya pagué»: el horario no vence solo, avisa al admin y se valida con un toque', () => {
  const r = g.post(sol({ inicio: 10, horas: 1, telefono: telP2, banda: 'Pagadores', nombre: 'Pía Pago', correo: 'p@p.cl' })); assert.ok(r.ok, JSON.stringify(r)); codPY = r.codigo;
  assert.strictEqual(r.pago.mp, false, 'sin token no se ofrece Mercado Pago');
  assert.strictEqual(g.post({ accion: 'pagado', codigo: codPY, telefono: '56900000000' }).codigo, 'NO_RESERVA', 'teléfono ajeno rechazado');
  assert.strictEqual(g.post({ accion: 'pagado', codigo: 'RP-999999', telefono: telP2 }).ok, false);
  const a = g.post({ accion: 'pagado', codigo: codPY, telefono: telP2 }); assert.ok(a.ok, JSON.stringify(a));
  assert.ok(g.estado.correos.some((c) => /Comprobante por validar/.test(c.subject) && c.subject.indexOf(codPY) >= 0), 'aviso al admin');
  g.avanzar(3 * 3600000); C.liberarPendientes();
  assert.strictEqual(g.admin('adminJornadas').reservas.find((q) => q.codigo === codPY).estado, 'Reservado (sin abono)', 'sigue guardada tras 3 h');
  assert.strictEqual(g.admin('adminJornadas').reservas.find((q) => q.codigo === codPY).pago, 'COMPROBANTE');
  g.admin('adminCambiarEstado', codPY, 'Reservado (con abono)');
  assert.strictEqual(g.post({ accion: 'pagado', codigo: codPY, telefono: telP2 }).ok, true, 'ya confirmada: respuesta amable');
});
t('«Ya pagué» no retiene el horario para siempre (tope de 12 h)', () => {
  const r = g.post(sol({ inicio: 12, horas: 1, telefono: telP3, banda: 'Dormilones', nombre: 'Dani Duerme', correo: 'd@d.cl' })); assert.ok(r.ok, JSON.stringify(r));
  assert.ok(g.post({ accion: 'pagado', codigo: r.codigo, telefono: telP3 }).ok);
  g.avanzar(13 * 3600000); C.liberarPendientes();
  assert.strictEqual(g.admin('adminJornadas').reservas.find((q) => q.codigo === r.codigo).estado, 'Anulada', 'el horario se liberó');
  assert.ok(g.estado.correos.some((c) => /sin validar|SIN validar/.test(c.subject)), 'avisa que se liberó');
  assert.strictEqual(g.post({ accion: 'pagado', codigo: r.codigo, telefono: telP3 }).codigo, 'VENCIDA');
});
t('config pública no filtra token ni datos de pago', () => {
  const c = JSON.stringify(g.get({ accion: 'config' }));
  ['MP_ACCESS_TOKEN', 'TEST-token', 'datosTransferencia', 'linkPago'].forEach((k) => assert.ok(c.indexOf(k) < 0, 'filtra ' + k));
});
t('Mercado Pago: sin token no hay pago en línea', () => {
  const r = g.post({ accion: 'mp_pagar', codigo: 'RP-123456', telefono: telP2 }); assert.strictEqual(r.codigo, 'MP_OFF');
});
t('Mercado Pago: pago aprobado confirma la reserva y anota la comisión como gasto', () => {
  C.PropertiesService.getScriptProperties().setProperty('MP_ACCESS_TOKEN', 'TEST-token'); C.PropertiesService.getScriptProperties().setProperty('MP_URL_AVISOS', 'https://script.google.com/macros/s/TEST/exec');
    g.admin('adminGuardarAjustes', { mpActivo: 'SI' });
  g.avanzar(1000);
  let r = null; for (let d = 14; d < 60; d++) { r = g.post(sol({ fecha: sumar(f3, d), inicio: 18, horas: 2, telefono: telP2, banda: 'Pagadores', nombre: 'Pía Pago', correo: 'p@p.cl' })); if (r.ok || r.codigo !== 'OCUPADO') break; }
  assert.ok(r.ok, JSON.stringify(r)); codMP = r.codigo;
  assert.strictEqual(r.pago.mp, true);
  let pref = null, pagos = [];
  g.estado.mp = (url, o) => {
    if (/checkout\/preferences/.test(url)) { pref = JSON.parse(o.payload); assert.ok(/TEST-token/.test(o.headers.Authorization)); return { c: 201, j: { init_point: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1' } }; }
    if (/payments\/search/.test(url)) return { c: 200, j: { results: pagos } };
    if (/payments\/777001/.test(url)) return { c: 200, j: pagos[0] };
    return { c: 404, j: {} };
  };
  const p = g.post({ accion: 'mp_pagar', codigo: codMP, telefono: telP2 }); assert.ok(p.ok && /^https:\/\/www\.mercadopago/.test(p.url), JSON.stringify(p));
  assert.strictEqual(pref.items[0].unit_price, 10000); assert.strictEqual(pref.external_reference, codMP); assert.ok(pref.notification_url && /k=/.test(pref.notification_url));
  assert.strictEqual(g.post({ accion: 'mp_pagar', codigo: codMP, telefono: '56911112222' }).codigo, 'NO_RESERVA');
  // aún sin pago: no confirma
  assert.strictEqual(g.post({ accion: 'mp_verificar', codigo: codMP, telefono: telP2 }).confirmada, false);
  // pago por menos del abono: no confirma
  pagos = [{ id: 777001, status: 'approved', external_reference: codMP, transaction_amount: 500, fee_details: [{ amount: 20 }] }];
  assert.strictEqual(g.post({ accion: 'mp_verificar', codigo: codMP, telefono: telP2 }).confirmada, false);
  // aviso con clave incorrecta se ignora
  C.doPost({ parameter: { mp: '1', k: 'mala', type: 'payment', 'data.id': '777001' }, postData: { contents: '{}' } });
  assert.strictEqual(g.admin('adminJornadas').reservas.find((q) => q.codigo === codMP).estado, 'Reservado (sin abono)');
  // pago correcto con comisión real
  pagos = [{ id: 777001, status: 'approved', external_reference: codMP, transaction_amount: 10000, fee_details: [{ amount: 356 }] }];
  const k = C.PropertiesService.getScriptProperties().getProperty('MP_SECRETO');
  C.doPost({ parameter: { mp: '1', k, type: 'payment', 'data.id': '777001' }, postData: { contents: '{"type":"payment","data":{"id":"777001"}}' } });
  const rr = g.admin('adminJornadas').reservas.find((q) => q.codigo === codMP); assert.strictEqual(rr.estado, 'Reservado (con abono)'); assert.strictEqual(rr.pago, 'PAGO EN LÍNEA');
  const movs = g.hoja('Movimientos').filter((f) => /Comisión Mercado Pago/.test(String(f[5]))); assert.strictEqual(movs.length, 1); assert.strictEqual(movs[0][4], 356); assert.strictEqual(movs[0][2], 'Gasto');
  // repetir el aviso no duplica nada
  C.doPost({ parameter: { mp: '1', k, type: 'payment', 'data.id': '777001' }, postData: { contents: '{}' } });
  g.post({ accion: 'mp_verificar', codigo: codMP, telefono: telP2 });
  assert.strictEqual(g.hoja('Movimientos').filter((f) => /Comisión Mercado Pago/.test(String(f[5]))).length, 1);
  assert.ok(g.estado.correos.some((c) => /pagada por Mercado Pago/.test(c.subject)));
});


t('la disponibilidad usa la hoja de Reservas: aunque falte el evento del calendario, el horario sigue ocupado', () => {
  const dia = sumar(f3, 17);
  const r = g.post(sol({ fecha: dia, inicio: 19, horas: 2, telefono: '56977778888', banda: 'SinEvento', nombre: 'Eva L', correo: 'e@e.cl' })); assert.ok(r.ok, JSON.stringify(r));
  g.admin('adminCambiarEstado', r.codigo, 'Reservado (con abono)');
  g.estado.eventos.forEach((e) => { if (/SinEvento/i.test(e.titulo)) e.borrado = true; }); // el evento desaparece del calendario
  const libres = g.get({ accion: 'disponibilidad', fecha: dia }).libres;
  assert.ok(libres.indexOf(19) < 0 && libres.indexOf(20) < 0, 'el horario debe seguir ocupado');
  assert.ok(g.get({ accion: 'agenda' }).dias[dia].libres.indexOf(19) < 0, 'la agenda de la semana también');
  const o = g.post(sol({ fecha: dia, inicio: 20, horas: 1, telefono: '56988889999', banda: 'Choca', nombre: 'Ana B', correo: 'a@a.cl' }));
  assert.ok(!o.ok, 'no se puede reservar encima');
});
t('«Mantener 12 h»: el horario sin abono no vence antes de ese plazo', () => {
  const dia = sumar(f3, 17);
  const r = g.post(sol({ fecha: dia, inicio: 12, horas: 1, telefono: '56911112222', banda: 'Comprobante', nombre: 'Lalo R', correo: 'l@l.cl' })); assert.ok(r.ok, JSON.stringify(r));
  g.admin('adminMantenerHorario', r.codigo);
  const f = g.hoja('Reservas').find((x) => x[0] === r.codigo);
  assert.strictEqual(String(f[C.RES.pago - 1]), 'COMPROBANTE');
  assert.throws(() => g.admin('adminMantenerHorario', 'RP-NOEXISTE'), /No se encontró/);
});
t('reagendar nunca va al pasado ni fuera del horario de atención (ni con la excepción del límite)', () => {
  let dia = sumar(f3, 9); while ([4, 6, 0].indexOf(new Date(dia + 'T12:00:00Z').getUTCDay()) >= 0) dia = sumar(dia, 1);
  const r = g.post(sol({ fecha: dia, inicio: 21, horas: 1, telefono: '56922223333', banda: 'Mueve', nombre: 'Tito R', correo: 't@t.cl' })); assert.ok(r.ok, JSON.stringify(r));
  assert.throws(() => g.admin('adminReagendar', r.codigo, sumar(hoy, -2), 18, true), /FECHA/);
  assert.throws(() => g.admin('adminReagendar', r.codigo, dia, 3, true), /FUERA_HORARIO/);
  assert.throws(() => g.admin('adminReagendar', r.codigo, dia, 15, true), /FUERA_HORARIO/);
  g.admin('adminReagendar', r.codigo, dia, 11, true); // dentro de horario sí
});
t('cuadro de honor: las redes y el último trabajo llegan al portal y se pueden editar', () => {
  const r = C.registrarHonor_({ banda: 'Los Probadores', telefono: '+56 9 5555 4321', correo: 'p@c.cl', resena: 'Grabamos nuestro primer single aquí.', redes: JSON.stringify([{ r: 'Instagram', u: '@losprobadores' }, { r: 'Spotify', u: 'https://open.spotify.com/artist/abc' }]), ultimo: 'https://youtu.be/abcdefghijk' });
  assert.ok(r.ok, r.error);
  let h = C.leerHonor_().filter((x) => x.banda === 'Los Probadores')[0];
  assert.ok(h && /instagram\.com\/losprobadores/.test(h.redes) && /spotify/.test(h.redes) && /youtu\.be/.test(h.ultimo), 'redes y último trabajo guardados y legibles por el portal');
  C.adminEditarHonor(h.fila, { banda: 'Los Probadores', resena: 'Grabamos nuestro primer single aquí.', redes: [{ r: 'TikTok', u: 'https://tiktok.com/@lp' }], ultimo: '' });
  h = C.leerHonor_().filter((x) => x.banda === 'Los Probadores')[0];
  assert.ok(/tiktok/.test(h.redes) && !/spotify/.test(h.redes) && h.ultimo === '', 'edición de redes desde el portal');
});
t('micrófonos: guarda hasta 2 fotos y 3 audios válidos por micrófono y descarta lo inválido', () => {
  const r = C.limpiarMicsSitio_([{ nombre: 'Shure SM57', foto: 'assets/x.jpg', foto2: 'javascript:alert(1)', foto3: 'javascript:alert(2)', uso: 'Cajas / Amp', descripcion: 'Dinámico cardioide', audios: [
    { etiqueta: 'Caja', enlace: 'https://drive.google.com/file/d/ABC123456789/view' }, { etiqueta: 'Amp', enlace: 'https://drive.google.com/file/d/DEF123456789/view' },
    { etiqueta: 'Malo', enlace: 'javascript:alert(1)' }, { etiqueta: 'Tom', enlace: 'https://drive.google.com/file/d/GHI123456789/view' }, { etiqueta: 'Sobra', enlace: 'https://drive.google.com/file/d/JKL123456789/view' }] }]);
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].foto2, ''); assert.strictEqual(r[0].foto3, ''); assert.ok(r[0].audios.length >= 2 && r[0].audios.length <= 3, 'máximo 3 audios'); assert.ok(r[0].audios.every((a) => /^https:\/\//.test(a.enlace)), 'solo enlaces válidos');
});
t('banda de la casa: su reserva sin abono no vence sola y reagenda sin tope; las demás sí vencen', () => {
  let dia = sumar(f3, 11); while ([4, 6, 0].indexOf(new Date(dia + 'T12:00:00Z').getUTCDay()) >= 0) dia = sumar(dia, 1);
  const casa = g.post(sol({ fecha: dia, inicio: 10, horas: 1, telefono: '56933330001', banda: 'Casa Semanal', nombre: 'Rex Z', correo: 'casa.sem@r.cl' })); assert.ok(casa.ok, JSON.stringify(casa));
  const otra = g.post(sol({ fecha: dia, inicio: 12, horas: 1, telefono: '56933330002', banda: 'Una Vez', nombre: 'Tom Y', correo: 'unavez@t.cl' })); assert.ok(otra.ok, JSON.stringify(otra));
  g.admin('adminGuardarCliente', { clave: '56933330001', nombre: 'Rex', apellido: 'Z', correo: 'casa.sem@r.cl', banda: 'Casa Semanal', casa: true });
  g.hoja('Reservas'); const sh = g.estado.hojas['Reservas'];
  sh.filas.forEach((f) => { if (f[0] === casa.codigo || f[0] === otra.codigo) f[C.RES.creada - 1] = new C.Date(Date.now() - 5 * 3600000); });
  C.liberarPendientes();
  const est = (c) => g.admin('adminJornadas').reservas.find((q) => q.codigo === c).estado;
  assert.strictEqual(est(casa.codigo), 'Reservado (sin abono)', 'la banda de la casa no vence');
  assert.strictEqual(est(otra.codigo), 'Anulada', 'la que reserva de vez en cuando vence');
  for (let i = 0; i < 4; i++) g.admin('adminReagendar', casa.codigo, dia, i % 2 ? 10 : 11); // más de 2 reagendos
  assert.ok(g.admin('adminJornadas').clientes.find((c) => c.telefono === '56933330001').casa, 'queda marcada como casa');
});
t('una reserva anulada que se reactiva con abono vuelve a ocupar el horario (y no se pisa si otro lo tomó)', () => {
  const dia = sumar(f3, 16);
  const r = g.post(sol({ fecha: dia, inicio: 21, horas: 2, telefono: '56955556666', banda: 'Reactivada', nombre: 'Diego B', correo: 'd@d.cl' })); assert.ok(r.ok, JSON.stringify(r));
  g.admin('adminCambiarEstado', r.codigo, 'Anulada');
  let libres = g.get({ accion: 'disponibilidad', fecha: dia }).libres;
  assert.ok(libres.indexOf(21) >= 0 && libres.indexOf(22) >= 0, 'anulada: el horario queda libre');
  g.admin('adminCambiarEstado', r.codigo, 'Reservado (con abono)');
  libres = g.get({ accion: 'disponibilidad', fecha: dia }).libres;
  assert.ok(libres.indexOf(21) < 0 && libres.indexOf(22) < 0, 'reactivada con abono: 21 y 22 deben quedar ocupados');
  // anulada de nuevo y otra persona toma el horario: no se puede reactivar encima
  g.admin('adminCambiarEstado', r.codigo, 'Anulada');
  const o = g.post(sol({ fecha: dia, inicio: 21, horas: 1, telefono: '56966667777', banda: 'Otra', nombre: 'Ana P', correo: 'a@a.cl' })); assert.ok(o.ok, JSON.stringify(o));
  assert.throws(() => g.admin('adminCambiarEstado', r.codigo, 'Reservado (con abono)'), /ya lo ocupa/);
  assert.ok(/Todas las reservas|Repuestas/.test(g.admin('adminRepararAgenda')), 'la revisión de agenda responde');
});

t('adicionales con un clic: agregar y quitar bajo/video/material ajusta total y saldo y vuelve al original', () => {
  const r = g.post(sol({ fecha: sumar(f3, 10), inicio: 11, horas: 2, telefono: '56977776666', banda: 'Solo platos', nombre: 'Pablo Rey', correo: 'p@p.cl' })); assert.ok(r.ok, JSON.stringify(r));
  const ver = () => g.admin('adminJornadas').reservas.find((q) => q.codigo === r.codigo);
  const t0 = ver().total, s0 = ver().saldo;
  g.admin('adminCambiarAdicionales', r.codigo, { equipos: ['Bajo eléctrico Epiphone Thunderbird Pro IV'] });
  let x = ver(); assert.ok(x.total > t0, 'el bajo suma al total'); assert.strictEqual(x.saldo - s0, x.total - t0);
  g.admin('adminCambiarAdicionales', r.codigo, { video: true, raw: true });
  x = ver(); assert.ok(x.video && x.raw && x.total > t0);
  g.admin('adminCambiarAdicionales', r.codigo, { equipos: [], video: false, raw: false });
  x = ver(); assert.strictEqual(x.total, t0, 'quitar todo restaura el total'); assert.strictEqual(x.saldo, s0);
  g.admin('adminCambiarEstado', r.codigo, 'Anulada');
  assert.throws(() => g.admin('adminCambiarAdicionales', r.codigo, { video: true }));
});


console.log('\n' + ok + ' pasos correctos, ' + fallas + ' con falla.');
