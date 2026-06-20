import type { AppState, Court, FixedCosts, Reservation, Settings, ValidationRecord } from "@/lib/types";
import { addDays, generateId, startOfWeek, toInputDate } from "@/lib/utils";

export const storageKey = "canchapro-next-mvp-state-v1";
const OTTANTUNO_COMPLEX_ID = "069ab75d-b488-4f2a-ba27-d2540643a912";
const OTTANTUNO_DEMO_START_DATE = "2026-06-06";
const OTTANTUNO_DEMO_CUTOFF_DATE = "2026-06-22";
const OTTANTUNO_DEMO_FUTURE_START_DATE = "2026-06-23";
const OTTANTUNO_DEMO_FUTURE_END_DATE = "2026-06-29";
const DEMO_NORTE_COMPLEX_ID = "6610a6f9-d586-4b00-a8d5-c8ddae585f8b";
const DEMO_NORTE_RESALE_DATE = "2026-06-20";
const DEMO_NORTE_RESALE_TIME = "20:00";
const DEMO_NORTE_RESALE_REASON = "El cliente aviso que no llega a completar equipo";
const LP_SPORTS_DEMO_START_DATE = "2026-06-17";
const LP_SPORTS_DEMO_CUTOFF_DATE = "2026-06-22";

export const costLabels: Record<keyof FixedCosts, string> = {
  electricity: "Luz",
  gas: "Gas",
  water: "Agua",
  salaries: "Salarios",
  rent: "Alquiler",
  taxes: "Impuestos",
  maintenance: "Mantenimiento",
  other: "Otros costos"
};

export const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export const defaultSettings: Settings = {
  basePrice: 45000,
  valleyPrice: 45000,
  weekendPrice: 45000,
  openHour: "17:00",
  closeHour: "00:00",
  slotDuration: 60,
  confirmationLeadHours: 0,
  openDays: [1, 2, 3, 4, 5, 6, 0],
  valleyRanges: []
};

export function createDefaultState(): AppState {
  const weekStart = startOfWeek(new Date("2026-06-01T12:00:00"));
  const courts = createOttantunoCourts();
  const reservations = createOttantunoReservations(weekStart, courts);

  return normalizeOttantunoDemoStateForPartIII({
    complex: {
      id: "complex-ottantuno-demo",
      name: "Ottantuno",
      address: "Calle 46 e/ 198 y 199",
      phone: "2216652449",
      responsibleName: "Roman",
      configuredByRole: "owner"
    },
    courts,
    settings: defaultSettings,
    costs: {
      electricity: 325800,
      gas: 43600,
      water: 47900,
      salaries: 1875000,
      rent: 0,
      taxes: 180000,
      maintenance: 160000,
      other: 100000
    },
    reservations,
    publicSlotIds: createOttantunoPublicSlotIds(courts),
    validationRecords: createValidationRecords()
  });
}

export function createDemoStateForComplex(complexId?: string, currentState?: Partial<AppState> | null, demoHint = ""): AppState {
  const complexName = `${currentState?.complex?.name ?? ""} ${demoHint}`.toLowerCase();
  if (complexId === OTTANTUNO_COMPLEX_ID) return createDefaultState();
  if (complexId === DEMO_NORTE_COMPLEX_ID) return createDemoNorteState(currentState);
  if (complexName.includes("lp sports") || complexName.includes("lpsports") || complexName.includes("lp-sports")) return createLpSportsState();
  if (complexName.includes("demo norte")) return createDemoNorteState(currentState);
  if (complexName.includes("ottantuno") || !complexId) return createDefaultState();
  return createGenericOperationalDemoState(currentState);
}

function createOttantunoCourts(): Court[] {
  return [
    {
      id: "court-1",
      name: "Cancha 1 - Futbol 5 techada",
      type: "futbol5",
      roofed: true,
      active: true,
      openHour: "17:00",
      closeHour: "00:00",
      slotStepMinutes: 60,
      price: 45000
    },
    {
      id: "court-2",
      name: "Cancha 2 - Futbol 5 abierta",
      type: "futbol5",
      roofed: false,
      active: true,
      openHour: "17:00",
      closeHour: "00:00",
      slotStepMinutes: 60,
      price: 45000
    }
  ];
}

function createOttantunoReservations(weekStart: Date, courts: Court[]) {
  return normalizeOttantunoTemporalStates(dedupeByIdAndSlot([
    ...ottantunoFixedTurns(weekStart, courts),
    ...ottantunoOccasionalReservations(weekStart, courts)
  ]));
}

function createOttantunoPublicSlotIds(courts: Court[]) {
  return [
    `2026-06-23-${courts[0].id}-20:00`,
    `2026-06-24-${courts[1].id}-21:00`,
    `2026-06-25-${courts[0].id}-20:00`
  ];
}

function ottantunoFixedTurns(weekStart: Date, courts: Court[]) {
  const fixedTurns: Array<[number, string, string, string, number]> = [
    [1, "17:00", courts[0].id, "Escuelita Ottantuno", 0],
    [1, "18:00", courts[0].id, "Escuelita Ottantuno", 0],
    [1, "17:00", courts[1].id, "Escuelita Ottantuno", 0],
    [1, "18:00", courts[1].id, "Escuelita Ottantuno", 0],
    [3, "17:00", courts[0].id, "Escuelita Ottantuno", 0],
    [3, "18:00", courts[0].id, "Escuelita Ottantuno", 0],
    [3, "17:00", courts[1].id, "Escuelita Ottantuno", 0],
    [3, "18:00", courts[1].id, "Escuelita Ottantuno", 0],
    [0, "20:00", courts[0].id, "Javier Almiron", 45000],
    [7, "19:00", courts[1].id, "Barrio Norte", 45000],
    [7, "21:00", courts[1].id, "La 22 FC", 45000],
    [1, "20:00", courts[1].id, "La 46 FC", 45000],
    [8, "21:00", courts[0].id, "Los Profes", 45000],
    [2, "21:00", courts[0].id, "Federico Ledesma", 45000],
    [9, "20:00", courts[1].id, "Deportivo 46", 45000],
    [9, "22:00", courts[0].id, "Amigos del Parque", 45000],
    [3, "20:00", courts[1].id, "Veteranos 45", 45000],
    [10, "21:00", courts[0].id, "Los del Fondo", 45000],
    [4, "22:00", courts[0].id, "Nicolas Benitez", 45000],
    [11, "19:00", courts[1].id, "La 10 Futbol", 45000],
    [11, "21:00", courts[1].id, "Viejos Crack", 45000],
    [12, "23:00", courts[0].id, "Fulbito 81", 45000],
    [12, "22:00", courts[1].id, "Equipo Norte", 45000],
    [13, "23:00", courts[0].id, "Amigos del Parque", 45000],
    [13, "22:00", courts[1].id, "Los Profes", 45000]
  ];

  return fixedTurns.map(([dayOffset, time, courtId, customerName, price]) => ottantunoFixedReservation(weekStart, dayOffset, time, courtId, customerName, price));
}

function ottantunoFixedReservation(weekStart: Date, dayOffset: number, time: string, courtId: string, customerName: string, price: number): Reservation {
  const date = toInputDate(addDays(weekStart, dayOffset));
  const confirmedDates = recurringDatesUntil(date, OTTANTUNO_DEMO_CUTOFF_DATE);
  return {
    id: stableId("ottantuno-fixed", date, time, courtId, customerName),
    date,
    time,
    courtId,
    type: "fixed",
    customerName,
    customerPhone: phoneForCustomer(customerName),
    price,
    status: "pending",
    notes: price === 0 ? "Bloqueo recurrente institucional" : "Turno fijo semanal",
    durationMinutes: 60,
    confirmedDates,
    paidDates: price > 0 ? confirmedDates : undefined,
    createdAt: new Date().toISOString()
  };
}

