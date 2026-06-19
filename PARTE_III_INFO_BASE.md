# Parte III - Informacion base CanchaPro

## 1. Estado actual del MVP

CanchaPro es un MVP funcional para gestion de turnos de complejos deportivos. No se plantea como marketplace para jugadores, sino como software de gestion para el dueno/administrador y el encargado operativo del complejo.

Funcionalidades actuales:

| Modulo | Estado | Aporte al MVP |
|---|---:|---|
| Login por complejo | Implementado | Permite separar datos por usuario y `complex_id`. |
| Agenda semanal | Implementado | Visualiza turnos por cancha, fecha y horario. |
| Nueva reserva | Implementado | Permite cargar reservas ocasionales y turnos fijos. |
| Reservas | Implementado | Lista reservas, estados y pagos. |
| Confirmar turnos | Implementado | Facilita seguimiento operativo de reservas a confirmar. |
| WhatsApp operativo | Implementado | Genera mensajes para confirmar o republicar turnos. |
| Cancelaciones | Implementado | Libera horarios y muestra ingreso en riesgo. |
| Enviar disponibilidad | Implementado | Permite responder consultas con horarios disponibles. |
| Turnos fijos | Implementado | Ordena clientes recurrentes y su historial. |
| Publicar horarios | Implementado | Permite seleccionar horarios para vista publica. |
| Tablero del dueno | Implementado | Muestra ocupacion, ingresos, cancelaciones y recuperacion. |
| Costos y punto de equilibrio | Implementado | Relaciona ocupacion con costos mensuales. |
| Panel admin basico | Implementado | Lista complejos, usuarios y snapshots. |
| Multi-complejo | Implementado | Ottantuno y Demo Norte funcionan aislados por `complex_id`. |

Funcionalidades nuevas respecto de Parte II:

- Login con Supabase Auth.
- Separacion de datos por complejo.
- Panel admin basico.
- Demo contextual por complejo.
- Contador de turnos recuperados.
- Persistencia remota por snapshot.
- Accion de prueba real y carga de demo academico.

Fuera del MVP actual:

- Marketplace de reservas para jugadores.
- Pagos online.
- WhatsApp Business API.
- Automatizacion real de mensajes.
- Facturacion o contabilidad formal.
- IA predictiva.
- Panel admin con ABM completo.
- Migracion completa a tablas relacionales.

Roadmap inmediato:

- Crear complejos desde panel admin.
- Gestionar usuarios y permisos.
- Recuperacion de contrasena.
- Reportes mensuales.
- Vista publica por complejo con slug.
- Auditoria de acciones.

## 2. Caso Ottantuno: datos operativos simulados

Los datos siguientes surgen de la demo actual cargada por `Cargar demo academico` para el complejo Ottantuno. Son simulacion de uso para Parte III, no validacion real completa.

| Dato | Valor |
|---|---:|
| Complejo | Ottantuno |
| Direccion | Calle 46 e/ 198 y 199 |
| Telefono | 2216652449 |
| Encargado | Roman |
| Canchas | 2 |
| Cancha 1 | Futbol 5 techada |
| Cancha 2 | Futbol 5 abierta |
| Horario operativo | Todos los dias, 17:00 a 00:00 |
| Turnos por dia | 14 |
| Precio por turno | $45.000 |
| Periodo simulado | 01/06/2026 al 24/06/2026 |
| Inicio de uso de app simulado | 06/06/2026 |
| Corte de simulacion | 17/06/2026 |
| Reservas futuras cargadas | Hasta 24/06/2026 |

Costos mensuales cargados:

| Costo | Importe |
|---|---:|
| Luz | $325.800 |
| Gas | $43.600 |
| Agua | $47.900 |
| Salarios | $1.875.000 |
| Alquiler | $0 |
| Impuestos | $180.000 |
| Mantenimiento | $160.000 |
| Otros | $100.000 |
| Total | $2.732.300 |

Resumen operativo simulado de junio:

