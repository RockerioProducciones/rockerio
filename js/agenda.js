/* Disponibilidad pública. Primero lo más próximo (hoy, mañana, próximos días); luego el mes completo.
   Nunca muestra nombres ni datos de nadie. Al tocar un horario lleva a reservar con día, hora y duración ya elegidos. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', R = window.Reglas, cont = document.getElementById('dias');
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], DOWL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function msg(t) { cont.textContent = ''; cont.appendChild(el('p', 'sub', t)); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  if (!API) return msg('La agenda aún no está conectada.');
  function pedir(u) { return fetch(u).then(function (r) { return r.json(); }); }
  Promise.all([pedir(API + '?accion=agenda'), pedir(API + '?accion=config').catch(function () { return null; })]).then(function (res) {
    var d = res[0], lim = { min: 1, max: 4 };
    if (!d.ok) return msg('No pudimos cargar la agenda. Intenta de nuevo.');
    try { if (res[1] && res[1].ok) { var l = R.limitesHoras(R.normalizarConfig(res[1].config), 'ensayo'); lim = { min: l.min, max: Math.min(l.max, 6) }; } } catch (x) { /* se queda 1–4 */ }
    var fechas = Object.keys(d.dias).sort(); if (!fechas.length) return msg('Aún no hay días publicados.');
    var hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    try { hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); } catch (x) { /* aproximación */ }
    var horas = Math.min(Math.max(2, lim.min), lim.max), selec = '';
    function dTxt(f) { return DOWL[(R.diaSemana(f) + 6) % 7].slice(0, 3) + ' ' + (+f.slice(8)); }
    function inicios(f) { var x = d.dias[f]; return x ? R.inicios(x.libres, horas) : []; }
    function liga(f, h) { var a = el('a', 'dp-b', R.horaTxt(h)); a.href = 'index.html?f=' + f + '&h=' + h + '&d=' + horas + '#reservar'; a.setAttribute('aria-label', 'Reservar ' + R.fechaLarga(f) + ' de ' + R.horaTxt(h) + ' a ' + R.horaTxt(h + horas)); return a; }
    function estado(f) { var x = d.dias[f], ab = x.abiertas.length, li = x.libres.length; if (!ab) return 'cerrado'; if (!li) return 'lleno'; return li / ab <= 0.34 ? 'poco' : 'libre'; }

    /* ---- barra de duración ---- */
    var dur = el('div', 'dp-dur'); dur.appendChild(el('span', 'dp-q', '¿Cuántas horas necesitas?'));
    var chips = el('div', 'dp-chips'); dur.appendChild(chips);
    function pintarDur() { chips.textContent = ''; for (var h = lim.min; h <= lim.max; h++) (function (h) { var b = el('button', 'dp-chip' + (h === horas ? ' on' : ''), h + (h === 1 ? ' hora' : ' horas')); b.type = 'button'; b.setAttribute('aria-pressed', h === horas ? 'true' : 'false'); b.onclick = function () { horas = h; pintarTodo(); }; chips.appendChild(b); })(h); }

    /* ---- lo próximo ---- */
    var prox = el('section', 'dp-prox');
    function tarjeta(titulo, f, grande) {
      var c = el('div', 'dp-t' + (grande ? ' g' : '')), x = d.dias[f];
      var cab = el('div', 'dp-tc'); cab.appendChild(el('b', '', titulo)); cab.appendChild(el('span', '', dTxt(f))); c.appendChild(cab);
      if (!x || !x.abiertas.length) { c.appendChild(el('p', 'dp-vacio', 'Cerrado este día.')); return c; }
      var ini = inicios(f);
      if (!ini.length) { c.appendChild(el('p', 'dp-vacio', x.libres.length ? 'No quedan bloques de ' + horas + (horas === 1 ? ' hora' : ' horas') + '. Prueba con menos horas.' : 'Sin cupo este día.')); return c; }
      var bs = el('div', 'dp-bs'); ini.slice(0, 6).forEach(function (h) { bs.appendChild(liga(f, h)); });
      if (ini.length > 6) { var m = el('button', 'dp-mas', '+' + (ini.length - 6) + ' más'); m.type = 'button'; m.onclick = function () { mostrar(f); document.getElementById('dp-det').scrollIntoView({ behavior: 'smooth', block: 'start' }); }; bs.appendChild(m); }
      c.appendChild(bs); return c;
    }
    function pintarProx() {
      prox.textContent = ''; var fm = R.sumarDias(hoy, 1);
      prox.appendChild(el('h2', 'dp-h2', 'Lo más próximo'));
      var g = el('div', 'dp-tg');
      if (d.dias[hoy]) g.appendChild(tarjeta('Hoy', hoy, true));
      if (d.dias[fm]) g.appendChild(tarjeta('Mañana', fm, true));
      prox.appendChild(g);
      var sig = fechas.filter(function (f) { return f > fm && d.dias[f].abiertas.length && inicios(f).length; }).slice(0, 5);
      if (sig.length) {
        prox.appendChild(el('h3', 'dp-h3', 'Los días que vienen')); var l = el('div', 'dp-lista');
        sig.forEach(function (f) { var r = el('div', 'dp-fil'); r.appendChild(el('span', 'dp-fd', dTxt(f))); var bs = el('div', 'dp-bs'); var ini = inicios(f); ini.slice(0, 5).forEach(function (h) { bs.appendChild(liga(f, h)); }); if (ini.length > 5) { var m = el('button', 'dp-mas', '+' + (ini.length - 5)); m.type = 'button'; m.onclick = function () { mostrar(f); document.getElementById('dp-det').scrollIntoView({ behavior: 'smooth', block: 'start' }); }; bs.appendChild(m); } r.appendChild(bs); l.appendChild(r); });
        prox.appendChild(l);
      } else if (!inicios(hoy).length && !inicios(fm).length) prox.appendChild(el('p', 'dp-vacio', 'No hay bloques de ' + horas + (horas === 1 ? ' hora' : ' horas') + ' en los próximos días. Prueba con menos horas o mira el mes completo.'));
    }

    /* ---- mes + detalle ---- */
    var calBox = el('section', 'dp-calbox'), cal = el('div', 'dp-cal'), sem = el('div', 'dp-sem'), det = el('section', 'dp-det'), botones = {};
    det.id = 'dp-det'; DOW.forEach(function (n) { sem.appendChild(el('b', '', n)); });
    function mostrar(f) {
      selec = f; Object.keys(botones).forEach(function (k) { botones[k].classList.toggle('sel', k === f); botones[k].setAttribute('aria-pressed', k === f ? 'true' : 'false'); });
      var x = d.dias[f], ini = inicios(f), okI = {}; ini.forEach(function (h) { okI[h] = true; }); var libres = {}; x.libres.forEach(function (h) { libres[h] = true; }); det.textContent = '';
      det.appendChild(el('h2', '', R.fechaLarga(f).replace(' De ', ' de ')));
      if (!x.abiertas.length) { det.appendChild(el('p', 'res', 'Cerrado este día.')); return; }
      det.appendChild(el('p', 'res', ini.length ? 'Toca la hora en que quieres empezar (' + horas + (horas === 1 ? ' hora' : ' horas') + ').' : x.libres.length ? 'No quedan bloques de ' + horas + (horas === 1 ? ' hora' : ' horas') + ' este día. Prueba con menos horas.' : 'Sin cupo este día.'));
      var hs = el('div', 'dp-hs'); x.abiertas.forEach(function (h) { hs.appendChild(okI[h] ? liga(f, h) : el('span', 'dp-h ' + (libres[h] ? 'suelta' : 'ocupada'), R.horaTxt(h))); }); det.appendChild(hs);
      det.appendChild(el('p', 'dp-pie', 'Verde: puedes empezar a esa hora. Tachado: ocupado.'));
    }
    var ini0 = R.sumarDias(fechas[0], -((R.diaSemana(fechas[0]) + 6) % 7)), fin = fechas[fechas.length - 1], f = ini0, fila;
    function cel(f) {
      var pub = !!d.dias[f], b = el('button', 'dp-d ' + (pub ? estado(f) : 'fuera') + (f === hoy ? ' hoy' : '')); b.type = 'button';
      if (!pub) { b.disabled = true; b.setAttribute('aria-hidden', 'true'); return b; }
      var x = d.dias[f], n = +f.slice(8), st = estado(f), primero = n === 1 || f === fechas[0];
      b.appendChild(el('span', 'm', primero ? MES[+f.slice(5, 7) - 1] : ' ')); b.appendChild(el('span', 'n', String(n)));
      b.appendChild(el('span', 't', st === 'cerrado' ? 'Cerrado' : st === 'lleno' ? 'Sin cupo' : plural(x.libres.length, 'libre', 'libres')));
      if (x.abiertas.length) { var bar = el('span', 'bar'), i = el('i'); i.style.width = Math.round(x.libres.length / x.abiertas.length * 100) + '%'; bar.appendChild(i); b.appendChild(bar); }
      b.setAttribute('aria-label', R.fechaLarga(f) + ': ' + (x.abiertas.length ? plural(x.libres.length, 'hora libre', 'horas libres') : 'cerrado')); b.setAttribute('aria-pressed', 'false'); botones[f] = b;
      if (st !== 'cerrado') b.addEventListener('click', function () { mostrar(f); det.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }); else b.tabIndex = -1;
      return b;
    }
    cal.appendChild(sem);
    while (f <= fin) { if (R.diaSemana(f) === 1 || !fila) { fila = el('div', 'dp-fila'); cal.appendChild(fila); } fila.appendChild(cel(f)); f = R.sumarDias(f, 1); }
    while (fila.children.length < 7) fila.appendChild(cel('0000-00-00'));
    calBox.appendChild(el('h2', 'dp-h2', 'Mira otro día')); calBox.appendChild(cal); calBox.appendChild(det);
    var ley = el('p', 'dp-ley'); [['#3ddc84', 'Con horas libres'], ['#FCC631', 'Quedan pocas'], ['#8a8581', 'Sin cupo'], ['#555', 'Cerrado']].forEach(function (x) { var s = el('span', '', x[1]); s.style.setProperty('--c', x[0]); ley.appendChild(s); }); calBox.appendChild(ley);

    function pintarTodo() { pintarDur(); pintarProx(); if (selec) mostrar(selec); }
    cont.textContent = ''; var cols = el('div', 'dp-cols'), izq = el('div', 'dp-izq'), der = el('div', 'dp-der');
    izq.appendChild(dur); izq.appendChild(prox); der.appendChild(calBox); cols.appendChild(izq); cols.appendChild(der); cont.appendChild(cols);
    cont.appendChild(el('p', 'dp-nota', 'Se actualiza al instante con cada reserva. Al elegir un horario pasas a reservar con el día y la hora ya puestos.'));
    var primero = fechas.filter(function (x) { return d.dias[x].abiertas.length && inicios(x).length; })[0] || fechas[0];
    selec = primero; pintarTodo();
  }).catch(function () { msg('No pudimos cargar la agenda. Intenta de nuevo.'); });
})();
