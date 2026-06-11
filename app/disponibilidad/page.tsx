"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createDefaultState } from "@/lib/demo-data";
import { getCourtTimeSlots, suggestPrice } from "@/lib/metrics";
import { loadAppState } from "@/lib/persistence";
import type { AppState } from "@/lib/types";
import { formatDate, money, toInputDate } from "@/lib/utils";

export default function PublicAvailabilityPage() {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [date, setDate] = useState(toInputDate(new Date()));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryDate = params.get("fecha");
    const queryComplexId = params.get("complejo") ?? undefined;
    if (queryDate) setDate(queryDate);

    let active = true;

    async function hydrateState() {
      const parsed = await loadAppState(queryComplexId);
      if (!active || !parsed) return;
      const fallback = createDefaultState();
      setState({
        ...fallback,
        ...parsed,
        complex: { ...fallback.complex, ...parsed.complex },
        settings: { ...fallback.settings, ...parsed.settings },
        costs: { ...fallback.costs, ...parsed.costs },
        courts: parsed.courts?.length ? parsed.courts : fallback.courts,
        reservations: parsed.reservations ?? fallback.reservations,
        publicSlotIds: parsed.publicSlotIds ?? []
      } as AppState);
    }

    void hydrateState();
    return () => {
      active = false;
    };
  }, []);

  const slots = useMemo(() => {
    const selectedIds = new Set(state.publicSlotIds ?? []);
    if (!(state.settings.openDays ?? [1, 2, 3, 4, 5, 6, 0]).includes(new Date(`${date}T12:00:00`).getDay())) return [];
    return state.courts.filter((court) => court.active).flatMap((court) => {
      return getCourtTimeSlots(court, state.settings).flatMap((time) => {
        if (isPastSlot(date, time)) return [];
        const reserved = state.reservations.some((item) => reservationAppearsOnDate(item, date) && item.courtId === court.id && item.status !== "cancelled" && slotOverlapsReservation(time, item));
        const slotId = `${date}-${court.id}-${time}`;
        return reserved || !selectedIds.has(slotId) ? [] : [{ time, courtName: court.name, price: suggestPrice(date, time, state.settings, court) }];
      });
    });
  }, [state, date]);

  const message = `Hola! Quiero consultar disponibilidad para el ${formatDate(date)}.`;
  const whatsappHref = `https://wa.me/${state.complex.phone}?text=${encodeURIComponent(message)}`;

  return (
    <main className="min-h-screen bg-field-900 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="border-b border-white/15 pb-5">
          <span className="text-xs font-black uppercase tracking-wide text-lime-300">{state.complex.address}</span>
          <h1 className="mt-2 text-3xl font-black">{state.complex.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
            Horarios disponibles para consultar. La reserva se confirma por WhatsApp con el complejo.
          </p>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-lime-200">
            La disponibilidad publicada es informativa y debe confirmarse con el complejo por WhatsApp.
          </p>
        </header>

        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-white/10 bg-white p-4 text-field-900 shadow-soft sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-slate-500">Fecha</span>
            <input className="rounded-lg border border-line px-3 py-2" type="date" min={toInputDate(new Date())} value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900" href={whatsappHref} target="_blank" rel="noreferrer">
            <MessageCircle size={17} />
            Consultar por WhatsApp
          </a>
        </div>
        <p className="mt-3 text-sm font-bold text-white/65">El mensaje se abre en WhatsApp, servicio externo a CanchaPro. No hay pago online ni reserva automatica definitiva en esta version.</p>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slots.slice(0, 24).map((slot) => (
            <article key={`${slot.time}-${slot.courtName}`} className="rounded-lg border border-white/10 bg-white p-4 text-field-900 shadow-soft">
              <strong className="block">{slot.time}</strong>
              <span className="mt-1 block text-sm text-slate-500">{slot.courtName}</span>
              <span className="mt-3 block text-sm font-black text-field-700">{money(slot.price)}</span>
            </article>
          ))}
        </section>

        {!slots.length && (
          <div className="mt-5 rounded-lg border border-dashed border-white/20 bg-white/10 p-8 text-center shadow-soft">
            <strong>No hay horarios disponibles para esta fecha.</strong>
            <p className="mt-2 text-sm text-white/65">Proba con otro dia o consultanos por WhatsApp.</p>
          </div>
        )}
        <footer className="mt-8 flex flex-wrap gap-3 border-t border-white/15 pt-4 text-xs font-bold text-lime-200">
          <a href="/terminos">Terminos y Condiciones</a>
          <a href="/privacidad">Politica de Privacidad</a>
        </footer>
      </section>
    </main>
  );
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isPastSlot(date: string, time: string) {
  const today = toInputDate(new Date());
  if (date < today) return true;
  if (date > today) return false;
  const now = new Date();
  return timeToMinutes(time) <= now.getHours() * 60 + now.getMinutes();
}

function slotOverlapsReservation(slot: string, reservation: { time: string; durationMinutes?: number }) {
  const slotStart = timeToMinutes(slot);
  const reservationStart = timeToMinutes(reservation.time);
  return slotStart >= reservationStart && slotStart < reservationStart + (reservation.durationMinutes || 60);
}

function reservationAppearsOnDate(reservation: { date: string; type: string; status: string; cancelledDates?: string[]; seriesEndDate?: string }, date: string) {
  if (reservation.date === date) return true;
  if (reservation.type !== "fixed" || reservation.status === "cancelled") return false;
  if (reservation.seriesEndDate && date > reservation.seriesEndDate) return false;
  if (reservation.cancelledDates?.includes(date)) return false;
  const base = new Date(`${reservation.date}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);
  return target >= base && target.getDay() === base.getDay();
}