function ottantunoOccasionalReservations(weekStart: Date, courts: Court[]) {
  const items: Reservation[] = [
    // Sabado 06/06 y domingo 07/06, primer fin de semana mostrado en Parte II.
    ottantunoOccasional("2026-06-06", "17:00", courts[0].id, "Martin Duarte", "confirmed", true),
    ottantunoOccasional("2026-06-06", "17:00", courts[1].id, "Agustin Ferreyra", "confirmed", true),
    ottantunoOccasional("2026-06-06", "18:00", courts[0].id, "Rodrigo Sosa", "confirmed", true),
    ottantunoOccasional("2026-06-06", "18:00", courts[1].id, "Juan Ignacio Roldan", "confirmed", true),
    ottantunoOccasional("2026-06-06", "19:00", courts[0].id, "Tomas Galarza", "confirmed", true),
    ottantunoOccasional("2026-06-06", "19:00", courts[1].id, "Franco Medina", "confirmed", true),
    ottantunoOccasional("2026-06-06", "20:00", courts[0].id, "Sebastian Pereyra", "confirmed", true),
    ottantunoOccasional("2026-06-06", "20:00", courts[1].id, "Pablo Echeverria", "confirmed", true),
    ottantunoOccasional("2026-06-06", "21:00", courts[0].id, "Leandro Correa", "confirmed", true),
    ottantunoOccasional("2026-06-06", "21:00", courts[1].id, "Emiliano Castro", "confirmed", true),
    ottantunoOccasional("2026-06-06", "22:00", courts[0].id, "Matias Barreto", "confirmed", true),
    ottantunoOccasional("2026-06-06", "23:00", courts[1].id, "Santiago Villar", "confirmed", true),
    ottantunoOccasional("2026-06-07", "17:00", courts[0].id, "Lautaro Gomez", "confirmed", true),
    ottantunoOccasional("2026-06-07", "17:00", courts[1].id, "Julian Costa", "confirmed", true),
    ottantunoOccasional("2026-06-07", "18:00", courts[0].id, "Andres Molina", "confirmed", true),
    ottantunoOccasional("2026-06-07", "18:00", courts[1].id, "Manuel Quiroga", "confirmed", true),
    ottantunoOccasional("2026-06-07", "19:00", courts[0].id, "Bruno Sampedro", "confirmed", true),
    ottantunoOccasional("2026-06-07", "19:00", courts[1].id, "Patricio Silva", "confirmed", true),
    ottantunoOccasional("2026-06-07", "20:00", courts[0].id, "Facundo Miranda", "confirmed", true),
    ottantunoCancellation("2026-06-07", "20:00", courts[1].id, "Grupo de Joaquin", "Cancelan por mal clima", false),
    ottantunoOccasional("2026-06-07", "21:00", courts[0].id, "Gaston Arce", "confirmed", true),
    ottantunoOccasional("2026-06-07", "21:00", courts[1].id, "Rafael Mendez", "confirmed", true),
    ottantunoOccasional("2026-06-07", "22:00", courts[0].id, "Ignacio Herrera", "confirmed", true),
    ottantunoOccasional("2026-06-07", "23:00", courts[1].id, "Diego Farias", "confirmed", true),

    // Semana 08/06 al 14/06.
    ottantunoOccasional("2026-06-08", "19:00", courts[0].id, "Alan Peralta", "confirmed", true),
    ottantunoOccasional("2026-06-08", "20:00", courts[1].id, "Pedro Gimenez", "confirmed", true),
    ottantunoOccasional("2026-06-09", "19:00", courts[1].id, "Emiliano Torres", "confirmed", true),
    ottantunoOccasional("2026-06-09", "20:00", courts[0].id, "Federico Ruiz", "confirmed", true),
    ottantunoOccasional("2026-06-09", "22:00", courts[0].id, "Cristian Acosta", "confirmed", true),
    ottantunoOccasional("2026-06-10", "20:00", courts[0].id, "Mateo Silva", "confirmed", true),
    ottantunoOccasional("2026-06-10", "19:00", courts[1].id, "Ezequiel Ponce", "confirmed", true),
    ottantunoOccasional("2026-06-10", "21:00", courts[1].id, "Gonzalo Arias", "confirmed", true),
    ottantunoCancellation("2026-06-10", "18:00", courts[0].id, "Camilo Fuentes", "Equipo incompleto, avisan por WhatsApp", true),
    ottantunoOccasional("2026-06-10", "18:00", courts[0].id, "Benjamin Aguirre", "confirmed", true, "Recuperado por reventa"),
    ottantunoCancellation("2026-06-12", "22:00", courts[1].id, "Hernan Bustos", "Cancelan por falta de jugadores", false),
    ottantunoOccasional("2026-06-11", "19:00", courts[0].id, "Agustin Salas", "confirmed", true),
    ottantunoOccasional("2026-06-11", "21:00", courts[1].id, "Matias Rios", "confirmed", true),
    ottantunoOccasional("2026-06-12", "19:00", courts[0].id, "Marcos Cabrera", "confirmed", true),
    ottantunoOccasional("2026-06-12", "20:00", courts[0].id, "Tomas Cabrera", "confirmed", true),
    ottantunoOccasional("2026-06-13", "19:00", courts[1].id, "Luciano Vega", "confirmed", true),
    ottantunoOccasional("2026-06-13", "18:00", courts[0].id, "Benjamin Aguirre", "confirmed", true),
    ottantunoOccasional("2026-06-13", "20:00", courts[1].id, "Diego Morales", "confirmed", true),
    ottantunoOccasional("2026-06-14", "17:00", courts[0].id, "Ramon Villalba", "confirmed", true),
    ottantunoOccasional("2026-06-14", "18:00", courts[0].id, "Maximiliano Torres", "confirmed", true),
    ottantunoOccasional("2026-06-14", "19:00", courts[0].id, "Joaquin Vera", "confirmed", true),
    ottantunoOccasional("2026-06-14", "19:00", courts[1].id, "Gabriel Nunez", "confirmed", true),
    ottantunoOccasional("2026-06-14", "21:00", courts[0].id, "Ariel Dominguez", "confirmed", true),
    ottantunoOccasional("2026-06-14", "18:00", courts[1].id, "Lucas Morel", "confirmed", true),
    ottantunoOccasional("2026-06-14", "20:00", courts[1].id, "Dario Campos", "confirmed", true),

    // Lunes feriado 15/06, alta demanda y recuperacion.
    ottantunoOccasional("2026-06-15", "17:00", courts[0].id, "Lucas Medina", "confirmed", true),
    ottantunoOccasional("2026-06-15", "17:00", courts[1].id, "Federico Ruiz", "confirmed", true),
    ottantunoOccasional("2026-06-15", "18:00", courts[0].id, "Nicolas Herrera", "confirmed", true),
    ottantunoOccasional("2026-06-15", "18:00", courts[1].id, "Bruno Castillo", "confirmed", true),
    ottantunoCancellation("2026-06-15", "19:00", courts[0].id, "Ivan Benitez", "No llegan a completar equipo", true),
    ottantunoOccasional("2026-06-15", "19:00", courts[0].id, "Matias Rios", "confirmed", true, "Recuperado por reventa"),
    ottantunoOccasional("2026-06-15", "20:00", courts[1].id, "Franco Molina", "confirmed", true),
    ottantunoOccasional("2026-06-15", "21:00", courts[0].id, "Juan Pablo Gomez", "confirmed", true),
    ottantunoOccasional("2026-06-15", "22:00", courts[0].id, "Santiago Ferreyra", "confirmed", true),
    ottantunoOccasional("2026-06-15", "22:00", courts[1].id, "Martin Acosta", "confirmed", true),
    ottantunoOccasional("2026-06-15", "23:00", courts[1].id, "Lautaro Perez", "confirmed", true),

    // Martes 16 y miercoles 17, uso moderado ya gestionado.
    ottantunoOccasional("2026-06-16", "19:00", courts[0].id, "Ivan Benitez", "confirmed", true),
    ottantunoOccasional("2026-06-16", "19:00", courts[1].id, "Rodrigo Luna", "confirmed", true),
    ottantunoOccasional("2026-06-16", "20:00", courts[0].id, "Diego Peralta", "confirmed", true),
    ottantunoOccasional("2026-06-16", "21:00", courts[1].id, "Ramiro Suarez", "confirmed", true),
    ottantunoCancellation("2026-06-16", "22:00", courts[1].id, "Ezequiel Navarro", "Avisan que se baja el equipo", true),
    ottantunoOccasional("2026-06-16", "22:00", courts[1].id, "Facundo Romero", "confirmed", true, "Recuperado por reventa"),
    ottantunoOccasional("2026-06-16", "23:00", courts[0].id, "Andres Correa", "confirmed", true),
    ottantunoOccasional("2026-06-17", "17:00", courts[0].id, "Diego Morales", "confirmed", true),
    ottantunoOccasional("2026-06-17", "18:00", courts[0].id, "Emiliano Torres", "confirmed", true),
    ottantunoOccasional("2026-06-17", "18:00", courts[1].id, "Ramiro Suarez", "confirmed", true),
    ottantunoOccasional("2026-06-17", "19:00", courts[1].id, "Joaquin Vera", "confirmed", true),
    ottantunoOccasional("2026-06-17", "20:00", courts[0].id, "Nicolas Herrera", "confirmed", true),
    ottantunoOccasional("2026-06-17", "22:00", courts[1].id, "Facundo Romero", "confirmed", true),
    ottantunoCancellation("2026-06-17", "23:00", courts[0].id, "Pedro Gimenez", "Cancelan sobre la hora; se recupera por reventa", false),
    ottantunoOccasional("2026-06-17", "23:00", courts[0].id, "Damian Amaya", "confirmed", true, "Recuperado por reventa"),

    // Uso gestionado hasta el 22/06 y futuras pendientes hasta el 29/06.
    ottantunoOccasional("2026-06-18", "19:00", courts[1].id, "Mateo Silva", "confirmed", true),
    ottantunoOccasional("2026-06-18", "21:00", courts[1].id, "Ivan Benitez", "confirmed", true),
    ottantunoCancellation("2026-06-18", "19:00", courts[0].id, "Gonzalo Arias", "Cancelan por baja de jugadores", false),
    ottantunoCancellation("2026-06-18", "22:00", courts[1].id, "Mateo Silva", "Cancelacion por lluvia", false),
    ottantunoOccasional("2026-06-18", "23:00", courts[0].id, "Gonzalo Arias", "confirmed", true),
    ottantunoCancellation("2026-06-19", "20:00", courts[1].id, "Agustin Salas", "Cancelan con dos dias de anticipacion", false),
    ottantunoOccasional("2026-06-19", "20:00", courts[1].id, "Facundo Romero", "confirmed", true, "Recuperado por reventa"),
    ottantunoOccasional("2026-06-19", "18:00", courts[0].id, "Tomas Cabrera", "confirmed", true),
    ottantunoOccasional("2026-06-19", "21:00", courts[0].id, "Nicolas Ferreyra", "confirmed", true),
    ottantunoOccasional("2026-06-19", "23:00", courts[0].id, "Mariano Ibarra", "confirmed", true),
    ottantunoOccasional("2026-06-19", "22:00", courts[1].id, "Santiago Robles", "confirmed", true),
    ottantunoOccasional("2026-06-19", "23:00", courts[1].id, "Bruno Castillo", "confirmed", true),
    ottantunoOccasional("2026-06-20", "17:00", courts[1].id, "Ramiro Suarez", "confirmed", true),
    ottantunoOccasional("2026-06-20", "17:00", courts[0].id, "Lautaro Perez", "confirmed", true),
    ottantunoOccasional("2026-06-20", "18:00", courts[0].id, "Federico Molina", "confirmed", true),
    ottantunoOccasional("2026-06-20", "18:00", courts[1].id, "Santiago Ferreyra", "confirmed", true),
    ottantunoOccasional("2026-06-20", "19:00", courts[1].id, "Franco Acuna", "confirmed", true),
    ottantunoOccasional("2026-06-20", "20:00", courts[1].id, "Matias Godoy", "confirmed", true),
    ottantunoOccasional("2026-06-20", "21:00", courts[0].id, "Lucas Barrios", "confirmed", true),
    ottantunoOccasional("2026-06-20", "22:00", courts[0].id, "Martin Acosta", "confirmed", true),
    ottantunoOccasional("2026-06-21", "17:00", courts[1].id, "Rodrigo Luna", "confirmed", true),
    ottantunoOccasional("2026-06-21", "18:00", courts[1].id, "Emiliano Paredes", "confirmed", true),
    ottantunoOccasional("2026-06-21", "19:00", courts[0].id, "Ignacio Salvatierra", "confirmed", true),
    ottantunoOccasional("2026-06-21", "19:00", courts[1].id, "Andres Correa", "confirmed", true),
    ottantunoOccasional("2026-06-21", "21:00", courts[0].id, "Federico Molina", "confirmed", true),
    ottantunoOccasional("2026-06-21", "21:00", courts[1].id, "Mariano Ibarra", "confirmed", true),
    ottantunoOccasional("2026-06-21", "22:00", courts[0].id, "Lucas Barrios", "confirmed", true),
    ottantunoOccasional("2026-06-22", "18:00", courts[0].id, "Ezequiel Navarro", "confirmed", true),
    ottantunoOccasional("2026-06-22", "20:00", courts[1].id, "Facundo Romero", "confirmed", true),
    ottantunoCancellation("2026-06-23", "20:00", courts[0].id, "Pedro Gimenez", "Cancelan con un dia de anticipacion", false),
    ottantunoOccasional("2026-06-23", "19:00", courts[1].id, "Facundo Romero", "pending", false),
    ottantunoOccasional("2026-06-24", "20:00", courts[0].id, "Diego Morales", "pending", false),
    ottantunoCancellation("2026-06-24", "21:00", courts[1].id, "Nicolas Herrera", "Cancelan por viaje laboral", false),
    ottantunoOccasional("2026-06-26", "20:00", courts[1].id, "Federico Ruiz", "pending", false),
    ottantunoCancellation("2026-06-25", "20:00", courts[0].id, "Martin Acosta", "Cancelan por lesion de un jugador", false),
    ottantunoOccasional("2026-06-26", "19:00", courts[0].id, "Bruno Castillo", "pending", false),
    ottantunoOccasional("2026-06-27", "18:00", courts[1].id, "Lucas Medina", "pending", false),
    ottantunoOccasional("2026-06-28", "20:00", courts[0].id, "Lautaro Perez", "pending", false),
    ottantunoOccasional("2026-06-29", "22:00", courts[0].id, "Rodrigo Luna", "pending", false)
  ];

  return items;
}

