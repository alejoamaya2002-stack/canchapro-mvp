import { clsx, type ClassValue } from "clsx";
import type { AppState, Reservation } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function generateId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function percent(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMonthInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(dateText: string) {
  const date = parseInputDate(dateText);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function buildReservationConfirmationMessage(state: Pick<AppState, "complex" | "courts">, reservation: Reservation) {
  const court = state.courts.find((item) => item.id === reservation.courtId)?.name ?? "la cancha";
  const location = state.complex.address.trim() ? `${state.complex.name}, ${state.complex.address.trim()}` : state.complex.name;
  const readableDate = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(parseInputDate(reservation.date));
  const duration = reservation.durationMinutes ? `\nDuracion: ${reservation.durationMinutes} minutos.` : "";

  return `Hola ${reservation.customerName}. Tu turno quedo reservado en ${location}, para el dia ${readableDate} ${formatDate(reservation.date)} a las ${reservation.time}, en ${court}.
${duration}
El valor del turno es ${money(reservation.price)}. Se abona sin excepcion antes de ingresar a jugar.

Ante cualquier cambio o cancelacion, por favor avisar con anticipacion. Gracias.`;
}

export function buildWhatsAppUrl(message: string, phone = "") {
  const destination = phone.trim().replace(/\D/g, "");
  return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}
