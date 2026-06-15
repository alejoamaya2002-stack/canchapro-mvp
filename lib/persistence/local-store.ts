import { createDemoStateForComplex, storageKey } from "@/lib/demo-data";
import type { AppState } from "@/lib/types";
import type { LegalAcceptance, StoredAppState } from "@/lib/persistence/types";

export const legalAcceptanceKey = "canchapro-legal-acceptance";
export const onboardingCompleteKey = "canchapro-onboarding-complete";

function scopedKey(key: string, complexId?: string) {
  return complexId ? `${key}:${complexId}` : key;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadAppState(complexId?: string): StoredAppState | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(scopedKey(storageKey, complexId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAppState;
  } catch {
    return null;
  }
}

export function saveAppState(state: AppState, complexId?: string) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(scopedKey(storageKey, complexId), JSON.stringify(state));
}

export function restoreDemoState(complexId?: string, currentState?: Partial<AppState> | null) {
  const demo = createDemoStateForComplex(complexId, currentState);
  saveAppState(demo, complexId);
  saveOnboardingStatus(complexId);
  return demo;
}

export function clearAppState(complexId?: string) {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(scopedKey(storageKey, complexId));
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

export function loadOnboardingStatus(complexId?: string) {
  if (!canUseLocalStorage()) return false;
  return Boolean(window.localStorage.getItem(scopedKey(onboardingCompleteKey, complexId)));
}

export function saveOnboardingStatus(complexId?: string, completedAt = new Date().toISOString()) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(scopedKey(onboardingCompleteKey, complexId), completedAt);
  }
  return completedAt;
}

export function markOnboardingIncomplete(complexId?: string) {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(scopedKey(onboardingCompleteKey, complexId));
}
