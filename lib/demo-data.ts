import type { AppState, Court, FixedCosts, Reservation, Settings } from "@/lib/types";
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
  basePrice: 32000,
  valleyPrice: 26000,
  weekendPrice: 38000,
  openHour: "18:00",
  closeHour: "00:00",
  slotDuration: 60,
  confirmationLeadHours: 0,
  openDays: [1, 2, 3, 4, 5, 6, 0],
  valleyRanges: []
};

export function createDefaultState(): AppState {
  const today = startOfWeek(new Date());
  const courts = Array.from({ length: 3 }, (_, index) => ({
    id: `court-${index + 1}`,
    name: ["Cancha 1 - Sintetico", "Cancha 2 - Techada", "Cancha 3 - Futbol 7"][index],
    type: index === 2 ? "futbol7" as const : "futbol5" as const,
    active: true,
    openHour: "18:00",
    closeHour: "00:00",
    slotStepMinutes: 60
  }));
  const reservations = [
    demoReservation(today, 0, "18:00", courts[0].id, "Los Pibes del Sur", "fixed", 26000, "confirmed"),
    demoReservation(today, 0, "19:00", courts[1].id, "Equipo de Nico", "fixed", 32000, "confirmed"),
    demoReservation(today, 0, "20:00", courts[2].id, "La 22 FC", "occasional", 32000, "pending"),
    demoReservation(today, 0, "21:00", courts[0].id, "Lucas Benitez", "occasional", 32000, "confirmed"),
    demoReservation(today, 0, "22:00", courts[1].id, "Barrio Norte", "occasional", 32000, "confirmed"),
    demoReservation(today, 0, "18:00", courts[1].id, "Deportivo Union", "fixed", 26000, "confirmed"),
    demoReservation(today, 0, "19:00", courts[2].id, "Agustin y Amigos", "occasional", 32000, "confirmed"),
    demoReservation(today, 0, "21:00", courts[2].id, "Los del Deposito", "fixed", 32000, "confirmed"),
    demoReservation(today, 1, "19:00", courts[0].id, "Martes Unidos", "fixed", 32000, "confirmed"),
    demoReservation(today, 1, "20:00", courts[2].id, "Veteranos 145", "fixed", 32000, "confirmed"),
    demoReservation(today, 1, "21:00", courts[1].id, "Fede Gomez", "occasional", 32000, "confirmed"),
    demoReservation(today, 1, "18:00", courts[2].id, "Taller Mecanico", "occasional", 26000, "confirmed"),
    demoReservation(today, 1, "22:00", courts[0].id, "Franco Ledesma", "occasional", 32000, "pending"),
    demoReservation(today, 1, "18:00", courts[0].id, "Los de Arquitectura", "occasional", 26000, "confirmed"),
    demoReservation(today, 1, "20:00", courts[1].id, "La Esquina FC", "fixed", 32000, "confirmed"),
    demoReservation(today, 2, "18:00", courts[2].id, "Juan Perez", "occasional", 26000, "confirmed"),
    demoReservation(today, 2, "19:00", courts[1].id, "Los Contadores", "occasional", 32000, "confirmed"),
    demoReservation(today, 2, "20:00", courts[0].id, "Los del Banco", "fixed", 32000, "confirmed"),
    demoReservation(today, 2, "21:00", courts[1].id, "Estudiantes de Noche", "fixed", 32000, "confirmed"),
    demoReservation(today, 2, "22:00", courts[2].id, "Rafa y Amigos", "occasional", 32000, "confirmed"),
    demoReservation(today, 2, "18:00", courts[0].id, "Los del Club", "fixed", 26000, "confirmed"),
    demoReservation(today, 2, "19:00", courts[2].id, "Maxi Rodriguez", "occasional", 32000, "confirmed"),
    demoReservation(today, 3, "18:00", courts[0].id, "Nacho Silva", "occasional", 26000, "pending"),
    demoReservation(today, 3, "19:00", courts[2].id, "Tomas R.", "occasional", 32000, "confirmed"),
    demoReservation(today, 3, "20:00", courts[0].id, "La Oficina", "occasional", 32000, "confirmed"),
    demoReservation(today, 3, "21:00", courts[1].id, "Jueves Pro", "fixed", 32000, "confirmed"),
    demoReservation(today, 3, "18:00", courts[1].id, "Facultad Economicas", "occasional", 26000, "confirmed"),
    demoReservation(today, 3, "20:00", courts[2].id, "Los del Taller II", "fixed", 32000, "confirmed"),
    demoReservation(today, 4, "22:00", courts[0].id, "La Banda", "occasional", 32000, "confirmed"),
    demoReservation(today, 4, "19:00", courts[2].id, "Los Profes", "fixed", 32000, "confirmed"),
    demoReservation(today, 4, "18:00", courts[1].id, "Viernes Light", "occasional", 26000, "confirmed"),
    demoReservation(today, 4, "21:00", courts[2].id, "Equipo del Taller", "occasional", 32000, "pending"),
    demoReservation(today, 4, "18:00", courts[0].id, "Los de Sistemas", "occasional", 26000, "confirmed"),
    demoReservation(today, 4, "20:00", courts[1].id, "Amigos de Leo", "occasional", 32000, "confirmed"),
    demoReservation(today, 5, "18:00", courts[1].id, "Sabado FC", "occasional", 38000, "pending"),
    demoReservation(today, 5, "19:00", courts[0].id, "Cumple de Mati", "occasional", 38000, "confirmed"),
    demoReservation(today, 5, "20:00", courts[2].id, "Los Amigos", "occasional", 38000, "confirmed"),
    demoReservation(today, 5, "21:00", courts[1].id, "Previa FC", "occasional", 38000, "confirmed"),
    demoReservation(today, 5, "22:00", courts[0].id, "Los Primos", "occasional", 38000, "confirmed"),
    demoReservation(today, 5, "18:00", courts[2].id, "La Reserva", "occasional", 38000, "cancelled", "Se bajaron dos jugadores y no completan equipo", true, 5),
    demoReservation(today, 5, "20:00", courts[0].id, "Sabado Veteranos", "fixed", 38000, "confirmed"),
    demoReservation(today, 5, "21:00", courts[2].id, "Los del Barrio", "occasional", 38000, "confirmed"),
    demoReservation(today, 6, "18:00", courts[0].id, "Domingo Sur", "fixed", 38000, "confirmed"),
    demoReservation(today, 6, "19:00", courts[1].id, "Domingo Norte", "occasional", 38000, "cancelled", "Avisaron que no llegan a completar equipo", false, 46),
    demoReservation(today, 6, "20:00", courts[0].id, "Familia Suarez", "occasional", 38000, "confirmed"),
    demoReservation(today, 6, "21:00", courts[2].id, "Reserva Instagram", "occasional", 38000, "pending"),
    demoReservation(today, 6, "18:00", courts[1].id, "Domingo Temprano", "occasional", 38000, "confirmed"),
    demoReservation(today, 6, "20:00", courts[1].id, "Los Historicos", "fixed", 38000, "confirmed"),
    demoReservation(today, 7, "22:00", courts[2].id, "Los del Centro", "occasional", 32000, "cancelled", "Cancelaron con anticipacion porque varios jugadores trabajan", false, 70),
    ...createMayReservations(courts)
  ];

  return {
    complex: {
      id: "complex-demo",
      name: "Complejo del Sur",
      address: "Av. 72 y 145, La Plata",
      phone: "5492215555555"
    },
    courts,
    settings: defaultSettings,
    costs: {
      electricity: 260000,
      gas: 85000,
      water: 65000,
      salaries: 1150000,
      rent: 520000,
      taxes: 210000,
      maintenance: 180000,
      other: 95000
    },
    reservations,
    publicSlotIds: [
      `${toInputDate(addDays(today, 6))}-${courts[2].id}-18:00`,
      `${toInputDate(addDays(today, 6))}-${courts[1].id}-19:00`,
      `${toInputDate(addDays(today, 7))}-${courts[2].id}-20:00`
    ],
    validationRecords: []
  };
}

