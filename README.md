# ROCKERÍO Producciones · Sitio de reservas

Sitio estático (presentación, ficha técnica, galería, tienda, reservas) + servidor en Google Apps Script.
Todo gratis y dentro de tu cuenta de Google: **Google Sheets** guarda los datos y **Google Calendar** es la agenda.
No hay claves de administración: administras con tu cuenta de Google, desde el portal (`?admin=1`) o directo en la hoja y el calendario.

## Instalación (unos 15 minutos, sin tocar código)

Tienes dos archivos para pegar, en la carpeta `instalacion/`: **Todo.gs** y **Admin.html**.

### Parte 1 · Servidor en Google (cuenta rockerioestudio@gmail.com)
1. Entra a <https://script.google.com> y presiona **Nuevo proyecto**. Arriba, cámbiale el nombre a «Rockerío».
2. En el archivo `Código.gs` borra todo, pega el contenido de **Todo.gs** y presiona el disquete (Guardar).
3. En el menú izquierdo, junto a «Archivos», presiona **+** > **HTML**, ponle de nombre **Admin** (sin escribir .html), borra lo que trae y pega el contenido de **Admin.html**. Guardar.
4. Arriba, en el selector de funciones elige **instalar** y presiona **Ejecutar**. Google pide permisos: **Revisar permisos** > tu cuenta > «Avanzado» > «Ir a Rockerío (no seguro)» > **Permitir**. (Es tu propio código; Google avisa así con cualquier proyecto nuevo.)
5. Cuando termine, abajo aparece «Instalación lista». Ya se crearon la hoja «Rockerío · Base de datos» y el calendario «Rockerío · Agenda».

### Parte 2 · Publicar (dos veces)
6. **Implementar** > **Nueva implementación** > engranaje > **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`). Esta es la del sitio público.
7. Repite: **Implementar** > **Nueva implementación** > **Aplicación web**. Ejecutar como: **Usuario que accede a la aplicación web**. Quién tiene acceso: **Solo yo**. Implementar y copia esa URL. Esta es tu **portal de administración**: ábrela agregando `?admin=1` al final y guárdala en favoritos. La primera vez pide permiso otra vez (igual que en el paso 4).

### Parte 3 · Sitio web en GitHub
8. En GitHub crea un repositorio nuevo (público) llamado `rockerio`. Presiona **uploading an existing file** y arrastra **todo el contenido** de la carpeta del proyecto. **Commit changes**.
9. Abre `js/config.js` en GitHub, presiona el lápiz y pega la URL del paso 6 entre las comillas de `APPS_SCRIPT_URL`. **Commit changes**.
10. **Settings** > **Pages** > Source: **Deploy from a branch** > rama `main`, carpeta `/ (root)` > **Save**. En un par de minutos el sitio queda en `https://TU-USUARIO.github.io/rockerio`.

Listo. Haz una reserva de prueba, confírmala en el portal y revisa tu calendario. Si cambias el código más adelante: Implementar > Administrar implementaciones > lápiz > Versión: **Nueva versión**, en **ambas** implementaciones.

Notas: el correo del administrador se guarda solo (cuenta que ejecutó `instalar`) en Configuración del proyecto > Propiedades del script > `ADMIN_EMAIL`; no queda en el código ni en GitHub. Los archivos sueltos de `apps-script/` son los mismos que `Todo.gs`, separados para mantenimiento (`sh scripts/empaquetar.sh` regenera `Todo.gs`). Sin URL en `config.js`, el sitio funciona igual y las reservas se envían por WhatsApp.

## Horarios y reglas de la reserva
- Lunes, martes, miércoles y viernes 9:00–14:00 y 17:00–23:00; jueves 9:00–14:00 y 17:00–22:00; sábado 10:00–22:00; domingo 11:00–22:00 (hoja `Horarios`).
- Sala de ensayo o estudio de grabación, de 1 a 5 horas. Se puede reservar desde hoy hasta 21 días adelante, con al menos 4 horas de anticipación.
- El cliente ve un calendario de esos días (los apagados no tienen cupo para las horas elegidas), elige un bloque (por ejemplo 19:00 a 21:00) y va viendo el detalle y el precio en el cuadro «Tu reserva» antes de enviar.
- Después ve los datos de transferencia (con botón para copiarlos) y un botón que abre WhatsApp con el detalle y el aviso de comprobante.

