import type { AppState, Court, FixedCosts, Reservation, Settings, ValidationRecord } from "@/lib/types";
import { addDays, generateId, startOfWeek, toInputDate } from "@/lib/utils";

export const storageKey = "canchapro-next-mvp-state-v1";
const OTTANTUNO_COMPLEX_ID = "069ab75d-b488-4f2a-ba27-d2540643a912";
const DEMO_NORTE_COMPLEX_ID = "6610a6f9-d586-4b00-a8d5-c8ddae585f8b";
const DEMO_NORTE_RESALE_DATE = "2026-06-20";
const DEMO_NORTE_RESALE_TIME = "20:00";
const DEMO_NORTE_RESALE_REASON = "El cliente aviso que no llega a completar equipo";

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
  const courts: Court[] = [
    {
      id: "court-1",
      name: "Cancha 1 - Futbol 5 techada",
      type: "futbol5",
      roofed: true,
      active: true,
      openHour: "17:00",
      closeHour: "00:00",
      slotStepMinutes: 60
    },
    {
      id: "court-2",
      name: "Cancha 2 - Futbol 5 abierta",
      type: "futbol5",
      roofed: false,
      active: true,
      openHour: "17:00",
      closeHour: "00:00",
      slotStepMinutes: 60
    }
  ];

  const reservations = [
    ...schoolBlocks(weekStart, courts),
    ...weeklyFixedTurns(weekStart, courts),
    ...weekendReservations(weekStart, courts),
    ...nextWeekOccasionalReservations(weekStart, courts),
    ...nextWeekendResaleCase(weekStart, courts)
  ];

  return {
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
    publicSlotIds: [
      `${toInputDate(addDays(weekStart, 6))}-${courts[1].id}-20:00`
    ],
    validationRecords: createValidationRecords()
  };
}

export function createDemoStateForComplex(complexId?: string, currentState?: Partial<AppState> | null): AppState {
  const complexName = currentState?.complex?.name?.toLowerCase() ?? "";
  if (complexId === OTTANTUNO_COMPLEX_ID) return createDefaultState();
  if (complexId === DEMO_NORTE_COMPLEX_ID) return createDemoNorteState(currentState);
  if (complexName.includes("demo norte")) return createDemoNorteState(currentState);
  if (complexName.includes("ottantuno") || !complexId) return createDefaultState();
  return createGenericOperationalDemoState(currentState);
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
    "Los Martes FC": "2215551001",
    "Equipo Norte": "2215551002",
    "Veteranos del Parque": "2215551003",
    "La 10 Futbol": "2215551004",
    "Grupo Los Pibes": "2215551005",
    "Deportivo 10": "2215551006",
    "Fulbito Amigos": "2215551007",
    "La Banda del Miercoles": "2215551008",
    "Viejos Crack": "2215551009",
    "Los del Fondo": "2215551030",
    "Barrio Norte": "2215551031",
    "La 22 FC": "2215551032",
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
    "Facundo Romero": "2215551028"
  };
  return phones[customerName] ?? "2216652449";
}
