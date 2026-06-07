# CanchaPro

Este repositorio conserva dos capas:

- `index.html`, `styles.css` y `app.js`: MVP estatico original, conservado como prototipo funcional.
- `app/`: aplicacion Next.js para seguir desarrollando CanchaPro como producto real.

MVP funcional de CanchaPro como software de gestion comercial para complejos de futbol amateur.

## Stack

- Next.js + React
- TypeScript
- Tailwind CSS
- Supabase preparado para PostgreSQL/Auth
- Persistencia demo en `localStorage` hasta conectar credenciales reales

## Alcance del MVP

- Agenda semanal para 3 canchas de futbol amateur.
- Alta, edicion, cancelacion y eliminacion de reservas.
- Turnos fijos con repeticion inicial por 4 semanas.
- Roles separados:
  - Dueno / Administrador: agenda, reservas, WhatsApp, tablero, rentabilidad y configuracion.
  - Encargado operativo: agenda, reservas y mensajes de disponibilidad.
- Panel comercial con ocupacion, cancelaciones e ingresos estimados.
- Carga de costos fijos mensuales y tablero con punto de equilibrio, turnos minimos, ocupacion minima y utilidad estimada.
- Precios configurables: base, horario valle y fin de semana.
- Mensaje de disponibilidad listo para copiar y enlace preparado para WhatsApp.
- Instrumento de validacion al final de la app para registrar entrevistas y pruebas con complejos sin interferir con el uso diario.
- Terminos, privacidad y aceptacion explicita para prueba piloto.

## Funciones agregadas en la app Next

- Vista de turnos fijos con datos de contacto habituales. Las reservas ocasionales conservan nombre y telefono solo para operar y confirmar el turno.
- Vista publica controlada de disponibilidad en `/disponibilidad?fecha=YYYY-MM-DD`.
- Seleccion manual de horarios publicados, para evitar que la vista publica funcione como marketplace.
- CTA por WhatsApp para que el complejo conserve la confirmacion manual de la reserva.
- Horarios configurables por cancha, incluyendo canchas que arrancan en punto y otras a y media.
- Reservas con duracion configurable de 60, 90, 120, 150 o 180 minutos.
- Reservas pendientes destacadas en amarillo.
- Seccion de confirmaciones con mensaje por turno y anticipacion configurable.

## Producto

CanchaPro no funciona como marketplace en este MVP. La vista publica de jugadores solo muestra horarios que el complejo decide publicar manualmente y mantiene la confirmacion por WhatsApp.

El panel de rentabilidad esta restringido al rol Dueno / Administrador, porque contiene informacion economica sensible que no corresponde al rol Encargado operativo.

## Supabase

El esquema inicial esta en `lib/supabase/schema.sql`.

Para conectar Supabase:

1. Crear un proyecto en Supabase.
2. Ejecutar el SQL de `lib/supabase/schema.sql`.
3. Copiar `.env.example` a `.env.local`.
4. Completar:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

La version actual usa `localStorage` para que el MVP funcione sin depender todavia de credenciales externas. Si no existe `.env.local`, este comportamiento es intencional y debe presentarse como modo demo controlado.

La primera vez que se usa la app, despues de aceptar los documentos legales, aparece una configuracion inicial de cinco pasos. Puede completarse con datos reales del complejo o ingresar directamente con `Usar datos demo`. En esta etapa MVP, la configuracion queda guardada en `localStorage` y luego puede editarse desde `Configuracion`.

## Datos demo

Usar `Restaurar demo` para cargar el caso academico:

- Complejo del Sur.
- 3 canchas.
- Reservas confirmadas, pendientes y turnos fijos.
- Cancelaciones con horarios disponibles para reventa.
- Costos fijos mensuales.
- Indicadores de ocupacion, ingresos, costos y punto de equilibrio.
- Horarios publicados manualmente para la vista publica.

## Entregables academicos

- `TESTING_GUIDE.md`: guion de prueba y capturas sugeridas.
- `SECURITY_NOTES.md`: alcance de seguridad del MVP y pendientes para Supabase Auth/RLS.
- `SEED_DEMO.md`: datos demo cargados por `Restaurar demo`.
- `CAPTURE_GUIDE.md`: pantallas recomendadas para capturas academicas.
- `FINAL_QA_REPORT.md`: revision final, criterios cubiertos y pendientes reales.
- `LEGAL_NOTES.md`: alcance de la capa legal MVP/piloto y pendientes comerciales.
- `SUPABASE_SCHEMA.sql`: esquema SQL preparado para Supabase.

## Desarrollo

```bash
npm install
npm run dev
```

Luego abrir `http://localhost:3000`.

En este entorno de Codex tambien podes usar:

```powershell
.\scripts\dev.ps1
```

Para verificar build:

```powershell
.\scripts\build.ps1
```
