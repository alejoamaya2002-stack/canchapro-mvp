import type { AppState } from "@/lib/types";
import type { StoredAppState } from "@/lib/persistence/types";
import {
  clearAppState as clearLocalAppState,
  loadAppState as loadLocalAppState,
  loadLegalAcceptance,
  loadOnboardingStatus,
  loadRole,
  restoreDemoState as restoreLocalDemoState,
  saveAppState as saveLocalAppState,
  saveLegalAcceptance,
  saveOnboardingStatus,
  saveRole
} from "@/lib/persistence/local-store";
import { isSupabaseConfigured, loadRemoteAppState, restoreRemoteDemoState, saveRemoteAppState } from "@/lib/persistence/supabase-store";

export * from "@/lib/persistence/types";
export { isSupabaseConfigured, loadLegalAcceptance, loadOnboardingStatus, loadRole, saveLegalAcceptance, saveOnboardingStatus, saveRole };

export async function loadAppState(): Promise<StoredAppState | null> {
  const localState = loadLocalAppState();

  if (!isSupabaseConfigured()) return localState;

  try {
    const remoteState = await loadRemoteAppState();
    if (remoteState) {
      saveLocalAppState(remoteState as AppState);
      return remoteState;
    }

    if (localState) {
      void saveRemoteSafely(localState as AppState);
      return localState;
    }
  } catch {
    return localState;
  }

  return localState;
}

export function saveAppState(state: AppState) {
  saveLocalAppState(state);
  if (isSupabaseConfigured()) void saveRemoteSafely(state);
}

export function restoreDemoState() {
  const demo = restoreLocalDemoState();
  if (isSupabaseConfigured()) void restoreRemoteSafely(demo);
  return demo;
}

export function clearAppState() {
  clearLocalAppState();
}

async function saveRemoteSafely(state: AppState) {
  try {
    await saveRemoteAppState(state);
  } catch {
    // localStorage remains the operational fallback for the MVP pilot.
  }
}

async function restoreRemoteSafely(state: AppState) {
  try {
    await restoreRemoteDemoState(state);
  } catch {
    // localStorage remains the operational fallback for the MVP pilot.
  }
}
