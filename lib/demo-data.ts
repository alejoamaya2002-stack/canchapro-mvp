import type { AppState, Court, FixedCosts, Reservation, Settings, ValidationRecord } from "@/lib/types";
import { addDays, generateId, startOfWeek, toInputDate } from "@/lib/utils";

export const storageKey = "canchapro-next-mvp-state-v1";

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
    "Dario Campos": "2215143708"
  };
  return phones[customerName] ?? "2216652449";
}
