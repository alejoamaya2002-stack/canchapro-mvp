# QA MVP CanchaPro

Fecha de revision: 2026-06-05

## Criterios de aceptacion

- Owner ve dashboard y costos: OK.
- Staff carga reservas: OK.
- Staff cancela reservas: OK.
- La cancelacion libera horario para reventa: OK. La reserva cancelada aparece en `Cancelaciones`, genera ingreso en riesgo y la agenda permite cargar una nueva reserva en ese horario.
- Se genera mensaje de WhatsApp: OK. Disponible en reventa, disponibilidad y confirmaciones.
- Vista publica muestra horarios disponibles: OK. Solo muestra horarios publicados manualmente.

## Verificacion tecnica

Comandos ejecutados:

```powershell
pnpm lint
.\scripts\build.ps1
```

Resultado:

- Lint: OK.
- Build: OK.
- TypeScript: OK dentro de `next build`.

## Flujos probados en navegador

1. Restaurar demo.
2. Owner abre `Tablero` y `Costos`.
3. Cambio a rol `Encargado operativo`.
4. Staff crea reserva `QA Demo FC`.
5. Staff cancela esa reserva con motivo.
6. Se verifica pantalla `Cancelaciones` con mensaje de reventa y boton WhatsApp.
7. Se verifica `Vista publica`.
8. Se abre `/disponibilidad?fecha=2026-06-04` y muestra Complejo del Sur, horarios publicados y consulta por WhatsApp.

## Responsive

- Las pantallas usan grillas responsive con cortes `sm`, `lg` y `xl`.
- La agenda mantiene ancho minimo y scroll horizontal para evitar que la grilla se rompa en pantallas chicas.
- No se detectaron bloqueos de layout para la demo, aunque conviene tomar capturas finales en desktop para la entrega academica.

## Pendientes reales no bloqueantes

- Supabase Auth y RLS estan preparados a nivel de esquema, pero la demo sigue usando `localStorage`.
- No hay tests automatizados E2E; la validacion actual fue manual/asistida en navegador.
- La vista publica usa datos demo del navegador local; en produccion deberia leer desde Supabase.