## Tarifa conveniente (lunes a viernes, 9 a 14)

En Configuración > Precios: «Tarifa conveniente lun–vie: activada», precio por hora de ensayo (y de estudio, si quieres) y la franja (por defecto 9 a 14). Se cobra por hora: si una reserva cruza la franja, solo las horas dentro de ella llevan el precio conveniente. El sitio muestra una etiqueta en la portada y avisa cuánto ahorra el cliente. Viene apagada y con $12.000 de ejemplo para el ensayo: define el valor y enciéndela.

## Planes mensuales
- Plan de 8 horas ($112.000) = 4 sesiones de 2 h; plan de 12 horas ($168.000) = 4 sesiones de 3 h. Se paga completo por adelantado. Sirve para clientes nuevos o ya registrados.
- **Lo compra el cliente en el sitio:** elige sus 4 sesiones (hasta 35 días adelante, días distintos) y las envía. Quedan «Reservado (sin abono)» y bloquean el calendario; cuando marcas el plan como pagado en el portal, las 4 pasan a «Reservado (con abono)».
- **Lo vendes tú:** en el portal, sección Planes mensuales, creas el plan (queda «0 de 4») y vas agregando las fechas una a una. Si ya lo marcaste pagado, cada sesión nace confirmada.
- Cada sesión es una reserva normal (con el código del plan, por ejemplo PL-1002-1): usa los mismos estados y alimenta sola el Balance. Cada sesión vale la cuarta parte del plan.
- Anular o no asistir a una sesión de plan sigue las mismas reglas de retención que una reserva normal (supuesto: confirmar).

## Tienda
Cada producto tiene un botón «Pedir» que abre WhatsApp con el producto ya escrito.

## Flujo de reserva
El cliente elige servicio, horas, fecha y un bloque horario (solo aparecen los libres). El servidor valida, crea el evento en tu calendario (amarillo = pendiente de abono) y el sitio lo lleva a WhatsApp con el detalle ya escrito, para que valides el abono y confirmes. Cuando llega el abono, pasas el Estado a «Reservado (con abono)» desde el portal o la hoja.

**Pago online (apagado por defecto):** cuando quieras, pon tu enlace de pago en `linkPago` (hoja `Configuracion`) y activa "Pago online" en el portal (o `pagoOnline = SI` en la hoja). Aparece un botón extra junto al de WhatsApp. Apagarlo es el mismo interruptor.

## Cómo se administra
- **Estados de una reserva** (se cambian en el portal o en la columna Estado de la hoja `Reservas`):
  1. **Reservado (sin abono):** nace así. Evento amarillo en el calendario; se libera sola (pasa a Anulada) si no abonan a tiempo.
  2. **Reservado (con abono):** cuando validas el abono por WhatsApp. El evento cambia de color.
  3. **Finalizada:** la sesión se realizó. Cuenta como ingreso y habilita al cliente a dejar su opinión.
  4. **No asiste:** el cliente no llegó. El abono queda retenido en el Balance.
  5. **Anulada:** cancelada. El evento se elimina del calendario y el horario queda libre.
