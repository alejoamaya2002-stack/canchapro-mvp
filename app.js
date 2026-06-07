const STORAGE_KEY = "canchapro-mvp-state-v1";

function generateId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const courts = ["Cancha 1", "Cancha 2", "Cancha 3", "Cancha 4"];
const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const costLabels = {
  electricity: "Luz",
  gas: "Gas",
  water: "Agua",
  salaries: "Salarios",
  rent: "Alquiler",
  taxes: "Impuestos",
  maintenance: "Mantenimiento",
  other: "Otros costos"
};

const state = loadState();

let activeRole = localStorage.getItem("canchapro-role") || "owner";
let activeView = "agenda";
let editingId = null;

const views = [
  { id: "agenda", label: "Agenda semanal", roles: ["owner", "staff"], title: "Agenda semanal", eyebrow: "Gestion operativa" },
  { id: "reservations", label: "Reservas", roles: ["owner", "staff"], title: "Reservas", eyebrow: "Carga y seguimiento" },
  { id: "availability", label: "Disponibilidad WhatsApp", roles: ["owner", "staff"], title: "Disponibilidad", eyebrow: "Mensajes prearmados" },
  { id: "dashboard", label: "Tablero comercial", roles: ["owner"], title: "Tablero comercial", eyebrow: "Indicadores para el dueno" },
  { id: "profitability", label: "Rentabilidad", roles: ["owner"], title: "Panel de rentabilidad", eyebrow: "Costos e indicadores" },
  { id: "settings", label: "Configuracion", roles: ["owner"], title: "Configuracion", eyebrow: "Precios y horarios" }
];

