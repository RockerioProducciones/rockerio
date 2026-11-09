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
  var sr = ss.getSheetByName(HOJAS.reservas), n = sr.getLastRow();
  if (n > 1) sr.getRange(2, 1, n - 1, ENCABEZADO_RESERVAS.length).getValues().forEach(function (r) {
    var f = aFechaIso_(r[RES.fecha - 1]);
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
      fila.total = base + ex + vi + rw; detalle.push(fila);
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
  out.ingresosBrutos = sala.total + estudio.total + bruto.monto;
  if (R.periodo === 'mes') {
    var c = null; leerCostos_().forEach(function (x) { if (x.mes === R.ref) c = x; });
    var luz = c ? c.luz : 0, aporte = c && c.aporte !== '' ? c.aporte : Number(cfg.aporteLuzProAudix) || 0, caja = c && c.caja !== '' ? c.caja : Number(cfg.cajaChicaMensual) || 0, otros = c ? c.otros : 0;
    var luzSala = Math.max(0, luz - aporte), utilSala = sala.total - luzSala - caja - otros, utilEst = estudio.total;
    out.mes = {
      boletaIngresada: !!(c && c.luz > 0), luz: luz, aporte: aporte, luzSala: luzSala, caja: caja, otros: otros, notas: c ? c.notas : '',
      utilidadSala: utilSala, salaJC: utilSala * cfg.repartoSalaJC / 100, salaJaime: utilSala * cfg.repartoSalaJaime / 100,
      utilidadEstudio: utilEst, estudioEstudio: utilEst * cfg.repartoEstudioEstudio / 100, estudioJC: utilEst * cfg.repartoEstudioJC / 100,
      brutoJC: bruto.monto,
      pct: { salaJC: cfg.repartoSalaJC, salaJaime: cfg.repartoSalaJaime, estudioEstudio: cfg.repartoEstudioEstudio, estudioJC: cfg.repartoEstudioJC }
    };
    out.mes.totalJC = out.mes.salaJC + out.mes.estudioJC + bruto.monto; out.mes.totalJaime = out.mes.salaJaime; out.mes.totalEstudio = out.mes.estudioEstudio;
    out.meses = [];
    var yy = Number(R.ref.slice(0, 4)), mx = Number(R.ref.slice(5, 7));
    for (var k = 0; k < 12; k++) { var d = new Date(Date.UTC(yy, mx - 1 - k, 1)); out.meses.push(d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2)); }
  }
  return out;
}