function ottantunoOccasional(date: string, time: string, courtId: string, customerName: string, status: Reservation["status"], paid: boolean, notes = ""): Reservation {
  return {
    id: stableId("ottantuno-reservation", date, time, courtId, customerName),
    date,
    time,
    courtId,
    type: "occasional",
    customerName,
    customerPhone: phoneForCustomer(customerName),
    price: 45000,
    status,
    notes,
    durationMinutes: 60,
    paid,
    paidAt: paid ? new Date(`${date}T${time}:00`).toISOString() : undefined,
    createdAt: new Date().toISOString()
  };
}

function ottantunoCancellation(date: string, time: string, courtId: string, customerName: string, reason: string, recovered: boolean): Reservation {
  const cancelledAt = new Date(`${date}T${time}:00`);
  cancelledAt.setHours(cancelledAt.getHours() - (date > OTTANTUNO_DEMO_CUTOFF_DATE ? 48 : 6));
  return {
    id: stableId("ottantuno-cancellation", date, time, courtId, reason),
    date,
    time,
    courtId,
    type: "occasional",
    customerName,
    customerPhone: phoneForCustomer(customerName),
    price: 45000,
    status: "cancelled",
    notes: recovered ? `${reason}. Recuperado por reventa.` : reason,
    durationMinutes: 60,
    cancellationReason: recovered ? `${reason}. Recuperado por reventa.` : reason,
    cancellationLastMinute: date <= OTTANTUNO_DEMO_CUTOFF_DATE,
    cancelledAt: cancelledAt.toISOString(),
    paid: false,
    createdAt: new Date().toISOString()
  };
}

function recurringDatesUntil(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(toInputDate(cursor));
    cursor = addDays(cursor, 7);
  }
  return dates;
}

