#!/bin/sh
# Genera la carpeta "instalacion" con lo único que hay que pegar en Google Apps Script:
#   Todo.gs (un solo archivo con todo el código del servidor) y Admin.html (el portal).
cd "$(dirname "$0")/.." || exit 1
mkdir -p instalacion
{
  echo "/* ROCKERÍO · Servidor completo. Generado por scripts/empaquetar.sh. No lo edites aquí. */"
  for f in Reglas Code AdminApi Contenido Planes Ventas Socios Contabilidad Ajustes WhatsApp Sitio; do echo; echo "/* ===== $f ===== */"; cat "apps-script/$f.gs"; done
} > instalacion/Todo.gs
cp apps-script/Admin.html instalacion/Admin.html
dup=$(grep -ho "^function [A-Za-z0-9_]*" instalacion/Todo.gs | sort | uniq -d)
[ -z "$dup" ] || { echo "ERROR funciones repetidas:"; echo "$dup"; exit 1; }
node --check instalacion/Todo.gs 2>/dev/null || { cp instalacion/Todo.gs /tmp/_todo.js && node --check /tmp/_todo.js; } || exit 1
echo "ok  instalacion/Todo.gs generado"
