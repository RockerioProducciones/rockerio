# Qué hacer si algo se rompe (2 minutos, sin saber de código)

## 1. Volver el sitio y el portal a una versión que funcionaba
1. Entra a https://github.com/RockerioProducciones/rockerio/actions
2. Elige **«Volver a una versión anterior (rescate)»** (lista de la izquierda).
3. Pulsa **Run workflow**, escribe el nombre de la versión (por ejemplo `estable-2026-11-11-0118`) y pulsa el botón verde.
4. Espera 2 minutos y recarga (Ctrl+F5). Nada se borra: la versión rota queda guardada en el historial.

Las versiones que funcionaban se ven en https://github.com/RockerioProducciones/rockerio/branches (las que empiezan con `estable-`).

## 2. Volver los DATOS (reservas, ventas, ingresos) a un día anterior
Portal → **Configuración → Copias de seguridad** (si no la ves, está en «Socios y respaldo») → elige la fecha → **Restaurar**.
Antes de restaurar se guarda lo actual, así que se puede deshacer.
Las copias también están en tu Drive, carpeta «Rockerío · Respaldos».

## 3. Si el portal queda en blanco o cargando
- Cierra todas las pestañas del portal y espera 10 minutos (se vacían solas las ejecuciones atascadas).
- Si sigue igual: en Apps Script → editor → función **rescate** (crea una copia limpia de la hoja) y, si no ayuda, **rescateDeshacer**.

## Tu contenido personal está protegido
- Lo que cambias desde el portal (textos, fotos, precios, productos, ajustes) vive en tu Google Sheet y en tu Drive, **no** en el código del sitio. Los cambios de diseño o de funciones no lo tocan.
- Cada cambio queda anotado en la hoja «Cambios» (Configuración → Respaldo → «Mis cambios recientes»), con el valor anterior.
- Antes de algo grande: Configuración → Respaldo → «Guardar instantánea». Se restaura desde la misma lista.
- Regla para quien modifique el código: nunca reemplazar ni borrar hojas, ni sobrescribir `data/*.json` con valores nuevos que pisen lo que ella editó; solo agregar.
