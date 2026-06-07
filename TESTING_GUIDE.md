# Guia de prueba academica - CanchaPro

## Objetivo de la prueba

Validar si CanchaPro ayuda a un complejo de futbol amateur a ordenar reservas, detectar capacidad ociosa y visualizar el impacto economico de cancelaciones, horarios libres y costos fijos.

## Perfil del complejo ideal

- Complejo de futbol amateur con 2 a 5 canchas.
- Gestion actual por WhatsApp, cuaderno, planilla o Google Calendar.
- Dueño o administrador involucrado en decisiones comerciales.
- Encargado que carga reservas en el dia a dia.
- Existencia de cancelaciones, horarios libres o turnos dificiles de vender.

## Datos demo

- Complejo: Complejo del Sur.
- Canchas: 3.
- Horario: 18:00 a 23:00.
- Incluye reservas confirmadas, pendientes, turnos fijos, cancelaciones, horarios libres publicados y costos fijos cargados.

Antes de sacar capturas, usar `Restaurar demo`.

## Capturas sugeridas

1. Agenda semanal.
2. Modal de nueva reserva.
3. Modal de cancelacion.
4. Pantalla de cancelaciones con horario disponible para reventa.
5. Mensaje de WhatsApp para reventa.
6. Dashboard del dueno.
7. Carga de costos fijos.
8. Vista publica para jugador.
9. Registro de validacion al final de la prueba.

## Flujo del encargado

1. Seleccionar rol `Encargado operativo`.
2. Entrar a `Agenda semanal`.
3. Crear una reserva desde un horario libre.
4. Ver la reserva en la grilla.
5. Abrir una reserva existente.
6. Cancelarla con motivo y marcar si fue de ultimo momento.
7. Entrar a `Cancelaciones`.
8. Entrar a `Horarios disponibles`.
9. Copiar o abrir WhatsApp con el mensaje de reventa.

## Flujo del dueno

1. Seleccionar rol `Dueno / Administrador`.
2. Entrar a `Tablero`.
3. Revisar ocupacion, cancelaciones, ingresos estimados, ingresos perdidos, utilidad y punto de equilibrio.
4. Entrar a `Costos`.
5. Modificar costos fijos.
6. Volver a `Tablero`.
7. Ver utilidad estimada, turnos necesarios y ocupacion minima.
8. Al terminar, usar `Registrar validacion`.

## Flujo del jugador

1. Entrar a `Vista publica`.
2. Seleccionar manualmente horarios a publicar.
3. Abrir `/disponibilidad?fecha=YYYY-MM-DD`.
4. Ver horarios publicados.
5. Consultar por WhatsApp.

## Preguntas de validacion

- Si recuperas 3 a 5 turnos por mes, cuanto pagarias por CanchaPro?
- La agenda es tan rapida como tu metodo actual?
- El tablero te muestra informacion que hoy no tenes?
- El impacto de cancelaciones y horarios vacios justifica pagar una suscripcion?
- Que parte te haria dejar el cuaderno, planilla o Google Calendar?

## Hipotesis a validar

- Los complejos pierden ingresos por cancelaciones y horarios libres que no logran revender.
- El encargado puede cargar una reserva sin ayuda en menos de 2 minutos.
- El dueno entiende el tablero economico sin explicacion tecnica.
- La vista publica controlada no se percibe como marketplace.
- Recuperar pocos turnos al mes puede justificar una suscripcion.
- WhatsApp como integracion liviana reduce resistencia frente a una integracion compleja.

## Tabla supuesto / observacion / decision

| Supuesto | Observacion durante la prueba | Decision |
| --- | --- | --- |
| El encargado carga reservas sin friccion |  |  |
| La cancelacion genera dolor economico |  |  |
| El dueno valora ingresos perdidos y punto de equilibrio |  |  |
| La vista publica controlada no parece marketplace |  |  |
| El complejo pagaria si recupera turnos |  |  |

## Registro de evidencia

Usar la seccion `Validacion` dentro de la app para guardar cada entrevista o prueba:

- complejo entrevistado;
- cantidad de canchas;
- metodo actual;
- cancelaciones semanales;
- turnos ociosos;
- precio promedio;
- facilidad de uso del encargado;
- comprension del tablero;
- disposicion a pagar;
- observaciones.

La seccion no esta en el menu operativo diario. Se accede desde el boton `Registrar validacion` al final de la pagina para usarla despues de probar la app.

## Criterios de exito

- El encargado puede crear y cancelar una reserva sin ayuda.
- El horario cancelado queda claro como oportunidad de reventa.
- El mensaje de WhatsApp resulta util y facil de copiar/enviar.
- El dueno comprende el tablero y puede explicar el punto de equilibrio.
- El complejo expresa interes en probarlo con datos propios.
- Hay una disposicion a pagar o a seguir probando si recupera turnos.

## Senales de alerta

- El encargado prefiere seguir con WhatsApp sin agenda.
- El dueno no entiende costos, punto de equilibrio o utilidad.
- La vista publica se interpreta como una reserva automatica.
- Los complejos no tienen suficiente dolor por cancelaciones u horarios libres.
