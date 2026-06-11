"use client";

import {
  CalendarDays,
  Copy,
  DollarSign,
  RotateCcw,
  LayoutDashboard,
  MessageCircle,
  Plus,
  RefreshCw,
  Repeat2,
  Settings,
  ShieldCheck,
  Share2,
  ClipboardCheck,
  LogOut,
  Trash2,
  UsersRound,
  UserRound
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadCurrentProfile, signInWithPassword, signOut, type AuthProfile } from "@/lib/auth";
import { costLabels, createDefaultState, createEmptyInitialState, dayNames, hasInitialConfiguration } from "@/lib/demo-data";
import { getCourtTimeSlots, getMonthlyMetrics, getTimeSlots, suggestPrice } from "@/lib/metrics";
import { loadAppState, loadLegalAcceptance, resetForRealPilot, restoreDemoState, saveAppState, saveLegalAcceptance, saveOnboardingStatus } from "@/lib/persistence";
import type { AppState, Court, FixedCosts, Reservation, ReservationStatus, ReservationType, Role, Settings as AppSettings, ValidationRecord, ValleyRange } from "@/lib/types";
import { addDays, buildReservationConfirmationMessage, buildWhatsAppUrl, cn, formatDate, generateId, money, normalize, parseInputDate, percent, startOfWeek, toInputDate, toMonthInput } from "@/lib/utils";

type ViewId = "agenda" | "reservations" | "cancellations" | "availability" | "confirmations" | "customers" | "public" | "validation" | "dashboard" | "profitability" | "settings";

type ReservationDraft = {
  id?: string;
  date: string;
  time: string;
  courtId: string;
  type: ReservationType;
  customerName: string;
  customerPhone: string;
  price: number;
  durationMinutes: number;
  status: ReservationStatus;
  notes: string;
  repeatFixed: boolean;
};

type OnboardingData = {
  complexName: string;
  address: string;
  phone: string;
  responsibleName: string;
  configuredByRole: Role | "";
  openDays: number[];
  openHour: string;
  closeHour: string;
  slotDuration: number;
  courts: Court[];
  basePrice: number;
  weekendDifferent: boolean;
  weekendPrice: number;
  courtDifferent: boolean;
  valleyChoice: "yes" | "no" | "unsure";
  valleyRanges: ValleyRange[];
  reservationMode: "all" | "fixed" | "skip";
  reservations: Reservation[];
};

const views: Array<{ id: ViewId; label: string; roles: Role[]; icon: typeof CalendarDays }> = [
  { id: "agenda", label: "Agenda", roles: ["owner", "staff"], icon: CalendarDays },
  { id: "reservations", label: "Reservas", roles: ["owner", "staff"], icon: UserRound },
  { id: "availability", label: "Enviar disponibilidad", roles: ["owner", "staff"], icon: MessageCircle },
  { id: "confirmations", label: "Confirmar turnos", roles: ["owner", "staff"], icon: MessageCircle },
  { id: "cancellations", label: "Cancelaciones", roles: ["owner", "staff"], icon: RotateCcw },
  { id: "customers", label: "Turnos fijos", roles: ["owner", "staff"], icon: UsersRound },
  { id: "public", label: "Publicar horarios", roles: ["owner", "staff"], icon: Share2 },
  { id: "validation", label: "Validacion", roles: ["owner"], icon: ClipboardCheck },
  { id: "dashboard", label: "Tablero", roles: ["owner"], icon: LayoutDashboard },
  { id: "profitability", label: "Costos", roles: ["owner"], icon: DollarSign },
  { id: "settings", label: "Configuracion", roles: ["owner"], icon: Settings }
];

const validationPayLabels: Record<ValidationRecord["willingnessToPay"], string> = {
  no_pay: "No pagaria",
  up_to_amount: "Pagaria hasta",
  free_trial: "Probaria gratis",
  pay_if_recovers: "Pagaria si recupera turnos"
};

const staffMenuGroups: Array<{ label: string; viewIds: ViewId[] }> = [
  { label: "Operacion diaria", viewIds: ["agenda", "reservations", "availability", "confirmations", "cancellations"] },
  { label: "Clientes y publicacion", viewIds: ["customers", "public"] }
];

const emptyDraft = (state: AppState): ReservationDraft => {
  const today = toInputDate(new Date());
  const time = getAllCourtSlots(state)[0] ?? "18:00";
  return {
    date: today,
    time,
    courtId: "",
    type: "occasional",
    customerName: "",
    customerPhone: "",
    price: suggestPrice(today, time, state.settings),
    durationMinutes: state.settings.slotDuration,
    status: "confirmed",
    notes: "",
    repeatFixed: false
  };
};

