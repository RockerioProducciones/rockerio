# Automatización completa — guía paso a paso

Meta: **cada mejora se publica sola, sin copiar archivos ni "Nueva versión" a mano, y sin poner en riesgo tus datos.**

## Cómo queda el sistema
- **Tus datos** (reservas, clientes, ventas) viven en tu Google Sheet. La automatización **nunca los toca**: solo reemplaza código.
- **Sitio público**: GitHub Pages lo publica solo cuando cambia el repo.
- **Portal admin**: un robot de GitHub sube el código a Apps Script y actualiza tus dos implementaciones (URL iguales).
- **Protecciones contra corrupción**
  1. Antes de publicar corren las pruebas automáticas; si una falla, no se publica nada.
  2. Los cambios de la hoja son solo "agregar" (p. ej. la columna Reagendos); nunca borran ni reordenan.
  3. Respaldo automático cada noche (3 AM) en Drive → carpeta «Rockerío · Respaldos» (últimas 30).
  4. En el portal → **Socios y respaldo** hay lista de copias con botón **Restaurar**. Al restaurar, antes se guarda una copia «Previo a restaurar», así que siempre se puede deshacer.
  5. Si algo sale mal con el código, GitHub y Apps Script guardan versiones anteriores y se vuelve atrás.

## Parte A — Subir el proyecto a GitHub (15 min, una vez)
1. Entra a tu repo `rockerio` en GitHub → **Add file → Upload files**.
2. Arrastra TODO el contenido de la carpeta del proyecto (incluida la carpeta oculta `.github`). Si el navegador no sube carpetas ocultas: **Add file → Create new file**, nombre `.github/workflows/portal.yml` y pega el contenido que te entrego.
3. **No reemplaces tu `js/config.js`** (tiene tus URL). Si ya existe, deja el tuyo.
4. Settings → Pages: Source = *Deploy from a branch*, rama `main`, carpeta `/ (root)`.

## Parte B — Conectar Apps Script (10 min, una vez)
1. Abre https://script.google.com/home/usersettings y activa **API de Apps Script**.
2. En tu proyecto de Apps Script → ⚙ Configuración del proyecto → copia el **ID de secuencia de comandos**.
3. Implementar → Administrar implementaciones: copia el **ID de implementación** de cada una (la pública y la «Solo yo»).
4. En tu computador instala Node.js, abre la Terminal y ejecuta:
   `npm i -g @google/clasp` y luego `clasp login` (se abre Google, inicias sesión tú).
   Esto crea el archivo `~/.clasprc.json` (en Mac: Finder → Cmd+Shift+. para ver ocultos).
5. En GitHub → repo → Settings → Secrets and variables → Actions:
   - Pestaña **Secrets** → New secret: nombre `CLASPRC_JSON`, valor = contenido completo de `~/.clasprc.json`.
   - Pestaña **Variables** → crea `SCRIPT_ID`, `DEPLOY_ID_PUBLICO`, `DEPLOY_ID_ADMIN`.
6. Pestaña **Actions** → "Publicar portal" → **Run workflow** para la primera prueba. Verde ✔ = listo.

## Parte C — Cómo se usa después
Me pides una mejora → yo te entrego los archivos → los subes al repo (Upload files, Commit) → en 1–3 minutos sitio y portal están actualizados. Si algo falla verás una ✗ roja en Actions y lo anterior sigue funcionando.
(Mejor aún: si me autorizas el repo desde Claude Code, puedo subir los cambios yo mismo; así tú solo me pides la mejora.)

## Seguridad
- `CLASPRC_JSON` es una llave de tu cuenta de Google: va solo en GitHub Secrets, nunca en el chat ni en archivos del repo. Se puede revocar en https://myaccount.google.com/permissions.
- No está probado con tu cuenta real; la primera ejecución se revisa juntas.