- **Bloquear horarios:** agrega una fila en `Bloqueos` (fecha, desde, hasta; sin horas = todo el día) o crea en el calendario un evento de día completo cuyo título empiece con `BLOQUEO`. Cualquier evento con hora que crees en el calendario también bloquea.
- **Precios, horarios, avisos, pausar reservas:** hojas `Configuracion`, `Horarios` y `DiasInhabiles`. Los cambios rigen en 2 minutos.
- **Tienda (portal):** agrega, edita y elimina productos (también bebestibles: la categoría es libre), define precio y stock, y registra ventas. «Vender» descuenta stock y anota la venta en la hoja `Ventas`, que alimenta sola el `Balance`. Stock vacío = sin control; 0 = agotado. También se puede editar directo en la hoja `Tienda`.
- **Clientes y material:** en el portal pegas una vez el enlace de la carpeta de Drive de cada banda; queda ligado a todos sus integrantes y cada reserva muestra «Enviar material», que abre WhatsApp con el enlace ya escrito. La carpeta de cada banda debe estar compartida con «cualquiera con el enlace».
- **Muestras de audio (ficha técnica):** sube tus audios a Drive («cualquiera con el enlace»), y en el portal agrega cada muestra con su grupo (un micrófono, una canción o un ensayo) y su etiqueta (Caja, Voz, Bombo, En bruto, Mezclada, Masterizada…). El sitio arma solo el catálogo de micrófonos y la sección «Escucha cómo suena»; el audio se carga al tocar «Escuchar». También acepta YouTube, SoundCloud o archivos `.mp3` dentro de la carpeta `audio/` del repositorio.
- **Presentación personal:** se escribe en el portal (título y texto). Si queda vacía, la sección no aparece.
- **Cuadro de honor:** las bandas envían su logo (enlace), Instagram, enlaces, video de YouTube y una reseña. Solo pueden hacerlo bandas que ya reservaron (se comprueba su WhatsApp). Todo llega PENDIENTE y solo se publica cuando lo apruebas en el portal.
- **Opiniones:** el cliente deja estrellas y comentario con su código de reserva y su WhatsApp (solo reservas finalizadas, una opinión por reserva). Se publica cuando la apruebas.
- **Cotizaciones:** planes mensuales, producción musical y otras consultas llegan a la sección de solicitudes del portal. Ahí anotas el monto y el detalle, y la envías por WhatsApp o correo. Cada solicitud nueva también te llega por correo.
- **Respaldos:** cada noche (3 AM) se copia toda la base de datos a la carpeta «Rockerío · Respaldos» de tu Google Drive, conservando las últimas 30 copias. Si falla, llega un correo de aviso. Botón «Respaldar ahora» en el portal. El calendario no se copia, pero Google guarda 30 días los eventos eliminados.
- **Balance:** hoja `Balance`, por mes.
- **Ficha y galería:** `data/ficha.json` y `data/galeria.json`.
- Una reserva sin abono se anula sola pasados `minutosReserva` minutos (por defecto 20; configurable entre 5 y 180 en la hoja Configuracion). Mientras tanto el horario está tomado y el cliente ve una cuenta regresiva. Dos personas nunca pueden quedarse con el mismo bloque: el servidor revisa y guarda cada reserva con un candado.

## Dónde se guardan los datos y qué pasa al cambiar de mes

Todo vive en **tu cuenta de Google** (rockerioestudio@gmail.com), nada en GitHub ni en servidores de terceros:

| Qué | Dónde |
|---|---|
| Reservas, clientes, planes, ventas, costos, historial de balances | Google Sheets «Rockerío · Base de datos» (privada) |
| Agenda | Google Calendar «Rockerío · Agenda» (privado) |
| Claves y enlaces secretos de socios | Propiedades del script (no se ven en la hoja ni en GitHub) |
| Respaldos | Tu Drive, carpeta «Rockerío · Respaldos» (copia diaria, últimas 30) |

**Nada se borra al terminar el mes.** `Reservas` y `Ventas` son un registro continuo. El `Balance` es una vista de un mes: parte mostrando el mes actual, así que al cambiar de mes los conteos y resúmenes «parten de cero» solos, y para ver un mes anterior escribes ese mes en B1 (ej. `2026-10`).

- **Boleta de la luz y otros costos**: se ingresan en el portal, sección «Costos del mes», **una vez por mes**. Quedan guardados en la hoja `CostosMes` y el Balance de cada mes usa los suyos. Si no ingresas nada, usa aporte ProAudix $10.000, caja chica $20.000 y luz $0.
- **Historial de balances**: el día 1 de cada mes, a las 4 AM, se guarda una copia fija del balance del mes anterior en la hoja `HistorialBalance` (también puedes cerrar un mes a mano desde el portal). Así un balance cerrado no cambia aunque después edites reservas.
- **Ventas**: cada venta lleva fecha, producto, cantidad, total, tipo (música / bebestibles), forma de pago, quién vendió y un ID. Estados de pago: **Venta efectivo**, **Venta transferencia**, **Entregado en sesión (pago pendiente)**. Lo pendiente no suma a ingresos hasta que se marque como cobrado (efectivo o transferencia); entonces cuenta en el mes en que se cobró. Una venta mal hecha se **anula** (queda registrada y el stock vuelve).

## Enlaces para socios y para el público

En el portal, sección «Enlaces para compartir» (primero escribe la dirección del sitio en «Sitio»):