const el = {
  roleSelect: document.querySelector("#roleSelect"),
  mainNav: document.querySelector("#mainNav"),
  viewTitle: document.querySelector("#viewTitle"),
  viewEyebrow: document.querySelector("#viewEyebrow"),
  accessNotice: document.querySelector("#accessNotice"),
  newReservationButton: document.querySelector("#newReservationButton"),
  seedButton: document.querySelector("#seedButton"),
  weekPicker: document.querySelector("#weekPicker"),
  courtFilter: document.querySelector("#courtFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  agendaGrid: document.querySelector("#agendaGrid"),
  reservationsTable: document.querySelector("#reservationsTable"),
  reservationSearch: document.querySelector("#reservationSearch"),
  availabilityDate: document.querySelector("#availabilityDate"),
  availabilityPhone: document.querySelector("#availabilityPhone"),
  availabilityForm: document.querySelector("#availabilityForm"),
  whatsappMessage: document.querySelector("#whatsappMessage"),
  copyWhatsappButton: document.querySelector("#copyWhatsappButton"),
  openWhatsappLink: document.querySelector("#openWhatsappLink"),
  dashboardMonth: document.querySelector("#dashboardMonth"),
  kpiGrid: document.querySelector("#kpiGrid"),
  dayBars: document.querySelector("#dayBars"),
  opportunityList: document.querySelector("#opportunityList"),
  costForm: document.querySelector("#costForm"),
  costInputs: document.querySelector("#costInputs"),
  profitabilityMetrics: document.querySelector("#profitabilityMetrics"),
  settingsForm: document.querySelector("#settingsForm"),
  basePrice: document.querySelector("#basePrice"),
  valleyPrice: document.querySelector("#valleyPrice"),
  weekendPrice: document.querySelector("#weekendPrice"),
  openHour: document.querySelector("#openHour"),
  closeHour: document.querySelector("#closeHour"),
  slotDuration: document.querySelector("#slotDuration"),
  reservationDialog: document.querySelector("#reservationDialog"),
  reservationForm: document.querySelector("#reservationForm"),
  reservationDialogTitle: document.querySelector("#reservationDialogTitle"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelReservationButton: document.querySelector("#cancelReservationButton"),
  deleteReservationButton: document.querySelector("#deleteReservationButton"),
  reservationId: document.querySelector("#reservationId"),
  reservationDate: document.querySelector("#reservationDate"),
  reservationTime: document.querySelector("#reservationTime"),
  reservationCourt: document.querySelector("#reservationCourt"),
  reservationType: document.querySelector("#reservationType"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  reservationPrice: document.querySelector("#reservationPrice"),
  reservationStatus: document.querySelector("#reservationStatus"),
  repeatFixed: document.querySelector("#repeatFixed"),
  reservationNotes: document.querySelector("#reservationNotes"),
  toast: document.querySelector("#toast")
};

init();

function init() {
  const today = new Date();
  el.roleSelect.value = activeRole;
  el.weekPicker.value = toInputDate(startOfWeek(today));
  el.availabilityDate.value = toInputDate(today);
  el.dashboardMonth.value = toMonthInput(today);

  courts.forEach((court) => {
    el.courtFilter.append(new Option(court, court));
    el.reservationCourt.append(new Option(court, court));
  });
  el.courtFilter.prepend(new Option("Todas", "all"));
  el.courtFilter.value = "all";

  renderTimeOptions();
  renderCostInputs();
  bindEvents();
  renderAll();
}

function bindEvents() {
  el.roleSelect.addEventListener("change", () => {
    activeRole = el.roleSelect.value;
    localStorage.setItem("canchapro-role", activeRole);
    if (!canAccess(activeView)) activeView = "agenda";
    renderAll();
  });

  el.newReservationButton.addEventListener("click", () => openReservationDialog());
  el.seedButton.addEventListener("click", restoreDemo);
  el.weekPicker.addEventListener("change", renderAgenda);
  el.courtFilter.addEventListener("change", renderAgenda);
  el.statusFilter.addEventListener("change", renderAgenda);
  el.reservationSearch.addEventListener("input", renderReservationsTable);
  el.dashboardMonth.addEventListener("change", renderOwnerViews);

  el.availabilityForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generateAvailabilityMessage();
  });

  el.copyWhatsappButton.addEventListener("click", async () => {
    if (!el.whatsappMessage.value.trim()) generateAvailabilityMessage();
    const copied = await copyText(el.whatsappMessage.value);
    showToast(copied ? "Mensaje copiado para WhatsApp." : "No se pudo copiar automaticamente. El mensaje quedo seleccionado.");
  });

  el.costForm.addEventListener("submit", (event) => {
    event.preventDefault();
    Object.keys(costLabels).forEach((key) => {
      state.costs[key] = Number(document.querySelector(`#cost-${key}`).value || 0);
    });
    saveState();
    renderOwnerViews();
    showToast("Costos fijos guardados.");
  });

  el.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings.basePrice = Number(el.basePrice.value || 0);
    state.settings.valleyPrice = Number(el.valleyPrice.value || 0);
    state.settings.weekendPrice = Number(el.weekendPrice.value || 0);
    state.settings.openHour = el.openHour.value;
    state.settings.closeHour = el.closeHour.value;
    state.settings.slotDuration = Number(el.slotDuration.value);
    saveState();
    renderTimeOptions();
    renderAll();
    showToast("Configuracion guardada.");
  });

  el.reservationForm.addEventListener("submit", saveReservationFromForm);
  el.closeDialogButton.addEventListener("click", closeDialog);
  el.cancelReservationButton.addEventListener("click", closeDialog);
  el.deleteReservationButton.addEventListener("click", deleteCurrentReservation);

  ["reservationDate", "reservationTime"].forEach((id) => {
    document.querySelector(`#${id}`).addEventListener("change", updateSuggestedPrice);
  });
}

function renderAll() {
  renderNavigation();
  renderActiveView();
  renderSettingsForm();
  renderAgenda();
  renderReservationsTable();
  generateAvailabilityMessage();
  renderOwnerViews();
}

function renderNavigation() {
  el.mainNav.innerHTML = "";
  views.filter((view) => view.roles.includes(activeRole)).forEach((view) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = view.label;
    button.className = view.id === activeView ? "active" : "";
    button.addEventListener("click", () => {
      activeView = view.id;
      renderActiveView();
      renderNavigation();
    });
    el.mainNav.append(button);
  });
}

