import type { AppState } from "@/lib/types";

export type LegalAcceptance = {
  acceptedTerms: boolean;
  acceptedTermsAt: string;
  acceptedPrivacy: boolean;
  acceptedPrivacyAt: string;
};

export type StoredAppState = Partial<AppState>;

export type PersistenceProvider = {
  loadAppState: (complexId?: string) => Promise<StoredAppState | null>;
  saveAppState: (state: AppState, complexId?: string) => void;
  restoreDemoState: (complexId?: string, currentState?: Partial<AppState> | null, demoHint?: string) => AppState;
  clearAppState: (complexId?: string) => void;
  loadLegalAcceptance: () => LegalAcceptance | null;
  saveLegalAcceptance: (acceptance?: LegalAcceptance) => LegalAcceptance;
  loadOnboardingStatus: (complexId?: string) => boolean;
  saveOnboardingStatus: (complexId?: string, completedAt?: string) => string;
  markOnboardingIncomplete: (complexId?: string) => void;
};