function createMayReservations(courts: Court[]): Reservation[] {
  const monthStart = new Date(2026, 4, 1);
  const monthEnd = "2026-05-31";
  const slots = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
  const fixedCustomers = [
    "Los Pibes del Sur", "Equipo de Nico", "Martes Unidos", "Veteranos 145",
    "Los del Banco", "Estudiantes de Noche", "Jueves Pro", "Los Profes",
    "Domingo Sur", "Deportivo Union", "Los del Deposito", "La Esquina FC",
    "Los del Club", "Los del Taller II", "Sabado Veteranos", "Los Historicos"
  ];
  const occasionalCustomers = [
    "Lucas Benitez", "Barrio Norte", "Taller Mecanico", "Fede Gomez", "Franco Ledesma",
    "Juan Perez", "Los Contadores", "Rafa y Amigos", "Nacho Silva", "Tomas R.",
    "La Oficina", "La Banda", "Viernes Light", "Equipo del Taller", "Sabado FC",
    "Cumple de Mati", "Los Amigos", "Previa FC", "Los Primos", "Familia Suarez",
    "Reserva Instagram", "Agustin y Amigos", "Los de Arquitectura", "Maxi Rodriguez",
    "Facultad Economicas", "Los de Sistemas", "Amigos de Leo", "Los del Barrio"
  ];
  const fixed: Reservation[] = fixedCustomers.map((customerName, index) => {
    const weekday = index % 7;
    const date = firstWeekdayOfMonth(monthStart, weekday);
    const time = slots[(index * 2 + Math.floor(index / 7)) % slots.length];
    const court = courts[index % courts.length];
    const occurrenceDates = datesForWeekday(date, monthEnd);
    const price = priceForDate(date, time);
    return {
      id: generateId("reservation"),
      courtId: court.id,
      customerName,
      customerPhone: phoneForCustomer(customerName),
      date,
      time,
      type: "fixed",
      status: "confirmed",
      price,
      durationMinutes: 60,
      notes: "Turno fijo activo durante mayo",
      seriesEndDate: monthEnd,
      confirmedDates: occurrenceDates,
      paidDates: occurrenceDates,
      createdAt: new Date(`${date}T10:00:00`).toISOString()
    };
  });

  const fixedKeys = new Set(fixed.flatMap((reservation) => datesForWeekday(reservation.date, monthEnd).map((date) => `${date}-${reservation.courtId}-${reservation.time}`)));
  const occasional: Reservation[] = [];
  let sequence = 0;

  for (let day = 1; day <= 31; day += 1) {
    const date = toInputDate(new Date(2026, 4, day));
    const weekend = new Date(2026, 4, day).getDay() === 0 || new Date(2026, 4, day).getDay() === 6;
    const dailyTarget = weekend ? 5 : 4;
    let added = 0;

    for (let offset = 0; offset < courts.length * slots.length && added < dailyTarget; offset += 1) {
      const court = courts[(day + offset * 2) % courts.length];
      const time = slots[(day * 2 + offset * 3) % slots.length];
      if (fixedKeys.has(`${date}-${court.id}-${time}`)) continue;
      const cancelled = [18, 43, 67, 92, 116, 141, 165, 188].includes(sequence);
      const price = priceForDate(date, time);
      const turn = new Date(`${date}T${time}:00`);
      const cancellationHours = [6, 18, 30, 42, 54, 66, 12, 36][sequence % 8];
      occasional.push({
        id: generateId("reservation"),
        courtId: court.id,
        customerName: occasionalCustomers[sequence % occasionalCustomers.length],
        customerPhone: phoneForCustomer(occasionalCustomers[sequence % occasionalCustomers.length]),
        date,
        time,
        type: "occasional",
        status: cancelled ? "cancelled" : "confirmed",
        price,
        durationMinutes: 60,
        notes: cancelled ? "Horario liberado durante mayo" : "",
        cancellationReason: cancelled ? "El equipo aviso que no completaba jugadores" : "",
        cancellationLastMinute: cancelled && cancellationHours <= 12,
        cancelledAt: cancelled ? new Date(turn.getTime() - cancellationHours * 60 * 60 * 1000).toISOString() : undefined,
        paid: !cancelled,
        paidAt: !cancelled ? turn.toISOString() : undefined,
        createdAt: new Date(turn.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      });
      sequence += 1;
      added += 1;
    }
  }

  return [...fixed, ...occasional];
}

function firstWeekdayOfMonth(monthStart: Date, weekday: number) {
  const date = new Date(monthStart);
  date.setDate(1 + (weekday - date.getDay() + 7) % 7);
  return toInputDate(date);
}

function datesForWeekday(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  while (toInputDate(cursor) <= endDate) {
    dates.push(toInputDate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

function priceForDate(date: string, time: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  if (day === 0 || day === 6) return defaultSettings.weekendPrice;
  return time === "18:00" ? defaultSettings.valleyPrice : defaultSettings.basePrice;
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
  cancellationReason = "",
  cancellationLastMinute = false,
  cancellationHoursBefore = 24
): Reservation {
  const date = toInputDate(addDays(weekStart, dayOffset));
  const now = new Date();
  const turn = new Date(`${date}T${time}:00`);
  const withinConfirmationWindow = turn.getTime() <= now.getTime() + defaultSettings.confirmationLeadHours * 60 * 60 * 1000;
  const effectiveStatus = type === "fixed" || (status === "confirmed" && !withinConfirmationWindow) ? "pending" : status;
  const paid = type === "occasional" && effectiveStatus === "confirmed" && turn < now;
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
    notes: "",
    durationMinutes: 60,
    cancellationReason,
    cancellationLastMinute,
    cancelledAt: effectiveStatus === "cancelled" ? new Date(turn.getTime() - cancellationHoursBefore * 60 * 60 * 1000).toISOString() : undefined,
    paid,
    paidAt: paid ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString()
  };
}

function phoneForCustomer(customerName: string) {
  const phones: Record<string, string> = {
    "Los Pibes del Sur": "549221410001",
    "Equipo de Nico": "549221410002",
    "Martes Unidos": "549221410003",
    "Veteranos 145": "549221410004",
    "Los del Banco": "549221410005",
    "Estudiantes de Noche": "549221410006",
    "Jueves Pro": "549221410007",
    "Los Profes": "549221410008",
    "Domingo Sur": "549221410009",
    "Deportivo Union": "549221410010",
    "Los del Deposito": "549221410011",
    "La Esquina FC": "549221410012",
    "Los del Club": "549221410013",
    "Los del Taller II": "549221410014",
    "Sabado Veteranos": "549221410015",
    "Los Historicos": "549221410016",
    "Fede Gomez": "549221420001",
    "Lucas Benitez": "549221420009",
    "Barrio Norte": "549221420010",
    "Taller Mecanico": "549221420011",
    "Franco Ledesma": "549221420012",
    "Nacho Silva": "549221420002",
    "Tomas R.": "549221420003",
    "Los Contadores": "549221420013",
    "Rafa y Amigos": "549221420014",
    "La Oficina": "549221420015",
    "Sabado FC": "549221420004",
    "Cumple de Mati": "549221420005",
    "Los Amigos": "549221420006",
    "Viernes Light": "549221420016",
    "Equipo del Taller": "549221420017",
    "Previa FC": "549221420018",
    "Los Primos": "549221420019",
    "Domingo Norte": "549221420007",
    "Familia Suarez": "549221420020",
    "Reserva Instagram": "549221420008",
    "Agustin y Amigos": "549221420021",
    "Los de Arquitectura": "549221420022",
    "Maxi Rodriguez": "549221420023",
    "Facultad Economicas": "549221420024",
    "Los de Sistemas": "549221420025",
    "Amigos de Leo": "549221420026",
    "La Reserva": "549221420027",
    "Los del Barrio": "549221420028",
    "Domingo Temprano": "549221420029",
    "Los del Centro": "549221420030"
  };
  return phones[customerName] ?? "";
}
