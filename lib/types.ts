export type Role = "owner" | "staff";

export type ReservationStatus = "confirmed" | "pending" | "cancelled";

export type ReservationType = "occasional" | "fixed";

export type Court = {
  id: string;
  name: string;
  type: "futbol5" | "futbol6" | "futbol7" | "futbol9";
  roofed?: boolean;
  price?: number;
  active: boolean;
  openHour: string;
  closeHour: string;
  slotStepMinutes: number;
};

export type ValleyRange = {
  id: string;
  days: number[];
  from: string;
  to: string;
  price: number;
};

export type Settings = {
  basePrice: number;
  valleyPrice: number;
  weekendPrice: number;
  openHour: string;
  closeHour: string;
  slotDuration: number;
  confirmationLeadHours: number;
  openDays?: number[];
  valleyRanges?: ValleyRange[];
};

export type FixedCosts = {
  electricity: number;
  gas: number;
  water: number;
  salaries: number;
  rent: number;
  taxes: number;
  maintenance: number;
  other: number;
};

export type Reservation = {
  id: string;
  courtId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  type: ReservationType;
  status: ReservationStatus;
  price: number;
  durationMinutes: number;
  notes: string;
  cancellationReason?: string;
  cancellationLastMinute?: boolean;
  cancelledAt?: string;
  cancelledDates?: string[];
  confirmedDates?: string[];
  seriesEndDate?: string;
  paid?: boolean;
  paidAt?: string;
  paidDates?: string[];
  createdAt: string;
};

export type AppState = {
  complex: {
    id: string;
    name: string;
    address: string;
    phone: string;
    responsibleName?: string;
    configuredByRole?: Role;
  };
  courts: Court[];
  settings: Settings;
  costs: FixedCosts;
  reservations: Reservation[];
  publicSlotIds: string[];
  validationRecords: ValidationRecord[];
};

export type ValidationRecord = {
  id: string;
  complexName: string;
  courtsCount: number;
  currentMethod: string;
  weeklyCancellations: number;
  unsoldTurnsPerWeek: number;
  averageTurnPrice: number;
  staffLoadedWithoutHelp: boolean;
  ownerUnderstoodDashboard: boolean;
  willingnessToPay: "no_pay" | "up_to_amount" | "free_trial" | "pay_if_recovers";
  willingnessAmount: number;
  comments: string;
  createdAt: string;
};

export type MonthlyMetrics = {
  capacity: number;
  confirmedCount: number;
  cancelledCount: number;
  pendingCount: number;
  soldCount: number;
  soldRevenue: number;
  revenue: number;
  fixedCosts: number;
  breakEvenTurns: number;
  minimumOccupancy: number;
  occupancy: number;
  profit: number;
  cancelledLoss: number;
  uncapturedRevenue: number;
};
