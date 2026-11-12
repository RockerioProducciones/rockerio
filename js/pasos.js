/* Asistente de reserva: muestra un solo paso a la vez (menos desplazamiento en el celular) y valida los campos.
   No contiene reglas de negocio: usa Reglas (reglas.js) y el estado de app.js (RK.estado). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); }, form = $('form'), R = window.Reglas, RK = window.RK;
  if (!form || !R || !RK) return;
  var PASOS = [
    { id: 'paso-servicio', t: '¿Qué necesitas?', g: ['paso-servicio'] }, { id: 'paso-fecha', t: 'Elige día y horario', g: ['paso-fecha', 'paso-hora'] },
    { id: 'paso-datos', t: 'Tus datos', g: ['paso-datos'] }, { id: 'paso-resumen', t: 'Revisa y confirma', g: ['adicionales', 'paso-resumen'] }
  ];
  var actual = 'paso-servicio', aviso = '';

  function lista() { return PASOS; }
  function indice() { var l = lista(), i = 0; l.forEach(function (p, k) { if (p.id === actual) i = k; }); return i; }
  function listo(id) { var S = RK.estado(); if (id === 'paso-fecha') return !!S.fecha && S.inicio !== null; return true; }

  function ir(id, mover) {
    actual = id; dibujar();
    if (mover) { var b = $('reservar'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start' }); }
  }
  function sig(mover) { var l = lista(), i = indice(); if (i < l.length - 1) ir(l[i + 1].id, mover !== false); }
  function atras() { var l = lista(), i = indice(); if (i > 0) ir(l[i - 1].id, true); }

  function chip() {
    var S = RK.estado(), l = lista(), i = indice(), c = $('wiz-chip');
    if (i === 0 || i === l.length - 1) { c.hidden = true; return; }
    var partes = [S.servicio === 'ensayo' ? 'Ensayo' : 'Estudio', S.horas + (S.horas === 1 ? ' h' : ' h')];
    if (S.fecha) partes.push(R.fechaLarga(S.fecha));
    if (S.inicio !== null) partes.push(R.horaTxt(S.inicio) + '–' + R.horaTxt(S.inicio + S.horas));
    var m = document.querySelector('#tr-total .tr-monto');
    c.textContent = ''; var a = document.createElement('span'); a.textContent = partes.join(' · '); c.appendChild(a);
    if (m) { var b = document.createElement('b'); b.textContent = m.textContent; c.appendChild(b); }
    c.hidden = false;
  }

  function dibujar() {
    var l = lista(), i = indice(), p = l[i];
    PASOS.forEach(function (x) { x.g.forEach(function (g) { $(g).classList.toggle('activo', x.id === actual); }); });
    $('wiz-titulo').textContent = p.t; $('wiz-titulo').setAttribute('data-n', i + 1); $('wiz-n').textContent = (i + 1) + ' de ' + l.length;
    var pr = $('wiz-prog'); pr.textContent = '';
    l.forEach(function (x, k) { var d = document.createElement('i'); d.className = k < i ? 'hecho' : k === i ? 'actual' : ''; var c = document.createElement('u'); c.textContent = k < i ? '✓' : String(k + 1); d.appendChild(c); var t = document.createElement('em'); t.textContent = x.t; d.appendChild(t); pr.appendChild(d); });
    $('wiz-atras').hidden = i === 0;
    var ultimo = i === l.length - 1, s = $('wiz-sig');
    $('wiz-acc').hidden = ultimo; s.disabled = !listo(actual);
    s.textContent = actual === 'paso-servicio' ? 'Elegir el día ›' : actual === 'paso-datos' ? 'Revisar mi reserva ›' : 'Siguiente ›';
    var av = $('wiz-aviso'); if (!av) { av = document.createElement('div'); av.id = 'wiz-aviso'; av.className = 'wiz-aviso'; $('wiz-barra').appendChild(av); }
    av.hidden = !aviso; av.textContent = aviso;
    chip();
  }

  /* ---- validación de los datos de contacto ---- */
  function marcar(input, msg) {
    var prev = input.parentNode.querySelector('.campo-error'); if (prev) prev.remove();
    input.classList.toggle('invalido', !!msg); input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { var s = document.createElement('small'); s.className = 'campo-error'; s.textContent = msg; input.parentNode.appendChild(s); }
    return !msg;
  }
  function revisar(input) {
    var v = input.value.trim();
    if (input.type === 'tel') return marcar(input, v && !R.telefonoValido(R.normalizarTelefono(v)) ? 'Escribe un teléfono válido, por ejemplo +56 9 1234 5678.' : '');
    if (input.type === 'email') return marcar(input, v && !R.correoValido(v.toLowerCase()) ? 'Escribe un correo válido, por ejemplo nombre@correo.cl.' : '');
    return true;
  }
  function validarDatos() {
    var ok = true;
    [['banda', 'Escribe el nombre de tu banda o proyecto.'], ['nombre', 'Escribe tu nombre.']].forEach(function (c) { var i = $(c[0]); if (!marcar(i, i.value.trim().length < 2 ? c[1] : '')) ok = false; });
    var t = $('telefono'), e = $('correo');
    if (!marcar(t, !R.telefonoValido(R.normalizarTelefono(t.value)) ? 'Escribe un teléfono válido, por ejemplo +56 9 1234 5678.' : '')) ok = false;
    if (!marcar(e, !R.correoValido(e.value.trim().toLowerCase()) ? 'Escribe un correo válido, por ejemplo nombre@correo.cl.' : '')) ok = false;
    if (!ok) { var m = form.querySelector('.invalido'); if (m) m.focus(); }
    return ok;
  }

  /* teléfonos: solo números y los signos habituales, en TODOS los formularios del sitio */
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.tagName === 'INPUT' && t.type === 'tel') { var l = t.value.replace(/[^0-9+\s()\-]/g, ''); if (l !== t.value) t.value = l; if (t.classList.contains('invalido')) revisar(t); }
    if (t.tagName === 'INPUT' && t.type === 'email' && t.classList.contains('invalido')) revisar(t);
    if (t.classList && t.classList.contains('invalido') && t.value.trim()) { if (t.type !== 'tel' && t.type !== 'email') marcar(t, ''); }
  });
  document.addEventListener('focusout', function (ev) { var t = ev.target; if (t.tagName === 'INPUT' && (t.type === 'tel' || t.type === 'email')) revisar(t); });

  /* ---- eventos ---- */
  $('wiz-sig').addEventListener('click', function () {
    if (actual === 'paso-datos' && !validarDatos()) return;
    aviso = ''; sig();
  });
  $('wiz-atras').addEventListener('click', atras);
  // al elegir el día, los horarios aparecen debajo: bajamos hasta ellos; al elegir una hora libre avanza solo
  $('cal').addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('.cal-dia'); if (b && !b.disabled && actual === 'paso-fecha') setTimeout(function () { var h = $('paso-hora'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 120); });
  $('horarios').addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('.hora'); if (b && !b.disabled && !b.classList.contains('ocupado') && actual === 'paso-fecha') setTimeout(function () { aviso = ''; sig(); }, 160); });
  // adicionales: plegados hasta que el cliente los pida
  var ext = $('adicionales'), tg = $('ex-toggle');
  if (tg) tg.addEventListener('click', function () { var ab = ext.classList.toggle('abierto'); tg.setAttribute('aria-expanded', ab ? 'true' : 'false'); });

  // si lo elegido deja de ser válido (cambió la duración o alguien tomó el horario), volvemos al paso que corresponde
  RK.alCambiar = function () {
    var S = RK.estado(), l = lista().map(function (p) { return p.id; });
    if (l.indexOf(actual) < 0) actual = l[0];
    if (!S.fecha && l.indexOf(actual) > l.indexOf('paso-fecha')) { actual = 'paso-fecha'; }
    else if (S.inicio === null && l.indexOf(actual) > l.indexOf('paso-fecha')) { aviso = 'Ese horario ya no está disponible. Elige otro.'; actual = 'paso-fecha'; }
    dibujar();
  };
  dibujar();
})();