export default function Home() {
  const [state, setState] = useState<AppState>(() => createDefaultState());
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeView, setActiveView] = useState<ViewId>("agenda");
  const [weekDate, setWeekDate] = useState(toInputDate(startOfWeek(new Date())));
  const [courtFilter, setCourtFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all" | "free">("all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(toMonthInput(new Date()));
  const [availabilityDate, setAvailabilityDate] = useState(toInputDate(new Date()));
  const [availabilityPhone, setAvailabilityPhone] = useState("");
  const [publicDate, setPublicDate] = useState(toInputDate(new Date()));
  const [draft, setDraft] = useState<ReservationDraft | null>(null);
  const [confirmationReservation, setConfirmationReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const role: Role = profile?.role ?? "owner";

  useEffect(() => {
    let active = true;

    async function hydrateState() {
      try {
        const currentProfile = await loadCurrentProfile();
        if (!active) return;
        setProfile(currentProfile);
        setAuthReady(true);

        if (!currentProfile || currentProfile.status !== "active" || currentProfile.role === "admin") {
          setHydrated(true);
          return;
        }

        if (!currentProfile.complex_id) {
          setAuthError("El perfil no tiene un complejo asociado.");
          setHydrated(true);
          return;
        }

        const storedState = await loadAppState(currentProfile.complex_id);
        if (!active) return;
        const legalAcceptance = loadLegalAcceptance();
        const setupComplete = hasInitialConfiguration(storedState);
        setState(storedState ? normalizeState(storedState) : createEmptyInitialState());
        if (legalAcceptance) setLegalAccepted(true);
        setOnboardingComplete(setupComplete);
        setHydrated(true);
      } catch (error) {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "No se pudo iniciar CanchaPro.");
        setAuthReady(true);
        setHydrated(true);
      }
    }

    void hydrateState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated && onboardingComplete && profile?.complex_id) saveAppState(state, profile.complex_id);
  }, [state, hydrated, onboardingComplete, profile?.complex_id]);

  useEffect(() => {
    if (!canAccess(activeView, role)) setActiveView("agenda");
  }, [role, activeView]);

  const activeCourts = state.courts.filter((court) => court.active);
  const slots = useMemo(() => getAllCourtSlots(state), [state]);
  const metrics = useMemo(() => getMonthlyMetrics(state, month), [state, month]);
  const availabilityMessage = useMemo(() => buildAvailabilityMessage(state, availabilityDate), [state, availabilityDate]);
  const currentView = views.find((view) => view.id === activeView) ?? views[0];

  function acceptLegalTerms() {
    saveLegalAcceptance();
    setLegalAccepted(true);
  }

  function finishOnboarding(next: AppState, _configuredRole: Role | "") {
    if (!profile?.complex_id) return;
    const normalized = normalizeState(next);
    setState(normalized);
    saveAppState(normalized, profile.complex_id);
    saveOnboardingStatus(profile.complex_id);
    setOnboardingComplete(true);
  }

  function restoreDemoAndEnter() {
    if (!profile?.complex_id) return;
    const demo = restoreDemoState(profile.complex_id);
    setState(demo);
    setOnboardingComplete(true);
  }

  function loadAcademicDemo() {
    restoreDemoAndEnter();
    notify("Demo academico cargado.");
  }

  function prepareRealTrial() {
    if (!profile?.complex_id) return;
    const emptyState = resetForRealPilot(profile.complex_id);
    setState(emptyState);
    setOnboardingComplete(false);
    setDraft(null);
    setConfirmationReservation(null);
    setActiveView("agenda");
    setShowCleanConfirm(false);
    notify("Listo para configurar una prueba real desde cero.");
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function login(email: string, password: string) {
    setAuthError("");
    await signInWithPassword(email, password);
    window.location.reload();
  }

  async function logout() {
    await signOut();
    window.location.reload();
  }

  function updateState(next: AppState) {
    setState(next);
  }

  function openDraft(input?: Partial<ReservationDraft>) {
    const base = emptyDraft(state);
    const next = { ...base, ...input };
    next.price = input?.price ?? suggestPrice(next.date, next.time, state.settings);
    setDraft(next);
  }

  function editReservation(reservation: Reservation) {
    setDraft({ ...reservation, repeatFixed: false });
  }

  function goToCancellations() {
    setDraft(null);
    setActiveView("cancellations");
  }

  function markReservationPaid(reservationId: string, occurrenceDate: string) {
    updateState({
      ...state,
      reservations: state.reservations.map((item) => item.id === reservationId ? item.type === "fixed"
        ? { ...item, paidDates: Array.from(new Set([...(item.paidDates ?? []), occurrenceDate])) }
        : { ...item, paid: true, paidAt: new Date().toISOString() } : item)
    });
    notify("Pago registrado. El turno cuenta como vendido.");
  }

  function saveReservation(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const isNewReservation = !draft.id;

    const reservation: Reservation = {
      id: draft.id ?? generateId("reservation"),
      courtId: draft.courtId,
      customerName: draft.customerName.trim(),
      customerPhone: draft.customerPhone.trim(),
      date: draft.date,
      time: draft.time,
      type: draft.type,
      status: draft.type === "fixed" || (draft.status === "confirmed" && !isWithinConfirmationWindow(draft.date, draft.time, state.settings.confirmationLeadHours)) ? "pending" : draft.status,
      price: Number(draft.price || 0),
      durationMinutes: Number(draft.durationMinutes || state.settings.slotDuration),
      notes: draft.notes.trim(),
      createdAt: draft.id ? state.reservations.find((item) => item.id === draft.id)?.createdAt ?? new Date().toISOString() : new Date().toISOString()
    };

    const duplicate = state.reservations.find((item) => {
      return item.id !== reservation.id && reservationConflictsOnDate(item, reservation);
    });

    if (duplicate) {
      notify("Ese horario ya tiene una reserva confirmada.");
      return;
    }

    const withoutCurrent = state.reservations.filter((item) => item.id !== reservation.id);
    updateState({ ...state, reservations: [...withoutCurrent, reservation] });
    setDraft(null);
    if (isNewReservation && reservation.status !== "cancelled") setConfirmationReservation(reservation);
    notify("Reserva guardada.");
  }

  function deleteReservation() {
    if (!draft?.id) return;
    updateState({ ...state, reservations: state.reservations.filter((item) => item.id !== draft.id) });
    setDraft(null);
    notify("Reserva eliminada.");
  }

  function cancelReservation(reservationId: string, occurrenceDate: string, reason: string, lastMinute: boolean) {
    const cancelled = state.reservations.find((item) => item.id === reservationId);
    if (cancelled?.type === "fixed") {
      const cancelledOccurrence: Reservation = {
        ...cancelled,
        id: generateId("reservation"),
        date: occurrenceDate,
        type: "occasional",
        status: "cancelled",
        cancellationReason: reason,
        cancellationLastMinute: lastMinute,
        cancelledAt: new Date().toISOString(),
        notes: `Ocurrencia cancelada del turno fijo ${cancelled.customerName}`
      };
      updateState({
        ...state,
        reservations: [
          ...state.reservations.map((item) => item.id === reservationId ? { ...item, cancelledDates: Array.from(new Set([...(item.cancelledDates ?? []), occurrenceDate])) } : item),
          cancelledOccurrence
        ]
      });
      setDraft(null);
      notify(`Ocurrencia fija liberada para reventa: ${cancelled.time}.`);
      return;
    }
    updateState({
      ...state,
      reservations: state.reservations.map((item) => item.id === reservationId ? {
        ...item,
        status: "cancelled",
        cancellationReason: reason,
        cancellationLastMinute: lastMinute,
        cancelledAt: new Date().toISOString()
      } : item)
    });
    setDraft(null);
    notify(cancelled ? `Horario liberado para reventa: ${cancelled.time}.` : "Reserva cancelada.");
  }

  function copyAvailability() {
    navigator.clipboard?.writeText(availabilityMessage).then(
      () => notify("Mensaje copiado para WhatsApp."),
      () => notify("No se pudo copiar automaticamente.")
    );
  }

  const visibleReservations = state.reservations
    .filter((reservation) => {
      const court = activeCourts.find((item) => item.id === reservation.courtId)?.name ?? "";
      return normalize(`${reservation.customerName} ${reservation.customerPhone} ${court}`).includes(normalize(search));
    })
    .map((reservation) => ({ ...reservation, status: getEffectiveStatus(reservation, reservation.date, state.settings.confirmationLeadHours) }))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  if (!authReady) return null;

  if (!profile) {
    return <LoginScreen onLogin={login} externalError={authError} />;
  }

  if (profile.status !== "active") {
    return <AccessBlocked message="Este usuario se encuentra desactivado. Contacta al administrador de CanchaPro." onLogout={logout} />;
  }

  if (profile.role === "admin") {
    return <AdminPlaceholder profile={profile} onLogout={logout} />;
  }

  if (!profile.complex_id || authError) {
    return <AccessBlocked message={authError || "El perfil no tiene un complejo asociado."} onLogout={logout} />;
  }

  if (!hydrated) return null;

  if (!legalAccepted) {
    return <LegalGate onAccept={acceptLegalTerms} />;
  }

  if (!onboardingComplete) {
    return <InitialSetupWizard onComplete={finishOnboarding} onUseDemo={restoreDemoAndEnter} />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#050806_0%,#102116_34%,#f7fbf7_34%,#f7fbf7_100%)] text-field-900">
      <div className="grid min-h-screen lg:grid-cols-[292px_1fr]">
        <aside className="flex flex-col gap-6 bg-field-900 p-5 text-white lg:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime-400 text-sm font-black text-field-900">CP</div>
            <div>
              <strong className="block text-lg">CanchaPro</strong>
              <span className="text-sm text-white/65">Gestion comercial</span>
            </div>
          </div>

          <section className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="text-xs font-bold uppercase tracking-wide text-white/55">Sesion activa</span>
            <strong className="mt-1 block text-sm">{profile.full_name || profile.email}</strong>
            <span className="text-xs text-white/65">{role === "owner" ? "Dueno / Administrador" : "Encargado operativo"}</span>
            <button className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-black text-white" type="button" onClick={logout}>
              <LogOut size={15} />
              Cerrar sesion
            </button>
          </section>

          <nav className="grid gap-5">
            {(role === "staff" ? staffMenuGroups : [{ label: "", viewIds: views.filter((view) => view.roles.includes(role) && view.id !== "validation").map((view) => view.id) }]).map((group) => (
              <div key={group.label || "owner-menu"} className="grid gap-2">
                {group.label && <span className="px-3 text-[11px] font-black uppercase text-white/45">{group.label}</span>}
                {group.viewIds.map((viewId) => {
                  const view = views.find((item) => item.id === viewId);
                  if (!view) return null;
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      className={cn("flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left text-sm font-bold text-white/82", activeView === view.id && "border-white/15 bg-white/10 text-white")}
                      type="button"
                      onClick={() => setActiveView(view.id)}
                    >
                      <Icon size={18} />
                      {view.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <section className="mt-auto rounded-lg border border-white/10 bg-white/5 p-4">
            <span className="text-xs font-bold uppercase tracking-wide text-lime-300">Complejo activo</span>
            <strong className="mt-2 block">{state.complex.name}</strong>
            <p className="mt-2 text-sm leading-6 text-white/65">{activeCourts.length} canchas activas. Reservas, disponibilidad, costos e indicadores en un solo lugar.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-lime-200">
              <a href="/terminos" target="_blank" rel="noreferrer">Terminos y Condiciones</a>
              <a href="/privacidad" target="_blank" rel="noreferrer">Politica de Privacidad</a>
            </div>
          </section>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wide text-lime-300 drop-shadow">{role === "owner" ? "Vista del dueno" : "Vista del encargado"}</span>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)] sm:text-3xl">{currentView.label}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-field-700 shadow-soft" type="button" onClick={loadAcademicDemo}>
                <RefreshCw size={17} />
                Cargar demo academico
              </button>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-field-700 shadow-soft" type="button" onClick={() => setShowCleanConfirm(true)}>
                <Trash2 size={17} />
                Preparar prueba real
              </button>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900 shadow-soft" type="button" onClick={() => openDraft()}>
                <Plus size={18} />
                Nueva reserva
              </button>
            </div>
          </header>

          {(activeView === "dashboard" || activeView === "profitability" || activeView === "settings") && (
            <PilotNotice />
          )}

          {activeView === "agenda" && (
            <AgendaView
              activeCourts={activeCourts}
              courtFilter={courtFilter}
              openDraft={openDraft}
              reservations={state.reservations}
              setCourtFilter={setCourtFilter}
              setStatusFilter={setStatusFilter}
              setWeekDate={setWeekDate}
              settings={state.settings}
              slots={slots}
              statusFilter={statusFilter}
              weekDate={weekDate}
            />
          )}

          {activeView === "reservations" && (
            <ReservationsView reservations={visibleReservations} courts={activeCourts} search={search} setSearch={setSearch} editReservation={editReservation} goToCancellations={goToCancellations} markPaid={markReservationPaid} />
          )}

          {activeView === "cancellations" && (
            <CancellationsView state={state} setState={updateState} notify={notify} />
          )}

          {activeView === "availability" && (
            <AvailabilityView
              date={availabilityDate}
              phone={availabilityPhone}
              message={availabilityMessage}
              setDate={setAvailabilityDate}
              setPhone={setAvailabilityPhone}
              copyAvailability={copyAvailability}
            />
          )}

          {activeView === "confirmations" && (
            <ConfirmationsView state={state} setState={updateState} notify={notify} markPaid={markReservationPaid} />
          )}

          {activeView === "customers" && (
            <CustomersView state={state} setState={updateState} openDraft={openDraft} notify={notify} />
          )}

          {activeView === "public" && (
            <PublicAvailabilityView state={state} setState={updateState} complexId={profile.complex_id} date={publicDate} setDate={setPublicDate} notify={notify} />
          )}

          {activeView === "validation" && role === "owner" && (
            <ValidationView state={state} setState={updateState} notify={notify} />
          )}

          {activeView === "dashboard" && role === "owner" && (
            <DashboardView state={state} month={month} setMonth={setMonth} metrics={metrics} />
          )}

          {activeView === "profitability" && role === "owner" && (
            <ProfitabilityView state={state} setState={updateState} />
          )}

          {activeView === "settings" && role === "owner" && (
            <SettingsView state={state} setState={updateState} notify={notify} />
          )}

          {role === "owner" && activeView !== "validation" && (
            <footer className="mt-8 rounded-lg border border-dashed border-line bg-white/70 p-4 text-sm text-slate-600">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>Despues de usar la app, registra aprendizajes de la prueba con un complejo real.</p>
                <button className="min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-black text-field-700" type="button" onClick={() => setActiveView("validation")}>
                  Registrar validacion
                </button>
              </div>
            </footer>
          )}
        </section>
      </div>

      {draft && (
        <ReservationModal
          draft={draft}
          setDraft={setDraft}
          courts={activeCourts}
          slots={slots}
          settings={state.settings}
          reservations={state.reservations}
          saveReservation={saveReservation}
          deleteReservation={deleteReservation}
          cancelReservation={cancelReservation}
          goToCancellations={goToCancellations}
          markPaid={markReservationPaid}
          complex={state.complex}
          notify={notify}
        />
      )}

      {confirmationReservation && (
        <ReservationConfirmationModal
          state={state}
          reservation={confirmationReservation}
          notify={notify}
          onClose={() => setConfirmationReservation(null)}
        />
      )}

      {showCleanConfirm && (
        <CleanOperationalDataModal
          onCancel={() => setShowCleanConfirm(false)}
          onConfirm={prepareRealTrial}
        />
      )}

      {toast && <div className="fixed bottom-5 right-5 max-w-sm rounded-lg bg-field-900 px-4 py-3 text-sm font-bold text-white shadow-soft">{toast}</div>}
    </main>
  );
}

function LoginScreen(props: { onLogin: (email: string, password: string) => Promise<void>; externalError: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await props.onLogin(email.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesion.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-field-900 px-4 py-8 text-white">
      <form className="w-full max-w-md rounded-lg border border-white/10 bg-white p-6 text-field-900 shadow-soft" onSubmit={submit}>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime-400 text-sm font-black text-field-900">CP</div>
          <div>
            <span className="text-xs font-black uppercase tracking-wide text-lime-700">Acceso por complejo</span>
            <h1 className="text-2xl font-black">Ingresar a CanchaPro</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">Usa el email y la contrasena asignados a tu complejo.</p>
        <div className="mt-5 grid gap-3">
          <Field label="Email"><input className="rounded-lg border border-line px-3 py-2" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Contrasena"><input className="rounded-lg border border-line px-3 py-2" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        </div>
        {(error || props.externalError) && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error || props.externalError}</p>}
        <button className="mt-5 min-h-11 w-full rounded-lg bg-field-700 px-4 text-sm font-black text-white disabled:bg-slate-300" type="submit" disabled={submitting}>
          {submitting ? "Ingresando..." : "Iniciar sesion"}
        </button>
      </form>
    </main>
  );
}

function AccessBlocked(props: { message: string; onLogout: () => Promise<void> }) {
  return (
    <main className="grid min-h-screen place-items-center bg-field-900 px-4 py-8 text-white">
      <section className="w-full max-w-lg rounded-lg bg-white p-6 text-field-900 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-red-700">Acceso bloqueado</span>
        <h1 className="mt-1 text-2xl font-black">No se puede ingresar</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{props.message}</p>
        <button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={props.onLogout}><LogOut size={17} />Cerrar sesion</button>
      </section>
    </main>
  );
}

function AdminPlaceholder(props: { profile: AuthProfile; onLogout: () => Promise<void> }) {
  return (
    <main className="grid min-h-screen place-items-center bg-field-900 px-4 py-8 text-white">
      <section className="w-full max-w-xl rounded-lg bg-white p-6 text-field-900 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-lime-700">Administrador general</span>
        <h1 className="mt-1 text-2xl font-black">Panel admin pendiente de implementacion</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Sesion iniciada como {props.profile.email}. Este usuario no carga datos de ningun complejo.</p>
        <button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={props.onLogout}><LogOut size={17} />Cerrar sesion</button>
      </section>
    </main>
  );
}

function CleanOperationalDataModal(props: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-field-900/55 p-4">
      <section className="w-full max-w-lg rounded-lg bg-white p-5 text-field-900 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Prueba real</span>
        <h2 className="mt-1 text-xl font-black">Limpiar datos para prueba real</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Esto eliminara reservas, cancelaciones, horarios publicados, canchas, precios, costos y configuracion anterior para comenzar una prueba real desde cero. Queres continuar?
        </p>
        <p className="mt-3 rounded-lg bg-lime-50 p-3 text-sm font-bold text-lime-950">
          Usar esta opcion antes de entregar la app a un complejo para que vuelva a cargar sus datos reales en la configuracion inicial.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={props.onCancel}>Cancelar</button>
          <button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-black text-white" type="button" onClick={props.onConfirm}>Preparar prueba real</button>
        </div>
      </section>
    </div>
  );
}

function LegalGate(props: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setChecked(Boolean(inputRef.current?.checked));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-field-900 px-4 py-8 text-white">
      <section className="w-full max-w-2xl rounded-lg border border-white/10 bg-white p-6 text-field-900 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime-400 text-sm font-black text-field-900">CP</div>
          <div>
            <span className="text-xs font-black uppercase tracking-wide text-lime-700">MVP / Piloto</span>
            <h1 className="text-2xl font-black">Ingresar a CanchaPro</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          CanchaPro es una herramienta piloto para gestionar reservas, cancelaciones, mensajes operativos e indicadores estimados de complejos deportivos.
        </p>
        <label className="mt-5 flex items-start gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <input ref={inputRef} className="mt-1 h-4 w-4" type="checkbox" checked={checked} onChange={(event) => { setChecked(event.target.checked); setError(""); }} />
          <span>
            Acepto los <a className="font-black text-field-700 underline" href="/terminos" target="_blank" rel="noreferrer">Terminos y Condiciones</a> y la <a className="font-black text-field-700 underline" href="/privacidad" target="_blank" rel="noreferrer">Politica de Privacidad</a> de CanchaPro MVP/Piloto.
          </span>
        </label>
        {error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}
        <button className="mt-5 min-h-11 w-full rounded-lg bg-field-700 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="button" disabled={!checked} onClick={props.onAccept}>
          Continuar a configuracion
        </button>
      </section>
    </main>
  );
}

function InitialSetupWizard(props: { onComplete: (state: AppState, role: Role | "") => void; onUseDemo: () => void }) {
  const today = toInputDate(new Date());
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [fixedDay, setFixedDay] = useState(new Date().getDay());
  const [data, setData] = useState<OnboardingData>({
    complexName: "",
    address: "",
    phone: "",
    responsibleName: "",
    configuredByRole: "",
    openDays: [1, 2, 3, 4, 5, 6],
    openHour: "18:00",
    closeHour: "00:00",
    slotDuration: 60,
    courts: [newSetupCourt(1, "18:00", "00:00", 60)],
    basePrice: 0,
    weekendDifferent: false,
    weekendPrice: 0,
    courtDifferent: false,
    valleyChoice: "unsure",
    valleyRanges: [],
    reservationMode: "skip",
    reservations: []
  });
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft>({
    id: undefined,
    date: today,
    time: "18:00",
    courtId: data.courts[0].id,
    type: "occasional",
    customerName: "",
    customerPhone: "",
    price: 0,
    durationMinutes: 60,
    status: "pending",
    notes: "",
    repeatFixed: false
  });

  function patchData(patch: Partial<OnboardingData>) {
    setData((current) => ({ ...current, ...patch }));
  }

  function setCourtCount(count: number) {
    const safeCount = Math.max(1, Math.min(20, count || 1));
    const courts = Array.from({ length: safeCount }, (_, index) => data.courts[index] ?? newSetupCourt(index + 1, data.openHour, data.closeHour, data.slotDuration));
    patchData({ courts });
    if (!courts.some((court) => court.id === reservationDraft.courtId)) setReservationDraft({ ...reservationDraft, courtId: courts[0].id });
  }

  function validateCurrentStep() {
    if (step === 1 && !data.complexName.trim()) return "Ingresa el nombre del complejo.";
    if (step === 2 && (!data.openHour || !data.closeHour || data.openHour === data.closeHour)) return "Configura un horario de apertura y cierre valido.";
    if (step === 2 && !data.openDays.length) return "Selecciona al menos un dia de apertura.";
    if (step === 2 && (!data.courts.length || data.courts.some((court) => !court.name.trim()))) return "Configura al menos una cancha con nombre.";
    if (step === 2 && data.courts.some((court) => !court.openHour || !court.closeHour || court.openHour === court.closeHour)) return "Revisa los horarios de cada cancha. Apertura y cierre no pueden ser iguales.";
    if (step === 3 && data.basePrice <= 0) return "Ingresa un precio base mayor a cero.";
    if (step === 3 && data.weekendDifferent && data.weekendPrice <= 0) return "Ingresa el precio de fin de semana.";
    if (step === 3 && data.valleyChoice === "yes" && data.valleyRanges.some((range) => range.to <= range.from || range.price <= 0 || !range.days.length)) return "Revisa los rangos valle: deben tener dias, precio y un horario valido.";
    return "";
  }

  function goNext() {
    const message = validateCurrentStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step === 3) {
      setReservationDraft((current) => ({ ...current, price: onboardingSuggestedPrice(data, current.date, current.time, current.courtId) }));
    }
    setStep(Math.min(5, step + 1));
  }

  function addInitialReservation() {
    const date = data.reservationMode === "fixed" ? nextDateForWeekday(fixedDay, reservationDraft.time) : reservationDraft.date;
    const type: ReservationType = data.reservationMode === "fixed" ? "fixed" : reservationDraft.type;
    const candidate: Reservation = {
      id: generateId("reservation"),
      date,
      time: reservationDraft.time,
      courtId: reservationDraft.courtId,
      type,
      customerName: reservationDraft.customerName.trim(),
      customerPhone: reservationDraft.customerPhone.trim(),
      price: Number(reservationDraft.price || data.basePrice),
      status: type === "fixed" ? "pending" : reservationDraft.status,
      durationMinutes: Number(reservationDraft.durationMinutes || data.slotDuration),
      notes: reservationDraft.notes.trim(),
      createdAt: new Date().toISOString()
    };
    if (!candidate.customerName || !candidate.courtId || !candidate.time || (!candidate.date && type === "occasional")) {
      setError("Completa cliente, fecha, hora y cancha.");
      return;
    }
    if (isPastSlot(candidate.date, candidate.time)) {
      setError("No se pueden cargar reservas en fechas u horarios pasados.");
      return;
    }
    const selectedCourt = data.courts.find((court) => court.id === candidate.courtId);
    if (!selectedCourt || !getCourtTimeSlots(selectedCourt, {
      basePrice: data.basePrice,
      valleyPrice: data.basePrice,
      weekendPrice: data.weekendPrice || data.basePrice,
      openHour: data.openHour,
      closeHour: data.closeHour,
      slotDuration: data.slotDuration,
      confirmationLeadHours: 0
    }).includes(candidate.time)) {
      setError("La hora elegida no corresponde a los horarios configurados para esa cancha.");
      return;
    }
    const overlap = data.reservations.some((item) => item.courtId === candidate.courtId && reservationAppearsOnDate(item, candidate.date) && timesOverlap(item.time, item.durationMinutes, candidate.time, candidate.durationMinutes));
    if (overlap) {
      setError("Ya existe una reserva para esa cancha y horario.");
      return;
    }
    patchData({ reservations: [...data.reservations, candidate] });
    setReservationDraft({ ...reservationDraft, customerName: "", customerPhone: "", notes: "", price: onboardingSuggestedPrice(data, reservationDraft.date, reservationDraft.time, reservationDraft.courtId) });
    setError("");
  }

  function finish() {
    const settings: AppSettings = {
      basePrice: data.basePrice,
      weekendPrice: data.weekendDifferent ? data.weekendPrice : data.basePrice,
      valleyPrice: data.valleyRanges[0]?.price ?? data.basePrice,
      openHour: data.openHour,
      closeHour: data.closeHour,
      slotDuration: data.slotDuration,
      confirmationLeadHours: 0,
      openDays: data.openDays,
      valleyRanges: data.valleyChoice === "yes" ? data.valleyRanges : []
    };
    const state: AppState = {
      complex: {
        id: generateId("complex"),
        name: data.complexName.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        responsibleName: data.responsibleName.trim(),
        configuredByRole: data.configuredByRole || undefined
      },
      courts: data.courts,
      settings,
      costs: { electricity: 0, gas: 0, water: 0, salaries: 0, rent: 0, taxes: 0, maintenance: 0, other: 0 },
      reservations: data.reservations,
      publicSlotIds: [],
      validationRecords: []
    };
    props.onComplete(state, data.configuredByRole);
  }

  const fixedCount = data.reservations.filter((reservation) => reservation.type === "fixed").length;
  const inputClass = "rounded-lg border border-line px-3 py-2";

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#050806_0%,#102116_28%,#f7fbf7_28%,#f7fbf7_100%)] px-4 py-6 text-field-900 sm:py-10">
      <section className="mx-auto max-w-5xl rounded-lg border border-line bg-white p-5 shadow-soft sm:p-7">
        <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-xs font-black uppercase text-lime-700">Paso {step} de 5</span>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Configuracion inicial del complejo</h1>
            <p className="mt-2 text-sm text-slate-600">Carga los datos basicos para dejar CanchaPro listo para operar.</p>
          </div>
          <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={props.onUseDemo}>Cargar demo academico</button>
        </header>
        <div className="mt-5 grid grid-cols-5 gap-2" aria-label={`Paso ${step} de 5`}>
          {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-2 rounded-full transition-colors" style={{ backgroundColor: item <= step ? "#a3e635" : "#e2e8f0" }} />)}
        </div>

        {step === 1 && (
          <WizardSection title="Datos del complejo" text="Empecemos por la informacion que identifica al complejo.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre del complejo *"><input className={inputClass} value={data.complexName} onChange={(event) => patchData({ complexName: event.target.value })} /></Field>
              <Field label="Direccion o zona"><input className={inputClass} value={data.address} onChange={(event) => patchData({ address: event.target.value })} /></Field>
              <Field label="Telefono / WhatsApp principal"><input className={inputClass} value={data.phone} onChange={(event) => patchData({ phone: event.target.value })} /></Field>
              <Field label="Nombre del responsable"><input className={inputClass} value={data.responsibleName} onChange={(event) => patchData({ responsibleName: event.target.value })} /></Field>
              <Field label="Rol de quien configura"><select className={inputClass} value={data.configuredByRole} onChange={(event) => patchData({ configuredByRole: event.target.value as Role | "" })}><option value="">Sin indicar</option><option value="owner">Dueno / Administrador</option><option value="staff">Encargado</option></select></Field>
            </div>
          </WizardSection>
        )}

        {step === 2 && (
          <WizardSection title="Horarios y canchas" text="Configura la operacion habitual. Luego podras ajustar cada cancha por separado.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Primer turno *"><input className={inputClass} type="time" value={data.openHour} onChange={(event) => patchData({ openHour: event.target.value, courts: data.courts.map((court) => ({ ...court, openHour: event.target.value })) })} /></Field>
              <Field label="Cierre *"><input className={inputClass} type="time" value={data.closeHour} onChange={(event) => patchData({ closeHour: event.target.value, courts: data.courts.map((court) => ({ ...court, closeHour: event.target.value })) })} /></Field>
              <Field label="Duracion estandar"><select className={inputClass} value={data.slotDuration} onChange={(event) => { const value = Number(event.target.value); patchData({ slotDuration: value, courts: data.courts.map((court) => ({ ...court, slotStepMinutes: value })) }); }}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></Field>
              <Field label="Cantidad de canchas *"><input className={inputClass} type="number" min="1" max="20" value={data.courts.length} onChange={(event) => setCourtCount(Number(event.target.value))} /></Field>
            </div>
            <div className="mt-4">
              <span className="text-sm font-black text-slate-700">Dias de apertura</span>
              <div className="mt-2 flex flex-wrap gap-2">{["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((name, day) => <label key={name} className={cn("flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-bold", data.openDays.includes(day) && "border-lime-500 bg-lime-50")}><input className="h-4 w-4" type="checkbox" checked={data.openDays.includes(day)} onChange={() => patchData({ openDays: data.openDays.includes(day) ? data.openDays.filter((item) => item !== day) : [...data.openDays, day] })} />{name}</label>)}</div>
            </div>
            <div className="mt-5 grid gap-3">
              {data.courts.map((court) => <div key={court.id} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Nombre"><input className={inputClass} value={court.name} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, name: event.target.value } : item) })} /></Field>
                <Field label="Tipo"><select className={inputClass} value={court.type} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, type: event.target.value as Court["type"] } : item) })}><option value="futbol5">Futbol 5</option><option value="futbol6">Futbol 6</option><option value="futbol7">Futbol 7</option><option value="futbol9">Futbol 9</option></select></Field>
                <Field label="Techada"><select className={inputClass} value={court.roofed ? "yes" : "no"} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, roofed: event.target.value === "yes" } : item) })}><option value="no">No</option><option value="yes">Si</option></select></Field>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold"><input className="h-4 w-4" type="checkbox" checked={court.active} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, active: event.target.checked } : item) })} />Activa</label>
                <Field label="Primer turno"><input className={inputClass} type="time" value={court.openHour} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, openHour: event.target.value } : item) })} /></Field>
                <Field label="Cierre"><input className={inputClass} type="time" value={court.closeHour} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, closeHour: event.target.value } : item) })} /></Field>
                <Field label="Intervalo entre turnos"><select className={inputClass} value={court.slotStepMinutes} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, slotStepMinutes: Number(event.target.value) } : item) })}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></Field>
              </div>)}
            </div>
          </WizardSection>
        )}

        {step === 3 && (
          <WizardSection title="Precios" text="Define una base simple. Las reglas opcionales se pueden ajustar mas adelante.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Precio base *"><input className={inputClass} type="number" min="1" value={data.basePrice || ""} onChange={(event) => patchData({ basePrice: Number(event.target.value || 0) })} /></Field>
              <Field label="Precio diferente fin de semana"><select className={inputClass} value={data.weekendDifferent ? "yes" : "no"} onChange={(event) => patchData({ weekendDifferent: event.target.value === "yes" })}><option value="no">No</option><option value="yes">Si</option></select></Field>
              {data.weekendDifferent && <Field label="Precio fin de semana *"><input className={inputClass} type="number" min="1" value={data.weekendPrice || ""} onChange={(event) => patchData({ weekendPrice: Number(event.target.value || 0) })} /></Field>}
              <Field label="Alguna cancha tiene precio distinto"><select className={inputClass} value={data.courtDifferent ? "yes" : "no"} onChange={(event) => patchData({ courtDifferent: event.target.value === "yes" })}><option value="no">No</option><option value="yes">Si</option></select></Field>
            </div>
            {data.courtDifferent && <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.courts.map((court) => <Field key={court.id} label={`Precio de ${court.name}`}><input className={inputClass} type="number" min="0" value={court.price || ""} onChange={(event) => patchData({ courts: data.courts.map((item) => item.id === court.id ? { ...item, price: Number(event.target.value || 0) } : item) })} /></Field>)}</div>}
            <div className="mt-5 grid gap-3">
              <Field label="Tiene horarios valle definidos"><select className={inputClass} value={data.valleyChoice} onChange={(event) => patchData({ valleyChoice: event.target.value as OnboardingData["valleyChoice"] })}><option value="unsure">No estoy seguro</option><option value="no">No</option><option value="yes">Si</option></select></Field>
              {data.valleyChoice === "yes" ? <>
                {data.valleyRanges.map((range) => <div key={range.id} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-3 sm:grid-cols-4">
                  <Field label="Dias (Lun a Vie)"><select className={inputClass} value={range.days.join(",")} onChange={(event) => patchData({ valleyRanges: data.valleyRanges.map((item) => item.id === range.id ? { ...item, days: event.target.value.split(",").map(Number) } : item) })}><option value="1,2,3,4,5">Lunes a viernes</option><option value="6,0">Fin de semana</option><option value="1,2,3,4,5,6,0">Todos los dias</option></select></Field>
                  <Field label="Desde"><input className={inputClass} type="time" value={range.from} onChange={(event) => patchData({ valleyRanges: data.valleyRanges.map((item) => item.id === range.id ? { ...item, from: event.target.value } : item) })} /></Field>
                  <Field label="Hasta"><input className={inputClass} type="time" value={range.to} onChange={(event) => patchData({ valleyRanges: data.valleyRanges.map((item) => item.id === range.id ? { ...item, to: event.target.value } : item) })} /></Field>
                  <Field label="Precio valle"><input className={inputClass} type="number" min="1" value={range.price || ""} onChange={(event) => patchData({ valleyRanges: data.valleyRanges.map((item) => item.id === range.id ? { ...item, price: Number(event.target.value || 0) } : item) })} /></Field>
                </div>)}
                <button className="min-h-11 justify-self-start rounded-lg border border-line px-4 text-sm font-black" type="button" onClick={() => patchData({ valleyRanges: [...data.valleyRanges, { id: generateId("valley"), days: [1, 2, 3, 4, 5], from: data.openHour, to: "19:00", price: data.basePrice }] })}>Agregar rango valle</button>
              </> : <p className="rounded-lg bg-lime-50 p-4 text-sm text-slate-700">CanchaPro podra sugerir horarios valle a partir de la ocupacion registrada con el uso.</p>}
            </div>
          </WizardSection>
        )}

        {step === 4 && (
          <WizardSection title="Reservas existentes" text="Podes cargar las reservas que ya tenes en WhatsApp, agenda, papel o planilla. Tambien podes omitir este paso y empezar con la agenda vacia.">
            <div className="grid gap-2 sm:grid-cols-3">{([["all", "Cargar reservas ahora"], ["fixed", "Cargar solo turnos fijos"], ["skip", "Omitir por ahora"]] as const).map(([value, label]) => <button key={value} className={cn("min-h-11 rounded-lg border border-line px-3 text-sm font-black", data.reservationMode === value && "border-lime-500 bg-lime-50")} type="button" onClick={() => { patchData({ reservationMode: value }); setReservationDraft({ ...reservationDraft, price: onboardingSuggestedPrice(data, reservationDraft.date, reservationDraft.time, reservationDraft.courtId) }); }}>{label}</button>)}</div>
            {data.reservationMode !== "skip" && <div className="mt-5 rounded-lg border border-line bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.reservationMode === "all" ? <Field label="Fecha"><input className={inputClass} type="date" min={today} value={reservationDraft.date} onChange={(event) => { const date = event.target.value; setReservationDraft({ ...reservationDraft, date, price: onboardingSuggestedPrice(data, date, reservationDraft.time, reservationDraft.courtId) }); }} /></Field> : <Field label="Dia de la semana"><select className={inputClass} value={fixedDay} onChange={(event) => { const day = Number(event.target.value); setFixedDay(day); setReservationDraft({ ...reservationDraft, price: onboardingSuggestedPrice(data, nextDateForWeekday(day, reservationDraft.time), reservationDraft.time, reservationDraft.courtId) }); }}>{["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"].map((name, day) => <option key={name} value={day}>{name}</option>)}</select></Field>}
                <Field label="Hora"><input className={inputClass} type="time" value={reservationDraft.time} onChange={(event) => { const time = event.target.value; const date = data.reservationMode === "fixed" ? nextDateForWeekday(fixedDay, time) : reservationDraft.date; setReservationDraft({ ...reservationDraft, time, price: onboardingSuggestedPrice(data, date, time, reservationDraft.courtId) }); }} /></Field>
                <Field label="Duracion"><select className={inputClass} value={reservationDraft.durationMinutes} onChange={(event) => setReservationDraft({ ...reservationDraft, durationMinutes: Number(event.target.value) })}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></Field>
                <Field label="Cancha"><select className={inputClass} value={reservationDraft.courtId} onChange={(event) => { const courtId = event.target.value; const date = data.reservationMode === "fixed" ? nextDateForWeekday(fixedDay, reservationDraft.time) : reservationDraft.date; setReservationDraft({ ...reservationDraft, courtId, price: onboardingSuggestedPrice(data, date, reservationDraft.time, courtId) }); }}>{data.courts.filter((court) => court.active).map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></Field>
                <Field label="Cliente"><input className={inputClass} value={reservationDraft.customerName} onChange={(event) => setReservationDraft({ ...reservationDraft, customerName: event.target.value })} /></Field>
                <Field label="Telefono"><input className={inputClass} value={reservationDraft.customerPhone} onChange={(event) => setReservationDraft({ ...reservationDraft, customerPhone: event.target.value })} /></Field>
                {data.reservationMode === "all" && <><Field label="Estado"><select className={inputClass} value={reservationDraft.status} onChange={(event) => setReservationDraft({ ...reservationDraft, status: event.target.value as ReservationStatus })}><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option></select></Field><Field label="Tipo"><select className={inputClass} value={reservationDraft.type} onChange={(event) => setReservationDraft({ ...reservationDraft, type: event.target.value as ReservationType })}><option value="occasional">Ocasional</option><option value="fixed">Turno fijo</option></select></Field></>}
                <Field label="Precio"><input className={inputClass} type="number" min="0" value={reservationDraft.price || ""} onChange={(event) => setReservationDraft({ ...reservationDraft, price: Number(event.target.value || 0) })} /></Field>
                <Field label="Observaciones"><input className={inputClass} value={reservationDraft.notes} onChange={(event) => setReservationDraft({ ...reservationDraft, notes: event.target.value })} /></Field>
              </div>
              <button className="mt-4 min-h-11 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={addInitialReservation}>Agregar otra reserva</button>
            </div>}
            <div className="mt-4 grid gap-2">{data.reservations.map((reservation) => <div key={reservation.id} className="flex flex-col gap-2 rounded-lg border border-line p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span><strong>{reservation.customerName}</strong> · {formatDate(reservation.date)} {reservation.time} · {data.courts.find((court) => court.id === reservation.courtId)?.name}</span><button className="font-black text-red-700" type="button" onClick={() => patchData({ reservations: data.reservations.filter((item) => item.id !== reservation.id) })}>Eliminar</button></div>)}</div>
          </WizardSection>
        )}

        {step === 5 && (
          <WizardSection title="Resumen y comenzar" text="Revisa la configuracion antes de entrar a CanchaPro.">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryItem label="Complejo" value={data.complexName} />
              <SummaryItem label="Horario" value={`${data.openHour} a ${data.closeHour}`} />
              <SummaryItem label="Dias abiertos" value={data.openDays.map((day) => dayNames[day]).join(", ")} />
              <SummaryItem label="Canchas" value={`${data.courts.length}: ${data.courts.map((court) => court.type.replace("futbol", "Futbol ")).join(", ")}`} />
              <SummaryItem label="Horarios por cancha" value={data.courts.map((court) => `${court.name}: ${court.openHour}-${court.closeHour}`).join(" / ")} />
              <SummaryItem label="Precio base" value={money(data.basePrice)} />
              <SummaryItem label="Precio fin de semana" value={data.weekendDifferent ? money(data.weekendPrice) : "Igual al precio base"} />
              <SummaryItem label="Horarios valle" value={data.valleyChoice === "yes" ? `${data.valleyRanges.length} rango(s)` : "No configurados"} />
              <SummaryItem label="Reservas iniciales" value={`${data.reservations.length} (${fixedCount} turnos fijos)`} />
            </div>
          </WizardSection>
        )}

        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
          <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black disabled:opacity-30" type="button" disabled={step === 1} onClick={() => { setError(""); setStep(step - 1); }}>Volver</button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={props.onUseDemo}>Cargar demo academico</button>
            {step < 5 ? <button className="min-h-11 rounded-lg bg-lime-400 px-5 text-sm font-black text-field-900" type="button" onClick={goNext}>Continuar</button> : <button className="min-h-11 rounded-lg bg-field-700 px-5 text-sm font-black text-white" type="button" onClick={finish}>Empezar a usar CanchaPro</button>}
          </div>
        </footer>
      </section>
    </main>
  );
}

function WizardSection(props: { title: string; text: string; children: ReactNode }) {
  return <section className="mt-6"><h2 className="text-xl font-black">{props.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{props.text}</p><div className="mt-5">{props.children}</div></section>;
}

function SummaryItem(props: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-slate-50 p-4"><span className="text-xs font-black uppercase text-slate-500">{props.label}</span><strong className="mt-1 block">{props.value}</strong></div>;
}

function newSetupCourt(index: number, openHour: string, closeHour: string, slotDuration: number): Court {
  return { id: generateId("court"), name: `Cancha ${index}`, type: "futbol5", roofed: false, active: true, openHour, closeHour, slotStepMinutes: slotDuration };
}

function onboardingSuggestedPrice(data: OnboardingData, date: string, time: string, courtId: string) {
  const day = parseInputDate(date).getDay();
  const valleyRange = data.valleyChoice === "yes" ? data.valleyRanges.find((range) => range.days.includes(day) && time >= range.from && time < range.to) : undefined;
  if (valleyRange) return valleyRange.price;
  const courtPrice = data.courts.find((court) => court.id === courtId)?.price;
  if (data.courtDifferent && courtPrice) return courtPrice;
  if (data.weekendDifferent && (day === 0 || day === 6)) return data.weekendPrice;
  return data.basePrice;
}

function nextDateForWeekday(day: number, time: string) {
  const date = new Date();
  const distance = (day - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + distance);
  if (distance === 0 && timeToMinutes(time) <= new Date().getHours() * 60 + new Date().getMinutes()) date.setDate(date.getDate() + 7);
  return toInputDate(date);
}

function timesOverlap(firstTime: string, firstDuration: number, secondTime: string, secondDuration: number) {
  const firstStart = timeToMinutes(firstTime);
  const secondStart = timeToMinutes(secondTime);
  return firstStart < secondStart + secondDuration && secondStart < firstStart + firstDuration;
}

function PilotNotice() {
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-950">
      CanchaPro se encuentra en etapa MVP/Piloto. Los indicadores son estimativos y no reemplazan registros contables formales.
    </div>
  );
}

function AgendaView(props: {
  activeCourts: AppState["courts"];
  reservations: Reservation[];
  settings: AppState["settings"];
  slots: string[];
  weekDate: string;
  courtFilter: string;
  statusFilter: ReservationStatus | "all" | "free";
  setWeekDate: (value: string) => void;
  setCourtFilter: (value: string) => void;
  setStatusFilter: (value: ReservationStatus | "all" | "free") => void;
  openDraft: (input?: Partial<ReservationDraft>) => void;
}) {
  const weekStart = startOfWeek(parseInputDate(props.weekDate));
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const filteredCourts = props.courtFilter === "all" ? props.activeCourts : props.activeCourts.filter((court) => court.id === props.courtFilter);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-3 shadow-soft">
        <Field label="Semana"><input className="rounded-lg border border-line px-3 py-2" type="date" value={props.weekDate} onChange={(event) => props.setWeekDate(event.target.value)} /></Field>
        <Field label="Cancha"><select className="rounded-lg border border-line px-3 py-2" value={props.courtFilter} onChange={(event) => props.setCourtFilter(event.target.value)}><option value="all">Todas</option>{props.activeCourts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></Field>
        <Field label="Estado"><select className="rounded-lg border border-line px-3 py-2" value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value as ReservationStatus | "all" | "free")}><option value="all">Todos</option><option value="confirmed">Confirmadas</option><option value="pending">Pendientes</option><option value="cancelled">Canceladas</option><option value="free">Libres</option></select></Field>
      </div>

      <div className="overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[110px_repeat(7,minmax(124px,1fr))] bg-field-100">
            <div className="border-b border-line p-3 text-sm font-black">Horario</div>
            {dates.map((date) => <div key={date.toISOString()} className="border-b border-l border-line p-3 text-sm font-black">{dayNames[date.getDay()]} {date.getDate()}/{date.getMonth() + 1}</div>)}
          </div>
          {props.slots.map((slot) => (
            <div key={slot} className="grid grid-cols-[110px_repeat(7,minmax(124px,1fr))]">
              <div className="border-b border-line bg-slate-50 p-3 text-sm font-black text-slate-500">{slot}</div>
              {dates.map((date) => {
                const dateText = toInputDate(date);
                return (
                  <div key={`${dateText}-${slot}`} className={cn("min-h-24 border-b border-l border-line p-2", isPastSlot(dateText, slot) && "bg-slate-100 text-slate-400")}>
                    {filteredCourts.map((court) => {
                      if (!isOpenDay(dateText, props.settings)) return null;
                      const courtSlots = getCourtTimeSlots(court, props.settings);
                      if (!courtSlots.includes(slot)) return null;
                      const reservation = props.reservations.find((item) => reservationAppearsOnDate(item, dateText) && item.courtId === court.id && item.status !== "cancelled" && slotOverlapsReservation(slot, item));
                      const cancelledReservation = props.reservations.find((item) => item.date === dateText && item.time === slot && item.courtId === court.id && item.status === "cancelled");
                      const sourceReservation = reservation ?? cancelledReservation;
                      const visibleReservation = sourceReservation ? { ...sourceReservation, date: dateText, status: getEffectiveStatus(sourceReservation, dateText, props.settings.confirmationLeadHours) } : undefined;
                      if (props.statusFilter === "free" && visibleReservation) return null;
                      if (props.statusFilter !== "all" && props.statusFilter !== "free" && visibleReservation?.status !== props.statusFilter) return null;
                      return visibleReservation ? (
                        <button
                          key={court.id}
                          className={cn("mb-2 w-full rounded-lg border p-2 text-left text-xs", visibleReservation.status === "cancelled" && "border-lime-300 bg-lime-50", visibleReservation.status === "pending" && "border-yellow-300 bg-yellow-50", visibleReservation.status === "confirmed" && "border-emerald-200 bg-emerald-50")}
                          type="button"
                          onClick={() => props.openDraft({ ...(sourceReservation ?? visibleReservation), date: dateText, time: slot, courtId: court.id, status: visibleReservation.status })}
                        >
                          <strong className="flex items-center gap-1">{visibleReservation.type === "fixed" && <Repeat2 size={13} aria-label="Turno fijo" />} {court.name} - {visibleReservation.status === "cancelled" ? "Disponible reventa" : visibleReservation.customerName}</strong>
                          <span className="text-slate-500">{visibleReservation.status === "cancelled" ? "Horario liberado" : visibleReservation.status === "pending" ? "Pendiente" : "Confirmada"} - {visibleReservation.durationMinutes || 60} min - {money(visibleReservation.price)}</span>
                        </button>
                      ) : isPastSlot(dateText, slot) ? (
                        <div key={court.id} className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-left text-xs text-slate-400">
                          <strong className="block">{court.name}</strong>
                          Turno pasado
                        </div>
                      ) : (
                        <button key={court.id} className="mb-2 w-full rounded-lg border border-dashed border-line bg-white p-2 text-left text-xs text-slate-500" type="button" onClick={() => props.openDraft({ date: dateText, time: slot, courtId: court.id })}>
                          <strong className="block text-field-900">{court.name}</strong>
                          Libre · {money(suggestPrice(dateText, slot, props.settings))}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReservationsView(props: { reservations: Reservation[]; courts: AppState["courts"]; search: string; setSearch: (value: string) => void; editReservation: (reservation: Reservation) => void; goToCancellations: () => void; markPaid: (reservationId: string, occurrenceDate: string) => void }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><span className="text-xs font-black uppercase tracking-wide text-slate-500">Operacion diaria</span><h2 className="text-xl font-black">Reservas cargadas</h2></div>
        <input className="max-w-md rounded-lg border border-line px-3 py-2" type="search" placeholder="Buscar cliente, telefono o cancha" value={props.search} onChange={(event) => props.setSearch(event.target.value)} />
      </div>
      <div className="overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-field-100 text-left text-xs uppercase text-slate-500">
            <tr>{["Fecha", "Hora", "Cancha", "Cliente", "Tipo", "Duracion", "Estado", "Precio", ""].map((head) => <th key={head} className="border-b border-line p-3">{head}</th>)}</tr>
          </thead>
          <tbody>
            {props.reservations.map((reservation) => (
              <tr key={reservation.id}>
                <td className="border-b border-line p-3">{formatDate(reservation.date)}</td>
                <td className="border-b border-line p-3">{reservation.time}</td>
                <td className="border-b border-line p-3">{props.courts.find((court) => court.id === reservation.courtId)?.name}</td>
                <td className="border-b border-line p-3 font-bold">{reservation.customerName}</td>
                <td className="border-b border-line p-3">{reservation.type === "fixed" ? "Turno fijo" : "Ocasional"}</td>
                <td className="border-b border-line p-3">{reservation.durationMinutes || 60} min</td>
                <td className="border-b border-line p-3"><span className={cn("rounded-full px-3 py-1 text-xs font-black", reservation.status === "pending" && "bg-yellow-100 text-yellow-800", reservation.status === "confirmed" && "bg-emerald-100 text-emerald-800", reservation.status === "cancelled" && "bg-red-100 text-red-800")}>{reservation.status === "cancelled" ? "Cancelada" : reservation.status === "pending" ? "Pendiente" : "Confirmada"}</span></td>
                <td className="border-b border-line p-3">{money(reservation.price)}</td>
                <td className="border-b border-line p-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-lg border border-line px-3 py-2 font-bold text-field-700" type="button" onClick={() => props.editReservation(reservation)}>Editar</button>
                    {reservation.status === "confirmed" && canMarkPaidNow(reservation.date, reservation.time) && (
                      <button className="rounded-lg bg-lime-400 px-3 py-2 font-bold text-field-900 disabled:bg-slate-200 disabled:text-slate-500" type="button" disabled={isReservationPaid(reservation, reservation.date)} onClick={() => props.markPaid(reservation.id, reservation.date)}>
                        {isReservationPaid(reservation, reservation.date) ? "Pagado" : "Marcar pago"}
                      </button>
                    )}
                    {reservation.status === "cancelled" && <button className="rounded-lg bg-lime-400 px-3 py-2 font-bold text-field-900" type="button" onClick={props.goToCancellations}>Vender</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AvailabilityView(props: { date: string; phone: string; message: string; setDate: (value: string) => void; setPhone: (value: string) => void; copyAvailability: () => void }) {
  const whatsappHref = props.phone.trim() ? `https://wa.me/${props.phone.trim()}?text=${encodeURIComponent(props.message)}` : `https://wa.me/?text=${encodeURIComponent(props.message)}`;
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Horarios disponibles</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Para responder consultas por WhatsApp con los turnos libres de una fecha.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Fecha"><input className="rounded-lg border border-line px-3 py-2" type="date" min={toInputDate(new Date())} value={props.date} onChange={(event) => props.setDate(event.target.value)} /></Field>
          <Field label="Telefono destino opcional"><input className="rounded-lg border border-line px-3 py-2" type="tel" placeholder="5492215555555" value={props.phone} onChange={(event) => props.setPhone(event.target.value)} /></Field>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <Field label="Mensaje"><textarea className="min-h-64 rounded-lg border border-line px-3 py-2" readOnly value={props.message} /></Field>
        <p className="mt-3 text-sm font-bold text-slate-500">Se generara un mensaje prearmado. El envio se realiza desde WhatsApp, servicio externo a CanchaPro.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={props.copyAvailability}><Copy size={17} />Copiar</button>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17} />Abrir WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

function CancellationsView(props: { state: AppState; setState: (state: AppState) => void; notify: (message: string) => void }) {
  const cancelled = props.state.reservations
    .filter((reservation) => reservation.status === "cancelled" && !isPastSlot(reservation.date, reservation.time))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const totalRisk = cancelled.reduce((total, reservation) => total + reservation.price, 0);

  function resaleMessage(reservation: Reservation) {
    const court = props.state.courts.find((item) => item.id === reservation.courtId);
    return `Hola! Tenemos disponible ${court?.name ?? "cancha"} el ${formatDate(reservation.date)} de ${reservation.time} a ${addMinutesToTime(reservation.time, reservation.durationMinutes || 60)}. Valor: ${money(reservation.price)}. Responde este mensaje para reservar.`;
  }

  function copyResale(reservation: Reservation) {
    navigator.clipboard?.writeText(resaleMessage(reservation)).then(
      () => props.notify("Mensaje de reventa copiado."),
      () => props.notify("No se pudo copiar automaticamente.")
    );
  }

  function publishForResale(reservation: Reservation) {
    const slotId = `${reservation.date}-${reservation.courtId}-${reservation.time}`;
    const next = new Set(props.state.publicSlotIds ?? []);
    next.add(slotId);
    props.setState({ ...props.state, publicSlotIds: Array.from(next) });
    props.notify("Horario publicado en la vista publica.");
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Cancelaciones registradas" value={String(cancelled.length)} />
        <Kpi label="Ingreso en riesgo" value={money(totalRisk)} />
        <Kpi label="Horarios liberados" value={String(cancelled.length)} />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {cancelled.map((reservation) => {
          const court = props.state.courts.find((item) => item.id === reservation.courtId);
          const text = resaleMessage(reservation);
          return (
            <article key={reservation.id} className="rounded-lg border border-l-4 border-line border-l-lime-400 bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Disponible para reventa</span>
                  <strong className="mt-1 block text-lg">{formatDate(reservation.date)} - {reservation.time} - {court?.name}</strong>
                  <p className="mt-1 text-sm text-slate-600">{reservation.cancellationReason || "Sin motivo cargado"}</p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">{money(reservation.price)}</span>
              </div>
              <textarea className="mt-4 min-h-24 rounded-lg border border-line px-3 py-2 text-sm" readOnly value={text} />
              <p className="mt-3 text-sm font-bold text-slate-500">Se generara un mensaje prearmado. El envio se realiza desde WhatsApp, servicio externo a CanchaPro.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={() => copyResale(reservation)}><Copy size={17} />Copiar reventa</button>
                <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} />Abrir WhatsApp</a>
                <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900" type="button" onClick={() => publishForResale(reservation)}><Share2 size={17} />Publicar para reventa</button>
              </div>
            </article>
          );
        })}
      </section>

      {!cancelled.length && <EmptyState title="Sin cancelaciones" text="Cuando canceles una reserva, el horario aparecera aca como oportunidad de reventa." />}
    </div>
  );
}

function ConfirmationsView(props: { state: AppState; setState: (state: AppState) => void; notify: (message: string) => void; markPaid: (reservationId: string, occurrenceDate: string) => void }) {
  const targetDate = getConfirmationTargetDate(props.state.settings.confirmationLeadHours);
  const today = toInputDate(new Date());
  const turns = props.state.reservations
    .filter((reservation) => reservationAppearsOnDate(reservation, targetDate) && reservation.status !== "cancelled")
    .map((reservation) => ({ ...reservation, date: targetDate, status: getEffectiveStatus(reservation, targetDate, props.state.settings.confirmationLeadHours) }))
    .filter((reservation) => !isOutsideConfirmationTolerance(reservation.date, reservation.time))
    .sort((a, b) => a.time.localeCompare(b.time));
  const paymentTurns = props.state.reservations
    .filter((reservation) => reservationAppearsOnDate(reservation, today) && reservation.status !== "cancelled")
    .map((reservation) => ({ ...reservation, date: today, status: getEffectiveStatus(reservation, today, props.state.settings.confirmationLeadHours) }))
    .filter((reservation) => reservation.status === "confirmed" && canMarkPaidNow(reservation.date, reservation.time))
    .sort((a, b) => a.time.localeCompare(b.time));

  function messageFor(reservation: Reservation) {
    const court = props.state.courts.find((item) => item.id === reservation.courtId)?.name ?? "la cancha";
    return `Hola ${reservation.customerName}! Te escribimos para confirmar tu turno del ${formatDate(reservation.date)} a las ${reservation.time} en ${court}. Por favor respondanos si sigue todo ok.`;
  }

  function copyMessage(reservation: Reservation) {
    navigator.clipboard?.writeText(messageFor(reservation)).then(
      () => props.notify("Mensaje de confirmacion copiado."),
      () => props.notify("No se pudo copiar automaticamente.")
    );
  }

  function markConfirmed(reservation: Reservation) {
    props.setState({
      ...props.state,
      reservations: props.state.reservations.map((item) => item.id === reservation.id ? item.type === "fixed"
        ? { ...item, confirmedDates: Array.from(new Set([...(item.confirmedDates ?? []), reservation.date])) }
        : { ...item, status: "confirmed" } : item)
    });
    props.notify("Turno marcado como confirmado.");
  }

  function markPaid(reservation: Reservation) {
    props.markPaid(reservation.id, reservation.date);
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Operacion diaria</span>
        <h2 className="mt-1 text-xl font-black">Turnos a confirmar</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Configurado para pedir confirmacion {props.state.settings.confirmationLeadHours === 0 ? "el mismo dia" : `${props.state.settings.confirmationLeadHours} horas antes`}. Fecha objetivo: {formatDate(targetDate)}.
        </p>
      </section>

      {paymentTurns.length > 0 && (
        <section className="rounded-lg border border-lime-200 bg-lime-50 p-5">
          <h3 className="font-black text-lime-950">Cobros de ahora</h3>
          <p className="mt-1 text-sm text-lime-900">Turnos confirmados de la hora actual y la proxima hora.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {paymentTurns.map((reservation) => (
              <button key={`pay-${reservation.id}`} className="rounded-lg bg-white px-4 py-3 text-left text-sm font-bold text-field-900 shadow-soft disabled:text-slate-400" type="button" disabled={isReservationPaid(reservation, reservation.date)} onClick={() => markPaid(reservation)}>
                {reservation.time} - {reservation.customerName}: {isReservationPaid(reservation, reservation.date) ? "Pago registrado" : "Marcar pago"}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {turns.map((reservation) => {
          const court = props.state.courts.find((item) => item.id === reservation.courtId);
          const text = messageFor(reservation);
          const whatsappHref = reservation.customerPhone ? `https://wa.me/${reservation.customerPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
          return (
            <article key={reservation.id} className={cn("rounded-lg border bg-white p-4 shadow-soft", reservation.status === "pending" ? "border-yellow-300" : "border-line")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block text-lg">{reservation.time} - {court?.name}</strong>
                  <span className="text-sm font-bold text-slate-500">{reservation.customerName} · {reservation.durationMinutes || 60} min</span>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-black", reservation.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-emerald-100 text-emerald-800")}>
                  {reservation.status === "pending" ? "Pendiente" : "Confirmada"}
                </span>
              </div>
              <textarea className="mt-4 min-h-24 rounded-lg border border-line px-3 py-2 text-sm" readOnly value={text} />
              <p className="mt-3 text-sm font-bold text-slate-500">Se generara un mensaje prearmado. El envio se realiza desde WhatsApp, servicio externo a CanchaPro.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={() => copyMessage(reservation)}><Copy size={17} />Copiar</button>
                <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17} />WhatsApp</a>
                <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={() => markConfirmed(reservation)}>Marcar confirmada</button>
                {reservation.status === "confirmed" && canMarkPaidNow(reservation.date, reservation.time) && (
                  <button className="min-h-11 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900 disabled:bg-slate-200 disabled:text-slate-500" type="button" disabled={isReservationPaid(reservation, reservation.date)} onClick={() => markPaid(reservation)}>
                    {isReservationPaid(reservation, reservation.date) ? "Pago registrado" : "Marcar pago"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!turns.length && <EmptyState title="No hay turnos para confirmar" text="Cuando haya reservas en la fecha objetivo, apareceran aca con su mensaje listo para copiar." />}
    </div>
  );
}

function CustomersView(props: { state: AppState; setState: (state: AppState) => void; openDraft: (input?: Partial<ReservationDraft>) => void; notify: (message: string) => void }) {
  const customers = getCustomers(props.state);
  const [selectedKey, setSelectedKey] = useState("");
  const selectedCustomer = customers.find((customer) => customer.key === selectedKey) ?? null;
  const [customerDraft, setCustomerDraft] = useState({ name: "", phone: "" });

  function openCustomer(customer: ReturnType<typeof getCustomers>[number]) {
    setSelectedKey(customer.key);
    setCustomerDraft({ name: customer.name, phone: customer.phone });
  }

  function saveCustomer() {
    if (!selectedCustomer) return;
    props.setState({
      ...props.state,
      reservations: props.state.reservations.map((reservation) => {
        const key = normalize(`${reservation.customerName}-${reservation.customerPhone}`);
        return reservation.type === "fixed" && key === selectedCustomer.key
          ? { ...reservation, customerName: customerDraft.name.trim(), customerPhone: customerDraft.phone.trim() }
          : reservation;
      })
    });
    props.notify("Datos del turno fijo actualizados.");
    setSelectedKey(normalize(`${customerDraft.name.trim()}-${customerDraft.phone.trim()}`));
  }

  return (
    <div className="grid gap-4">
      <div>
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Gestion comercial</span>
        <h2 className="text-xl font-black">Turnos fijos</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Contactos habituales de turnos fijos. Las reservas ocasionales se registran para confirmar el turno, pero no alimentan esta lista.</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {customers.map((customer) => (
          <button key={customer.key} className="rounded-lg border border-line bg-white p-4 text-left shadow-soft" type="button" onClick={() => openCustomer(customer)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block text-lg">{customer.name}</strong>
                <span className="text-sm font-bold text-slate-500">{customer.phone || "Sin telefono cargado"}</span>
              </div>
              <span className="rounded-full bg-field-100 px-3 py-1 text-xs font-black text-field-700">{customer.total} turnos</span>
            </div>
            <div className="mt-4 grid gap-2">
              <Metric label="Confirmadas" value={String(customer.confirmed)} />
              <Metric label="Canceladas" value={String(customer.cancelled)} />
              <Metric label="Ingresos historicos" value={money(customer.revenue)} />
              <Metric label="Ultima reserva" value={customer.lastReservation ? formatDate(customer.lastReservation) : "-"} />
            </div>
          </button>
        ))}
      </div>

      {!customers.length && <EmptyState title="Todavia no hay turnos fijos" text="Cuando cargues reservas fijas, apareceran aca sus datos de contacto." />}

      {selectedCustomer && (
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Detalle del turno fijo</span>
              <h3 className="mt-1 text-xl font-black">{selectedCustomer.name}</h3>
            </div>
            <button className="rounded-lg border border-line px-3 py-2 text-sm font-black" type="button" onClick={() => setSelectedKey("")}>Cerrar</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input className="rounded-lg border border-line px-3 py-2" value={customerDraft.name} onChange={(event) => setCustomerDraft({ ...customerDraft, name: event.target.value })} /></Field>
            <Field label="Contacto"><input className="rounded-lg border border-line px-3 py-2" value={customerDraft.phone} onChange={(event) => setCustomerDraft({ ...customerDraft, phone: event.target.value })} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="min-h-11 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={saveCustomer}>Guardar datos</button>
            <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={() => props.openDraft({ customerName: selectedCustomer.name, customerPhone: selectedCustomer.phone, type: "fixed" })}>Nuevo turno fijo</button>
          </div>
          <div className="mt-5 overflow-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-field-100 text-left text-xs uppercase text-slate-500">
                <tr>{["Dia base", "Hora", "Cancha", "Duracion", "Precio", "Estado", ""].map((head) => <th key={head} className="border-b border-line p-3">{head}</th>)}</tr>
              </thead>
              <tbody>
                {selectedCustomer.reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="border-b border-line p-3">{dayNames[parseInputDate(reservation.date).getDay()]} - {formatDate(reservation.date)}</td>
                    <td className="border-b border-line p-3">{reservation.time}</td>
                    <td className="border-b border-line p-3">{props.state.courts.find((court) => court.id === reservation.courtId)?.name}</td>
                    <td className="border-b border-line p-3">{reservation.durationMinutes} min</td>
                    <td className="border-b border-line p-3">{money(reservation.price)}</td>
                    <td className="border-b border-line p-3">{reservation.status === "cancelled" ? "Cancelada" : reservation.status === "pending" ? "Pendiente" : "Confirmada"}</td>
                    <td className="border-b border-line p-3"><button className="rounded-lg border border-line px-3 py-2 font-bold text-field-700" type="button" onClick={() => props.openDraft({ ...reservation })}>Editar turno</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PublicAvailabilityView(props: { state: AppState; setState: (state: AppState) => void; complexId: string; date: string; setDate: (value: string) => void; notify: (message: string) => void }) {
  const freeSlots = getPublicSlots(props.state, props.date);
  const selectedIds = new Set(props.state.publicSlotIds ?? []);
  const publishedSlots = freeSlots.filter((slot) => selectedIds.has(slot.id));
  const publicUrl = typeof window === "undefined" ? "" : `${window.location.origin}/disponibilidad?complejo=${props.complexId}&fecha=${props.date}`;
  const message = `${props.state.complex.name} - horarios disponibles ${formatDate(props.date)}:\n\n${publishedSlots.map((slot) => `- ${slot.time} ${slot.courtName} - ${money(slot.price)}`).join("\n")}\n\nPara confirmar, escribinos por WhatsApp.`;
  const whatsappHref = `https://wa.me/${props.state.complex.phone}?text=${encodeURIComponent(message)}`;

  function copyLink() {
    navigator.clipboard?.writeText(publicUrl).then(
      () => props.notify("Link publico copiado."),
      () => props.notify("No se pudo copiar el link automaticamente.")
    );
  }

  function toggleSlot(slotId: string) {
    const next = new Set(props.state.publicSlotIds ?? []);
    if (next.has(slotId)) next.delete(slotId);
    else next.add(slotId);
    props.setState({ ...props.state, publicSlotIds: Array.from(next) });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">No marketplace</span>
        <h2 className="mt-1 text-xl font-black">Vista publica controlada</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Elegi manualmente que horarios libres publicar. El jugador no reserva solo: consulta y el complejo confirma.
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">La disponibilidad publicada es informativa y debe confirmarse con el complejo por WhatsApp.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Fecha visible"><input className="rounded-lg border border-line px-3 py-2" type="date" min={toInputDate(new Date())} value={props.date} onChange={(event) => props.setDate(event.target.value)} /></Field>
          <Field label="Link de ejemplo"><input className="rounded-lg border border-line px-3 py-2" readOnly value={publicUrl} /></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={copyLink}>
            <Copy size={17} />
            Copiar link
          </button>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" href={whatsappHref} target="_blank" rel="noreferrer">
            <MessageCircle size={17} />
            Difundir por WhatsApp
          </a>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-500">Se generara un mensaje prearmado. El envio se realiza desde WhatsApp, servicio externo a CanchaPro.</p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="border-b border-line pb-4">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">{props.state.complex.address}</span>
          <h2 className="mt-1 text-2xl font-black">{props.state.complex.name}</h2>
          <p className="mt-2 text-sm text-slate-600">Disponibilidad para consultar el {formatDate(props.date)}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {freeSlots.map((slot) => (
            <article key={slot.id} className={cn("rounded-lg border p-3", selectedIds.has(slot.id) ? "border-field-700 bg-emerald-50" : "border-line bg-slate-50")}>
              <label className="mb-2 flex items-center gap-2 text-sm font-black text-slate-600">
                <input className="h-4 w-4" type="checkbox" checked={selectedIds.has(slot.id)} onChange={() => toggleSlot(slot.id)} />
                Publicar
              </label>
              <strong className="block">{slot.time} - {slot.courtName}</strong>
              <span className="text-sm font-bold text-field-700">{money(slot.price)}</span>
            </article>
          ))}
        </div>
        {!freeSlots.length && <EmptyState title="Sin horarios publicados" text="No hay espacios libres para esta fecha con la configuracion actual." />}
      </section>
    </div>
  );
}

function DashboardView(props: { state: AppState; month: string; setMonth: (value: string) => void; metrics: ReturnType<typeof getMonthlyMetrics> }) {
  const cancelled = props.state.reservations.filter((item) => item.date.startsWith(props.month) && item.status === "cancelled").slice(0, 6);
  const valleyHours = getValleyHours(props.state);
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-line bg-white p-3 shadow-soft"><Field label="Mes"><input className="max-w-xs rounded-lg border border-line px-3 py-2" type="month" value={props.month} onChange={(event) => props.setMonth(event.target.value)} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Ocupacion" value={percent(props.metrics.occupancy)} />
        <Kpi label="Turnos confirmados" value={String(props.metrics.confirmedCount)} />
        <Kpi label="Turnos vendidos" value={String(props.metrics.soldCount)} />
        <Kpi label="Cancelaciones" value={String(props.metrics.cancelledCount)} />
        <Kpi label="Ingresos estimados" value={money(props.metrics.revenue)} />
        <Kpi label="Ingresos cobrados" value={money(props.metrics.soldRevenue)} />
        <Kpi label="Turnos libres" value={String(Math.max(0, props.metrics.capacity - props.metrics.confirmedCount))} />
        <Kpi label="Ingresos perdidos" value={money(props.metrics.cancelledLoss)} />
        <Kpi label="Recuperable estimado" value={money(props.metrics.uncapturedRevenue)} />
        <Kpi label="Punto equilibrio" value={money(props.metrics.fixedCosts)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft"><h2 className="text-xl font-black">Lectura comercial</h2><div className="mt-4 grid gap-3"><Metric label="Capacidad mensual" value={`${props.metrics.capacity} turnos`} /><Metric label="Turnos minimos para cubrir costos" value={String(Math.ceil(props.metrics.breakEvenTurns))} /><Metric label="Ocupacion minima necesaria" value={percent(props.metrics.minimumOccupancy)} /><Metric label="Ingresos no capturados" value={money(props.metrics.uncapturedRevenue)} /><Metric label="Utilidad estimada" value={money(props.metrics.profit)} /></div></div>
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft"><h2 className="text-xl font-black">Cancelaciones recientes</h2><div className="mt-4 grid gap-3">{cancelled.length ? cancelled.map((item) => <Metric key={item.id} label={`${formatDate(item.date)} · ${item.time}`} value={money(item.price)} />) : <p className="text-sm text-slate-500">No hay cancelaciones registradas este mes.</p>}</div></div>
      </div>
      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <span className="text-xs font-black uppercase tracking-wide text-emerald-800">Dolor economico</span>
          <p className="mt-2 text-sm font-bold text-emerald-950">{props.metrics.cancelledCount} cancelaciones representan {money(props.metrics.cancelledLoss)} que conviene intentar recuperar.</p>
        </article>
        <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <span className="text-xs font-black uppercase tracking-wide text-emerald-800">Oportunidad de recuperacion</span>
          <p className="mt-2 text-sm font-bold text-emerald-950">Cada turno recuperado mejora el resultado mensual. Este dato sirve para conversar si la reventa de cancelaciones es un dolor real del complejo.</p>
        </article>
        <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <span className="text-xs font-black uppercase tracking-wide text-emerald-800">Horarios valle detectados</span>
          <p className="mt-2 text-sm font-bold text-emerald-950">{valleyHours.length ? valleyHours.join(", ") : "Todavia no hay patron suficiente para detectar horarios ociosos."}</p>
        </article>
      </section>
    </div>
  );
}

function ProfitabilityView(props: { state: AppState; setState: (state: AppState) => void }) {
  const [costs, setCosts] = useState<FixedCosts>(props.state.costs);
  return (
    <div className="grid max-w-4xl gap-4">
      <form className="rounded-lg border border-line bg-white p-5 shadow-soft" onSubmit={(event) => { event.preventDefault(); props.setState({ ...props.state, costs }); }}>
        <div className="flex items-center gap-2"><ShieldCheck size={19} className="text-field-700" /><h2 className="text-xl font-black">Costos fijos mensuales</h2></div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Carga los costos fijos del mes. El analisis economico, punto de equilibrio y utilidad estimada se muestran en el Tablero del dueno.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(costLabels) as Array<keyof FixedCosts>).map((key) => (
            <Field key={key} label={costLabels[key]}><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" step="1000" value={costs[key]} onChange={(event) => setCosts({ ...costs, [key]: Number(event.target.value || 0) })} /></Field>
          ))}
        </div>
        <button className="mt-4 min-h-11 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="submit">Guardar costos</button>
      </form>
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950">
        Los calculos de punto de equilibrio, utilidad e ingresos estimados son orientativos para la gestion del complejo. No reemplazan informacion contable, impositiva ni asesoramiento profesional.
      </section>
    </div>
  );
}

function ValidationView(props: { state: AppState; setState: (state: AppState) => void; notify: (message: string) => void }) {
  const [draft, setDraft] = useState({
    complexName: "",
    courtsCount: 3,
    currentMethod: "WhatsApp + cuaderno",
    weeklyCancellations: 2,
    unsoldTurnsPerWeek: 5,
    averageTurnPrice: props.state.settings.basePrice,
    staffLoadedWithoutHelp: true,
    ownerUnderstoodDashboard: true,
    willingnessToPay: "free_trial" as ValidationRecord["willingnessToPay"],
    willingnessAmount: 50000,
    comments: ""
  });

  function saveValidation(event: FormEvent) {
    event.preventDefault();
    const record: ValidationRecord = {
      id: generateId("validation"),
      ...draft,
      createdAt: new Date().toISOString()
    };
    props.setState({ ...props.state, validationRecords: [record, ...props.state.validationRecords] });
    props.notify("Registro de validacion guardado.");
    setDraft({ ...draft, complexName: "", comments: "" });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <form className="rounded-lg border border-line bg-white p-5 shadow-soft" onSubmit={saveValidation}>
        <div className="flex items-center gap-2"><ClipboardCheck size={19} className="text-field-700" /><h2 className="text-xl font-black">Validacion con complejos</h2></div>
        <p className="mt-2 text-sm text-slate-500">Instrumento simple para registrar aprendizajes de entrevistas o pruebas con duenos y encargados.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Complejo entrevistado"><input className="rounded-lg border border-line px-3 py-2" required value={draft.complexName} onChange={(event) => setDraft({ ...draft, complexName: event.target.value })} /></Field>
          <Field label="Cantidad de canchas"><input className="rounded-lg border border-line px-3 py-2" type="number" min="1" value={draft.courtsCount} onChange={(event) => setDraft({ ...draft, courtsCount: Number(event.target.value || 0) })} /></Field>
          <Field label="Metodo actual"><input className="rounded-lg border border-line px-3 py-2" value={draft.currentMethod} onChange={(event) => setDraft({ ...draft, currentMethod: event.target.value })} /></Field>
          <Field label="Cancelaciones por semana"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" value={draft.weeklyCancellations} onChange={(event) => setDraft({ ...draft, weeklyCancellations: Number(event.target.value || 0) })} /></Field>
          <Field label="Turnos ociosos por semana"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" value={draft.unsoldTurnsPerWeek} onChange={(event) => setDraft({ ...draft, unsoldTurnsPerWeek: Number(event.target.value || 0) })} /></Field>
          <Field label="Precio promedio"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" step="500" value={draft.averageTurnPrice} onChange={(event) => setDraft({ ...draft, averageTurnPrice: Number(event.target.value || 0) })} /></Field>
          <Field label="El encargado lo cargo solo"><select className="rounded-lg border border-line px-3 py-2" value={draft.staffLoadedWithoutHelp ? "yes" : "no"} onChange={(event) => setDraft({ ...draft, staffLoadedWithoutHelp: event.target.value === "yes" })}><option value="yes">Si</option><option value="no">No</option></select></Field>
          <Field label="El dueno entendio el tablero"><select className="rounded-lg border border-line px-3 py-2" value={draft.ownerUnderstoodDashboard ? "yes" : "no"} onChange={(event) => setDraft({ ...draft, ownerUnderstoodDashboard: event.target.value === "yes" })}><option value="yes">Si</option><option value="no">No</option></select></Field>
          <Field label="Disposicion a pagar"><select className="rounded-lg border border-line px-3 py-2" value={draft.willingnessToPay} onChange={(event) => setDraft({ ...draft, willingnessToPay: event.target.value as ValidationRecord["willingnessToPay"] })}><option value="free_trial">Probaria gratis</option><option value="up_to_amount">Pagaria hasta un monto</option><option value="pay_if_recovers">Pagaria si recupera turnos</option><option value="no_pay">No pagaria</option></select></Field>
          <Field label="Monto indicado"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" step="1000" value={draft.willingnessAmount} onChange={(event) => setDraft({ ...draft, willingnessAmount: Number(event.target.value || 0) })} /></Field>
          <Field label="Observaciones"><textarea className="min-h-24 rounded-lg border border-line px-3 py-2" value={draft.comments} onChange={(event) => setDraft({ ...draft, comments: event.target.value })} /></Field>
        </div>
        <button className="mt-4 min-h-11 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="submit">Guardar validacion</button>
      </form>
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Aprendizajes registrados</h2>
        <div className="mt-4 grid gap-3">
          {props.state.validationRecords.length ? props.state.validationRecords.map((record) => (
            <article key={record.id} className="rounded-lg border border-line bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{record.complexName}</strong>
                <span className="text-xs font-black text-slate-500">{formatDate(record.createdAt.slice(0, 10))}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <Metric label="Metodo actual" value={record.currentMethod} />
                <Metric label="Dolor semanal" value={`${record.weeklyCancellations} cancelaciones / ${record.unsoldTurnsPerWeek} turnos ociosos`} />
                <Metric label="Disposicion a pagar" value={`${validationPayLabels[record.willingnessToPay]} ${record.willingnessAmount ? money(record.willingnessAmount) : ""}`} />
              </div>
              {record.comments && <p className="mt-3 text-sm text-slate-600">{record.comments}</p>}
            </article>
          )) : <EmptyState title="Sin validaciones cargadas" text="Carga la primera entrevista para documentar evidencia real del MVP." />}
        </div>
      </section>
    </div>
  );
}

function SettingsView(props: { state: AppState; setState: (state: AppState) => void; notify: (message: string) => void }) {
  const [settings, setSettings] = useState(props.state.settings);
  const [courts, setCourts] = useState(props.state.courts);
  const [complex, setComplex] = useState(props.state.complex);
  function addCourt() {
    setCourts([...courts, {
      id: generateId("court"),
      name: `Cancha ${courts.length + 1}`,
      type: "futbol5",
      active: true,
      openHour: settings.openHour,
      closeHour: settings.closeHour,
      slotStepMinutes: settings.slotDuration
    }]);
  }

  function removeCourt(courtId: string) {
    if (courts.length <= 1) {
      props.notify("El complejo debe tener al menos una cancha.");
      return;
    }
    setCourts(courts.filter((court) => court.id !== courtId));
  }

  return (
    <form className="grid max-w-5xl gap-4" onSubmit={(event) => { event.preventDefault(); props.setState({ ...props.state, complex, settings, courts }); props.notify("Configuracion guardada."); }}>
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Datos del complejo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nombre"><input className="rounded-lg border border-line px-3 py-2" required value={complex.name} onChange={(event) => setComplex({ ...complex, name: event.target.value })} /></Field>
          <Field label="Direccion o zona"><input className="rounded-lg border border-line px-3 py-2" value={complex.address} onChange={(event) => setComplex({ ...complex, address: event.target.value })} /></Field>
          <Field label="Telefono / WhatsApp"><input className="rounded-lg border border-line px-3 py-2" value={complex.phone} onChange={(event) => setComplex({ ...complex, phone: event.target.value })} /></Field>
          <Field label="Responsable"><input className="rounded-lg border border-line px-3 py-2" value={complex.responsibleName ?? ""} onChange={(event) => setComplex({ ...complex, responsibleName: event.target.value })} /></Field>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <h2 className="text-xl font-black">Precios y horarios</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Precio base por turno"><input className="rounded-lg border border-line px-3 py-2" type="number" value={settings.basePrice} onChange={(event) => setSettings({ ...settings, basePrice: Number(event.target.value || 0) })} /></Field>
        <Field label="Precio horario valle"><input className="rounded-lg border border-line px-3 py-2" type="number" value={settings.valleyPrice} onChange={(event) => setSettings({ ...settings, valleyPrice: Number(event.target.value || 0) })} /></Field>
        <Field label="Precio fin de semana"><input className="rounded-lg border border-line px-3 py-2" type="number" value={settings.weekendPrice} onChange={(event) => setSettings({ ...settings, weekendPrice: Number(event.target.value || 0) })} /></Field>
        <Field label="Hora de apertura"><input className="rounded-lg border border-line px-3 py-2" type="time" value={settings.openHour} onChange={(event) => setSettings({ ...settings, openHour: event.target.value })} /></Field>
        <Field label="Hora de cierre"><input className="rounded-lg border border-line px-3 py-2" type="time" value={settings.closeHour} onChange={(event) => setSettings({ ...settings, closeHour: event.target.value })} /></Field>
        <Field label="Duracion del turno"><select className="rounded-lg border border-line px-3 py-2" value={settings.slotDuration} onChange={(event) => setSettings({ ...settings, slotDuration: Number(event.target.value) })}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></Field>
        <Field label="Pedir confirmacion"><select className="rounded-lg border border-line px-3 py-2" value={settings.confirmationLeadHours} onChange={(event) => setSettings({ ...settings, confirmationLeadHours: Number(event.target.value) })}><option value={0}>El mismo dia</option><option value={12}>12 horas antes</option><option value={24}>24 horas antes</option><option value={48}>48 horas antes</option></select></Field>
      </div>
      <div className="mt-4">
        <span className="text-sm font-black text-slate-700">Dias de apertura</span>
        <div className="mt-2 flex flex-wrap gap-2">{dayNames.map((name, day) => <label key={name} className={cn("flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-bold", (settings.openDays ?? [1, 2, 3, 4, 5, 6, 0]).includes(day) && "border-lime-500 bg-lime-50")}><input className="h-4 w-4" type="checkbox" checked={(settings.openDays ?? [1, 2, 3, 4, 5, 6, 0]).includes(day)} onChange={() => { const current = settings.openDays ?? [1, 2, 3, 4, 5, 6, 0]; setSettings({ ...settings, openDays: current.includes(day) ? current.filter((item) => item !== day) : [...current, day] }); }} />{name}</label>)}</div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-black">Rangos de horario valle</h3><p className="text-sm text-slate-600">Opcional. El precio del rango se aplica automaticamente.</p></div>
          <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black" type="button" onClick={() => setSettings({ ...settings, valleyRanges: [...(settings.valleyRanges ?? []), { id: generateId("valley"), days: [1, 2, 3, 4, 5], from: settings.openHour, to: "19:00", price: settings.valleyPrice }] })}>Agregar rango</button>
        </div>
        <div className="mt-3 grid gap-3">
          {(settings.valleyRanges ?? []).map((range) => <div key={range.id} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-3 sm:grid-cols-4">
            <Field label="Dias"><select className="rounded-lg border border-line px-3 py-2" value={range.days.join(",")} onChange={(event) => setSettings({ ...settings, valleyRanges: settings.valleyRanges?.map((item) => item.id === range.id ? { ...item, days: event.target.value.split(",").map(Number) } : item) })}><option value="1,2,3,4,5">Lunes a viernes</option><option value="6,0">Fin de semana</option><option value="1,2,3,4,5,6,0">Todos los dias</option></select></Field>
            <Field label="Desde"><input className="rounded-lg border border-line px-3 py-2" type="time" value={range.from} onChange={(event) => setSettings({ ...settings, valleyRanges: settings.valleyRanges?.map((item) => item.id === range.id ? { ...item, from: event.target.value } : item) })} /></Field>
            <Field label="Hasta"><input className="rounded-lg border border-line px-3 py-2" type="time" value={range.to} onChange={(event) => setSettings({ ...settings, valleyRanges: settings.valleyRanges?.map((item) => item.id === range.id ? { ...item, to: event.target.value } : item) })} /></Field>
            <div className="grid grid-cols-[1fr_auto] gap-2"><Field label="Precio"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" value={range.price} onChange={(event) => setSettings({ ...settings, valleyRanges: settings.valleyRanges?.map((item) => item.id === range.id ? { ...item, price: Number(event.target.value || 0) } : item) })} /></Field><button className="self-end pb-3 text-sm font-black text-red-700" type="button" onClick={() => setSettings({ ...settings, valleyRanges: settings.valleyRanges?.filter((item) => item.id !== range.id) })}>Quitar</button></div>
          </div>)}
        </div>
      </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black">Canchas del complejo</h2>
          <button className="min-h-11 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900" type="button" onClick={addCourt}>Agregar cancha</button>
        </div>
        <div className="mt-4 grid gap-3">
          {courts.map((court, index) => (
            <div key={court.id} className="grid gap-3 rounded-lg border border-line bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nombre"><input className="rounded-lg border border-line px-3 py-2" value={court.name} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></Field>
              <Field label="Tipo"><select className="rounded-lg border border-line px-3 py-2" value={court.type} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as Court["type"] } : item))}><option value="futbol5">Futbol 5</option><option value="futbol6">Futbol 6</option><option value="futbol7">Futbol 7</option><option value="futbol9">Futbol 9</option></select></Field>
              <Field label="Precio propio"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" value={court.price ?? ""} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value || 0) } : item))} /></Field>
              <Field label="Desde"><input className="rounded-lg border border-line px-3 py-2" type="time" value={court.openHour} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, openHour: event.target.value } : item))} /></Field>
              <Field label="Hasta"><input className="rounded-lg border border-line px-3 py-2" type="time" value={court.closeHour} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, closeHour: event.target.value } : item))} /></Field>
              <Field label="Intervalo"><select className="rounded-lg border border-line px-3 py-2" value={court.slotStepMinutes} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, slotStepMinutes: Number(event.target.value) } : item))}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option></select></Field>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input className="h-4 w-4" type="checkbox" checked={court.roofed ?? false} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, roofed: event.target.checked } : item))} />Techada</label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input className="h-4 w-4" type="checkbox" checked={court.active} onChange={(event) => setCourts(courts.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item))} />Activa</label>
              <button className="min-h-11 self-end rounded-lg border border-red-200 px-3 text-sm font-black text-red-700" type="button" onClick={() => removeCourt(court.id)}>Suprimir</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black">Legal MVP/Piloto</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Documentos visibles para usuarios internos y jugadores durante la prueba piloto.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-black text-field-700" href="/terminos" target="_blank" rel="noreferrer">Terminos y Condiciones</a>
          <a className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-black text-field-700" href="/privacidad" target="_blank" rel="noreferrer">Politica de Privacidad</a>
        </div>
      </section>

      <button className="min-h-11 justify-self-start rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="submit">Guardar configuracion</button>
    </form>
  );
}

function ReservationConfirmationModal(props: { state: AppState; reservation: Reservation; notify: (message: string) => void; onClose: () => void }) {
  const message = buildReservationConfirmationMessage(props.state, props.reservation);
  const whatsappHref = buildWhatsAppUrl(message, props.reservation.customerPhone);

  function copyConfirmation() {
    navigator.clipboard?.writeText(message).then(
      () => props.notify("Mensaje de confirmacion copiado."),
      () => props.notify("No se pudo copiar automaticamente.")
    );
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-field-900/55 p-4">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 text-field-900 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Reserva guardada</span>
            <h2 className="mt-1 text-xl font-black">Mensaje de confirmacion</h2>
          </div>
          <button className="rounded-lg border border-line px-3 py-2 font-black" type="button" onClick={props.onClose}>x</button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">La reserva ya quedo registrada. Podes copiar el mensaje o abrir WhatsApp para enviarlo manualmente.</p>
        <textarea className="mt-4 min-h-52 w-full rounded-lg border border-line px-3 py-2 text-sm" readOnly value={message} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={copyConfirmation}><Copy size={17} />Copiar confirmacion</button>
          {props.reservation.customerPhone.trim() ? (
            <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black text-field-700" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17} />Abrir WhatsApp</a>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-bold text-slate-500">Carga un telefono para abrir WhatsApp</span>
          )}
          <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black text-field-700" type="button" onClick={props.onClose}>Cerrar</button>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-500">WhatsApp es un servicio externo a CanchaPro. El mensaje no se envia automaticamente.</p>
      </section>
    </div>
  );
}

function ReservationModal(props: { draft: ReservationDraft; setDraft: (draft: ReservationDraft | null) => void; courts: AppState["courts"]; complex: AppState["complex"]; slots: string[]; settings: AppState["settings"]; reservations: Reservation[]; saveReservation: (event: FormEvent) => void; deleteReservation: () => void; cancelReservation: (reservationId: string, occurrenceDate: string, reason: string, lastMinute: boolean) => void; goToCancellations: () => void; markPaid: (reservationId: string, occurrenceDate: string) => void; notify: (message: string) => void }) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [lastMinute, setLastMinute] = useState(false);
  const update = (patch: Partial<ReservationDraft>) => props.setDraft({ ...props.draft, ...patch });
  const updatePrice = (patch: Partial<ReservationDraft>) => {
    const next = { ...props.draft, ...patch };
    const court = props.courts.find((item) => item.id === next.courtId);
    props.setDraft({ ...next, price: suggestPrice(next.date, next.time, props.settings, court) });
  };
  const isEditingCancelled = Boolean(props.draft.id && props.draft.status === "cancelled");
  const isEditingSameReservation = (reservation: Reservation) => reservation.id === props.draft.id;
  const draftCandidate = (patch: Partial<ReservationDraft>) => ({
    time: patch.time ?? props.draft.time,
    durationMinutes: patch.durationMinutes ?? props.draft.durationMinutes
  });
  const isCourtAvailable = (courtId: string, patch: Partial<ReservationDraft> = {}) => {
    if (props.draft.status !== "confirmed") return true;
    if (isPastSlot(patch.date ?? props.draft.date, patch.time ?? props.draft.time)) return false;
    return !props.reservations.some((reservation) => {
      return !isEditingSameReservation(reservation) &&
        reservation.status !== "cancelled" &&
        reservationAppearsOnDate(reservation, patch.date ?? props.draft.date) &&
        reservation.courtId === courtId &&
        reservationsOverlap(reservation, draftCandidate(patch));
    });
  };
  const availableTimes = props.slots.filter((slot) => isOpenDay(props.draft.date, props.settings) && !isPastSlot(props.draft.date, slot) && props.courts.some((court) => getCourtTimeSlots(court, props.settings).includes(slot) && isCourtAvailable(court.id, { time: slot })));
  const selectedTime = availableTimes.includes(props.draft.time) ? props.draft.time : availableTimes[0] ?? "";
  const availableCourts = props.courts.filter((court) => getCourtTimeSlots(court, props.settings).includes(selectedTime) && isCourtAvailable(court.id, { time: selectedTime }));
  const selectedCourtId = availableCourts.some((court) => court.id === props.draft.courtId) ? props.draft.courtId : availableCourts[0]?.id ?? "";
  const canConfirmNow = isWithinConfirmationWindow(props.draft.date, selectedTime || props.draft.time, props.settings.confirmationLeadHours);
  const sourceReservation = props.reservations.find((reservation) => reservation.id === props.draft.id);
  const paid = sourceReservation ? isReservationPaid(sourceReservation, props.draft.date) : false;
  const confirmationData = sourceReservation ? {
    ...sourceReservation,
    courtId: props.draft.courtId,
    customerName: props.draft.customerName,
    customerPhone: props.draft.customerPhone,
    date: props.draft.date,
    time: props.draft.time,
    price: props.draft.price,
    durationMinutes: props.draft.durationMinutes
  } : null;
  const confirmationMessage = confirmationData ? buildReservationConfirmationMessage({ complex: props.complex, courts: props.courts }, confirmationData) : "";
  const whatsappHref = confirmationData ? buildWhatsAppUrl(confirmationMessage, confirmationData.customerPhone) : "";
  function copyConfirmation() {
    navigator.clipboard?.writeText(confirmationMessage).then(
      () => props.notify("Mensaje de confirmacion copiado."),
      () => props.notify("No se pudo copiar automaticamente.")
    );
  }
  useEffect(() => {
    if ((selectedTime && selectedTime !== props.draft.time) || (selectedCourtId && selectedCourtId !== props.draft.courtId)) {
      props.setDraft({ ...props.draft, time: selectedTime || props.draft.time, courtId: selectedCourtId || props.draft.courtId, price: suggestPrice(props.draft.date, selectedTime || props.draft.time, props.settings) });
    }
  }, [selectedTime, selectedCourtId, props]);
  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-field-900/55 p-4">
      <form className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5 shadow-soft" onSubmit={props.saveReservation}>
        <div className="flex items-center justify-between gap-3">
          <div><span className="text-xs font-black uppercase tracking-wide text-slate-500">Carga rapida</span><h2 className="text-xl font-black">{props.draft.id ? "Editar reserva" : "Nueva reserva"}</h2></div>
          <button className="rounded-lg border border-line px-3 py-2 font-black" type="button" onClick={() => props.setDraft(null)}>x</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Fecha"><input className="rounded-lg border border-line px-3 py-2" type="date" required min={toInputDate(new Date())} value={props.draft.date} onChange={(event) => updatePrice({ date: event.target.value })} /></Field>
          <Field label="Horario"><select className="rounded-lg border border-line px-3 py-2" required value={selectedTime} onChange={(event) => updatePrice({ time: event.target.value, courtId: "" })}>{availableTimes.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></Field>
          <Field label="Cancha"><select className="rounded-lg border border-line px-3 py-2" required value={props.draft.courtId} onChange={(event) => {
            updatePrice({ courtId: event.target.value });
          }}>{availableCourts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></Field>
          <Field label="Tipo"><select className="rounded-lg border border-line px-3 py-2" value={props.draft.type} onChange={(event) => update({ type: event.target.value as ReservationType, status: event.target.value === "fixed" ? "pending" : props.draft.status })}><option value="occasional">Ocasional</option><option value="fixed">Turno fijo</option></select></Field>
          <Field label="Cliente"><input className="rounded-lg border border-line px-3 py-2" required value={props.draft.customerName} onChange={(event) => update({ customerName: event.target.value })} /></Field>
          <Field label="Contacto"><input className="rounded-lg border border-line px-3 py-2" value={props.draft.customerPhone} onChange={(event) => update({ customerPhone: event.target.value })} /></Field>
          <Field label="Precio"><input className="rounded-lg border border-line px-3 py-2" type="number" min="0" step="500" required value={props.draft.price} onChange={(event) => update({ price: Number(event.target.value || 0) })} /></Field>
          <Field label="Duracion"><select className="rounded-lg border border-line px-3 py-2" value={props.draft.durationMinutes} onChange={(event) => update({ durationMinutes: Number(event.target.value) })}><option value={60}>60 minutos</option><option value={90}>90 minutos</option><option value={120}>120 minutos</option><option value={150}>150 minutos</option><option value={180}>180 minutos</option></select></Field>
          <Field label="Estado"><select className="rounded-lg border border-line px-3 py-2" value={(props.draft.status === "confirmed" && !canConfirmNow) || props.draft.type === "fixed" ? "pending" : props.draft.status} onChange={(event) => update({ status: event.target.value as ReservationStatus })}><option value="confirmed" disabled={!canConfirmNow || props.draft.type === "fixed"}>Confirmada</option><option value="pending">Pendiente</option><option value="cancelled">Cancelada</option></select></Field>
          {props.draft.type === "fixed" && <p className="self-end rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-950">El turno fijo se muestra automaticamente todas las semanas desde la fecha elegida.</p>}
          <Field label="Observaciones"><textarea className="min-h-24 rounded-lg border border-line px-3 py-2" value={props.draft.notes} onChange={(event) => update({ notes: event.target.value })} /></Field>
        </div>
        {!availableTimes.length && props.draft.status === "confirmed" && (
          <p className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-bold text-yellow-900">No hay horarios disponibles para esa fecha con la duracion seleccionada.</p>
        )}
        {!canConfirmNow && props.draft.status !== "cancelled" && (
          <p className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-bold text-yellow-900">Este turno queda pendiente porque todavia esta fuera de la ventana de confirmacion configurada.</p>
        )}
        {confirmationData && props.draft.status !== "cancelled" && (
          <section className="mt-4 rounded-lg border border-line bg-slate-50 p-4">
            <h3 className="font-black text-field-900">Mensaje de confirmacion</h3>
            <p className="mt-1 text-sm text-slate-600">Se genera con los datos actuales de esta reserva. WhatsApp es un servicio externo a CanchaPro.</p>
            <textarea className="mt-3 min-h-40 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" readOnly value={confirmationMessage} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-700 px-4 text-sm font-black text-white" type="button" onClick={copyConfirmation}><Copy size={17} />Copiar confirmacion</button>
              {confirmationData.customerPhone.trim() ? (
                <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-field-700" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17} />Abrir WhatsApp</a>
              ) : (
                <span className="inline-flex min-h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-500">Carga un telefono para abrir WhatsApp</span>
              )}
            </div>
          </section>
        )}
        {isEditingCancelled && (
          <div className="mt-4 rounded-lg border border-lime-200 bg-lime-50 p-4">
            <p className="text-sm font-bold text-lime-950">Esta reserva esta cancelada. Para publicar el horario o copiar el mensaje de reventa, anda a Cancelaciones.</p>
            <button className="mt-3 min-h-11 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900" type="button" onClick={props.goToCancellations}>Ir a Cancelaciones</button>
          </div>
        )}
        {props.draft.id && props.draft.status === "confirmed" && canMarkPaidNow(props.draft.date, props.draft.time) && (
          <section className="mt-4 rounded-lg border border-lime-200 bg-lime-50 p-4">
            <h3 className="font-black text-lime-950">Cobro del turno</h3>
            <p className="mt-1 text-sm text-lime-900">Disponible porque el turno corresponde a la hora actual o la proxima hora.</p>
            <button className="mt-3 min-h-11 rounded-lg bg-lime-400 px-4 text-sm font-black text-field-900 disabled:bg-slate-200 disabled:text-slate-500" type="button" disabled={paid} onClick={() => props.markPaid(props.draft.id!, props.draft.date)}>
              {paid ? "Pago registrado" : "Marcar pago"}
            </button>
          </section>
        )}
        {showCancel && props.draft.id && (
          <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-black text-red-900">Cancelar reserva y liberar horario</h3>
            <div className="mt-3 grid gap-3">
              <Field label="Motivo opcional"><textarea className="min-h-20 rounded-lg border border-red-200 px-3 py-2" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></Field>
              <label className="flex items-center gap-2 text-sm font-bold text-red-900"><input className="h-4 w-4" type="checkbox" checked={lastMinute} onChange={(event) => setLastMinute(event.target.checked)} />Cancelacion de ultimo momento</label>
              <p className="text-sm text-red-800">Al confirmar, este horario queda disponible para reventa y se podra difundir por WhatsApp.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-black text-white" type="button" onClick={() => props.cancelReservation(props.draft.id!, props.draft.date, cancelReason, lastMinute)}>Confirmar cancelacion</button>
              <button className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-black text-red-800" type="button" onClick={() => setShowCancel(false)}>Volver</button>
            </div>
          </section>
        )}
        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-50 px-4 text-sm font-black text-red-700" type="button" disabled={!props.draft.id} onClick={props.deleteReservation}><Trash2 size={17} />Eliminar</button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-yellow-100 px-4 text-sm font-black text-yellow-900" type="button" disabled={!props.draft.id || props.draft.status === "cancelled"} onClick={() => setShowCancel(true)}><RotateCcw size={17} />Cancelar reserva</button>
          </div>
          <div className="flex gap-2"><button className="min-h-11 rounded-lg border border-line px-4 text-sm font-black" type="button" onClick={() => props.setDraft(null)}>Cancelar</button><button className="min-h-11 rounded-lg bg-field-700 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300" type="submit" disabled={(!availableTimes.length || !props.draft.courtId) && props.draft.status === "confirmed"}>Guardar</button></div>
        </div>
      </form>
    </div>
  );
}

function buildAvailabilityMessage(state: AppState, date: string) {
  const free: string[] = [];
  if (!isOpenDay(date, state.settings)) return `Hola! El complejo no abre el ${formatDate(date)}.`;
  state.courts.filter((court) => court.active).forEach((court) => {
    getCourtTimeSlots(court, state.settings).forEach((time) => {
      if (isPastSlot(date, time)) return;
      const reservation = state.reservations.find((item) => reservationAppearsOnDate(item, date) && item.courtId === court.id && item.status !== "cancelled" && slotOverlapsReservation(time, item));
      if (!reservation) free.push(`${time} ${court.name}`);
    });
  });

  if (!free.length) return `Hola! Por ahora no tenemos horarios disponibles para el ${formatDate(date)}.`;
  return `Hola! Tenemos estos horarios disponibles para el ${formatDate(date)}:\n\n${free.slice(0, 12).map((slot) => `- ${slot}`).join("\n")}\n\nConsultanos por WhatsApp y te confirmamos el turno.`;
}

function canAccess(view: ViewId, role: Role) {
  return views.find((item) => item.id === view)?.roles.includes(role) ?? false;
}

function normalizeState(input: Partial<AppState>) {
  const fallback = createDefaultState();
  const settings = { ...fallback.settings, ...input.settings };
  const courts = (input.courts?.length ? input.courts : fallback.courts).map((court, index) => ({
    ...fallback.courts[index % fallback.courts.length],
    ...court,
    openHour: court.openHour || (index < 2 ? "16:00" : "16:30"),
    closeHour: court.closeHour || (index < 2 ? "23:00" : "23:30"),
    slotStepMinutes: court.slotStepMinutes === 30 ? 60 : court.slotStepMinutes || settings.slotDuration || 60
  }));

  return {
    ...fallback,
    ...input,
    complex: { ...fallback.complex, ...input.complex },
    settings,
    courts,
    costs: { ...fallback.costs, ...input.costs },
    reservations: (input.reservations ?? fallback.reservations).map((reservation) => ({
      ...reservation,
      status: reservation.status === "confirmed" && !isWithinConfirmationWindow(reservation.date, reservation.time, settings.confirmationLeadHours) && reservation.date >= toInputDate(new Date()) ? "pending" : reservation.status,
      durationMinutes: reservation.durationMinutes || settings.slotDuration || 60,
      cancellationReason: reservation.cancellationReason || "",
      cancellationLastMinute: reservation.cancellationLastMinute || false,
      cancelledDates: reservation.cancelledDates ?? [],
      confirmedDates: reservation.confirmedDates ?? [],
      paid: reservation.paid ?? false,
      paidDates: reservation.paidDates ?? []
    })),
    publicSlotIds: input.publicSlotIds ?? [],
    validationRecords: input.validationRecords ?? []
  } as AppState;
}

function getAllCourtSlots(state: AppState) {
  return Array.from(new Set(state.courts.filter((court) => court.active).flatMap((court) => getCourtTimeSlots(court, state.settings)))).sort();
}

function isOpenDay(date: string, settings: AppSettings) {
  return (settings.openDays ?? [1, 2, 3, 4, 5, 6, 0]).includes(parseInputDate(date).getDay());
}

function getValleyHours(state: AppState) {
  const slotCounts = getAllCourtSlots(state).map((time) => {
    const confirmedCount = state.reservations.filter((reservation) => reservation.status === "confirmed" && slotOverlapsReservation(time, reservation)).length;
    return { time, confirmedCount };
  });
  return slotCounts
    .sort((a, b) => a.confirmedCount - b.confirmedCount || a.time.localeCompare(b.time))
    .slice(0, 3)
    .map((slot) => slot.time);
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes: number) {
  const normalized = totalMinutes % (24 * 60);
  const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minute = String(normalized % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

function isPastDate(date: string) {
  return date < toInputDate(new Date());
}

function isPastSlot(date: string, time: string) {
  if (isPastDate(date)) return true;
  if (date > toInputDate(new Date())) return false;
  const now = new Date();
  return timeToMinutes(time) <= now.getHours() * 60 + now.getMinutes();
}

function isOutsideConfirmationTolerance(date: string, time: string) {
  const turn = parseInputDate(date);
  const [hour, minute] = time.split(":").map(Number);
  turn.setHours(hour, minute + 30, 0, 0);
  return new Date() > turn;
}

function canMarkPaidNow(date: string, time: string) {
  if (date !== toInputDate(new Date())) return false;
  const now = new Date();
  const currentHourStart = now.getHours() * 60;
  const turnMinutes = timeToMinutes(time);
  return turnMinutes >= currentHourStart && turnMinutes < currentHourStart + 120;
}

function isReservationPaid(reservation: Reservation, occurrenceDate: string) {
  return reservation.type === "fixed" ? reservation.paidDates?.includes(occurrenceDate) ?? false : reservation.paid ?? false;
}

function isWithinConfirmationWindow(date: string, time: string, leadHours: number) {
  const now = new Date();
  if (leadHours === 0) return date === toInputDate(now);
  const turnDate = parseInputDate(date);
  const [hour, minute] = time.split(":").map(Number);
  turnDate.setHours(hour, minute, 0, 0);
  return turnDate.getTime() <= now.getTime() + leadHours * 60 * 60 * 1000;
}

function getEffectiveStatus(reservation: Reservation, occurrenceDate: string, leadHours: number): ReservationStatus {
  if (reservation.status === "cancelled") return "cancelled";
  if (reservation.confirmedDates?.includes(occurrenceDate)) return "confirmed";
  if (!isWithinConfirmationWindow(occurrenceDate, reservation.time, leadHours)) return "pending";
  if (reservation.type === "fixed") return "pending";
  return reservation.status;
}

function reservationsOverlap(a: Pick<Reservation, "time" | "durationMinutes">, b: Pick<Reservation, "time" | "durationMinutes">) {
  const aStart = timeToMinutes(a.time);
  const aEnd = aStart + (a.durationMinutes || 60);
  const bStart = timeToMinutes(b.time);
  const bEnd = bStart + (b.durationMinutes || 60);
  return aStart < bEnd && bStart < aEnd;
}

function reservationAppearsOnDate(reservation: Reservation, date: string) {
  if (reservation.date === date) return true;
  if (reservation.type !== "fixed" || reservation.status === "cancelled") return false;
  if (reservation.seriesEndDate && date > reservation.seriesEndDate) return false;
  if (reservation.cancelledDates?.includes(date)) return false;
  const base = parseInputDate(reservation.date);
  const target = parseInputDate(date);
  return target >= base && target.getDay() === base.getDay();
}

function reservationConflictsOnDate(existing: Reservation, candidate: Reservation) {
  return existing.status !== "cancelled" &&
    candidate.status !== "cancelled" &&
    existing.courtId === candidate.courtId &&
    reservationAppearsOnDate(existing, candidate.date) &&
    reservationsOverlap(existing, candidate);
}

function slotOverlapsReservation(slot: string, reservation: Pick<Reservation, "time" | "durationMinutes">) {
  const slotStart = timeToMinutes(slot);
  const reservationStart = timeToMinutes(reservation.time);
  return slotStart >= reservationStart && slotStart < reservationStart + (reservation.durationMinutes || 60);
}

function getConfirmationTargetDate(leadHours: number) {
  const date = new Date();
  date.setHours(date.getHours() + leadHours);
  return toInputDate(date);
}

function getPublicSlots(state: AppState, date: string) {
  if (!isOpenDay(date, state.settings)) return [];
  return state.courts.filter((court) => court.active).flatMap((court) => {
    return getCourtTimeSlots(court, state.settings).flatMap((time) => {
      if (isPastSlot(date, time)) return [];
      const reserved = state.reservations.some((item) => reservationAppearsOnDate(item, date) && item.courtId === court.id && item.status !== "cancelled" && slotOverlapsReservation(time, item));
      return reserved ? [] : [{ id: `${date}-${court.id}-${time}`, time, courtName: court.name, price: suggestPrice(date, time, state.settings, court) }];
    });
  });
}

function getCustomers(state: AppState) {
  const grouped = new Map<string, { key: string; name: string; phone: string; total: number; confirmed: number; cancelled: number; revenue: number; lastReservation: string; reservations: Reservation[] }>();

  state.reservations.filter((reservation) => reservation.type === "fixed").forEach((reservation) => {
    const key = normalize(`${reservation.customerName}-${reservation.customerPhone}`);
    const current = grouped.get(key) ?? {
      key,
      name: reservation.customerName,
      phone: reservation.customerPhone,
      total: 0,
      confirmed: 0,
      cancelled: 0,
      revenue: 0,
      lastReservation: reservation.date,
      reservations: []
    };
    current.total += 1;
    current.reservations.push(reservation);
    current.confirmed += reservation.confirmedDates?.length ?? (reservation.status === "confirmed" ? 1 : 0);
    current.revenue += (reservation.paidDates?.length ?? (reservation.status === "confirmed" ? 1 : 0)) * reservation.price;
    current.cancelled += reservation.cancelledDates?.length ?? (reservation.status === "cancelled" ? 1 : 0);
    if (reservation.date > current.lastReservation) current.lastReservation = reservation.date;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-44 gap-1.5 text-sm"><span className="font-black text-slate-500">{label}</span>{children}</label>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <article className="rounded-lg border border-line bg-white p-4 shadow-soft"><span className="text-sm font-black text-slate-500">{label}</span><strong className="mt-2 block text-2xl font-black">{value}</strong></article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-slate-50 p-3 text-sm"><span className="font-bold text-slate-600">{label}</span><strong className="text-right">{value}</strong></div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-lg border border-dashed border-line bg-slate-50 p-6 text-center"><strong className="block">{title}</strong><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}