| Indicador | Valor |
|---|---:|
| Capacidad mensual estimada | 420 turnos |
| Turnos fijos semanales | 25 |
| Turnos fijos institucionales a $0 | 8 |
| Reservas ocasionales cargadas | 83 |
| Turnos confirmados | 119 |
| Turnos vendidos/cobrados | 102 |
| Reservas pendientes | 61 |
| Cancelaciones | 7 |
| Turnos recuperados | 4 |
| Ingreso recuperado | $180.000 |
| Ingreso en riesgo por cancelaciones | $315.000 |
| Ingresos estimados confirmados | $4.455.000 |
| Ingresos cobrados | $4.590.000 |
| Ocupacion mensual aproximada | 28,3% |
| Turnos libres estimados del mes | 301 |
| Punto de equilibrio | 61 turnos aprox. |
| Utilidad estimada | $1.722.700 |

Aclaracion: los ingresos y utilidad son indicadores orientativos del tablero. No reemplazan informacion contable real.

## 3. Metricas clave extraidas

| Metrica | Valor | Tipo de dato |
|---|---:|---|
| Capacidad mensual | 420 turnos | Calculado por app |
| Turnos ocupados confirmados | 119 | Simulacion |
| Ocupacion | 28,3% | Calculado |
| Turnos fijos semanales | 25 | Simulacion |
| Reservas ocasionales | 83 | Simulacion |
| Cancelaciones | 7 | Simulacion |
| Turnos recuperados | 4 | Inferido desde cancelacion + nueva reserva |
| Tasa de recuperacion | 57,1% | Estimada: 4/7 |
| Ingreso en riesgo | $315.000 | 7 cancelaciones x $45.000 |
| Ingreso recuperado | $180.000 | 4 recuperaciones x $45.000 |
| Ingresos cobrados | $4.590.000 | Tablero/simulacion |
| Turnos pendientes futuros | 61 | Simulacion |
| Turnos libres estimados | 301 | Calculado |
| Costos mensuales | $2.732.300 | Cargado en app |
| Punto de equilibrio | 61 turnos | Costos / $45.000 |

Justificacion de suscripcion por turnos recuperados:

| Precio mensual | Turnos necesarios para cubrirlo | Lectura |
|---|---:|---|
| $25.000 | 1 turno | Muy defendible si recupera al menos un turno mensual. |
| $50.000 | 2 turnos | Escenario medio razonable: con 2 turnos recuperados se cubre. |
| $90.000 | 2 turnos exactos, 3 con margen | Requiere mayor evidencia sostenida o complejos con mas canchas. |

## 4. Funcionalidades y dolor que resuelven

| Funcionalidad | Dolor validado | Valor generado | Evidencia desde la app |
|---|---|---|---|
| Agenda semanal | Informacion dispersa en WhatsApp/papel | Centraliza turnos por cancha | Agenda de Ottantuno con reservas, fijos y cancelaciones. |
| Nueva reserva | Carga manual poco ordenada | Registra cliente, telefono, cancha, horario y precio | Reservas ocasionales y fijas cargadas. |
| Turnos fijos | Dificultad para ver clientes recurrentes | Agrupa recurrencia e ingresos historicos | 25 ocurrencias fijas semanales. |
| Cancelaciones | Perdida de turnos sin trazabilidad | Libera horario y mide ingreso en riesgo | 7 cancelaciones, $315.000 en riesgo. |
| Reventa | Reaccion lenta ante cancelaciones | Permite copiar/publicar horario liberado | 4 turnos recuperados modelados. |
| WhatsApp | El canal ya es usado por jugadores | Mantiene rutina, reduce friccion | Mensajes prearmados de confirmacion/reventa. |
| Publicar horarios | Consultas frecuentes de disponibilidad | Permite seleccionar horarios visibles | Vista publica y publicacion de disponibilidad. |
| Tablero | Falta de visibilidad economica | Muestra ocupacion, ingresos, recupero y costos | 28,3% ocupacion, $180.000 recuperados. |
| Costos | No saber si ocupacion cubre gastos | Calcula punto de equilibrio | 61 turnos para cubrir $2.732.300. |
| Login multi-complejo | Necesidad de pilotos separados | Evita mezcla de datos | Ottantuno y Demo Norte aislados. |
| Panel admin | Gestion del servicio SaaS | Base para operar varios complejos | Lista usuarios, complejos y snapshots. |

