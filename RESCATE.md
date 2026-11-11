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
