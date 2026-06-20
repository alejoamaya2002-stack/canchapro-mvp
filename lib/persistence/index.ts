import type { AppState } from "@/lib/types";
import type { StoredAppState } from "@/lib/persistence/types";
import { createEmptyInitialState } from "@/lib/demo-data";
import {
  clearAppState as clearLocalAppState,
  loadAppState as loadLocalAppState,
  loadLegalAcceptance,
  loadOnboardingStatus,
  markOnboardingIncomplete,
  restoreDemoState as restoreLocalDemoState,
  saveAppState as saveLocalAppState,
  saveLegalAcceptance,
  saveOnboardingStatus
} from "@/lib/persistence/local-store";
import { isSupabaseConfigured, loadRemoteAppState, restoreRemoteDemoState, saveRemoteAppState } from "@/lib/persistence/supabase-store";

export * from "@/lib/persistence/types";
export { isSupabaseConfigured, loadLegalAcceptance, loadOnboardingStatus, markOnboardingIncomplete, saveLegalAcceptance, saveOnboardingStatus };

export async function loadAppState(complexId?: string): Promise<StoredAppState | null> {
  const localState = loadLocalAppState(complexId);

  if (!isSupabaseConfigured() || !complexId) return localState;

  try {
    const remoteState = await loadRemoteAppState(complexId);
    if (remoteState) {
      saveLocalAppState(remoteState as AppState, complexId);
      return remoteState;
    }

    if (localState) {
      void saveRemoteSafely(localState as AppState, complexId);
      return localState;
    }
  } catch {
    return localState;
  }

  return localState;
}

export function saveAppState(state: AppState, complexId?: string) {
  saveLocalAppState(state, complexId);
  if (isSupabaseConfigured() && complexId) void saveRemoteSafely(state, complexId);
}

export function restoreDemoState(complexId?: string, currentState?: Partial<AppState> | null, demoHint = "") {
  const demo = restoreLocalDemoState(complexId, currentState, demoHint);
  if (isSupabaseConfigured() && complexId) void restoreRemoteSafely(demo, complexId);
  return demo;
}

export function clearAppState(complexId?: string) {
  clearLocalAppState(complexId);
}

export function resetForRealPilot(complexId?: string) {
  const emptyState = createEmptyInitialState();
  saveLocalAppState(emptyState, complexId);
  markOnboardingIncomplete(complexId);
  if (isSupabaseConfigured() && complexId) void saveRemoteSafely(emptyState, complexId);
  return emptyState;
}

async function saveRemoteSafely(state: AppState, complexId: string) {
  try {
    await saveRemoteAppState(state, complexId);
  } catch {
    // localStorage remains the operational fallback for the MVP pilot.
  }
}

async function restoreRemoteSafely(state: AppState, complexId: string) {
  try {
    await restoreRemoteDemoState(state, complexId);
  } catch {
    // localStorage remains the operational fallback for the MVP pilot.
  }
}
