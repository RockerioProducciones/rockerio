/* Planes mensuales: el cliente elige sus 4 sesiones, las envía y paga por adelantado. */
(function () {
  'use strict';
  var RK = window.RK, R = window.Reglas, el = RK.el, $ = function (id) { return document.getElementById(id); };
  var plan = null, sel = [], agenda = null, fecha = null, hoy = null, enviando = false;

  function tarjetas() {
    var cfg = RK.cfg(), cont = $('plan-cards'); cont.textContent = '';
    ['plan8', 'plan12'].forEach(function (tipo) {
      var p = R.planInfo(cfg, tipo); if (!p || !p.precio) return;
      var c = el('div', 'card plan-card ' + (tipo === 'plan8' ? 'plan-azul' : 'plan-morado'));
      c.appendChild(el('span', 'plan-badge', tipo === 'plan8' ? 'Ideal para empezar' : 'Para bandas en producción'));
      c.appendChild(el('h3', '', p.nombre)); c.appendChild(el('p', 'tr-monto', R.clp(p.precio)));
      var g = R.grabacionIncluidaMin(cfg, 'ensayo', p.horasPorSesion), normal = p.sesiones * p.horasPorSesion * cfg.precioEnsayoHora, ul = el('ul', 'plan-lista-b');
      [p.sesiones + ' ensayos de ' + p.horasPorSesion + ' horas, ' + (p.sesiones * p.horasPorSesion) + ' horas en total',
        g ? 'Incluye ' + R.minutosTxt(g) + ' de grabación con mezcla en cada ensayo' : '',
        'Sala acondicionada con backline completo',
        'Úsalas este mes o el siguiente; cambios hasta ' + cfg.horasAnulacion + ' h antes',
        normal > p.precio ? 'Ahorras ' + R.clp(normal - p.precio) + ' frente a reservar suelto' : ''
      ].forEach(function (t) { if (t) ul.appendChild(el('li', '', t)); });
      c.appendChild(ul); c.appendChild(el('p', 'nota', R.clp(p.porSesion) + ' por ensayo'));
      var usaWeb = RK.conectado() && cfg.reservasActivas, b;
      if (usaWeb) { b = el('button', 'btn', 'Elegir mis sesiones'); b.type = 'button'; b.addEventListener('click', function () { abrir(tipo); }); }
      else { b = el('a', 'btn', 'Consultar por WhatsApp'); b.href = RK.wsp('Hola, quiero el ' + p.nombre.toLowerCase() + ' (' + R.clp(p.precio) + ').'); b.target = '_blank'; b.rel = 'noopener'; }
      c.appendChild(b); cont.appendChild(c);
    });
  }

  function abrir(tipo) {
    plan = R.planInfo(RK.cfg(), tipo); sel = []; fecha = null;
    $('plan-wiz').hidden = false; $('plan-listo').hidden = true; $('f-plan').hidden = true;
    $('plan-tit').textContent = plan.nombre + ' · ' + R.clp(plan.precio);
    $('plan-wiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
    RK.traerAgenda(R.diasPlan(RK.ahora().fecha) + 1, true).then(function (d) { agenda = d.dias; hoy = d.hoy; pintar(); });
  }

  function pintar() {
    var completo = sel.length === plan.sesiones;
    $('plan-prog').textContent = sel.length + ' de ' + plan.sesiones;
    $('plan-cal').hidden = $('plan-horas').hidden = completo; $('f-plan').hidden = !completo;
    if (!completo) {
      RK.calendario({ cont: $('plan-cal'), hoy: hoy, dias: agenda, horas: function () { return plan.horasPorSesion; }, elegida: function () { return fecha; },
        deshabilitada: function (f) { return sel.some(function (s) { return s.fecha === f; }); }, alElegir: function (f) { fecha = f; pintar(); } });
      var h = $('plan-horas'); h.textContent = '';
      if (fecha) RK.bloques(h, agenda[fecha].libres, plan.horasPorSesion, function (ini) { sel.push({ fecha: fecha, inicio: ini }); sel.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }); fecha = null; pintar(); }, null, agenda[fecha].abiertas);
      else h.appendChild(el('p', 'nota', 'Elige un día para ver los horarios de la sesión ' + (sel.length + 1) + '.'));
    }
    var ul = $('plan-lista'); ul.textContent = '';
    sel.forEach(function (s, i) {
      var li = el('li', '', 'Sesión ' + (i + 1) + ': ' + R.fechaLarga(s.fecha) + ', ' + R.horaTxt(s.inicio) + ' a ' + R.horaTxt(s.inicio + plan.horasPorSesion) + ' ');
      var q = el('button', 'btn chico', 'Quitar'); q.type = 'button'; q.addEventListener('click', function () { sel.splice(i, 1); pintar(); }); li.appendChild(q); ul.appendChild(li);
    });
  }

  function enviar(ev) {
    ev.preventDefault(); if (enviando) return;
    var f = $('f-plan'), err = f.querySelector('.error'), btn = f.querySelector('button[type=submit]'), d = {};
    new FormData(f).forEach(function (v, k) { d[k] = v; }); d.tyc = !!f.tyc.checked;
    d.tipo = plan.tipo; d.sesiones = sel; err.hidden = true;
    var v = R.validarPlan(RK.cfg(), RK.ahora(), d, {});
    if (!v.ok) { err.textContent = v.error; err.hidden = false; return; }
    d.accion = 'plan'; enviando = true; btn.disabled = true; btn.textContent = 'Enviando…';
    RK.pedir(RK.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
      .then(function (r) {
        if (!r.ok) { err.textContent = r.error || 'No se pudo registrar el plan.'; err.hidden = false; return; }
        $('plan-wiz').hidden = true;
        RK.mostrarPago({ box: $('plan-listo'), titulo: '¡Plan registrado! Código #' + r.codigo.replace('PL-', ''),
          lineas: r.sesiones.map(function (s, i) { return 'Sesión ' + (i + 1) + ': ' + R.fechaLarga(s.fecha) + ', ' + R.horaTxt(s.inicio) + ' a ' + R.horaTxt(s.fin); }).concat(['Total del plan: ' + R.clp(r.plan.precio) + ' (se paga completo).']),
          monto: r.plan.precio, pago: r.pago, whatsapp: r.whatsapp });
      })
      .catch(function () { err.textContent = 'No pudimos confirmar el envío. Escríbenos por WhatsApp antes de reintentar.'; err.hidden = false; })
      .finally(function () { enviando = false; btn.disabled = false; btn.textContent = 'Solicitar plan'; });
  }

  RK.listo.then(function () { tarjetas(); $('f-plan').addEventListener('submit', enviar); });
})();