1. **Enlace de socio** (uno por persona; ya vienen creados Jaime Encina y Gabriela Martelli): agenda en solo lectura con bandas y horarios, tienda de música, bebestibles, historial de ventas y resumen del mes, y cobro de lo pendiente. No ven teléfonos, correos ni montos de reservas. Cada venta queda con el nombre de quien la hizo.
2. **Agenda pública** (`/agenda.html`): solo horas libres y ocupadas, sin nombres. Para familia y clientes.

El enlace de socio es una clave larga y secreta: quien lo tenga puede entrar, así que envíalo solo por mensaje directo. «Cambiar enlace» invalida el anterior al instante; «Eliminar» quita el acceso. Si alguien deja de ser socio, elimínalo.

## Temas

10 temas oscuros (Rockerío, Medianoche, Vino, Bosque, Grafito, Azufre, Abismo, Cobre, Ciruela, Carbón). En el portal eliges el tema por defecto del sitio; cada visitante puede cambiarlo con el selector de abajo a la izquierda (se recuerda en su navegador).

## Si ya tenías instalada una versión anterior

Reemplaza el código de Apps Script por el nuevo `Todo.gs` y `Admin.html`, ejecuta `instalar` otra vez (no borra datos: agrega las hojas `Bebestibles`, `CostosMes`, `HistorialBalance`, los enlaces de socios y el cierre mensual) y vuelve a **Implementar > Administrar implementaciones > Editar > Nueva versión** en las dos implementaciones. La hoja `Ventas` cambió de columnas: si ya tenía ventas de prueba, bórrala antes de ejecutar `instalar`. Las hojas `Balance` y `Tributario` solo se crean si no existen: para que tomen las fórmulas nuevas, bórralas (son solo fórmulas) antes de ejecutar `instalar`.

## Configuración desde el portal

Sección «Configuración» del portal: precios, reglas de reserva (horas mínimas/máximas, anticipación, minutos que se guarda el horario, anulaciones), pagos, funciones (reservas activas, correo al cliente, aviso, tema), **reparto entre socios** (porcentajes de sala y estudio, aporte de ProAudix, caja chica), contabilidad, **horarios de atención** por día y **qué ingresos entran al balance**. Todo se valida antes de guardarse (por ejemplo, los porcentajes de cada reparto deben sumar 100). Se guarda en la hoja `Configuracion`, que sigue siendo la única fuente de verdad: si prefieres, también puedes editarla ahí.

Para agregar un parámetro nuevo en el futuro: valor por defecto en `js/reglas.js` (copiar a `Reglas.gs`) y una línea en `ESQUEMA` de `apps-script/Ajustes.gs`. Cada archivo del servidor empieza con un comentario que explica para qué sirve (`Code.gs` reservas y agenda, `Admin.gs` portal, `Ventas.gs` tiendas y cierre de mes, `Socios.gs` enlaces, `Contabilidad.gs` IVA/impuestos, `Ajustes.gs` configuración, `Planes.gs`, `Contenido.gs`).

## Contabilidad formal (simulación para Chile)

Interruptor en el portal: **Contabilidad formal**. Apagado, todo sigue como antes y la hoja `Tributario` muestra ceros. Encendido, para el mes de la hoja `Balance` calcula:

- **IVA (F29):** IVA débito = ventas brutas − ventas brutas ÷ 1,19. IVA crédito = IVA de las facturas de compra (hoja `Compras`) + IVA de la luz si marcas «luz con factura». IVA a pagar = débito − crédito − remanente del mes anterior. Si el crédito es mayor, queda remanente para el mes siguiente.
- **PPM:** ventas netas × tasa (celda amarilla de la hoja `Tributario`; referencia 2026 para Pro Pyme 14 D N°3: 0,125%, 14 D N°8: 0,2%).
- **Impuesto de Primera Categoría (provisión):** utilidad tributaria (ingresos netos − gastos con documento) × tasa (Pro Pyme 14 D N°3: 12,5% para 2025–2027, 15% en 2028, 25% desde 2029 según la ley vigente). En 14 D N°8 no paga la empresa: se muestra la renta atribuida a los dueños.
- **Reserva de impuestos:** IVA a pagar + provisión, y el **reparto después de impuestos** estimado para Juan Carlos, Jaime y el estudio.
- **Compras:** factura = se separa el IVA y se recupera; boleta = se deduce el total, sin crédito; sin documento = no se deduce.
- El cierre de mes guarda IVA, PPM, utilidad y provisión en `HistorialBalance`, y el remanente de IVA pasa al mes siguiente.

