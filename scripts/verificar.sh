#!/bin/sh
# Comprueba que las reglas del navegador y del servidor sean idénticas y que el código no tenga errores de sintaxis.
cd "$(dirname "$0")/.." || exit 1
if diff -q js/reglas.js apps-script/Reglas.gs >/dev/null; then
  echo "ok  reglas.js y Reglas.gs son idénticos"
else
  echo "ERROR  js/reglas.js y apps-script/Reglas.gs son distintos. Copia uno sobre el otro."; exit 1
fi
node --check apps-script/Code.gs 2>/dev/null || cp apps-script/Code.gs /tmp/_code.js && node --check /tmp/_code.js && echo "ok  Code.gs sin errores de sintaxis"
for f in js/*.js; do node --check "$f" || exit 1; done && echo "ok  js/*.js sin errores de sintaxis"
sh scripts/empaquetar.sh
node tests/reglas.test.js | tail -1
node tests/contenido.test.js | tail -1
node tests/liquidacion.test.js | tail -1
node tests/ventas.test.js | tail -1
node tests/ajustes.test.js | tail -1
node tests/whatsapp.test.js | tail -8
for f in AdminApi Contenido Planes Ventas Socios Contabilidad Ajustes WhatsApp Sitio Pagos; do cp apps-script/$f.gs /tmp/_v_$f.js && node --check /tmp/_v_$f.js && echo "ok  $f.gs sin errores de sintaxis"; done
cp instalacion/Todo.gs /tmp/_todo.js && node --check /tmp/_todo.js && echo "ok  Todo.gs completo sin errores de sintaxis"
sed -n '/^<script>/,/^<\/script>/p' apps-script/Admin.html | sed '1d;$d' > /tmp/_admin_html.js && node --check /tmp/_admin_html.js && echo "ok  Admin.html (script) sin errores de sintaxis"
echo "--- Flujo completo (backend simulado) ---"
node tests/e2e/flujo.test.js | tail -1
echo "(Pruebas de navegador, si tienes Playwright: node tests/e2e/navegador-sitio.js y navegador-admin.js)"
