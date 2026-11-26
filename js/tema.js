/* Temas: se elige uno en el selector (se recuerda en este navegador). Si la persona no ha elegido, manda el tema que dejaste en el portal. */
(function () {
  var TEMAS = [['rockerio','Amarillo','#FCC631'],['rojo','Rojo','#ff3b3b'],['azul','Azul','#3b9dff'],['verde','Verde','#19e3b5'],['naranjo','Naranjo','#ff8a1f'],['purpura','Púrpura','#a855f7']], CLAVE = 'rk_tema';
  /* nombres de temas anteriores → los 6 actuales (lo que ya eligió alguien no se pierde) */
  var ANTIGUO = { medianoche: 'azul', vino: 'rojo', bosque: 'verde', abismo: 'verde', cobre: 'naranjo', ciruela: 'purpura', grafito: 'rockerio', azufre: 'rockerio', carbon: 'rockerio' };
  function canon(t) { return ANTIGUO[t] || t; }
  function valido(t) { return TEMAS.some(function (x) { return x[0] === t; }); }
  var BASE = '';
  function crudo() { try { return localStorage.getItem(CLAVE) || ''; } catch (e) { return ''; } }
  /* La elección del visitante se guarda junto al tema por defecto vigente: si el dueño cambia el tema, la elección vieja deja de mandar. */
  function leer() { var c = crudo().split('|'); c[0] = canon(c[0]); if (c[1] !== undefined) c[1] = canon(c[1]); if (c[1] === '?' || c[1] === '') return c[0] || ''; if (BASE && c[1] !== undefined && c[1] !== BASE) return ''; return c[0] || ''; }
  function poner(t) { if (valido(t)) document.documentElement.setAttribute('data-tema', t); }
  function guardar(t) { try { localStorage.setItem(CLAVE, t + '|' + (BASE || '?')); } catch (e) { /* sin almacenamiento */ } }
  var elegido = leer();
  poner(valido(elegido) ? elegido : 'rockerio');
  var sel;
  window.RKTema = {
    lista: TEMAS,
    /** Tema por defecto del sitio (viene de la configuración); no pisa la elección de la persona. */
    defecto: function (t) { t = canon(t); if (!valido(t)) return; BASE = t; var c = crudo().split('|'); c[0] = canon(c[0]); if (c[1] !== undefined && c[1] !== '?' && c[1] !== '') c[1] = canon(c[1]);
      /* La elección se hizo antes de que llegara la configuración: se conserva y se asocia a este tema por defecto. */
      if (c[0] && (c[1] === '?' || c[1] === '')) { try { localStorage.setItem(CLAVE, c[0] + '|' + t); } catch (e) { /* nada */ } c = crudo().split('|'); }
      if (c[1] !== undefined && c[1] !== t) { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } } if (!valido(leer())) { poner(t); if (sel && sel.marcar) sel.marcar(); } },
    selector: function () {
      if (sel) return;
      sel = document.createElement('div'); sel.className = 'selector-tema'; sel.setAttribute('role', 'group'); sel.setAttribute('aria-label', 'Color del sitio');
      var rot = document.createElement('span'); rot.className = 'tema-rot'; rot.textContent = 'Color'; sel.appendChild(rot);
      TEMAS.forEach(function (t) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'tema-dot'; b.dataset.t = t[0]; b.style.setProperty('--c', t[2]);
        b.setAttribute('aria-label', 'Tema ' + t[1].toLowerCase()); b.title = t[1];
        b.onclick = function () { guardar(t[0]); poner(t[0]); marcar(); };
        sel.appendChild(b);
      });
      function marcar() { var a = document.documentElement.getAttribute('data-tema') || 'rockerio'; Array.prototype.forEach.call(sel.querySelectorAll('.tema-dot'), function (b) { b.setAttribute('aria-pressed', b.dataset.t === a ? 'true' : 'false'); }); }
      sel.marcar = marcar; marcar();
      document.body.appendChild(sel);
    }
  };
  document.addEventListener('DOMContentLoaded', window.RKTema.selector);
})();
