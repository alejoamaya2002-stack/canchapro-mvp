# Guia de capturas - CanchaPro

Antes de capturar, abrir `http://localhost:3000` y presionar `Restaurar demo`.

## Capturas principales

1. `Aceptacion legal`
   - Mostrar checkbox de terminos y privacidad antes de ingresar al modo demo.

2. `Agenda semanal`
   - Mostrar las 3 canchas, reservas confirmadas, pendientes en amarillo y espacios libres.

3. `Nueva reserva`
   - Abrir un horario libre.
   - Mostrar cliente, cancha, horario, estado, duracion y precio.

4. `Reserva confirmada`
   - Mostrar la reserva ya cargada en la agenda semanal.

5. `Cancelacion`
   - Abrir una reserva confirmada.
   - Presionar `Cancelar reserva`.
   - Mostrar motivo y opcion de ultimo momento.

6. `Horario disponible para reventa`
   - Ir a `Cancelaciones`.
   - Mostrar una reserva cancelada.
   - Capturar botones `Copiar reventa`, `Abrir WhatsApp` y `Publicar para reventa`.

7. `Mensaje de WhatsApp`
   - Ir a `Horarios disponibles`.
   - Mostrar mensaje operativo listo para copiar.
   - Aclarar oralmente que el MVP no integra WhatsApp Business API.

8. `Dashboard del dueno`
   - Usar rol `Dueno / Administrador`.
   - Capturar ocupacion, cancelaciones, ingresos, utilidad, costos, punto de equilibrio e insights.

9. `Costos fijos`
   - Mostrar carga/edicion de costos fijos mensuales.
   - Aclarar que el analisis economico se ve en el Tablero.

10. `Punto de equilibrio`
   - Volver al `Tablero`.
   - Mostrar turnos minimos y ocupacion minima necesaria.

11. `Vista publica`
   - Publicar manualmente horarios.
   - Abrir `/disponibilidad?fecha=YYYY-MM-DD`.
   - Mostrar solo horarios disponibles publicados por el complejo.

12. `Seccion de validacion`
   - Usar el boton `Registrar validacion` al final de la app.
   - Mostrar el formulario para registrar entrevistas/pruebas con complejos.

## Capturas responsive

Tomar al menos una captura mobile de:

- Agenda semanal.
- Nueva reserva.
- Vista publica.

La demo esta pensada para funcionar en celular, tablet y escritorio.
