/* Genera datos de ejemplo ejecutando el backend simulado, para la vista previa del portal. */
const { crear } = require('./gas-sim');
function sembrar() {
  const g = crear(), C = g.ctx, R = C.Reglas; g.instalar();
  const hoy = C.ahoraChile_().fecha, dia = (n) => { let f = R.sumarDias(hoy, n); while ([0, 6].indexOf(new Date(f + 'T12:00:00Z').getUTCDay()) >= 0) f = R.sumarDias(f, 1); return f; };
  const B = [['Los Ensayos', 'Ana Pérez', '56912345678', 'ana@correo.cl'], ['Nuevos Aires', 'Carla Rojas', '56944443333', 'c@c.cl'], ['Mañaneros', 'Dani Vega', '56922221111', 'd@d.cl'], ['Hierro Fino', 'Beto Soto', '56998887777', 'b@b.cl']];
  const cods = B.map((b, i) => g.post({ accion: 'reservar', servicio: i === 3 ? 'grabacion' : 'ensayo', fecha: i === 2 ? R.sumarDias(hoy, 1) : i === 3 ? dia(9) : dia(2 + i), inicio: 17 + (i % 2), horas: i === 3 ? 3 : 2, extras: 0, video: false, raw: false, banda: b[0], nombre: b[1], telefono: b[2], correo: b[3], tyc: true }).codigo);
  g.admin('adminCambiarEstado', cods[1], 'Reservado (con abono)'); g.admin('adminCambiarEstado', cods[2], 'Reservado (con abono)'); g.admin('adminCambiarEstado', cods[3], 'Reservado (con abono)');
  g.admin('adminCambiarEstado', cods[2], 'Finalizada');
  g.post({ accion: 'resena', codigo: cods[2], telefono: '56922221111', nombre: 'Dani', estrellas: 5, comentario: 'Excelente sala, muy buen sonido' });
  g.post({ accion: 'honor', banda: 'Mañaneros', telefono: '56922221111', correo: 'd@d.cl', resena: 'Grabamos nuestro primer disco aquí', instagram: '@mananeros' });
  g.post({ accion: 'cotizacion', tipo: 'produccion', nombre: 'Eva Mora', telefono: '56911223344', correo: 'eva@correo.cl', mensaje: 'Necesito mezcla de 3 canciones' });
  [['Set 1046', 'Cuerdas 10-46 Ernie Ball', 12000, 6], ['Uñeta Fender', 'Heavy', 1000, 40], ['Baqueta 5A', 'Madera', 6000, 10]].forEach((x) => g.admin('adminGuardarProducto', { tipo: 'musica', categoria: 'Tienda', nombre: x[0], detalle: x[1], precio: x[2], stock: x[3], visible: true }));
  const p = g.admin('adminResumen').productos, pf = (n) => p.find((x) => x.nombre === n); g.admin('adminVenderCarrito', 'musica', [{ fila: pf('Set 1046').fila, cantidad: 1 }, { fila: pf('Uñeta Fender').fila, cantidad: 2 }], 'Venta efectivo'); g.admin('adminVenderCarrito', 'musica', [{ fila: pf('Uñeta Fender').fila, cantidad: 1 }], 'Entregado en sesión (pago pendiente)');
  const bb = g.admin('adminResumen').bebestibles; g.admin('adminReponer', bb[0].fila, 20, 'bebestible'); g.admin('adminVenderCarrito', 'bebestible', [{ fila: bb[0].fila, cantidad: 2 }, { fila: bb[3].fila, cantidad: 1 }], 'Venta transferencia');
  g.admin('adminCrearSocio', 'Gabriela Martelli');
  g.admin('adminGuardarCostos', { mes: hoy.slice(0, 7), luz: 60000, aporte: 10000, caja: 20000, otros: 0, luzFactura: true });
  g.admin('adminGuardarCompra', { fecha: hoy, proveedor: 'Distribuidora Sur', rut: '76.123.456-7', tipo: 'Factura', numero: '123', detalle: 'Cuerdas y unetas', categoria: 'Mercadería', total: 11900 });
  const mas = [['Sótano 13', 'Pía Gómez', '56911110000', 'p@p.cl', 8, 19, 3, 'ensayo'], ['Trío Eléctrico', 'Lalo Mena', '56933330000', 'l@l.cl', 9, 17, 2, 'ensayo'], ['Los Ensayos', 'Ana Pérez', '56912345678', 'ana@correo.cl', 12, 20, 2, 'ensayo'], ['Hierro Fino', 'Beto Soto', '56998887777', 'b@b.cl', 13, 18, 3, 'grabacion'], ['Nuevos Aires', 'Carla Rojas', '56944443333', 'c@c.cl', 15, 19, 2, 'ensayo']];
  mas.forEach((m, i) => { const r = g.post({ accion: 'reservar', servicio: m[7], fecha: dia(m[4]), inicio: m[5], horas: m[6], extras: i % 2 ? 1 : 0, video: m[7] === 'grabacion', raw: false, zurdo: i === 1, voces: 2, banda: m[0], nombre: m[1], telefono: m[2], correo: m[3], tyc: true }); if (r.ok && i % 2 === 0) g.admin('adminCambiarEstado', r.codigo, 'Reservado (con abono)'); });
  g.admin('adminBloquear', dia(22), '', '', 'Mantención');
  g.admin('adminBloquear', dia(23), '14', '17', 'Cita personal');
  return g;
}
module.exports = { sembrar };