## 5. Evidencia para justificar el modelo de negocio

La evidencia principal de la demo es que la app no solo registra turnos: convierte eventos operativos en informacion comercial.

En Ottantuno, la simulacion muestra:

- 7 cancelaciones registradas.
- 4 turnos recuperados.
- $315.000 de ingreso en riesgo.
- $180.000 de ingreso recuperado.
- Punto de equilibrio visible.
- Diferencia entre turnos confirmados, vendidos, pendientes y cancelados.

Lectura comercial:

- Si el turno vale $45.000, recuperar 2 turnos cubre una suscripcion de $50.000.
- En la simulacion se recuperan 4 turnos, equivalente a $180.000.
- Esto no valida definitivamente el negocio, pero da una senal positiva para seguir probando con complejos reales.

Diferenciacion:

- CanchaPro no reemplaza WhatsApp.
- Ordena la operacion que ya ocurre por WhatsApp.
- Genera trazabilidad y tablero para que el dueno entienda el impacto economico.

## 6. Business Model Canvas preliminar

| Bloque | Contenido |
|---|---|
| Segmento objetivo | Complejos deportivos pequenos y medianos con canchas de futbol amateur. |
| Cliente pagador | Dueno o administrador del complejo. |
| Usuario operativo | Encargado que gestiona reservas, cancelaciones y mensajes. |
| Beneficiario indirecto | Jugador que recibe respuestas mas rapidas y disponibilidad clara. |
| Propuesta de valor | Recuperar turnos cancelados, ordenar agenda y mostrar indicadores economicos simples. |
| Canales | Venta directa, referidos, demostraciones con complejos, redes locales. |
| Relacion con clientes | Onboarding asistido, soporte por WhatsApp, prueba piloto. |
| Fuentes de ingresos | Suscripcion mensual por complejo. Futuro: planes por cantidad de canchas o modulos. |
| Estructura de costos | Desarrollo, hosting, Supabase, soporte, ventas, mantenimiento. |
| Recursos clave | Software, datos operativos, marca, conocimiento del dominio. |
| Actividades clave | Desarrollo, soporte, onboarding, analisis de uso, mejoras del producto. |
| Socios clave | Complejos piloto, profesores/tutores, potenciales integradores de WhatsApp/pagos. |
| Metricas clave | Turnos recuperados, cancelaciones, ocupacion, ingresos recuperados, retencion. |
| Hipotesis pendientes | Disposicion real a pagar, adopcion sostenida, carga disciplinada de datos. |

Escenarios de precio:

| Escenario | Precio | Evaluacion |
|---|---:|---|
| Bajo | $25.000 | Se justifica con 1 turno recuperado. Bueno para adopcion inicial. |
| Medio | $50.000 | Se justifica con 2 turnos recuperados. Es el escenario mas defendible. |
| Alto | $90.000 | Requiere 2 o 3 turnos recuperados y mayor confianza en el valor. |

## 7. Roadmap

MVP actual:

- Agenda semanal.
- Reservas.
- Turnos fijos.
- Cancelaciones.
- Reventa por WhatsApp.
- Publicacion de disponibilidad.
- Tablero economico.
- Costos y punto de equilibrio.
- Login por complejo.
- Panel admin basico.

Release siguiente:

- Crear complejos desde panel admin.
- Gestionar usuarios y permisos.
- Recuperacion de contrasena.
- Vista publica por complejo con `public_slug`.
- Reportes mensuales descargables.
- Auditoria basica de acciones.

