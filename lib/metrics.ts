import type { AppState, Court, MonthlyMetrics, Reservation, Settings } from "@/lib/types";
import { daysInMonth, parseInputDate, sum, toInputDate } from "@/lib/utils";

export function getTimeSlots(settings: Settings) {
  return buildSlots(settings.openHour, settings.closeHour, settings.slotDuration);
}

export function getCourtTimeSlots(court: Court, settings: Settings) {
  return buildSlots(court.openHour || settings.openHour, court.closeHour || settings.closeHour, court.slotStepMinutes || settings.slotDuration);
}

function buildSlots(openText: string, closeText: string, stepMinutes: number) {
  const slots: string[] = [];
  const [openHour, openMinute] = openText.split(":").map(Number);
  const [closeHour, closeMinute] = closeText.split(":").map(Number);
  let cursor = openHour * 60 + openMinute;
  let close = closeHour * 60 + closeMinute;
  if (close <= cursor) close += 24 * 60;

  while (cursor < close) {
    const normalized = cursor % (24 * 60);
    const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
    const minute = String(normalized % 60).padStart(2, "0");
    slots.push(`${hour}:${minute}`);
    cursor += stepMinutes;
  }

  return slots;
}

export function suggestPrice(dateText: string, time: string, settings: Settings, court?: Court) {
  const date = parseInputDate(dateText);
  const valleyRange = settings.valleyRanges?.find((range) => range.days.includes(date.getDay()) && time >= range.from && time < range.to);
  if (valleyRange) return valleyRange.price;
  if (court?.price) return court.price;
  const hour = Number(time.split(":")[0]);
  if (date.getDay() === 0 || date.getDay() === 6) return settings.weekendPrice;
  if (hour < 19) return settings.valleyPrice;
  return settings.basePrice;
}

export function getMonthlyMetrics(state: AppState, month: string): MonthlyMetrics {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = daysInMonth(year, monthIndex - 1);
  const openDays = state.settings.openDays ?? [1, 2, 3, 4, 5, 6, 0];
  const operatingDays = Array.from({ length: days }, (_, index) => new Date(year, monthIndex - 1, index + 1).getDay()).filter((day) => openDays.includes(day)).length;
  const activeCourts = state.courts.filter((court) => court.active);
  const capacity = operatingDays * activeCourts.reduce((total, court) => total + getCourtTimeSlots(court, state.settings).length, 0);
  const occurrences = getMonthlyOccurrences(state.reservations, year, monthIndex - 1);
  const confirmed = occurrences.filter((occurrence) => occurrence.status === "confirmed");
  const cancelled = occurrences.filter((occurrence) => occurrence.status === "cancelled");
  const recovered = getRecoveredReservations(state.reservations, year, monthIndex - 1);
  const pending = occurrences.filter((occurrence) => occurrence.status === "pending");
  const sold = occurrences.filter((occurrence) => occurrence.paid);
  const soldCount = sold.length;
  const soldRevenue = sum(sold.map((occurrence) => occurrence.price));
  const revenue = sum(confirmed.map((occurrence) => occurrence.price));
  const cancelledLoss = sum(cancelled.map((occurrence) => occurrence.price));
  const recoveredRevenue = sum(recovered.map((reservation) => reservation.price));
  const averagePrice = state.settings.basePrice || 1;
  const fixedCosts = sum(Object.values(state.costs));
  const breakEvenTurns = fixedCosts / averagePrice;
  const freeSlots = Math.max(0, capacity - confirmed.length);
  const uncapturedRevenue = freeSlots * averagePrice + cancelledLoss;

  return {
    capacity,
    confirmedCount: confirmed.length,
    cancelledCount: cancelled.length,
    recoveredCount: recovered.length,
    recoveredRevenue,
    pendingCount: pending.length,
    soldCount,
    soldRevenue,
    revenue,
    fixedCosts,
    breakEvenTurns,
    minimumOccupancy: capacity ? breakEvenTurns / capacity : 0,
    occupancy: capacity ? confirmed.length / capacity : 0,
    profit: revenue - fixedCosts,
    cancelledLoss,
    uncapturedRevenue
  };
}

function getRecoveredReservations(reservations: Reservation[], year: number, monthIndex: number) {
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const cancelledSlots = new Map<string, Reservation>();
  reservations.forEach((reservation) => {
    if (reservation.status !== "cancelled" || !reservation.date.startsWith(monthPrefix)) return;
    cancelledSlots.set(`${reservation.date}-${reservation.time}-${reservation.courtId}`, reservation);
  });

  const recovered = new Map<string, Reservation>();
  reservations.forEach((reservation) => {
    if ((reservation.status !== "confirmed" && reservation.status !== "pending") || !reservation.date.startsWith(monthPrefix)) return;
    const key = `${reservation.date}-${reservation.time}-${reservation.courtId}`;
    if (!cancelledSlots.has(key)) return;
    recovered.set(key, reservation);
  });

  return Array.from(recovered.values());
}

function getMonthlyOccurrences(reservations: Reservation[], year: number, monthIndex: number) {
  const monthDays = daysInMonth(year, monthIndex);
  const dates = Array.from({ length: monthDays }, (_, index) => toInputDate(new Date(year, monthIndex, index + 1)));

  return reservations.flatMap((reservation) => {
    if (reservation.type !== "fixed") {
      if (!reservation.date.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}`)) return [];
      return [{ status: reservation.status, price: reservation.price, paid: reservation.paid ?? false }];
    }

    const base = parseInputDate(reservation.date);
    return dates.flatMap((date) => {
      const target = parseInputDate(date);
      if (target < base || target.getDay() !== base.getDay()) return [];
      if (reservation.seriesEndDate && date > reservation.seriesEndDate) return [];
      const cancelled = reservation.cancelledDates?.includes(date) ?? false;
      const confirmed = reservation.confirmedDates?.includes(date) || reservation.status === "confirmed";
      return [{
        status: cancelled ? "cancelled" as const : confirmed ? "confirmed" as const : "pending" as const,
        price: reservation.price,
        paid: !cancelled && (reservation.paidDates?.includes(date) ?? false)
      }];
    });
  });
}