Qué NO hace: no declara ni paga nada ante el SII, no emite boletas ni facturas, no calcula el Impuesto Global Complementario de cada persona (depende de sus otras rentas) ni reajusta el remanente de IVA. Supuestos que debe confirmar un contador: régimen, tasas, si la retención de abonos por inasistencia está afecta a IVA, y si el negocio es una sociedad o personas naturales (cambia quién declara). Obligaciones al formalizar: inicio de actividades, boleta electrónica por cada venta, F29 mensual (hasta el 12, o el 20 si declaras y pagas en línea), registro de compras y ventas y Operación Renta en abril. Para quien emite boletas de honorarios, la retención 2026 es 15,25%.

Fuentes: SII (retención de honorarios 2026), Circular SII N° 53/2025 y Ley 21.755 (tasa Pro Pyme y PPM), notas de Círculo Verde y contable.app. Hay un proyecto de ley en discusión (agosto 2026) que podría cambiar tasas: revisa antes de formalizar.

## Balance mensual (hoja `Balance`)
Se calcula solo desde la hoja `Reservas`, por el mes que escribas arriba (AAAA-MM). Reglas aplicadas:
- **Finalizada:** suma el monto completo de la reserva (horas, extras, video y material en bruto).
- **No asiste:** el abono recibido queda retenido ($5.000 por hora reservada).
- **Anulada con abono:** a tiempo (24 h o más antes) se retienen $1.000 por hora y se devuelven $4.000 por hora; la columna `Abono a devolver` de `Reservas` y el portal te recuerdan cuánto transferir. Con menos de 24 h se retiene todo el abono (supuesto: se puede cambiar con `anulacionTardiaRetiene = NO`). La devolución nunca cuenta como ingreso.
- **Sala:** del total de la sala se descuentan la luz (total menos $10.000 que pone ProAudix), $20.000 de caja chica y otros gastos. El resto va 50% y 50%.
- **Estudio:** del total, 40% es de Juan Carlos y 60% del estudio. El proceso de producción es $30.000 por hora.
- **Material en bruto ($10.000):** va 100% a Juan Carlos y no entra al reparto de la sala.
- **Tienda y bebestibles:** los registra ProAudix, así que quedan fuera por defecto.
- **Qué ingresos entran:** en la parte de arriba de la hoja hay un SI / NO por cada tipo de ingreso (sala, extras, video, estudio, material en bruto, abonos retenidos, anulaciones, tienda). Cámbialos y todo se recalcula.

## Métodos de pago en la web
Se encienden y apagan desde el portal (sección «Sitio»): **Pago por transferencia** (muestra los datos que escribas en `datosTransferencia`) y **Pago online** (botón con tu `linkPago`). El cliente siempre termina en WhatsApp para que valides el abono.