Evolucion comercial:

- Planes por cantidad de canchas.
- Onboarding guiado para complejos.
- Reportes de recuperacion mensual.
- Alertas de cancelaciones frecuentes.
- Tarifas por franja horaria.
- Promociones para horarios valle.

Evolucion con IA:

- Consulta en lenguaje natural: "cuantos turnos perdi esta semana".
- Deteccion de horarios valle.
- Sugerencias de publicacion.
- Recomendaciones de promociones.
- Analisis de patrones de cancelacion.

Escalamiento SaaS:

- Migrar de snapshot JSON a tablas relacionales.
- RLS completa por tabla.
- Service role solo en endpoints server-side.
- Panel admin con ABM completo.
- Monitoreo, backups y observabilidad.

## 8. Rol actual y futuro de IA

La IA no es nucleo del MVP actual porque el problema principal todavia es operativo: registrar bien reservas, cancelaciones, disponibilidad y costos. Incorporar IA ahora tendria limites:

- pocos datos reales;
- riesgo de recomendaciones poco confiables;
- complejidad tecnica innecesaria para validar el dolor;
- necesidad de primero ordenar la base de datos operativa.

Rol futuro posible:

| Caso de uso IA | Valor esperado | Condicion previa |
|---|---|---|
| Consulta inteligente de datos | Facilita lectura para duenos no tecnicos | Datos historicos confiables. |
| Deteccion de horarios valle | Identifica franjas ociosas | Uso sostenido por varias semanas. |
| Sugerencias de publicacion | Recomienda que horarios republicar | Registro real de respuestas y recuperos. |
| Promociones sugeridas | Ayuda a vender horarios dificiles | Precios y ocupacion historica. |
| Analisis de cancelaciones | Detecta clientes/franjas problematicas | Datos de cancelaciones consistentes. |

## 9. Guion de demo

Duracion sugerida: 5 a 7 minutos.

1. Problema: explicar que las canchas pierden ingresos por cancelaciones y horarios ociosos gestionados de forma dispersa por WhatsApp.
2. Login como Ottantuno: mostrar que es una herramienta por complejo, no marketplace.
3. Agenda: mostrar reservas, turnos fijos y horarios libres.
4. Cancelacion: abrir Cancelaciones y mostrar horario liberado.
5. WhatsApp: copiar mensaje de reventa o confirmacion.
6. Recuperacion: mostrar un turno recuperado en el mismo horario/cancha de una cancelacion.
7. Tablero: mostrar `Turnos recuperados`, `Ingresos recuperados`, cancelaciones e ingreso en riesgo.
8. Costos: mostrar punto de equilibrio.
9. Panel admin: evidenciar que el producto ya contempla varios complejos.
10. Cierre: conectar recuperacion de 2 o mas turnos con posible suscripcion mensual.

## 10. Narrativa para presentacion final

CanchaPro nace de un problema concreto: los complejos deportivos gestionan turnos, cancelaciones y consultas en canales dispersos. WhatsApp funciona, pero no deja datos ordenados para decidir. El aprendizaje principal es que el dolor no es solo "tener una agenda digital", sino perder trazabilidad sobre ocupacion, cancelaciones, horarios libres e ingresos potenciales.

La solucion propuesta no reemplaza la rutina actual del encargado. Se integra a ella: permite cargar reservas, confirmar por WhatsApp, registrar cancelaciones, publicar disponibilidad y medir impacto economico.

La evidencia simulada del caso Ottantuno muestra 7 cancelaciones, 4 turnos recuperados y $180.000 de ingreso recuperado. Esto permite formular una hipotesis comercial razonable: si el sistema ayuda a recuperar 2 turnos mensuales, una suscripcion de $50.000 empieza a justificarse.

CanchaPro tiene sentido como negocio porque apunta a un cliente pagador claro, resuelve un dolor economico medible y puede escalar como SaaS para complejos deportivos.

