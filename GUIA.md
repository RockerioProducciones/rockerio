# Guía de implementación y de mantenimiento

Para quien administra Rockerío: qué se hace primero, dónde vive cada cosa, cómo se actualiza con GitHub y qué pasa con los datos.

## 1. Dónde vive cada cosa (lo más importante)

| Qué | Dónde | ¿Se pierde al actualizar el sitio? |
|---|---|---|
| Página que ven los clientes (diseño, fotos, textos fijos) | **GitHub** (repositorio `rockerio`) | No: es solo el diseño |
| Reservas, clientes, ventas, configuración, reseñas, costos | **Hoja de Google** «Rockerío · Base de datos» | **Nunca** al subir archivos a GitHub |
| Calendario de reservas | **Google Calendar** «Rockerío · Agenda» | No |
| Programa que guarda y valida (reglas, correos, WhatsApp) | **Google Apps Script** (`Todo.gs`) | No: los datos están en la hoja, no en el programa |
| Claves (token de WhatsApp, enlaces de socios) | **Propiedades del script** de Google | No. Nunca van a GitHub |

Por eso, cambiar el diseño en GitHub **no toca ningún dato**, y los datos **no se actualizan solos con GitHub**: viven aparte y siempre están al día.

## 2. Orden de la primera instalación

1. **Google** (cuenta rockerioestudio@gmail.com): crear el proyecto de Apps Script, pegar `Todo.gs` y `Admin.html`, ejecutar `instalar` y dar permisos (README, pasos 1 a 5).
2. **Publicar dos veces** el proyecto: una pública (sitio) y una «Solo yo» (portal admin, termina en `?admin=1`) (README, pasos 6 y 7).
3. **GitHub**: crear el repositorio, subir la carpeta del proyecto, pegar la URL pública en `js/config.js`, activar Pages (README, pasos 8 a 10).
4. **Probar** (sección 5 de esta guía) antes de avisar a clientes.
5. **Configurar desde el portal**: precios, horarios, WhatsApp, correo de avisos, redes, ProAudix, secciones visibles.
6. **Dominio propio** (opcional, al final): rockerioproducciones.cl (README, «Dominio propio»).
7. **Compartir enlaces** de socios (Jaime y Gabriela) y la agenda pública.

## 3. Cómo cambiar cosas después

### Cambios que haces tú desde el portal (sin GitHub, sin código)
Precios, horarios, reparto entre socios, mensajes de WhatsApp, reglamento, presentación, redes y enlaces, apartado ProAudix, qué secciones se muestran, tema de colores, productos y stock, bloqueos. Se aplican al sitio en un par de minutos y **se guardan en la hoja**.

### Cambios de diseño o de fotos (GitHub)
1. Entra al repositorio `rockerio` en GitHub.
2. Para una foto nueva: carpeta `assets/fotos` > **Add file** > **Upload files** > **Commit**. Luego agrégala a `data/galeria.json` (lápiz para editar).
3. Para un video en la galería, agrega una entrada con `"video": "https://youtu.be/XXXXXXXXXXX"` y `"alt": "Título"` en `data/galeria.json` (también sirven enlaces de Drive `.../file/d/ID/...`).
4. Para reemplazar un archivo: ábrelo, lápiz, pega el contenido nuevo, **Commit changes**. O sube el archivo con el mismo nombre: lo reemplaza.
5. En 1 o 2 minutos GitHub Pages publica. Si no ves el cambio, recarga sin caché (Ctrl+Shift+R) o abre en ventana privada.

**Regla de oro:** `js/reglas.js` y `apps-script/Reglas.gs` deben ser idénticos. Si cambias una regla, cambia las dos y vuelve a pegar `Todo.gs` en Google (sección siguiente).

**Trabajar sin riesgo:** crea una rama (`prueba`) en GitHub, haz ahí los cambios y compáralos con **Pull request** antes de unirlos a `main`. Si algo sale mal, GitHub guarda todo el historial y puedes volver atrás con **Revert**.

### Cambios del programa en Google (reglas, correos, WhatsApp, portal)
Solo cuando recibas un `Todo.gs` o `Admin.html` nuevo:
1. Abre el proyecto en script.google.com, pega el contenido nuevo en `Código.gs` y `Admin`, guarda.
2. **Antes**, en el portal, presiona **Respaldar ahora** (Socios y respaldo).
3. Si la nota de la versión lo pide, ejecuta `instalar` otra vez: **no borra datos**; agrega columnas, filas de configuración y disparadores que falten. Las hojas Balance y Tributario solo se crean si no existen; si necesitas la versión nueva de sus fórmulas, renombra la antigua (no la borres) antes de ejecutar `instalar`.
4. **Implementar > Administrar implementaciones > lápiz > Versión: Nueva versión > Implementar**, en las **dos** implementaciones. La URL se mantiene, así que no hay que tocar `config.js`.

## 4. ¿Hay que respaldar a mano cada vez que hago un cambio?
- **Datos:** respaldo automático cada noche (3 AM) en tu Drive, carpeta «Rockerío · Respaldos», con rotación. Además, cada día 1 se guarda una foto del Balance del mes anterior. Para cambios grandes, usa **Respaldar ahora**.
- **Sitio:** GitHub guarda el historial completo; no necesitas copias.
- **Hoja:** Google Sheets tiene «Historial de versiones» (Archivo > Historial de versiones) por si alguien edita algo por error.

