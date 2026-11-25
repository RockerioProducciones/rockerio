/* Disponibilidad pública, simple: HOY, ESTA SEMANA y las PRÓXIMAS 4 SEMANAS. Filtro por cantidad de horas.
   Nunca muestra nombres ni datos de nadie. Al tocar un horario se pasa a reservar con día, hora y duración ya elegidos. */
(function () {
  var API = (window.ROCKERIO && window.ROCKERIO.APPS_SCRIPT_URL) || '', R = window.Reglas, cont = document.getElementById('dias');
  var DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], DOWL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'], MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }
  function msg(t) { cont.textContent = ''; cont.appendChild(el('p', 'sub', t)); }
  if (!API) return msg('La agenda aún no está conectada.');
  function pedir(u) { return fetch(u).then(function (r) { return r.json(); }); }
  Promise.all([pedir(API + '?accion=agenda'), pedir(API + '?accion=config').catch(function () { return null; })]).then(function (res) {
    var d = res[0], lim = { min: 1, max: 4 }, cfgP = null;
    if (!d.ok) return msg('No pudimos cargar la agenda. Intenta de nuevo.');
    try { if (res[1] && res[1].ok) { cfgP = R.normalizarConfig(res[1].config); var l = R.limitesHoras(cfgP, 'ensayo'); lim = { min: l.min, max: Math.min(l.max, 6) }; } } catch (x) { /* se queda 1–4 */ }
    var hoy = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    try { hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); } catch (x) { /* aproximación */ }
    var horas = Math.min(Math.max(2, lim.min), lim.max), selec = '';
    var lunes = R.sumarDias(hoy, -((R.diaSemana(hoy) + 6) % 7)), domingo = R.sumarDias(lunes, 6), sigLunes = R.sumarDias(lunes, 7), finCal = R.sumarDias(sigLunes, 27);
    function dmy(f) { return f.slice(8) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4); }
    function dTxt(f) { return R.fechaLarga(f); }
    function inicios(f) { /* bloques seguidos que no se pisan: 18–20, 20–22… (la hora exacta se puede ajustar al reservar) */
      var x = d.dias[f], r = [], fin = -1; if (!x) return r;
      R.inicios(x.libres, horas).sort(function (a, b) { return a - b; }).forEach(function (h) { if (h >= fin) { r.push(h); fin = h + horas; } }); return r; }
    function liga(f, h) { var a = el('a', 'dp-b', R.horaTxt(h) + ' – ' + R.horaTxt(h + horas)); a.href = 'index.html?f=' + f + '&h=' + h + '&d=' + horas + '#reservar'; a.setAttribute('aria-label', 'Reservar ' + R.fechaLarga(f) + ' de ' + R.horaTxt(h) + ' a ' + R.horaTxt(h + horas)); return a; }
    function mas(n, f) { var m = el('button', 'dp-mas', '+' + n + ' más'); m.type = 'button'; m.onclick = function () { selec = f; pintarDetalle(); var e = document.getElementById('dp-det'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; return m; }
    function horasTxt() { return horas + (horas === 1 ? ' hora' : ' horas'); }

    /* ---- filtro de horas (se conserva) ---- */
    var dur = el('div', 'dp-dur'); dur.appendChild(el('span', 'dp-q', '¿Cuántas horas necesitas?')); var chips = el('div', 'dp-chips'); dur.appendChild(chips);
    function pintarDur() { pintarInc(); chips.textContent = ''; for (var h = lim.min; h <= lim.max; h++) (function (h) { var b = el('button', 'dp-chip' + (h === horas ? ' on' : ''), h + (h === 1 ? ' hora' : ' horas')); b.type = 'button'; b.setAttribute('aria-pressed', h === horas ? 'true' : 'false'); b.onclick = function () { horas = h; pintarTodo(); }; chips.appendChild(b); })(h); }

    /* ---- HOY ---- */
    var boxHoy = el('section', 'dp-hoy'), boxSem = el('section', 'dp-sem'), boxCal = el('section', 'dp-calbox');
    function pintarHoy() {
      boxHoy.textContent = ''; var x = d.dias[hoy], ini = inicios(hoy);
      var c = el('div', 'dp-card dp-grande' + (ini.length ? ' ok' : '')); var cab = el('div', 'dp-cab'); cab.appendChild(el('b', '', 'Hoy')); cab.appendChild(el('span', '', R.fechaLarga(hoy))); c.appendChild(cab);
      if (!x || !x.abiertas.length) c.appendChild(el('p', 'dp-vacio', 'Hoy estamos cerrados.'));
      else if (!ini.length) c.appendChild(el('p', 'dp-vacio', x.libres.length ? 'No quedan bloques de ' + horasTxt() + ' hoy. Prueba con menos horas.' : 'Hoy ya no quedan horarios.'));
      else { var bs = el('div', 'dp-bs'); ini.forEach(function (h) { bs.appendChild(liga(hoy, h)); }); c.appendChild(bs); }
      boxHoy.appendChild(c);
    }
    /* ---- ESTA SEMANA (los días que faltan hasta el domingo) ---- */
    function pintarSem() {
      boxSem.textContent = ''; var dias = []; for (var f = R.sumarDias(hoy, 1); f <= domingo; f = R.sumarDias(f, 1)) if (d.dias[f]) dias.push(f);
      if (!dias.length) return; boxSem.appendChild(el('h2', 'dp-h2', 'Esta semana'));
      dias.forEach(function (f) {
        var ini = inicios(f), x = d.dias[f], r = el('div', 'dp-fila-d' + (ini.length ? ' ok' : ''));
        r.appendChild(el('span', 'dp-fd', dTxt(f)));
        if (!x.abiertas.length) r.appendChild(el('span', 'dp-nada', 'Cerrado'));
        else if (!ini.length) r.appendChild(el('span', 'dp-nada', x.libres.length ? 'Sin bloques de ' + horasTxt() : 'Sin cupo'));
        else { var bs = el('div', 'dp-bs'); ini.forEach(function (h) { bs.appendChild(liga(f, h)); }); r.appendChild(bs); }
        boxSem.appendChild(r);
      });
    }
    /* ---- PRÓXIMAS 4 SEMANAS ---- */
    function pintarCal() {
      boxCal.textContent = ''; boxCal.appendChild(el('h2', 'dp-h2', 'Próximas 4 semanas'));
      boxCal.appendChild(el('p', 'dp-rango', 'Del ' + dmy(sigLunes) + ' al ' + dmy(finCal) + '. Toca un día para ver sus horarios.'));
      var cal = el('div', 'dp-cal'), sem = el('div', 'dp-sm'); DOW.forEach(function (n) { sem.appendChild(el('b', '', n)); }); cal.appendChild(sem);
      var fila; for (var f = sigLunes; f <= finCal; f = R.sumarDias(f, 1)) {
        if (R.diaSemana(f) === 1) { fila = el('div', 'dp-fl'); cal.appendChild(fila); }
        var x = d.dias[f], n = x ? inicios(f).length : 0, ab = x && x.abiertas.length, est = !x || !ab ? 'cerrado' : !n ? 'lleno' : (n <= 2 ? 'poco' : 'libre');
        var b = el('button', 'dp-d ' + est + (f === selec ? ' sel' : '')); b.type = 'button'; b.appendChild(el('span', 'n', String(+f.slice(8))));
        if (+f.slice(8) === 1 || f === sigLunes) b.appendChild(el('span', 'm', MESL[+f.slice(5, 7) - 1].slice(0, 3)));
        b.setAttribute('aria-label', R.fechaLarga(f) + ': ' + (n ? n + (n === 1 ? ' horario' : ' horarios') : 'sin horarios')); b.setAttribute('aria-pressed', f === selec ? 'true' : 'false');
        if (est === 'cerrado' || est === 'lleno') b.disabled = true; else (function (f) { b.onclick = function () { selec = f; pintarCal(); pintarDetalle(); var e = document.getElementById('dp-det'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }; })(f);
        fila.appendChild(b);
      }
      boxCal.appendChild(cal);
      var ley = el('p', 'dp-ley'); [['#3ddc84', 'Hay horarios'], ['#FCC631', 'Quedan pocos'], ['#8a8581', 'No disponible']].forEach(function (x) { var s = el('span', '', x[1]); s.style.setProperty('--c', x[0]); ley.appendChild(s); }); boxCal.appendChild(ley);
      var det = el('div', 'dp-det'); det.id = 'dp-det'; boxCal.appendChild(det);
    }
    function pintarDetalle() {
      var det = document.getElementById('dp-det'); if (!det) return; det.textContent = ''; if (!selec) { det.hidden = true; return; } det.hidden = false;
      var ini = inicios(selec); det.appendChild(el('h3', '', R.fechaLarga(selec)));
      if (!ini.length) { det.appendChild(el('p', 'dp-vacio', 'No quedan bloques de ' + horasTxt() + ' este día.')); return; }
      var bs = el('div', 'dp-bs'); ini.forEach(function (h) { bs.appendChild(liga(selec, h)); }); det.appendChild(bs);
    }
    function pintarTodo() { pintarDur(); pintarHoy(); pintarSem(); pintarCal(); pintarDetalle(); }

    cont.textContent = ''; var cols = el('div', 'dp-cols'), izq = el('div', 'dp-izq'), der = el('div', 'dp-der');
    var inc = el('p', 'dp-inc'); dur.appendChild(inc);
    function pintarInc() { var g = 0; try { g = cfgP ? R.grabacionIncluidaMin(cfgP, 'ensayo', horas) : 0; } catch (x) { g = 0; } inc.hidden = !g; inc.textContent = g ? '🎙️ Dentro de tus ' + horas + ' horas: ' + R.minutosTxt(horas * 60 - g) + ' de ensayo + ' + R.minutosTxt(g) + ' grabados' : ''; }
    cont.appendChild(dur); izq.appendChild(boxHoy); izq.appendChild(boxSem); der.appendChild(boxCal); cols.appendChild(izq); cols.appendChild(der); cont.appendChild(cols);
    cont.appendChild(el('p', 'dp-nota', 'Se actualiza al instante con cada reserva.'));
    pintarTodo();
  }).catch(function () { msg('No pudimos cargar la agenda. Intenta de nuevo.'); });
})();