function stableId(prefix: string, date: string, time: string, courtId: string, label: string) {
  return `${prefix}-${date}-${time.replace(":", "")}-${courtId}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function dedupeByIdAndSlot(reservations: Reservation[]) {
  const byId = new Map<string, Reservation>();
  reservations.forEach((reservation) => byId.set(reservation.id, reservation));
  return Array.from(byId.values());
}

function normalizeOttantunoTemporalStates(reservations: Reservation[]) {
  return reservations.map((reservation) => {
    if (reservation.status === "cancelled") {
      return { ...reservation, paid: false, paidAt: undefined, paidDates: undefined, confirmedDates: undefined };
    }

    if (reservation.type === "fixed") {
      const activeDates = recurringDatesUntil(reservation.date, OTTANTUNO_DEMO_FUTURE_END_DATE);
      const confirmedDates = activeDates.filter((date) => date <= OTTANTUNO_DEMO_CUTOFF_DATE);
      const paidDates = reservation.price > 0 ? confirmedDates : undefined;
      return {
        ...reservation,
        status: "pending" as const,
        confirmedDates,
        paidDates,
        paid: false,
        paidAt: undefined
      };
    }

    if (reservation.date >= OTTANTUNO_DEMO_START_DATE && reservation.date <= OTTANTUNO_DEMO_CUTOFF_DATE) {
      return {
        ...reservation,
        status: "confirmed" as const,
        paid: true,
        paidAt: reservation.paidAt ?? new Date(`${reservation.date}T${reservation.time}:00`).toISOString(),
        paidDates: undefined,
        confirmedDates: undefined
      };
    }

    if (reservation.date >= OTTANTUNO_DEMO_FUTURE_START_DATE && reservation.date <= OTTANTUNO_DEMO_FUTURE_END_DATE) {
      return {
        ...reservation,
        status: "pending" as const,
        paid: false,
        paidAt: undefined,
        paidDates: undefined,
        confirmedDates: undefined
      };
    }

    return reservation;
  });
}

function normalizeOttantunoDemoStateForPartIII(state: AppState): AppState {
  const reservations = dedupeOttantunoDemoReservations(state.reservations)
    .map((reservation) => normalizeOttantunoReservationForPartIII(reservation));
  inspectOttantunoDemoConsistency(reservations);
  return {
    ...state,
    reservations,
    publicSlotIds: uniqueValues(state.publicSlotIds)
  };
}

function normalizeOttantunoReservationForPartIII(reservation: Reservation): Reservation {
  if (reservation.status === "cancelled") {
    return {
      ...reservation,
      status: "cancelled",
      paid: false,
      paidAt: undefined,
      confirmedDates: [],
      paidDates: [],
      cancelledDates: reservation.cancelledDates ?? [],
      cancellationReason: reservation.cancellationReason || reservation.notes || "Cancelacion registrada",
      cancellationLastMinute: reservation.cancellationLastMinute ?? false
    };
  }

  if (reservation.type === "fixed") {
    const activeDates = recurringDatesUntil(reservation.date, OTTANTUNO_DEMO_FUTURE_END_DATE);
    const confirmedDates = activeDates.filter((date) => date <= OTTANTUNO_DEMO_CUTOFF_DATE);
    const paidDates = reservation.price > 0 ? confirmedDates : [];
    return {
      ...reservation,
      status: "pending",
      paid: false,
      paidAt: undefined,
      confirmedDates,
      paidDates,
      cancelledDates: reservation.cancelledDates ?? []
    };
  }

  if (reservation.date >= OTTANTUNO_DEMO_START_DATE && reservation.date <= OTTANTUNO_DEMO_CUTOFF_DATE) {
    return {
      ...reservation,
      status: "confirmed",
      paid: true,
      paidAt: reservation.paidAt ?? new Date(`${reservation.date}T${reservation.time}:00`).toISOString(),
      confirmedDates: [reservation.date],
      paidDates: [reservation.date],
      cancelledDates: reservation.cancelledDates ?? []
    };
  }

  if (reservation.date >= OTTANTUNO_DEMO_FUTURE_START_DATE && reservation.date <= OTTANTUNO_DEMO_FUTURE_END_DATE) {
    return {
      ...reservation,
      status: "pending",
      paid: false,
      paidAt: undefined,
      confirmedDates: [],
      paidDates: [],
      cancelledDates: reservation.cancelledDates ?? []
    };
  }

  return {
    ...reservation,
    cancelledDates: reservation.cancelledDates ?? [],
    confirmedDates: reservation.confirmedDates ?? [],
    paidDates: reservation.paidDates ?? []
  };
}

function dedupeOttantunoDemoReservations(reservations: Reservation[]): Reservation[] {
  const byKey = new Map<string, Reservation>();
  reservations.forEach((reservation) => {
    const key = reservation.status === "cancelled"
      ? `cancelled-${reservation.date}-${reservation.time}-${reservation.courtId}-${reservation.cancellationReason || reservation.notes}`
      : `active-${reservation.date}-${reservation.time}-${reservation.courtId}-${reservation.customerName}`;
    byKey.set(key, reservation);
  });
  return Array.from(byKey.values());
}

function inspectOttantunoDemoConsistency(reservations: Reservation[]): void {
  const activePastPending = reservations.filter((reservation) =>
    reservation.status !== "cancelled" &&
    reservation.type !== "fixed" &&
    reservation.date >= OTTANTUNO_DEMO_START_DATE &&
    reservation.date <= OTTANTUNO_DEMO_CUTOFF_DATE &&
    reservation.status === "pending"
  ).length;
  const activeFutureConfirmed = reservations.filter((reservation) =>
    reservation.status !== "cancelled" &&
    reservation.type !== "fixed" &&
    reservation.date >= OTTANTUNO_DEMO_FUTURE_START_DATE &&
    reservation.date <= OTTANTUNO_DEMO_FUTURE_END_DATE &&
    (reservation.status === "confirmed" || reservation.paid)
  ).length;
  const duplicateCancellationKeys = duplicateCount(reservations
    .filter((reservation) => reservation.status === "cancelled")
    .map((reservation) => `${reservation.date}-${reservation.time}-${reservation.courtId}`));
  const duplicateActiveSlotKeys = duplicateCount(reservations
    .filter((reservation) => reservation.status !== "cancelled" && reservation.type !== "fixed")
    .map((reservation) => `${reservation.date}-${reservation.time}-${reservation.courtId}`));

  void {
    activePastPending,
    activeFutureConfirmed,
    duplicateCancellationKeys,
    duplicateActiveSlotKeys
  };
}

function duplicateCount(values: string[]): number {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.values()).filter((count) => count > 1).length;
}

function createLpSportsState(): AppState {
  const courts = createLpSportsCourts();
  return {
    complex: {
      id: "complex-lp-sports-demo",
      name: "LP Sports",
      address: "Calle 188 entre 519 y 520",
      phone: "2214915875",
      responsibleName: "LP Sports",
      configuredByRole: "owner"
    },
    courts,
    settings: {
      basePrice: 50000,
      valleyPrice: 25000,
      weekendPrice: 50000,
      openHour: "16:00",
      closeHour: "00:00",
      slotDuration: 60,
      confirmationLeadHours: 0,
      openDays: [1, 2, 3, 4, 5, 6],
      valleyRanges: [{ id: "lp-promo-valle", days: [1, 2, 3, 4, 5, 6], from: "16:00", to: "18:00", price: 25000 }]
    },
    costs: {
      electricity: 410000,
      gas: 52000,
      water: 68000,
      salaries: 2380000,
      rent: 0,
      taxes: 230000,
      maintenance: 260000,
      other: 140000
    },
    reservations: createLpSportsReservations(courts),
    publicSlotIds: createLpSportsPublicSlotIds(courts),
    validationRecords: []
  };
}

function createLpSportsCourts(): Court[] {
  return [
    { id: "lp-court-1", name: "Cancha 1 - Futbol 5 abierta", type: "futbol5", roofed: false, active: true, openHour: "16:00", closeHour: "00:00", slotStepMinutes: 60, price: 50000 },
    { id: "lp-court-2", name: "Cancha 2 - Futbol 5 abierta", type: "futbol5", roofed: false, active: true, openHour: "16:00", closeHour: "00:00", slotStepMinutes: 60, price: 50000 },
    { id: "lp-court-3", name: "Cancha 3 - Futbol 5 techada", type: "futbol5", roofed: true, active: true, openHour: "16:00", closeHour: "00:00", slotStepMinutes: 60, price: 50000 }
  ];
}

function createLpSportsPublicSlotIds(courts: Court[]) {
  return [
    `2026-06-24-${courts[0].id}-21:00`,
    `2026-06-25-${courts[1].id}-19:00`
  ];
}

function createLpSportsReservations(courts: Court[]) {
  return dedupeByIdAndSlot([
    ...lpSportsInstitutionalBlocks(courts),
    ...lpSportsPaidFixedTurns(courts),
    ...lpSportsOccasionalReservations(courts)
  ]);
}

function lpSportsInstitutionalBlocks(courts: Court[]) {
  const blocks: Reservation[] = [];
  const addBlock = (date: string, time: string, courtId: string, customerName: string) => {
    blocks.push({
      id: stableId("lp-block", date, time, courtId, customerName),
      date,
      time,
      courtId,
      type: "fixed",
      customerName,
      customerPhone: phoneForCustomer(customerName),
      price: 0,
      status: "pending",
      notes: "Bloqueo institucional, no alquiler de cancha",
      durationMinutes: 60,
      confirmedDates: recurringDatesUntil(date, LP_SPORTS_DEMO_CUTOFF_DATE),
      paidDates: [],
      createdAt: new Date().toISOString()
    });
  };

  addBlock("2026-06-03", "18:00", courts[2].id, "Academia LP Sports");
  ["20:00", "21:00", "22:00"].forEach((time) => {
    addBlock("2026-06-01", time, courts[0].id, "Torneo Senior");
    addBlock("2026-06-01", time, courts[1].id, "Torneo Senior");
    addBlock("2026-06-02", time, courts[0].id, "Torneo Libre");
    addBlock("2026-06-02", time, courts[1].id, "Torneo Libre");
    addBlock("2026-06-04", time, courts[0].id, "Torneo Femenino");
    addBlock("2026-06-04", time, courts[1].id, "Torneo Femenino");
  });
  ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].forEach((time) => {
    addBlock("2026-06-05", time, courts[0].id, "Escuelita LP Sports");
    addBlock("2026-06-05", time, courts[1].id, "Escuelita LP Sports");
  });

  return blocks;
}

function lpSportsPaidFixedTurns(courts: Court[]) {
  const fixedTurns: Array<[string, string, string, string]> = [
    ["2026-06-01", "18:00", courts[2].id, "Los Pibes de 188"],
    ["2026-06-02", "18:00", courts[2].id, "Viejos Crack LP"],
    ["2026-06-02", "19:00", courts[0].id, "La Banda de Melchor"],
    ["2026-06-03", "19:00", courts[1].id, "La 519 FC"],
    ["2026-06-03", "20:00", courts[2].id, "Deportivo Abasto"],
    ["2026-06-04", "19:00", courts[2].id, "Veteranos LP"],
    ["2026-06-04", "23:00", courts[0].id, "Los Profes LP"],
    ["2026-06-05", "17:00", courts[2].id, "La Noche FC"],
    ["2026-06-06", "22:00", courts[0].id, "Fulbito 188"],
    ["2026-06-06", "21:00", courts[2].id, "Equipo La Granja"]
  ];

  return fixedTurns.map(([date, time, courtId, customerName]) => {
    const confirmedDates = recurringDatesUntil(date, LP_SPORTS_DEMO_CUTOFF_DATE);
    return {
      id: stableId("lp-fixed-paid", date, time, courtId, customerName),
      date,
      time,
      courtId,
      type: "fixed" as const,
      customerName,
      customerPhone: phoneForCustomer(customerName),
      price: 50000,
      status: "pending" as const,
      notes: "Turno fijo semanal pago",
      durationMinutes: 60,
      confirmedDates,
      paidDates: confirmedDates,
      seriesEndDate: "2026-07-31",
      createdAt: new Date().toISOString()
    };
  });
}

function lpSportsOccasionalReservations(courts: Court[]) {
  return [
    lpOccasional("2026-06-17", "16:00", courts[0].id, "Tomas Aguirre", "confirmed", true),
    lpOccasional("2026-06-17", "19:00", courts[0].id, "Lautaro Rivas", "confirmed", true),
    lpOccasional("2026-06-17", "20:00", courts[1].id, "Santiago Duarte", "confirmed", true),
    lpOccasional("2026-06-17", "21:00", courts[2].id, "Federico Casas", "confirmed", true),
    lpOccasional("2026-06-17", "22:00", courts[2].id, "Nicolas Molina", "confirmed", true),

    lpOccasional("2026-06-18", "17:00", courts[2].id, "Matias Robledo", "confirmed", true),
    lpCancellation("2026-06-18", "19:00", courts[0].id, "Los Jueves LP", "Lluvia, cancha abierta", true),
    lpOccasional("2026-06-18", "19:00", courts[1].id, "Ivan Sosa", "confirmed", true),
    lpOccasional("2026-06-18", "20:00", courts[2].id, "Diego Altamirano", "confirmed", true),
    lpOccasional("2026-06-18", "22:00", courts[2].id, "Lucas Caceres", "confirmed", true),

    lpOccasional("2026-06-19", "16:00", courts[2].id, "Mariano Silva", "confirmed", true),
    lpOccasional("2026-06-19", "18:00", courts[2].id, "Gonzalo Ruiz", "confirmed", true),
    lpCancellation("2026-06-19", "19:00", courts[2].id, "Grupo Los Viernes", "Cambio de horario laboral", true),
    lpOccasional("2026-06-19", "19:00", courts[2].id, "Agustin Peralta", "confirmed", true, "Recuperado por reventa"),
    lpOccasional("2026-06-19", "20:00", courts[2].id, "Franco Medina", "confirmed", true),
    lpOccasional("2026-06-19", "21:00", courts[2].id, "Ezequiel Ponce", "confirmed", true),
    lpOccasional("2026-06-19", "22:00", courts[2].id, "Maximiliano Torres", "confirmed", true),
    lpOccasional("2026-06-19", "23:00", courts[2].id, "Nicolas Paredes", "confirmed", true),

    lpOccasional("2026-06-20", "16:00", courts[0].id, "Alan Fernandez", "confirmed", true),
    lpOccasional("2026-06-20", "18:00", courts[0].id, "Juan Cruz Castro", "confirmed", true),
    lpOccasional("2026-06-20", "18:00", courts[1].id, "Sebastian Gomez", "confirmed", true),
    lpOccasional("2026-06-20", "19:00", courts[0].id, "Emiliano Vargas", "confirmed", true),
    lpOccasional("2026-06-20", "19:00", courts[1].id, "Rodrigo Salas", "confirmed", true),
    lpCancellation("2026-06-20", "20:00", courts[1].id, "Los Sabados de 20", "Se baja el equipo", true),
    lpOccasional("2026-06-20", "20:00", courts[1].id, "Martin Quiroga", "confirmed", true, "Recuperado por reventa"),
    lpOccasional("2026-06-20", "20:00", courts[2].id, "Leandro Godoy", "confirmed", true),
    lpOccasional("2026-06-20", "21:00", courts[0].id, "Facundo Arias", "confirmed", true),
    lpOccasional("2026-06-20", "21:00", courts[1].id, "Ignacio Varela", "confirmed", true),
    lpOccasional("2026-06-20", "22:00", courts[2].id, "Julian Morales", "confirmed", true),
    lpOccasional("2026-06-20", "23:00", courts[0].id, "Ramiro Suarez", "confirmed", true),

    lpOccasional("2026-06-22", "16:00", courts[2].id, "Tomas Cabrera", "confirmed", true),
    lpOccasional("2026-06-22", "18:00", courts[0].id, "Lucas Medina", "confirmed", true),
    lpCancellation("2026-06-22", "19:00", courts[0].id, "Equipo de Gonnet", "No llegan a completar equipo", true),
    lpOccasional("2026-06-22", "19:00", courts[0].id, "Bruno Herrera", "confirmed", true, "Recuperado por reventa"),
    lpOccasional("2026-06-22", "19:00", courts[1].id, "Federico Ruiz", "confirmed", true),
    lpOccasional("2026-06-22", "21:00", courts[2].id, "Andres Correa", "confirmed", true),

    lpOccasional("2026-06-23", "17:00", courts[2].id, "Nicolas Herrera", "pending", false),
    lpOccasional("2026-06-23", "19:00", courts[2].id, "Bruno Castillo", "pending", false),
    lpOccasional("2026-06-24", "16:00", courts[1].id, "Lautaro Perez", "pending", false),
    lpCancellation("2026-06-24", "21:00", courts[0].id, "Equipo Norte LP", "Problema de transporte", false),
    lpOccasional("2026-06-24", "22:00", courts[2].id, "Santiago Ferreyra", "pending", false),
    lpOccasional("2026-06-25", "17:00", courts[2].id, "Ivan Benitez", "pending", false),
    lpCancellation("2026-06-25", "19:00", courts[1].id, "Rodrigo Luna", "Lesion de un jugador", false),
    lpOccasional("2026-06-25", "23:00", courts[2].id, "Diego Morales", "pending", false),
    lpOccasional("2026-06-26", "16:00", courts[2].id, "Ezequiel Navarro", "pending", false),
    lpOccasional("2026-06-27", "18:00", courts[0].id, "Facundo Romero", "pending", false),
    lpOccasional("2026-06-27", "20:00", courts[0].id, "Nicolas Ferreyra", "pending", false),
    lpOccasional("2026-06-27", "21:00", courts[1].id, "Mariano Ibarra", "pending", false),
    lpOccasional("2026-06-27", "22:00", courts[2].id, "Diego Peralta", "pending", false),
    lpOccasional("2026-06-29", "20:00", courts[2].id, "Santiago Robles", "pending", false),
    lpOccasional("2026-06-29", "19:00", courts[2].id, "Franco Acuna", "pending", false),
    lpOccasional("2026-06-29", "23:00", courts[2].id, "Lucas Barrios", "pending", false)
  ];
}

function lpOccasional(date: string, time: string, courtId: string, customerName: string, status: Reservation["status"], paid: boolean, notes = ""): Reservation {
  const promo = time === "16:00" || time === "17:00";
  return {
    id: stableId("lp-reservation", date, time, courtId, customerName),
    date,
    time,
    courtId,
    type: "occasional",
    customerName,
    customerPhone: phoneForCustomer(customerName),
    price: promo ? 25000 : 50000,
    status,
    notes: promo ? [notes, "Promo 50% off horario valle"].filter(Boolean).join(". ") : notes,
    durationMinutes: 60,
    paid,
    paidAt: paid ? new Date(`${date}T${time}:00`).toISOString() : undefined,
    confirmedDates: status === "confirmed" ? [date] : undefined,
    paidDates: paid ? [date] : undefined,
    createdAt: new Date().toISOString()
  };
}

function lpCancellation(date: string, time: string, courtId: string, customerName: string, reason: string, lastMinute: boolean): Reservation {
  const cancelledAt = new Date(`${date}T${time}:00`);
  cancelledAt.setHours(cancelledAt.getHours() - (date > LP_SPORTS_DEMO_CUTOFF_DATE ? 24 : 5));
  return {
    id: stableId("lp-cancellation", date, time, courtId, reason),
    date,
    time,
    courtId,
    type: "occasional",
    customerName,
    customerPhone: phoneForCustomer(customerName),
    price: time === "16:00" || time === "17:00" ? 25000 : 50000,
    status: "cancelled",
    notes: reason,
    durationMinutes: 60,
    cancellationReason: reason,
    cancellationLastMinute: lastMinute,
    cancelledAt: cancelledAt.toISOString(),
    paid: false,
    createdAt: new Date().toISOString()
  };
}

function createDemoNorteState(currentState?: Partial<AppState> | null): AppState {
  const previousWeekStart = startOfWeek(new Date("2026-06-08T12:00:00"));
  const currentWeekStart = startOfWeek(new Date("2026-06-15T12:00:00"));
  const courts = demoNorteCourts(currentState);
  const existingReservations = currentState?.reservations ?? [];
  const baseReservations = existingReservations.length ? existingReservations : [
    ...demoNorteLegacyFixedTurns(previousWeekStart, courts),
    ...demoNorteLegacyOccasionalReservations(previousWeekStart, courts)
  ];
  const currentWeekReservations = [
    ...demoNorteFixedTurns(currentWeekStart, courts),
    ...demoNorteOccasionalReservations(currentWeekStart, courts)
  ];
  const reservations = dedupeDemoNorteReservations(mergeDemoReservations(baseReservations, currentWeekReservations), courts);
  const resaleSlotId = `${toInputDate(addDays(currentWeekStart, 5))}-${courts[1].id}-20:00`;
  const hasResaleCancellation = reservations.some((reservation) =>
    reservation.date === DEMO_NORTE_RESALE_DATE &&
    reservation.courtId === courts[1].id &&
    reservation.time === DEMO_NORTE_RESALE_TIME &&
    reservation.status === "cancelled"
  );

  return {
    complex: {
      id: currentState?.complex?.id || "complex-demo-norte",
      name: currentState?.complex?.name || "Complejo Demo Norte",
      address: currentState?.complex?.address || "Calle 10 e/ 40 y 41",
      phone: currentState?.complex?.phone || "2215550000",
      responsibleName: currentState?.complex?.responsibleName || "Encargado Demo Norte",
      configuredByRole: currentState?.complex?.configuredByRole || "owner"
    },
    courts,
    settings: {
      ...(currentState?.settings ?? defaultSettings),
      basePrice: 35000,
      valleyPrice: 35000,
      weekendPrice: 35000,
      openHour: "17:00",
      closeHour: "00:00",
      slotDuration: 60,
      confirmationLeadHours: 0,
      openDays: [1, 2, 3, 4, 5, 6, 0],
      valleyRanges: []
    },
    costs: currentState?.costs ?? {
      electricity: 180000,
      gas: 35000,
      water: 42000,
      salaries: 920000,
      rent: 0,
      taxes: 95000,
      maintenance: 85000,
      other: 45000
    },
    reservations,
    publicSlotIds: hasResaleCancellation ? uniqueValues([...(currentState?.publicSlotIds ?? []), resaleSlotId]) : (currentState?.publicSlotIds ?? []),
    validationRecords: []
  };
}

function createGenericOperationalDemoState(currentState?: Partial<AppState> | null): AppState {
  const genericState = createDemoNorteState(currentState);
  return {
    ...genericState,
    complex: {
      ...genericState.complex,
      id: currentState?.complex?.id || genericState.complex.id,
      name: currentState?.complex?.name || "Complejo demo",
      address: currentState?.complex?.address || "",
      phone: currentState?.complex?.phone || ""
    }
  };
}

function demoNorteCourts(currentState?: Partial<AppState> | null): Court[] {
  const defaults: Court[] = [
    {
      id: "demo-norte-court-1",
      name: "Cancha 1 - Futbol 5",
      type: "futbol5",
      active: true,
      openHour: "17:00",
      closeHour: "00:00",
      slotStepMinutes: 60,
      price: 35000
    },
    {
      id: "demo-norte-court-2",
      name: "Cancha 2 - Futbol 5",
      type: "futbol5",
      active: true,
      openHour: "17:00",
      closeHour: "00:00",
      slotStepMinutes: 60,
      price: 35000
    }
  ];

  const existing = currentState?.courts?.filter((court) => court.active) ?? [];
  const baseCourts = existing.length >= 2 ? existing.slice(0, 2) : defaults;
  return baseCourts.map((court, index) => ({
    ...court,
    id: court.id || defaults[index].id,
    name: index === 0 ? "Cancha 1 - Futbol 5" : "Cancha 2 - Futbol 5",
    type: "futbol5",
    active: true,
    openHour: "17:00",
    closeHour: "00:00",
    slotStepMinutes: 60,
    price: 35000
  }));
}

function demoNorteLegacyFixedTurns(weekStart: Date, courts: Court[]) {
  return [
    demoReservation(weekStart, 1, "20:00", courts[0].id, "Los Martes FC", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 2, "21:00", courts[1].id, "Equipo Norte", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 3, "19:00", courts[0].id, "Veteranos del Parque", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 4, "22:00", courts[1].id, "La 10 Futbol", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 6, "18:00", courts[0].id, "Grupo Los Pibes", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 5, "18:00", courts[0].id, "Los Martes FC", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 4, "20:00", courts[0].id, "Equipo Norte", "fixed", 35000, "confirmed"),
    demoReservation(weekStart, 6, "19:00", courts[1].id, "Veteranos del Parque", "fixed", 35000, "confirmed")
  ];
}

function demoNorteLegacyOccasionalReservations(weekStart: Date, courts: Court[]) {
  return [
    demoReservation(weekStart, 0, "18:00", courts[0].id, "Lucas Medina", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 0, "19:00", courts[1].id, "Federico Ruiz", "occasional", 35000, "pending"),
    demoReservation(weekStart, 0, "21:00", courts[0].id, "Nicolas Herrera", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 1, "18:00", courts[1].id, "Bruno Castillo", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 1, "21:00", courts[0].id, "Matias Rios", "occasional", 35000, "pending"),
    demoReservation(weekStart, 1, "22:00", courts[1].id, "Juan Pablo Gomez", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 2, "18:00", courts[0].id, "Agustin Salas", "occasional", 35000, "pending"),
    demoReservation(weekStart, 2, "20:00", courts[1].id, "Tomas Cabrera", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 3, "20:00", courts[0].id, "Franco Molina", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 3, "22:00", courts[1].id, "Martin Acosta", "occasional", 35000, "pending"),
    demoReservation(weekStart, 4, "21:00", courts[0].id, "Lautaro Perez", "occasional", 35000, "pending"),
    demoReservation(weekStart, 5, "19:00", courts[0].id, "Santiago Ferreyra", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 5, "20:00", courts[1].id, "Ivan Benitez", "occasional", 35000, "cancelled", "El cliente aviso que no llega a completar equipo", true, 6),
    demoReservation(weekStart, 5, "21:00", courts[1].id, "Rodrigo Luna", "occasional", 35000, "confirmed"),
    demoReservation(weekStart, 6, "17:00", courts[1].id, "Andres Correa", "occasional", 35000, "pending"),
    demoReservation(weekStart, 6, "20:00", courts[0].id, "Diego Morales", "occasional", 35000, "confirmed")
  ];
}

function demoNorteFixedTurns(weekStart: Date, courts: Court[]) {
  return [
    demoNorteFixedReservation(weekStart, 0, "17:00", courts[0].id, "Los del Fondo", true, true),
    demoNorteFixedReservation(weekStart, 0, "18:00", courts[1].id, "Barrio Norte", true, true),
    demoNorteFixedReservation(weekStart, 0, "21:00", courts[0].id, "Deportivo 10", true, true),
    demoNorteFixedReservation(weekStart, 1, "20:00", courts[0].id, "Los Martes FC", false, false),
    demoNorteFixedReservation(weekStart, 1, "18:00", courts[1].id, "Fulbito Amigos", false, false),
    demoNorteFixedReservation(weekStart, 1, "22:00", courts[1].id, "La 22 FC", false, false),
    demoNorteFixedReservation(weekStart, 2, "21:00", courts[1].id, "Equipo Norte", false, false),
    demoNorteFixedReservation(weekStart, 2, "18:00", courts[0].id, "La Banda del Miercoles", false, false),
    demoNorteFixedReservation(weekStart, 2, "20:00", courts[0].id, "Barrio Norte", false, false),
    demoNorteFixedReservation(weekStart, 3, "19:00", courts[0].id, "Veteranos del Parque", false, false),
    demoNorteFixedReservation(weekStart, 3, "18:00", courts[1].id, "Deportivo 10", false, false),
    demoNorteFixedReservation(weekStart, 3, "21:00", courts[1].id, "Fulbito Amigos", false, false),
    demoNorteFixedReservation(weekStart, 3, "22:00", courts[0].id, "Viejos Crack", false, false),
    demoNorteFixedReservation(weekStart, 4, "22:00", courts[1].id, "La 10 Futbol", false, false),
    demoNorteFixedReservation(weekStart, 4, "20:00", courts[0].id, "Equipo Norte", false, false),
    demoNorteFixedReservation(weekStart, 4, "17:00", courts[1].id, "La 22 FC", false, false),
    demoNorteFixedReservation(weekStart, 5, "18:00", courts[0].id, "Los Martes FC", false, false),
    demoNorteFixedReservation(weekStart, 5, "19:00", courts[1].id, "La Banda del Miercoles", false, false),
    demoNorteFixedReservation(weekStart, 5, "21:00", courts[0].id, "Los del Fondo", false, false),
    demoNorteFixedReservation(weekStart, 5, "23:00", courts[1].id, "Viejos Crack", false, false),
    demoNorteFixedReservation(weekStart, 6, "18:00", courts[0].id, "Grupo Los Pibes", false, false),
    demoNorteFixedReservation(weekStart, 6, "19:00", courts[1].id, "Veteranos del Parque", false, false),
    demoNorteFixedReservation(weekStart, 6, "20:00", courts[0].id, "Barrio Norte", false, false),
    demoNorteFixedReservation(weekStart, 6, "21:00", courts[1].id, "La 22 FC", false, false)
  ];
}

function demoNorteOccasionalReservations(weekStart: Date, courts: Court[]) {
  return [
    demoNorteOccasionalReservation(weekStart, 0, "19:00", courts[0].id, "Lucas Medina", "confirmed", true),
    demoNorteOccasionalReservation(weekStart, 0, "17:00", courts[1].id, "Federico Ruiz", "pending"),
    demoNorteOccasionalReservation(weekStart, 0, "20:00", courts[1].id, "Nicolas Herrera", "confirmed", true),
    demoNorteOccasionalReservation(weekStart, 1, "18:00", courts[0].id, "Bruno Castillo", "pending"),
    demoNorteOccasionalReservation(weekStart, 1, "21:00", courts[1].id, "Matias Rios", "pending"),
    demoNorteOccasionalReservation(weekStart, 2, "18:00", courts[1].id, "Juan Pablo Gomez", "pending"),
    demoNorteOccasionalReservation(weekStart, 2, "22:00", courts[0].id, "Agustin Salas", "pending"),
    demoNorteOccasionalReservation(weekStart, 3, "19:00", courts[1].id, "Tomas Cabrera", "pending"),
    demoNorteOccasionalReservation(weekStart, 3, "20:00", courts[0].id, "Franco Molina", "pending"),
    demoNorteOccasionalReservation(weekStart, 4, "18:00", courts[0].id, "Martin Acosta", "pending"),
    demoNorteOccasionalReservation(weekStart, 4, "20:00", courts[1].id, "Lautaro Perez", "pending"),
    demoNorteOccasionalReservation(weekStart, 4, "22:00", courts[0].id, "Santiago Ferreyra", "pending"),
    demoNorteOccasionalReservation(weekStart, 5, "17:00", courts[0].id, "Ivan Benitez", "pending"),
    demoNorteOccasionalReservation(weekStart, 5, "20:00", courts[1].id, "Rodrigo Luna", "cancelled", false, DEMO_NORTE_RESALE_REASON, 6),
    demoNorteOccasionalReservation(weekStart, 5, "22:00", courts[0].id, "Andres Correa", "pending"),
    demoNorteOccasionalReservation(weekStart, 6, "17:00", courts[1].id, "Ezequiel Navarro", "pending"),
    demoNorteOccasionalReservation(weekStart, 6, "19:00", courts[0].id, "Facundo Romero", "pending"),
    demoNorteOccasionalReservation(weekStart, 6, "22:00", courts[1].id, "Diego Morales", "pending")
  ];
}

function demoNorteFixedReservation(weekStart: Date, dayOffset: number, time: string, courtId: string, customerName: string, confirmed: boolean, paid: boolean) {
  const reservation = demoReservation(weekStart, dayOffset, time, courtId, customerName, "fixed", 35000, "confirmed");
  const date = toInputDate(addDays(weekStart, dayOffset));
  return {
    ...reservation,
    confirmedDates: confirmed ? uniqueValues([...(reservation.confirmedDates ?? []), date]) : (reservation.confirmedDates ?? []).filter((confirmedDate) => confirmedDate !== date),
    paidDates: paid ? uniqueValues([...(reservation.paidDates ?? []), date]) : (reservation.paidDates ?? []).filter((paidDate) => paidDate !== date)
  };
}

function demoNorteOccasionalReservation(
  weekStart: Date,
  dayOffset: number,
  time: string,
  courtId: string,
  customerName: string,
  status: Reservation["status"],
  paid = false,
  notes = "",
  cancellationHoursBefore = 24
) {
  const reservation = demoReservation(weekStart, dayOffset, time, courtId, customerName, "occasional", 35000, status, notes, status === "cancelled", cancellationHoursBefore);
  const date = toInputDate(addDays(weekStart, dayOffset));
  const paidAt = paid ? new Date(`${date}T${time}:00`).toISOString() : undefined;
  return {
    ...reservation,
    id: demoNorteReservationId(date, time, courtId, customerName, status),
    status,
    cancellationReason: status === "cancelled" ? notes : "",
    cancelledAt: status === "cancelled" ? reservation.cancelledAt : undefined,
    paid,
    paidAt,
    paidDates: paid ? [date] : undefined
  };
}

function dedupeDemoNorteReservations(reservations: Reservation[], courts: Court[]): Reservation[] {
  const demoCancellations = reservations.filter((reservation) => isDemoNorteResaleCancellation(reservation));
  if (demoCancellations.length === 0) return reservations;

  const canonical = normalizeDemoNorteResaleCancellation(demoCancellations[demoCancellations.length - 1], courts);
  return [
    ...reservations.filter((reservation) => !isDemoNorteResaleCancellation(reservation)),
    canonical
  ];
}

function isDemoNorteResaleCancellation(reservation: Reservation) {
  return reservation.date === DEMO_NORTE_RESALE_DATE &&
    reservation.time === DEMO_NORTE_RESALE_TIME &&
    reservation.status === "cancelled" &&
    reservation.price === 35000 &&
    (reservation.cancellationReason === DEMO_NORTE_RESALE_REASON || reservation.notes === DEMO_NORTE_RESALE_REASON);
}

function normalizeDemoNorteResaleCancellation(reservation: Reservation, courts: Court[]): Reservation {
  const cancelledAt = new Date(`${DEMO_NORTE_RESALE_DATE}T${DEMO_NORTE_RESALE_TIME}:00`);
  cancelledAt.setHours(cancelledAt.getHours() - 6);

  return {
    ...reservation,
    id: `demo-norte-cancellation-${DEMO_NORTE_RESALE_DATE}-${DEMO_NORTE_RESALE_TIME.replace(":", "")}-${courts[1].id}`,
    courtId: courts[1].id,
    customerName: "Rodrigo Luna",
    customerPhone: phoneForCustomer("Rodrigo Luna"),
    date: DEMO_NORTE_RESALE_DATE,
    time: DEMO_NORTE_RESALE_TIME,
    type: "occasional" as const,
    status: "cancelled" as const,
    price: 35000,
    durationMinutes: 60,
    notes: DEMO_NORTE_RESALE_REASON,
    cancellationReason: DEMO_NORTE_RESALE_REASON,
    cancellationLastMinute: true,
    cancelledAt: cancelledAt.toISOString(),
    confirmedDates: undefined,
    paidDates: undefined,
    paid: false,
    paidAt: undefined
  };
}

function demoNorteReservationId(date: string, time: string, courtId: string, customerName: string, status: Reservation["status"]) {
  if (date === DEMO_NORTE_RESALE_DATE && time === DEMO_NORTE_RESALE_TIME && status === "cancelled") {
    return `demo-norte-cancellation-${date}-${time.replace(":", "")}-${courtId}`;
  }
  return `demo-norte-${date}-${time.replace(":", "")}-${courtId}-${customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function mergeDemoReservations(existingReservations: Reservation[], demoReservations: Reservation[]) {
  return demoReservations.reduce<Reservation[]>((result, demoReservationItem) => {
    const conflictIndex = result.findIndex((existingReservation) => reservationOccupiesSlot(existingReservation, demoReservationItem.date, demoReservationItem.time, demoReservationItem.courtId));
    if (conflictIndex === -1) return [...result, demoReservationItem];

    const existingReservation = result[conflictIndex];
    const enrichedReservation = enrichRecurringReservation(existingReservation, demoReservationItem);
    if (enrichedReservation === existingReservation && existingReservation.customerName === demoReservationItem.customerName && existingReservation.type === demoReservationItem.type) {
      const next = [...result];
      next[conflictIndex] = { ...demoReservationItem, id: existingReservation.id, createdAt: existingReservation.createdAt };
      return next;
    }
    if (enrichedReservation === existingReservation) return result;

    const next = [...result];
    next[conflictIndex] = enrichedReservation;
    return next;
  }, [...existingReservations]);
}

function enrichRecurringReservation(existingReservation: Reservation, demoReservationItem: Reservation) {
  if (existingReservation.type !== "fixed") return existingReservation;
  if (!reservationOccupiesSlot(existingReservation, demoReservationItem.date, demoReservationItem.time, demoReservationItem.courtId)) return existingReservation;

  return {
    ...existingReservation,
    confirmedDates: demoReservationItem.confirmedDates?.includes(demoReservationItem.date)
      ? uniqueValues([...(existingReservation.confirmedDates ?? []), demoReservationItem.date])
      : (existingReservation.confirmedDates ?? []).filter((confirmedDate) => confirmedDate !== demoReservationItem.date),
    paidDates: demoReservationItem.paidDates?.includes(demoReservationItem.date)
      ? uniqueValues([...(existingReservation.paidDates ?? []), demoReservationItem.date])
      : (existingReservation.paidDates ?? []).filter((paidDate) => paidDate !== demoReservationItem.date)
  };
}

function reservationOccupiesSlot(reservation: Reservation, date: string, time: string, courtId: string) {
  if (reservation.courtId !== courtId || reservation.time !== time) return false;
  if (reservation.status === "cancelled") return false;
  if (reservation.type !== "fixed") return reservation.date === date;

  const base = new Date(`${reservation.date}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  if (target < base) return false;
  if (reservation.seriesEndDate && date > reservation.seriesEndDate) return false;
  if (reservation.cancelledDates?.includes(date)) return false;
  return base.getDay() === target.getDay();
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

function schoolBlocks(weekStart: Date, courts: Court[]) {
  return [1, 3].flatMap((dayOffset) =>
    courts.flatMap((court) =>
      ["17:00", "18:00"].map((time) =>
        demoReservation(weekStart, dayOffset, time, court.id, "Escuelita Ottantuno", "fixed", 0, "confirmed", "Bloqueo recurrente de escuelita de futbol")
      )
    )
  );
}

function weeklyFixedTurns(weekStart: Date, courts: Court[]) {
  return [
    demoReservation(weekStart, 0, "20:00", courts[0].id, "Javier Almiron", "fixed", 45000, "confirmed"),
    demoReservation(weekStart, 1, "20:00", courts[1].id, "La 46 FC", "fixed", 45000, "confirmed"),
    demoReservation(weekStart, 2, "21:00", courts[0].id, "Federico Ledesma", "fixed", 45000, "confirmed"),
    demoReservation(weekStart, 4, "20:00", courts[1].id, "Veteranos 45", "fixed", 45000, "confirmed"),
    demoReservation(weekStart, 4, "22:00", courts[0].id, "Nicolas Benitez", "fixed", 45000, "confirmed")
  ];
}

function weekendReservations(weekStart: Date, courts: Court[]) {
  return [
    demoReservation(weekStart, 5, "17:00", courts[0].id, "Martin Duarte", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "18:00", courts[0].id, "Rodrigo Sosa", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "19:00", courts[0].id, "Tomas Galarza", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "20:00", courts[0].id, "Sebastian Pereyra", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "21:00", courts[0].id, "Leandro Correa", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "22:00", courts[0].id, "Matias Barreto", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "17:00", courts[1].id, "Agustin Ferreyra", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "18:00", courts[1].id, "Juan Ignacio Roldan", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "19:00", courts[1].id, "Franco Medina", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "20:00", courts[1].id, "Pablo Echeverria", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "21:00", courts[1].id, "Emiliano Castro", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 5, "23:00", courts[1].id, "Santiago Villar", "occasional", 45000, "confirmed"),

    demoReservation(weekStart, 6, "17:00", courts[0].id, "Lautaro Gomez", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "18:00", courts[0].id, "Andres Molina", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "19:00", courts[0].id, "Bruno Sampedro", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "20:00", courts[0].id, "Facundo Miranda", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "21:00", courts[0].id, "Gaston Arce", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "22:00", courts[0].id, "Ignacio Herrera", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "17:00", courts[1].id, "Julian Costa", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "18:00", courts[1].id, "Manuel Quiroga", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "19:00", courts[1].id, "Patricio Silva", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "20:00", courts[1].id, "Grupo de Joaquin", "occasional", 45000, "cancelled", "Cancelan por mal clima", true, 8),
    demoReservation(weekStart, 6, "21:00", courts[1].id, "Rafael Mendez", "occasional", 45000, "confirmed"),
    demoReservation(weekStart, 6, "23:00", courts[1].id, "Diego Farias", "occasional", 45000, "confirmed")
  ];
}

function nextWeekOccasionalReservations(weekStart: Date, courts: Court[]) {
  return [
    demoReservation(weekStart, 7, "19:00", courts[0].id, "Alan Peralta", "occasional", 45000, "pending"),
    demoReservation(weekStart, 8, "21:00", courts[0].id, "Cristian Acosta", "occasional", 45000, "pending"),
    demoReservation(weekStart, 9, "19:00", courts[1].id, "Ezequiel Ponce", "occasional", 45000, "pending"),
    demoReservation(weekStart, 10, "22:00", courts[1].id, "Hernan Bustos", "occasional", 45000, "pending"),
    demoReservation(weekStart, 11, "19:00", courts[0].id, "Marcos Cabrera", "occasional", 45000, "pending"),
    demoReservation(weekStart, 11, "21:00", courts[1].id, "Luciano Vega", "occasional", 45000, "pending")
  ];
}

function nextWeekendResaleCase(weekStart: Date, courts: Court[]) {
  return [
    demoReservation(weekStart, 12, "17:00", courts[0].id, "Ramiro Villalba", "occasional", 45000, "pending"),
    demoReservation(weekStart, 12, "18:00", courts[0].id, "Maximiliano Torres", "occasional", 45000, "pending"),
    demoReservation(weekStart, 12, "19:00", courts[1].id, "Gabriel Nunez", "occasional", 45000, "pending"),
    demoReservation(weekStart, 12, "21:00", courts[1].id, "Nestor Aguirre", "occasional", 45000, "pending"),
    demoReservation(weekStart, 13, "18:00", courts[0].id, "Ariel Dominguez", "occasional", 45000, "pending"),
    demoReservation(weekStart, 13, "19:00", courts[1].id, "Lucas Morel", "occasional", 45000, "pending"),
    demoReservation(weekStart, 13, "21:00", courts[0].id, "Dario Campos", "occasional", 45000, "pending")
  ];
}

export function createEmptyInitialState(): AppState {
  return {
    complex: {
      id: generateId("complex"),
      name: "",
      address: "",
      phone: ""
    },
    courts: [],
    settings: {
      basePrice: 0,
      valleyPrice: 0,
      weekendPrice: 0,
      openHour: "18:00",
      closeHour: "00:00",
      slotDuration: 60,
      confirmationLeadHours: 0,
      openDays: [1, 2, 3, 4, 5, 6, 0],
      valleyRanges: []
    },
    costs: {
      electricity: 0,
      gas: 0,
      water: 0,
      salaries: 0,
      rent: 0,
      taxes: 0,
      maintenance: 0,
      other: 0
    },
    reservations: [],
    publicSlotIds: [],
    validationRecords: []
  };
}

export function hasInitialConfiguration(state: Partial<AppState> | null | undefined) {
  return Boolean(state?.complex?.name?.trim() && state.courts?.length && state.settings?.basePrice);
}

function demoReservation(
  weekStart: Date,
  dayOffset: number,
  time: string,
  courtId: string,
  customerName: string,
  type: Reservation["type"],
  price: number,
  status: Reservation["status"],
  notes = "",
  cancellationLastMinute = false,
  cancellationHoursBefore = 24
): Reservation {
  const date = toInputDate(addDays(weekStart, dayOffset));
  const now = new Date();
  const turn = new Date(`${date}T${time}:00`);
  const withinConfirmationWindow = turn.getTime() <= now.getTime() + defaultSettings.confirmationLeadHours * 60 * 60 * 1000;
  const managedWeekendTurn = type === "occasional" && (dayOffset === 5 || dayOffset === 6);
  const effectiveStatus = type === "fixed" || (status === "confirmed" && !withinConfirmationWindow && !managedWeekendTurn) ? "pending" : status;
  const paid = type === "occasional" && effectiveStatus === "confirmed" && (turn < now || managedWeekendTurn);
  const confirmedDates = status === "confirmed" && (type === "fixed" || managedWeekendTurn) ? [date] : undefined;
  const paidDates = type === "fixed" && status === "confirmed" && price > 0 ? [date] : undefined;

  return {
    id: generateId("reservation"),
    date,
    time,
    courtId,
    type,
    customerName,
    customerPhone: phoneForCustomer(customerName),
    price,
    status: effectiveStatus,
    notes,
    durationMinutes: 60,
    cancellationReason: effectiveStatus === "cancelled" ? notes : "",
    cancellationLastMinute,
    cancelledAt: effectiveStatus === "cancelled" ? new Date(turn.getTime() - cancellationHoursBefore * 60 * 60 * 1000).toISOString() : undefined,
    confirmedDates,
    paidDates,
    paid,
    paidAt: paid ? turn.toISOString() : undefined,
    createdAt: new Date().toISOString()
  };
}

function createValidationRecords(): ValidationRecord[] {
  return [
    {
      id: generateId("validation"),
      complexName: "Ottantuno",
      courtsCount: 2,
      currentMethod: "WhatsApp y agenda manual",
      weeklyCancellations: 2,
      unsoldTurnsPerWeek: 5,
      averageTurnPrice: 45000,
      staffLoadedWithoutHelp: true,
      ownerUnderstoodDashboard: true,
      willingnessToPay: "free_trial",
      willingnessAmount: 0,
      comments: "El encargado valoro poder ver rapidamente la agenda semanal de Ottantuno.",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId("validation"),
      complexName: "Ottantuno",
      courtsCount: 2,
      currentMethod: "WhatsApp y consulta directa",
      weeklyCancellations: 2,
      unsoldTurnsPerWeek: 4,
      averageTurnPrice: 45000,
      staffLoadedWithoutHelp: true,
      ownerUnderstoodDashboard: true,
      willingnessToPay: "pay_if_recovers",
      willingnessAmount: 0,
      comments: "La cancelacion del domingo por mal clima en la cancha abierta permitio probar la logica de reventa.",
      createdAt: new Date().toISOString()
    },
    {
      id: generateId("validation"),
      complexName: "Ottantuno",
      courtsCount: 2,
      currentMethod: "Agenda y mensajes manuales",
      weeklyCancellations: 1,
      unsoldTurnsPerWeek: 6,
      averageTurnPrice: 45000,
      staffLoadedWithoutHelp: false,
      ownerUnderstoodDashboard: true,
      willingnessToPay: "free_trial",
      willingnessAmount: 0,
      comments: "Se observo que la carga inicial debe ser simple para no frenar la adopcion.",
      createdAt: new Date().toISOString()
    }
  ];
}

function phoneForCustomer(customerName: string) {
  const phones: Record<string, string> = {
    "Ottantuno": "2216652449",
    "Escuelita Ottantuno": "2216652449",
    "Javier Almiron": "2215748392",
    "La 46 FC": "2216129087",
    "Federico Ledesma": "2214987365",
    "Veteranos 45": "2213057814",
    "Nicolas Benitez": "2216874309",
    "Martin Duarte": "2215902168",
    "Rodrigo Sosa": "2214478921",
    "Tomas Galarza": "2216317540",
    "Sebastian Pereyra": "2213569082",
    "Leandro Correa": "2217045836",
    "Matias Barreto": "2215196704",
    "Agustin Ferreyra": "2216839157",
    "Juan Ignacio Roldan": "2214387690",
    "Franco Medina": "2216028451",
    "Pablo Echeverria": "2213957064",
    "Emiliano Castro": "2217182635",
    "Santiago Villar": "2215429086",
    "Lautaro Gomez": "2214763518",
    "Andres Molina": "2216294073",
    "Bruno Sampedro": "2213847196",
    "Facundo Miranda": "2216958302",
    "Gaston Arce": "2215179468",
    "Ignacio Herrera": "2217425609",
    "Julian Costa": "2214691835",
    "Manuel Quiroga": "2215830274",
    "Patricio Silva": "2217064918",
    "Grupo de Joaquin": "2216507824",
    "Rafael Mendez": "2214286097",
    "Diego Farias": "2215718360",
    "Alan Peralta": "2213095748",
    "Cristian Acosta": "2216842071",
    "Ezequiel Ponce": "2214538926",
    "Hernan Bustos": "2217906143",
    "Marcos Cabrera": "2215268309",
    "Luciano Vega": "2213479652",
    "Ramiro Villalba": "2216127405",
    "Maximiliano Torres": "2214892361",
    "Gabriel Nunez": "2217350946",
    "Nestor Aguirre": "2215604187",
    "Ariel Dominguez": "2214037859",
    "Lucas Morel": "2216985120",
    "Dario Campos": "2215143708",
    "La 22 FC": "2216124598",
    "Barrio Norte": "2214773059",
    "Los del Fondo": "2216932840",
    "La 10 Futbol": "2215489026",
    "Equipo Norte": "2217395164",
    "Deportivo 46": "2214608732",
    "Amigos del Parque": "2216812409",
    "Viejos Crack": "2215927041",
    "Fulbito 81": "2217340968",
    "Los Profes": "2214861275",
    "Camilo Fuentes": "2216128394",
    "Benjamin Aguirre": "2215714096",
    "Ramon Villalba": "2216439802",
    "Emiliano Torres": "2215087349",
    "Ramiro Suarez": "2216993218",
    "Joaquin Vera": "2214217605",
    "Pedro Gimenez": "2217862401",
    "Damian Amaya": "2214589736",
    "Mateo Silva": "2215379128",
    "Gonzalo Arias": "2216043857",
    "Los Martes FC": "2215551001",
    "Veteranos del Parque": "2215551003",
    "Grupo Los Pibes": "2215551005",
    "Deportivo 10": "2215551006",
    "Fulbito Amigos": "2215551007",
    "La Banda del Miercoles": "2215551008",
    "Lucas Medina": "2215551011",
    "Federico Ruiz": "2215551012",
    "Nicolas Herrera": "2215551013",
    "Bruno Castillo": "2215551014",
    "Matias Rios": "2215551015",
    "Juan Pablo Gomez": "2215551016",
    "Agustin Salas": "2215551017",
    "Tomas Cabrera": "2215551018",
    "Franco Molina": "2215551019",
    "Martin Acosta": "2215551020",
    "Lautaro Perez": "2215551021",
    "Santiago Ferreyra": "2215551022",
    "Ivan Benitez": "2215551023",
    "Rodrigo Luna": "2215551024",
    "Andres Correa": "2215551025",
    "Diego Morales": "2215551026",
    "Ezequiel Navarro": "2215551027",
    "Facundo Romero": "2215551028",
    "Diego Peralta": "2215551042",
    "Nicolas Ferreyra": "2215551029",
    "Santiago Robles": "2215551031",
    "Franco Acuna": "2215551033",
    "Matias Godoy": "2215551034",
    "Ignacio Salvatierra": "2215551037",
    "Mariano Ibarra": "2215551030",
    "Federico Molina": "2215551032",
    "Lucas Barrios": "2215551035",
    "Emiliano Paredes": "2215551036",
    "LP Sports": "2214915875",
    "Escuelita LP Sports": "2214915875",
    "Academia LP Sports": "2214915875",
    "Torneo Senior": "2214915875",
    "Torneo Libre": "2214915875",
    "Torneo Femenino": "2214915875",
    "Los Pibes de 188": "2215551073",
    "Viejos Crack LP": "2215551074",
    "La Banda de Melchor": "2215551075",
    "La 519 FC": "2215551076",
    "Deportivo Abasto": "2215551077",
    "Veteranos LP": "2215551078",
    "Los Profes LP": "2215551079",
    "La Noche FC": "2215551080",
    "Fulbito 188": "2215551081",
    "Equipo La Granja": "2215551082",
    "Tomas Aguirre": "2215551043",
    "Lautaro Rivas": "2215551044",
    "Santiago Duarte": "2215551045",
    "Federico Casas": "2215551046",
    "Nicolas Molina": "2215551047",
    "Matias Robledo": "2215551048",
    "Joaquin Leiva": "2215551049",
    "Bruno Herrera": "2215551050",
    "Ivan Sosa": "2215551051",
    "Diego Altamirano": "2215551052",
    "Lucas Caceres": "2215551053",
    "Mariano Silva": "2215551054",
    "Gonzalo Ruiz": "2215551055",
    "Grupo Los Viernes": "2215551056",
    "Agustin Peralta": "2215551057",
    "Alan Fernandez": "2215551058",
    "Juan Cruz Castro": "2215551059",
    "Sebastian Gomez": "2215551060",
    "Emiliano Vargas": "2215551061",
    "Rodrigo Salas": "2215551062",
    "Los Sabados de 20": "2215551063",
    "Martin Quiroga": "2215551064",
    "Leandro Godoy": "2215551065",
    "Facundo Arias": "2215551066",
    "Ignacio Varela": "2215551067",
    "Julian Morales": "2215551068",
    "Nicolas Paredes": "2215551069",
    "Los Jueves LP": "2215551070",
    "Equipo de Gonnet": "2215551071",
    "Equipo Norte LP": "2215551072"
  };
  return phones[customerName] ?? "2216652449";
}