## 11. Riesgos, limitaciones y validaciones pendientes

| Riesgo o limitacion | Impacto | Mitigacion |
|---|---|---|
| Simulacion vs uso real | La evidencia no prueba adopcion sostenida | Pilotos reales durante varias semanas. |
| Carga manual | Si el encargado no carga datos, el tablero pierde valor | UX simple, onboarding y recordatorios. |
| Dependencia de WhatsApp | El canal externo no esta automatizado | Mantener copiado manual en MVP, evaluar API luego. |
| Datos insuficientes para IA | Recomendaciones poco confiables | Postergar IA predictiva hasta tener historico. |
| Pocos complejos piloto | Riesgo de sesgo | Probar en mas complejos con distinto tamano. |
| Snapshot JSON | Limita reportes y auditoria fina | Migrar gradualmente a tablas relacionales. |
| Panel admin basico | Falta gestion operativa completa | Incorporar ABM, reset de usuarios, estados. |
| Seguridad futura | Requiere mayor robustez si escala | RLS por tabla, endpoints server-side, auditoria. |

## 12. Preguntas posibles del docente

**Por que no reemplazan WhatsApp?**  
Porque WhatsApp ya forma parte del habito de jugadores y encargados. El MVP reduce friccion manteniendo el canal, pero registra datos para decision.

**Quien paga?**  
El dueno o administrador del complejo.

**Por que pagaria?**  
Porque puede recuperar turnos cancelados, visualizar ingresos en riesgo y entender si la ocupacion cubre costos.

**Que evidencia tienen?**  
Una demo funcional con simulacion de Ottantuno: 7 cancelaciones, 4 recuperaciones y $180.000 recuperados. Es evidencia preliminar, no validacion definitiva.

**Como saben que se recuperaron turnos por la app?**  
En la demo se modela una cancelacion y una nueva reserva confirmada en el mismo horario/cancha, con nota de recuperacion por reventa.

**Cual es el diferencial?**  
No es solo agenda. Es trazabilidad comercial: cancelaciones, recupero, ingresos, costos y punto de equilibrio.

**Que falta validar?**  
Uso real sostenido, disposicion efectiva a pagar y comportamiento en mas complejos.

**Como escalaria?**  
Como SaaS por complejo, con login, roles, panel admin, reportes y luego migracion a tablas relacionales.

**Que rol tiene la IA?**  
Futuro. Primero se necesita capturar datos confiables; luego la IA puede ayudar a consultar, detectar patrones y sugerir acciones.

**Que harian si los complejos no cargan datos?**  
Simplificar flujos, capacitar encargados, automatizar recordatorios y priorizar beneficios visibles como reventa y confirmacion.

**Por que $50.000 es razonable?**  
Porque con turno de $45.000, recuperar 2 turnos mensuales cubre la suscripcion con margen.

**Que aprendieron desde Parte II?**  
Que el valor no esta en digitalizar por digitalizar, sino en convertir la operacion diaria en datos utiles y recuperacion economica.

## 13. Capturas necesarias

- Login.
- Panel admin.
- Agenda Ottantuno.
- Reservas.
- Nueva reserva.
- Mensaje de confirmacion por WhatsApp.
- Cancelaciones.
- Copiar/publicar reventa.
- Enviar disponibilidad.
- Turnos fijos.
- Tablero con Turnos recuperados e Ingresos recuperados.
- Costos y punto de equilibrio.
- Demo Norte o listado multi-complejo, si aporta a la narrativa.

## 14. Datos que faltan relevar con usuarios reales

- Cantidad real de cancelaciones por semana.
- Porcentaje real de turnos recuperables.
- Tiempo promedio para republicar un horario.
- Respuesta real de jugadores ante horarios publicados.
- Disposicion efectiva a pagar.
- Precio mensual aceptable.
- Uso sostenido por encargados.
- Necesidad de roles staff/owner separados.
- Valor percibido del tablero economico.
- Interes real en reportes mensuales e IA.

