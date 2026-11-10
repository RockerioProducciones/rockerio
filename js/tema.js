/* Temas: se elige uno en el selector (se recuerda en este navegador). Si la persona no ha elegido, manda el tema que dejaste en el portal. */
(function () {
  var TEMAS = [['rockerio','Rockerío'],['medianoche','Medianoche'],['vino','Vino'],['bosque','Bosque'],['grafito','Grafito'],['azufre','Azufre'],['abismo','Abismo'],['cobre','Cobre'],['ciruela','Ciruela'],['carbon','Carbón']], CLAVE = 'rk_tema';
  function valido(t) { return TEMAS.some(function (x) { return x[0] === t; }); }
  var BASE = '';
  function crudo() { try { return localStorage.getItem(CLAVE) || ''; } catch (e) { return ''; } }
  /* La elección del visitante se guarda junto al tema por defecto vigente: si el dueño cambia el tema, la elección vieja deja de mandar. */
  function leer() { var c = crudo().split('|'); if (BASE && c[1] !== undefined && c[1] !== BASE) return ''; return c[0] || ''; }
  function poner(t) { if (valido(t)) document.documentElement.setAttribute('data-tema', t); }
  function guardar(t) { try { localStorage.setItem(CLAVE, t + '|' + BASE); } catch (e) { /* sin almacenamiento */ } }
  var elegido = leer();
  poner(valido(elegido) ? elegido : 'rockerio');
  var sel;
  window.RKTema = {
    lista: TEMAS,
    /** Tema por defecto del sitio (viene de la configuración); no pisa la elección de la persona. */
    defecto: function (t) { if (!valido(t)) return; BASE = t; var c = crudo().split('|'); if (c[1] !== undefined && c[1] !== t) { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } } if (!valido(leer())) { poner(t); if (sel) sel.value = t; } },
    selector: function () {
      if (sel) return;
      sel = document.createElement('select'); sel.className = 'selector-tema'; sel.setAttribute('aria-label', 'Cambiar tema');
      TEMAS.forEach(function (t) { var o = document.createElement('option'); o.value = t[0]; o.textContent = 'Tema: ' + t[1]; sel.appendChild(o); });
      sel.value = document.documentElement.getAttribute('data-tema') || 'rockerio';
      sel.onchange = function () { guardar(sel.value); poner(sel.value); };
      document.body.appendChild(sel);
    }
  };
  document.addEventListener('DOMContentLoaded', window.RKTema.selector);
})();