function renderActiveView() {
  const view = views.find((item) => item.id === activeView) || views[0];
  document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
  el.accessNotice.classList.add("hidden");

  if (!canAccess(activeView)) {
    activeView = "agenda";
    el.accessNotice.classList.remove("hidden");
  }

  const active = views.find((item) => item.id === activeView);
  document.querySelector(`#${activeView}View`).classList.add("active");
  el.viewTitle.textContent = active.title;
  el.viewEyebrow.textContent = active.eyebrow;
}

function canAccess(viewId) {
  const view = views.find((item) => item.id === viewId);
  return view && view.roles.includes(activeRole);
}

function renderAgenda() {
  const weekStart = startOfWeek(parseInputDate(el.weekPicker.value));
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const times = getTimeSlots();
  const courtFilter = el.courtFilter.value;
  const statusFilter = el.statusFilter.value;

  el.agendaGrid.innerHTML = "";

  const head = document.createElement("div");
  head.className = "agenda-row";
  head.append(cell("Horario", "agenda-cell agenda-head"));
  dates.forEach((date) => {
    head.append(cell(`${dayNames[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`, "agenda-cell agenda-head"));
  });
  el.agendaGrid.append(head);

  times.forEach((time) => {
    const row = document.createElement("div");
    row.className = "agenda-row";
    row.append(cell(time, "agenda-cell time-cell"));

    dates.forEach((date) => {
      const dateText = toInputDate(date);
      const dayCell = cell("", "agenda-cell");
      const filteredCourts = courtFilter === "all" ? courts : [courtFilter];
      filteredCourts.forEach((court) => {
        const reservation = findReservation(dateText, time, court);
        if (statusFilter === "free" && reservation) return;
        if (statusFilter !== "all" && statusFilter !== "free" && (!reservation || reservation.status !== statusFilter)) return;
        dayCell.append(slotButton(dateText, time, court, reservation));
      });
      row.append(dayCell);
    });

    el.agendaGrid.append(row);
  });
}

function slotButton(date, time, court, reservation) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "slot-button";

  if (reservation) {
    button.classList.add(reservation.status === "cancelled" ? "cancelled" : "booked");
    button.innerHTML = `
      <span class="slot-title">${escapeHtml(court)} - ${escapeHtml(reservation.customerName)}</span>
      <span class="slot-meta">${statusLabel(reservation.status)} · ${money(reservation.price)}</span>
    `;
    button.addEventListener("click", () => openReservationDialog(reservation));
  } else {
    button.innerHTML = `
      <span class="slot-title">${escapeHtml(court)}</span>
      <span class="slot-meta">Libre · ${money(suggestPrice(date, time))}</span>
    `;
    button.addEventListener("click", () => openReservationDialog({ date, time, court }));
  }

  return button;
}

