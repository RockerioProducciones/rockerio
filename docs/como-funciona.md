---
title: "Rockerío Producciones: cómo se creó y cómo funciona el sitio"
---

## En una frase

Es una plataforma propia, sin costo mensual, para reservar sala de ensayo y estudio de grabación. El cliente reserva desde su celular; el dueño lo administra todo desde un portal privado. Los datos viven en el Google del propio negocio (Hoja de cálculo, Calendario y Drive), por lo que nada depende de un tercero pagado.

## Las tres piezas

1. **Sitio público** (rockerioproducciones.cl). Lo ve el cliente: reservar, planes mensuales, producción, galería, tienda, ficha técnica, contacto. Está hecho con HTML, CSS y JavaScript simples y se publica gratis en GitHub Pages. Está pensado primero para iPhone y también funciona en computador.
2. **Portal de administración** (privado, solo con la cuenta Google del dueño). Ahí se ven reservas, cobros, planes, clientes, ventas de tienda y bebestibles, balance, contenido del sitio y configuración. Funciona como una aplicación web de Google Apps Script.
3. **Base de datos en Google.** Una Hoja de cálculo guarda reservas, planes, ventas, clientes y ajustes; un Calendario de Google muestra cada reserva como evento; Drive guarda fotos, audios y respaldos.

Además hay dos portales aparte: uno para el colega ProAudix y otro de agenda para la familia (solo ven la agenda; no pueden vender ni cambiar datos).

## Cómo reserva un cliente

1. Elige servicio (ensayo o grabación), día y horas. El calendario solo muestra horarios realmente libres.
2. Agrega extras si quiere (arriendo de instrumentos, video, material en bruto en ensayo) y deja sus datos.
3. El sistema guarda la reserva como «sin abono» y bloquea ese horario de inmediato, para que nadie más lo tome.
4. El cliente paga por transferencia (o Mercado Pago cuando esté activo). El dueño confirma el pago en el portal y la reserva pasa a «con abono».
5. El día anterior se envía un recordatorio por WhatsApp. Después de la sesión, el dueño la marca como finalizada y registra extras, cobro y consumos.

**Planes mensuales:** el cliente elige 4 sesiones y se crean las 4 reservas juntas. Se confirman todas al marcar el plan como pagado, o se anulan todas juntas.

## Reglas que cuidan el negocio

- **Nunca hay reservas duplicadas:** antes de guardar, el sistema revisa el calendario con un bloqueo, así dos personas no pueden tomar la misma hora.
- **Las reservas sin pago no se anulan solas** (a menos que el dueño lo active); los planes nunca se sueltan de a una sesión.
- **Los ingresos no se mezclan:** reservas, tienda de música y bebestibles son cuentas separadas. Cada venta queda asociada a una reserva o cliente.
- **El balance cuenta solo lo que ocurrió:** sesiones finalizadas, abonos retenidos por «no asiste» y anulaciones con retención. Lo pendiente se ve aparte como «sin finalizar».
- **Datos protegidos:** el portal exige la cuenta del dueño; los datos personales no se publican en el sitio; las visitas se registran sin guardar direcciones IP; los textos se limpian antes de guardarse.

## Avisos y respaldos automáticos

- Respaldo diario de toda la base a Drive (se conservan las últimas 30 copias).
- Recordatorio de WhatsApp el día anterior a cada reserva.
- Aviso diario por correo si hay reservas o planes sin pago hace más de 24 horas o 3 días.
- Resumen semanal por correo (lunes) con los ingresos de cada cuenta por separado.

## Cómo se construyó y se mantiene

- **Código:** vive en un repositorio de GitHub (RockerioProducciones/rockerio). Cada cambio queda guardado con su historial, y hay «puntos de restauración» (ramas de respaldo) para volver atrás.
- **Publicación automática:** al guardar un cambio, GitHub actualiza el sitio público y despliega el portal sin pasos manuales.
- **Control de calidad:** antes de publicar, un conjunto de más de 120 pruebas automáticas verifica reglas de precios, reservas, cobros, balance, planes y el funcionamiento en celular y computador. Si algo falla, no se publica.
- **Las mismas reglas en dos lugares:** el sitio y el servidor usan una sola copia de las reglas de negocio (precios, horarios, validaciones), para que lo que ve el cliente coincida siempre con lo que guarda el sistema.
- **Tecnologías:** HTML, CSS y JavaScript; Google Apps Script; Google Sheets, Calendar y Drive; GitHub Pages y GitHub Actions; WhatsApp Business (recordatorios).

## Qué hace falta para operarlo

Solo una cuenta Google (con verificación en dos pasos activada), el dominio del sitio y revisar el portal a diario: reservas por confirmar, cobros pendientes y sesiones por cerrar. El portal indica con avisos qué requiere atención.
