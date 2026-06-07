import { createDefaultState, storageKey } from "@/lib/demo-data";
import type { AppState, Role } from "@/lib/types";
import type { LegalAcceptance, StoredAppState } from "@/lib/persistence/types";

export const roleKey = "canchapro-role";
export const legalAcceptanceKey = "canchapro-legal-acceptance";
export const onboardingCompleteKey = "canchapro-onboarding-complete";

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadAppState(): StoredAppState | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAppState;
  } catch {
    return null;
  }
}

export function saveAppState(state: AppState) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function restoreDemoState() {
  const demo = createDefaultState();
  saveAppState(demo);
  saveOnboardingStatus();
  return demo;
}

export function clearAppState() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(storageKey);
}

export function loadRole(): Role | null {
  if (!canUseLocalStorage()) return null;
  const role = window.localStorage.getItem(roleKey);
  return role === "owner" || role === "staff" ? role : null;
}

export function saveRole(role: Role) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(roleKey, role);
}

export function loadLegalAcceptance(): LegalAcceptance | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(legalAcceptanceKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LegalAcceptance;
  } catch {
    return null;
  }
}

export function saveLegalAcceptance(acceptance?: LegalAcceptance) {
  const now = new Date().toISOString();
  const next = acceptance ?? {
    acceptedTerms: true,
    acceptedTermsAt: now,
    acceptedPrivacy: true,
    acceptedPrivacyAt: now
  };

  if (canUseLocalStorage()) {
    window.localStorage.setItem(legalAcceptanceKey, JSON.stringify(next));
  }

  return next;
}

export function loadOnboardingStatus() {
  if (!canUseLocalStorage()) return false;
  return Boolean(window.localStorage.getItem(onboardingCompleteKey));
}

export function saveOnboardingStatus(completedAt = new Date().toISOString()) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(onboardingCompleteKey, completedAt);
  }
  return completedAt;
}