## Dominio propio (rockerioproducciones.cl)
1. Registra el dominio en NIC Chile (<https://www.nic.cl>); necesitas una cuenta con RUT. Revisa el precio vigente allí.
2. En el panel DNS del dominio, crea cuatro registros `A` para `@` hacia `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`, y un `CNAME` para `www` hacia `TU-USUARIO.github.io`.
3. En GitHub: Settings > Pages > Custom domain, escribe `rockerioproducciones.cl`, guarda y activa **Enforce HTTPS** cuando esté disponible (puede tardar un rato).
4. Pon la dirección completa en `js/config.js` (`SITIO_URL`) y en `og:image` de `index.html` (`https://rockerioproducciones.cl/assets/og.jpg`).
La URL de Apps Script no cambia al usar dominio propio.

## Seguridad
El servidor revalida todo (horario, choques, anticipación) y recalcula el precio; no confía en el navegador. Usa bloqueo de concurrencia contra doble reserva, campo trampa anti-spam, límite de solicitudes por teléfono, y protege la hoja contra fórmulas inyectadas. El sitio muestra textos con `textContent`. El portal exige sesión de Google y compara el correo con `ADMIN_EMAIL`; la API pública no tiene funciones de administración. Cuotas de Apps Script (cuenta gmail.com): 100 correos/día, 5.000 eventos/día.

**Protección de la información, en resumen**
- No hay claves ni datos de clientes en GitHub: el sitio público solo contiene páginas; los datos están en tu Google y se piden a Apps Script.
- La API pública jamás devuelve teléfonos, correos, montos ni nombres de clientes (la agenda pública muestra solo horas libres/ocupadas).
- El portal de administración exige iniciar sesión con tu cuenta de Google y además verifica que sea la tuya (`ADMIN_EMAIL`). No hay contraseña que se pueda filtrar.
- Los enlaces de socios son secretos, revocables, limitan los intentos con enlaces falsos, no aparecen en la barra de direcciones ni en buscadores (`noindex`, sin referrer) y solo dan acceso a lo necesario. Son menos fuertes que un inicio de sesión de Google: compártelos en privado y elimínalos cuando alguien se retire.
- Activa la **verificación en dos pasos** en rockerioestudio@gmail.com y no compartas la hoja de datos con nadie que no deba verla: quien tenga acceso a la hoja ve todo.
- Respaldo diario en tu Drive. Chile está implementando su nueva ley de datos personales (Ley 21.719); como guardas teléfonos y correos de clientes, conviene validar con un asesor qué avisos de privacidad corresponden.

## Mantenimiento
`js/reglas.js` y `apps-script/Reglas.gs` deben ser idénticos. Tras editar uno: `cp js/reglas.js apps-script/Reglas.gs`, luego `sh scripts/verificar.sh` (corre las pruebas con `node`).

## Reglas por confirmar con los socios
Los documentos de origen se contradicen; quedaron como valores editables en la hoja:
- Horario del domingo (11–22 / 10–21 / 10–22): hoy **cerrado** en la web.
- Cierre del jueves (22 o 23): hoy 22.
- Equipo extra: por hora o por sesión (`extraModo`): hoy por hora.
- Plazo para abonar (12 h) y vigencia de la escala de grabación incluida.
- Ya confirmados: reparto del estudio 40/60, sala 50/50, caja chica $20.000, luz menos $10.000 de ProAudix, extras $3.000 por hora, GoPro $20.000 y material en bruto $10.000 (100% de Juan Carlos).
- Por confirmar: que el video GoPro vaya a la sala, que una anulación con menos de 24 h retenga todo el abono, y que los planes sigan esas mismas reglas de retención.
- Fotos con personas: pedir consentimiento antes de publicarlas.


## Mensajes de WhatsApp (portal admin > Mensajes de WhatsApp)
- Textos editables: recordatorio, confirmación, cobro de abono, gracias. Variables: {nombre} {banda} {servicio} {fecha} {hora} {fin} {codigo} {total} {abono} {saldo} {direccion} {negocio} {sitio} {horasAnulacion}.
- Manual (gratis, funciona ya): en cada reserva, selector «WhatsApp…» abre wa.me con el mensaje escrito. También hay lista «Recordatorios de mañana».
- Automático (opcional, apagado por defecto): requiere WhatsApp Business Platform (Meta), número registrado, plantilla aprobada con parámetros {{1}} nombre, {{2}} servicio, {{3}} fecha, {{4}} hora inicio, {{5}} hora fin, y token (se guarda en Propiedades del script, no en la hoja). Configuración > WhatsApp: activar, ID del número, plantilla, idioma, versión API. Probado solo con API simulada.
- Si actualizas una instalación existente: pega el nuevo Todo.gs + Admin.html y ejecuta `instalar` otra vez (crea columna 31, filas de configuración y el disparador diario 18:00).


## Secciones del sitio y contenido nuevo
- El sitio se navega por **tarjetas**: el inicio muestra un menú y cada tarjeta abre una sola sección; la reserva es un asistente de 6 pasos (servicio y horas, día, horario, adicionales, datos, resumen).
- Secciones: Reservar, Producción, Ficha técnica, Planes mensuales, Galería, Evaluaciones, ProAudix, Contacto, Tienda, Cuadro de honor, Cotizar y Reglamento. Cada una se enciende o apaga en **Configuración > Portada y secciones**.
- **Contacto y redes** y **ProAudix** se editan en Configuración (solo se muestran los enlaces que completes y que empiecen con https://). Formato de «otros enlaces»: una línea por enlace, `Texto | https://enlace`.
- **Galería con video:** en `data/galeria.json` agrega `{ "video": "https://youtu.be/XXXXXXXXXXX", "alt": "Título" }`.
- Lee `GUIA.md` para la instalación paso a paso, el uso de GitHub y qué pasa con los datos al actualizar.
