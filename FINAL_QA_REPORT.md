# QA final - CanchaPro

Fecha: 2026-06-05

## Resultado

El MVP queda preparado para presentacion academica y validacion inicial con complejos de futbol amateur.

## Criterios revisados

- Owner ve dashboard y costos: cubierto por rol `Dueno / Administrador`.
- Staff carga y cancela reservas: cubierto por rol `Encargado operativo`.
- Cancelacion libera horario para reventa: cubierto en agenda y pantalla `Cancelaciones`.
- Se genera mensaje de WhatsApp: cubierto con copiar mensaje y enlace `wa.me`.
- Vista publica muestra horarios disponibles: cubierto con publicacion manual y ruta `/disponibilidad`.
- Datos demo realistas: cubierto con Complejo del Sur, 3 canchas, reservas, turnos fijos, cancelaciones, costos e indicadores.
- Separacion de informacion sensible: costos, dashboard, configuracion y validacion quedan solo para owner.
- Supabase: esquema preparado con RLS; la app sigue en modo demo local hasta configurar `.env.local`.
- Terminos y Condiciones: implementados en `/terminos`, accesibles sin login.
- Politica de Privacidad: implementada en `/privacidad`, accesible sin login.
- Aceptacion explicita: implementada como puerta inicial del modo demo y persistida en `localStorage`.
- Boton legal: queda bloqueado hasta marcar el checkbox de aceptacion.
- Avisos legales visibles: dashboard, costos, configuracion, WhatsApp y vista publica.
- Supabase legal: `profiles` incluye campos para aceptacion de terminos y privacidad.
- Validacion: movida fuera del menu operativo diario; se accede desde un boton al final de la app.
- Costos: queda enfocado en carga de costos fijos; el analisis economico queda en el Tablero.
- Reventa/disponibilidad: la seccion operativa se renombro a `Horarios disponibles`.

## Comandos ejecutados

- `pnpm lint`: pasa correctamente.
- `pnpm build`: pasa correctamente. El primer intento dentro del sandbox fallo con `spawn EPERM`; se ejecuto nuevamente con permisos elevados y compilo sin errores.

## Verificacion local

- `/`: responde 200 en servidor local alternativo `http://127.0.0.1:3001`.
- `/terminos`: responde 200.
- `/privacidad`: responde 200.
- `/disponibilidad?fecha=2026-06-05`: responde 200.
- `localhost:3000` puede aparecer ocupado si quedo un proceso anterior; para preview se uso `3001`.

## Pendientes no bloqueantes para prueba academica

- Persistencia local en `localStorage`.
- Sin tests E2E automatizados.
- Sin Auth/RLS real conectado en runtime.

## Pendientes productivos posteriores

- Conectar Supabase Auth y reemplazar `localStorage` por PostgreSQL.
- Ejecutar el SQL en un proyecto Supabase real y validar politicas RLS con usuarios owner/staff.
- Agregar tests E2E automatizados cuando el flujo se estabilice.
- Integrar WhatsApp Business API solo si el producto lo necesita despues de validar.
- Reemplazar la aceptacion legal local por persistencia en Supabase cuando se active Auth.
- Revisar terminos y privacidad con asesoramiento profesional antes de una version comercial.

## Notas para exposicion

CanchaPro no se presenta como marketplace. La vista publica solo muestra horarios que el complejo decide publicar y la confirmacion sigue siendo operativa por WhatsApp.

El panel economico no reemplaza un sistema contable. Sirve para que el dueno entienda si la ocupacion actual alcanza para cubrir costos y generar utilidad.