## 5. Lista de prueba antes de abrir al público
1. Sitio: abrir desde el celular, reservar un ensayo de prueba con tu propio teléfono.
2. Portal: aparece la reserva; confirma el abono; revisa el evento en Google Calendar.
3. Intentar reservar el mismo horario desde otro navegador: debe verse ocupado y deshabilitado.
4. Dejar una reserva sin abono y comprobar que se libera sola pasado el tiempo configurado.
5. Marcar la reserva como Finalizada, dejar una evaluación con el código y aprobarla en el portal.
6. Vender un producto (efectivo, transferencia y «entregado en sesión») y revisar «Ventas del mes».
7. Abrir los enlaces de Jaime y Gabriela y la agenda pública.
8. Apagar y volver a encender una sección en Configuración > Portada y secciones.
9. Borrar los datos de prueba de la hoja (las filas, no los encabezados).

## 6. Cómo se probó este proyecto
`sh scripts/verificar.sh` ejecuta las pruebas de reglas y liquidación, y un **flujo completo** (`tests/e2e/flujo.test.js`) que corre el código real de Apps Script sobre una hoja, un calendario y un correo simulados: reserva, doble reserva, liberación por tiempo, pagos, WhatsApp, reseñas, honor, planes, tienda, socios, contabilidad, cierre de mes, respaldo y permisos. Las pruebas de navegador están en `tests/e2e/navegador-*.js` (requieren Playwright).

**Lo que la simulación no puede comprobar:** el comportamiento real de Google (permisos, cuotas, límites de correo), el envío real por la API de WhatsApp de Meta y el cálculo de las fórmulas del Balance (esto último se verificó aparte en LibreOffice). Por eso conviene hacer la lista de la sección 5 en la instalación real.

## 6. Salir en vivo HOY (agenda funcionando en ~45 minutos)

Prioridad: que los clientes ya puedan reservar. Lo demás (dominio, fotos, extras) viene después.

**A. Google (15 min)** — con la cuenta rockerioestudio@gmail.com
1. Entra a script.google.com > **Nuevo proyecto**. Nómbralo «Rockerío».
2. Borra el contenido de `Código.gs` y pega todo `instalacion/Todo.gs`.
3. **+ > HTML**, nómbralo exactamente `Admin` y pega `instalacion/Admin.html`.
4. Arriba elige la función `instalar` > **Ejecutar**. Acepta permisos (Avanzado > Ir a Rockerío (no seguro) > Permitir). Crea la hoja de datos y el calendario.
5. **Implementar > Nueva implementación > Aplicación web**: ejecutar como **Yo**, acceso **Cualquier persona**. Copia la URL que termina en `/exec` (es la del sitio público).
6. Otra vez **Nueva implementación > Aplicación web**: ejecutar como **Yo**, acceso **Solo yo**. Copia la URL y agrega `?admin=1` al final (es tu portal).

**B. GitHub (15 min)**
1. github.com > **New repository** `rockerio`, público. Sube todo el contenido de la carpeta del proyecto (Add file > Upload files).
2. Edita `js/config.js`: pega la URL `/exec` en `APPS_SCRIPT_URL` y la URL del portal en `ADMIN_URL`. Commit.
3. **Settings > Pages**: Source «Deploy from a branch», rama `main`, carpeta `/ (root)`. En 1–2 min tendrás `https://TUUSUARIO.github.io/rockerio/`.
4. Tu portal queda en `/admin` de ese sitio (redirige a tu URL privada de Google). No hay ningún botón de admin en la página pública.

**C. Probar antes de avisar (10 min)**
1. Abre el sitio, haz una reserva de prueba y confirma que aparece en el calendario y en el portal.
2. Desde el portal, cancela la prueba o usa «Vaciar reservas de prueba».
3. Revisa el correo de aviso y el enlace de WhatsApp.

**D. Configurar en el portal (10 min)**: precios, horarios, WhatsApp, enlace de mapa, redes, ProAudix, abono y datos de transferencia.

**E. Aviso**: comparte el enlace de GitHub Pages por WhatsApp/Instagram. Más adelante apuntas rockerioproducciones.cl (README, «Dominio propio»).

**Seguridad:** cambia cualquier clave de acceso que haya aparecido en capturas del sitio antiguo; no la reutilices aquí.

**Cuadro de honor:** las bandas envían el formulario; aparece en el portal (Contenido > Cuadro de honor) para aceptar, editar o eliminar. **Muestras de audio:** en el portal, Contenido > Muestras, sube un archivo por micrófono.

## Pagar el abono: «Ya envié mi comprobante» y Mercado Pago

**«Ya envié mi comprobante» (ya activo).** Al terminar su reserva el cliente ve ese botón. Al apretarlo, el horario queda guardado hasta 12 horas (no vence a los 20 minutos), te llega un correo «Comprobante por validar» y en la Jornada aparece la reserva con «Confirmar abono». Pasadas 12 horas sin validar, el horario se libera y te llega otro aviso.

**Mercado Pago (opcional, confirma solo).** Está construido y apagado. Para activarlo:
1. En Mercado Pago → Tus integraciones → crea una aplicación (Checkout Pro) y copia el **Access Token de producción**.
2. En Apps Script → Configuración del proyecto → Propiedades del script → agrega `MP_ACCESS_TOKEN` con ese token. (Nunca en la hoja ni en el sitio.)
3. Avisar para agregar el permiso de conexión externa (`script.external_request`) y volver a autorizar: en el editor ejecuta `autorizarMercadoPago` una vez y acepta los permisos.
4. En el portal → Configuración → Pagos: «Pago con Mercado Pago» = SI. Opcional: comisión estimada (%).

Cuando el cliente paga, la reserva pasa sola a «con abono» y la comisión que cobra Mercado Pago se anota como **gasto** (Sala o Estudio) en Movimientos, así el balance mensual refleja lo que realmente entra. Si Mercado Pago informa la comisión real se usa esa; si no, la estimada. Si un pago llega con el horario ya liberado, te llega un aviso para reagendar o devolver.
