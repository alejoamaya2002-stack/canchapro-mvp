import type { AppState, Role } from "@/lib/types";

export type LegalAcceptance = {
  acceptedTerms: boolean;
  acceptedTermsAt: string;
  acceptedPrivacy: boolean;
  acceptedPrivacyAt: string;
};

export type StoredAppState = Partial<AppState>;

export type PersistenceProvider = {
  loadAppState: () => Promise<StoredAppState | null>;
  saveAppState: (state: AppState) => void;
  restoreDemoState: () => AppState;
  clearAppState: () => void;
  loadRole: () => Role | null;
  saveRole: (role: Role) => void;
  loadLegalAcceptance: () => LegalAcceptance | null;
  saveLegalAcceptance: (acceptance?: LegalAcceptance) => LegalAcceptance;
  loadOnboardingStatus: () => boolean;
  saveOnboardingStatus: (completedAt?: string) => string;
  markOnboardingIncomplete: () => void;
};