function renderReservationsTable() {
  const query = normalize(el.reservationSearch.value);
  const rows = state.reservations
    .filter((reservation) => {
      const haystack = normalize(`${reservation.customerName} ${reservation.customerPhone} ${reservation.court}`);
      return haystack.includes(query);
    })
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  if (!rows.length) {
    el.reservationsTable.innerHTML = `<div class="panel">No hay reservas para mostrar.</div>`;
    return;
  }

  el.reservationsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Cancha</th>
          <th>Cliente</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Precio</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((reservation) => `
          <tr>
            <td>${formatDate(reservation.date)}</td>
            <td>${reservation.time}</td>
            <td>${escapeHtml(reservation.court)}</td>
            <td>${escapeHtml(reservation.customerName)}</td>
            <td><span class="badge ${reservation.type === "fixed" ? "fixed" : ""}">${reservation.type === "fixed" ? "Turno fijo" : "Ocasional"}</span></td>
            <td><span class="badge ${reservation.status}">${statusLabel(reservation.status)}</span></td>
            <td>${money(reservation.price)}</td>
            <td><button class="ghost-button" type="button" data-edit="${reservation.id}">Editar</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  el.reservationsTable.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const reservation = state.reservations.find((item) => item.id === button.dataset.edit);
      openReservationDialog(reservation);
    });
  });
}

function renderOwnerViews() {
  if (activeRole !== "owner") return;
  const month = el.dashboardMonth.value || toMonthInput(new Date());
  const metrics = getMonthlyMetrics(month);
  renderKpis(metrics);
  renderDayBars(month);
  renderOpportunities(month);
  renderProfitability(metrics);
}

function renderKpis(metrics) {
  const cards = [
    ["Ocupacion", percent(metrics.occupancy)],
    ["Turnos vendidos", metrics.confirmedCount],
    ["Cancelaciones", metrics.cancelledCount],
    ["Ingresos estimados", money(metrics.revenue)]
  ];
  el.kpiGrid.innerHTML = cards.map(([label, value]) => `
    <article class="kpi-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderDayBars(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  const stats = Array.from({ length: 7 }, (_, day) => ({ day, confirmed: 0, total: 0 }));
  const days = daysInMonth(year, monthIndex - 1);
  const slotsPerDay = getTimeSlots().length * courts.length;

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, monthIndex - 1, day);
    stats[date.getDay()].total += slotsPerDay;
  }

  state.reservations.forEach((reservation) => {
    if (!reservation.date.startsWith(month) || reservation.status !== "confirmed") return;
    const date = parseInputDate(reservation.date);
    stats[date.getDay()].confirmed += 1;
  });

  el.dayBars.innerHTML = stats.map((item) => {
    const value = item.total ? item.confirmed / item.total : 0;
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${dayNames[item.day]}</span><span>${percent(value)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(100, value * 100)}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderOpportunities(month) {
  const cancelled = state.reservations
    .filter((reservation) => reservation.date.startsWith(month) && reservation.status === "cancelled")
    .slice(0, 6);

  if (!cancelled.length) {
    el.opportunityList.innerHTML = `<div class="stack-item"><span>No hay cancelaciones registradas este mes.</span></div>`;
    return;
  }

  el.opportunityList.innerHTML = cancelled.map((reservation) => `
    <div class="stack-item">
      <span>${formatDate(reservation.date)} · ${reservation.time} · ${escapeHtml(reservation.court)}</span>
      <strong>${money(reservation.price)}</strong>
    </div>
  `).join("");
}

function renderCostInputs() {
  el.costInputs.innerHTML = Object.entries(costLabels).map(([key, label]) => `
    <label class="field">
      <span>${label}</span>
      <input id="cost-${key}" type="number" min="0" step="1000">
    </label>
  `).join("");
}

function renderProfitability(metrics) {
  Object.keys(costLabels).forEach((key) => {
    document.querySelector(`#cost-${key}`).value = state.costs[key] || 0;
  });

  const rows = [
    ["Costos fijos mensuales", money(metrics.fixedCosts)],
    ["Punto de equilibrio", money(metrics.fixedCosts)],
    ["Turnos minimos para cubrir costos", Math.ceil(metrics.breakEvenTurns)],
    ["Ocupacion minima necesaria", percent(metrics.minimumOccupancy)],
    ["Utilidad estimada", money(metrics.profit)],
    ["Impacto de cancelaciones", money(metrics.cancelledLoss)],
    ["Ingresos potenciales no capturados", money(metrics.uncapturedRevenue)]
  ];

  el.profitabilityMetrics.innerHTML = rows.map(([label, value]) => `
    <div class="metric-row">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderSettingsForm() {
  el.basePrice.value = state.settings.basePrice;
  el.valleyPrice.value = state.settings.valleyPrice;
  el.weekendPrice.value = state.settings.weekendPrice;
  el.openHour.value = state.settings.openHour;
  el.closeHour.value = state.settings.closeHour;
  el.slotDuration.value = String(state.settings.slotDuration);
}

function openReservationDialog(reservation = {}) {
  editingId = reservation.id || null;
  el.reservationDialogTitle.textContent = editingId ? "Editar reserva" : "Nueva reserva";
  el.reservationId.value = editingId || "";
  el.reservationDate.value = reservation.date || toInputDate(new Date());
  el.reservationTime.value = reservation.time || getTimeSlots()[0];
  el.reservationCourt.value = reservation.court || courts[0];
  el.reservationType.value = reservation.type || "occasional";
  el.customerName.value = reservation.customerName || "";
  el.customerPhone.value = reservation.customerPhone || "";
  el.reservationStatus.value = reservation.status || "confirmed";
  el.reservationNotes.value = reservation.notes || "";
  el.repeatFixed.checked = false;
  el.repeatFixed.disabled = Boolean(editingId);
  el.deleteReservationButton.classList.toggle("hidden", !editingId);
  updateSuggestedPrice(reservation.price);
  el.reservationDialog.showModal();
}

function closeDialog() {
  el.reservationDialog.close();
}

function saveReservationFromForm(event) {
  event.preventDefault();
  const reservation = {
    id: editingId || generateId("reservation"),
    date: el.reservationDate.value,
    time: el.reservationTime.value,
    court: el.reservationCourt.value,
    type: el.reservationType.value,
    customerName: el.customerName.value.trim(),
    customerPhone: el.customerPhone.value.trim(),
    price: Number(el.reservationPrice.value || 0),
    status: el.reservationStatus.value,
    notes: el.reservationNotes.value.trim(),
    createdAt: editingId ? findById(editingId).createdAt : new Date().toISOString()
  };

  const duplicated = state.reservations.find((item) => {
    return item.id !== reservation.id &&
      item.date === reservation.date &&
      item.time === reservation.time &&
      item.court === reservation.court &&
      item.status === "confirmed" &&
      reservation.status === "confirmed";
  });

  if (duplicated) {
    showToast("Ese horario ya tiene una reserva confirmada.");
    return;
  }

  if (editingId) {
    const index = state.reservations.findIndex((item) => item.id === editingId);
    state.reservations[index] = reservation;
  } else {
    state.reservations.push(reservation);
    if (reservation.type === "fixed" && el.repeatFixed.checked) {
      for (let week = 1; week <= 4; week += 1) {
        const nextDate = toInputDate(addDays(parseInputDate(reservation.date), week * 7));
        if (!findReservation(nextDate, reservation.time, reservation.court)) {
          state.reservations.push({ ...reservation, id: generateId("reservation"), date: nextDate, createdAt: new Date().toISOString() });
        }
      }
    }
  }

  saveState();
  closeDialog();
  renderAll();
  showToast("Reserva guardada.");
}

function deleteCurrentReservation() {
  if (!editingId) return;
  state.reservations = state.reservations.filter((reservation) => reservation.id !== editingId);
  saveState();
  closeDialog();
  renderAll();
  showToast("Reserva eliminada.");
}

function generateAvailabilityMessage() {
  const date = el.availabilityDate.value || toInputDate(new Date());
  const free = [];
  getTimeSlots().forEach((time) => {
    courts.forEach((court) => {
      if (!findReservation(date, time, court)) free.push(`${time} ${court}`);
    });
  });

  const message = free.length
    ? `Hola! Tenemos estos horarios disponibles para el ${formatDate(date)}:\n\n${free.slice(0, 12).map((slot) => `- ${slot}`).join("\n")}\n\nConsultanos por WhatsApp y te confirmamos el turno.`
    : `Hola! Por ahora no tenemos horarios disponibles para el ${formatDate(date)}.`;

  el.whatsappMessage.value = message;
  const phone = el.availabilityPhone.value.trim();
  el.openWhatsappLink.href = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  el.openWhatsappLink.classList.remove("disabled-link");
}

function getMonthlyMetrics(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = daysInMonth(year, monthIndex - 1);
  const capacity = days * getTimeSlots().length * courts.length;
  const reservations = state.reservations.filter((reservation) => reservation.date.startsWith(month));
  const confirmed = reservations.filter((reservation) => reservation.status === "confirmed");
  const cancelled = reservations.filter((reservation) => reservation.status === "cancelled");
  const revenue = sum(confirmed.map((reservation) => reservation.price));
  const cancelledLoss = sum(cancelled.map((reservation) => reservation.price));
  const averagePrice = state.settings.basePrice || 1;
  const fixedCosts = sum(Object.values(state.costs));
  const breakEvenTurns = fixedCosts / averagePrice;
  const freeSlots = Math.max(0, capacity - confirmed.length);
  const uncapturedRevenue = freeSlots * averagePrice + cancelledLoss;

  return {
    capacity,
    confirmedCount: confirmed.length,
    cancelledCount: cancelled.length,
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

function restoreDemo() {
  const demo = createDefaultState();
  state.settings = demo.settings;
  state.costs = demo.costs;
  state.reservations = demo.reservations;
  saveState();
  renderAll();
  showToast("Datos demo restaurados.");
}

function renderTimeOptions() {
  const options = getTimeSlots();
  el.reservationTime.innerHTML = "";
  options.forEach((time) => el.reservationTime.append(new Option(time, time)));
}

function updateSuggestedPrice(override) {
  if (typeof override === "number") {
    el.reservationPrice.value = override;
    return;
  }
  el.reservationPrice.value = suggestPrice(el.reservationDate.value, el.reservationTime.value);
}

function suggestPrice(dateText, time) {
  const date = parseInputDate(dateText);
  const hour = Number(time.split(":")[0]);
  if (date.getDay() === 0 || date.getDay() === 6) return state.settings.weekendPrice;
  if (hour < 19) return state.settings.valleyPrice;
  return state.settings.basePrice;
}

function findReservation(date, time, court) {
  return state.reservations.find((reservation) => reservation.date === date && reservation.time === time && reservation.court === court);
}

function findById(id) {
  return state.reservations.find((reservation) => reservation.id === id);
}

function getTimeSlots() {
  const slots = [];
  const [openHour, openMinute] = state.settings.openHour.split(":").map(Number);
  const [closeHour, closeMinute] = state.settings.closeHour.split(":").map(Number);
  let cursor = openHour * 60 + openMinute;
  const close = closeHour * 60 + closeMinute;

  while (cursor < close) {
    const hour = String(Math.floor(cursor / 60)).padStart(2, "0");
    const minute = String(cursor % 60).padStart(2, "0");
    slots.push(`${hour}:${minute}`);
    cursor += state.settings.slotDuration;
  }

  return slots;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();
  try {
    return JSON.parse(raw);
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createDefaultState() {
  const today = startOfWeek(new Date());
  return {
    settings: {
      basePrice: 30000,
      valleyPrice: 24000,
      weekendPrice: 36000,
      openHour: "18:00",
      closeHour: "23:00",
      slotDuration: 60
    },
    costs: {
      electricity: 220000,
      gas: 70000,
      water: 55000,
      salaries: 900000,
      rent: 450000,
      taxes: 160000,
      maintenance: 140000,
      other: 80000
    },
    reservations: [
      demoReservation(today, 0, "19:00", "Cancha 1", "Equipo de Nico", "fixed", 30000, "confirmed"),
      demoReservation(today, 1, "20:00", "Cancha 2", "Los Martes FC", "fixed", 30000, "confirmed"),
      demoReservation(today, 2, "18:00", "Cancha 3", "Juan Perez", "occasional", 24000, "cancelled"),
      demoReservation(today, 3, "21:00", "Cancha 4", "Tomas R.", "occasional", 30000, "confirmed"),
      demoReservation(today, 4, "22:00", "Cancha 1", "La Banda", "occasional", 30000, "confirmed"),
      demoReservation(today, 5, "19:00", "Cancha 2", "Fede Gomez", "occasional", 36000, "confirmed")
    ]
  };
}

function demoReservation(weekStart, dayOffset, time, court, customerName, type, price, status) {
  return {
    id: generateId("reservation"),
    date: toInputDate(addDays(weekStart, dayOffset)),
    time,
    court,
    type,
    customerName,
    customerPhone: "",
    price,
    status,
    notes: "",
    createdAt: new Date().toISOString()
  };
}

function cell(text, className) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return div;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseInputDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatDate(dateText) {
  const date = parseInputDate(dateText);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function money(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value || 0);
}

function percent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function statusLabel(status) {
  return status === "cancelled" ? "Cancelada" : "Confirmada";
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyText(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the manual selection fallback.
  }

  el.whatsappMessage.focus();
  el.whatsappMessage.select();
  return document.execCommand("copy");
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.setTimeout(() => el.toast.classList.remove("show"), 2400);
}
