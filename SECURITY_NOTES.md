# Notas de seguridad - MVP

La version actual funciona con persistencia local en `localStorage` para facilitar la presentacion academica y la prueba navegable sin depender de credenciales externas.

La estructura Supabase queda preparada en `lib/supabase/schema.sql` y `SUPABASE_SCHEMA.sql`. El SQL incluye RLS por `complex_id`, funciones auxiliares para rol/complejo actual y politicas diferenciadas para owner, staff y vista publica.

## Reglas previstas

- Cada usuario pertenece a un `complex_id`.
- `owner` y `staff` solo pueden ver datos de su complejo.
- `owner` puede editar costos, configuracion y datos economicos.
- `staff` puede gestionar reservas, cancelaciones, confirmaciones y mensajes.
- La vista publica solo expone horarios publicados manualmente.

## Pendiente para produccion

- Implementar Supabase Auth real.
- Ejecutar y probar las politicas RLS en un proyecto Supabase real.
- Mover calculos sensibles al servidor o a vistas SQL si el producto escala.
- Reemplazar persistencia local por PostgreSQL.
- Agregar auditoria de cambios para reservas, cancelaciones y costos.
