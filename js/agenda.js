/* Agenda pública de solo lectura: calendario con horas libres y ocupadas. Nunca muestra nombres ni datos de nadie. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', R = window.Reglas, cont = document.getElementById('dias');
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function msg(t) { cont.textContent = ''; cont.appendChild(el('p', 'sub', t)); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  if (!API) return msg('La agenda aún no está conectada.');
  fetch(API + '?accion=agenda').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) return msg('No pudimos cargar la agenda. Intenta de nuevo.');
    var fechas = Object.keys(d.dias).sort(); if (!fechas.length) return msg('Aún no hay días publicados.');
    var hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // referencia aproximada; solo para la marca «HOY»
    try { hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); } catch (x) { /* se queda la aproximación */ }
    function estado(f) {
      var x = d.dias[f], ab = x.abiertas.length, li = x.libres.length;
      if (!ab) return 'cerrado'; if (!li) return 'lleno'; return li / ab <= 0.34 ? 'poco' : 'libre';
    }
    var cal = el('div', 'dp-cal'), sem = el('div', 'dp-sem'), det = el('section', 'dp-det'), botones = {}, selec = '';
    DOW.forEach(function (n) { sem.appendChild(el('b', '', n)); }); cal.appendChild(sem);
    function mostrar(f) {
      selec = f; Object.keys(botones).forEach(function (k) { botones[k].classList.toggle('sel', k === f); botones[k].setAttribute('aria-pressed', k === f ? 'true' : 'false'); });
      var x = d.dias[f], libres = {}; x.libres.forEach(function (h) { libres[h] = true; }); det.textContent = '';
      det.appendChild(el('h2', '', R.fechaLarga(f).replace(' De ', ' de ')));
      if (!x.abiertas.length) { det.appendChild(el('p', 'res', 'Cerrado este día.')); return; }
      det.appendChild(el('p', 'res', x.libres.length ? plural(x.libres.length, 'hora libre', 'horas libres') + ' de ' + x.abiertas.length : 'Sin cupo este día.'));
      var hs = el('div', 'dp-hs'); x.abiertas.forEach(function (h) { hs.appendChild(el('span', 'dp-h ' + (libres[h] ? 'libre' : 'ocupada'), R.horaTxt(h))); }); det.appendChild(hs);
      if (x.libres.length) { var a = el('a', 'dp-cta', 'Reservar en la página de reservas'); a.href = 'index.html#reservar'; det.appendChild(a); }
    }
    // semanas completas (lunes a domingo) desde el primer hasta el último día publicado
    var ini = R.sumarDias(fechas[0], -((R.diaSemana(fechas[0]) + 6) % 7)), fin = fechas[fechas.length - 1], f = ini, fila;
    function cel(f) {
      var pub = !!d.dias[f], b = el('button', 'dp-d ' + (pub ? estado(f) : 'fuera') + (f === hoy ? ' hoy' : '')); b.type = 'button';
      if (!pub) { b.disabled = true; b.setAttribute('aria-hidden', 'true'); return b; }
      var x = d.dias[f], n = +f.slice(8), st = estado(f), primero = n === 1 || f === fechas[0];
      b.appendChild(el('span', 'm', primero ? MES[+f.slice(5, 7) - 1] : ' ')); b.appendChild(el('span', 'n', String(n)));
      b.appendChild(el('span', 't', st === 'cerrado' ? 'Cerrado' : st === 'lleno' ? 'Sin cupo' : plural(x.libres.length, 'libre', 'libres')));
      if (x.abiertas.length) { var bar = el('span', 'bar'), i = el('i'); i.style.width = Math.round(x.libres.length / x.abiertas.length * 100) + '%'; bar.appendChild(i); b.appendChild(bar); }
      b.setAttribute('aria-label', R.fechaLarga(f) + ': ' + (x.abiertas.length ? plural(x.libres.length, 'hora libre', 'horas libres') : 'cerrado'));
      b.setAttribute('aria-pressed', 'false'); botones[f] = b;
      if (st !== 'cerrado') b.addEventListener('click', function () { mostrar(f); det.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); else b.tabIndex = -1;
      return b;
    }
    while (f <= fin) { if (R.diaSemana(f) === 1 || !fila) { fila = el('div', 'dp-fila'); cal.appendChild(fila); } fila.appendChild(cel(f)); f = R.sumarDias(f, 1); }
    while (fila.children.length < 7) fila.appendChild(cel('0000-00-00'));
    cont.textContent = ''; cont.appendChild(cal); cont.appendChild(det);
    cont.appendChild(el('p', 'dp-nota', 'Se actualiza al instante con cada reserva.'));
    var primeroLibre = fechas.filter(function (x) { return estado(x) === 'libre' || estado(x) === 'poco'; })[0] || fechas.filter(function (x) { return estado(x) !== 'cerrado'; })[0] || fechas[0];
    mostrar(primeroLibre);
  }).catch(function () { msg('No pudimos cargar la agenda. Intenta de nuevo.'); });
})();
