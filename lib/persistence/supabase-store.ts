import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppState } from "@/lib/types";
import type { StoredAppState } from "@/lib/persistence/types";

const snapshotId = "default";
const snapshotsTable = "app_state_snapshots";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export async function loadRemoteAppState(): Promise<StoredAppState | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(snapshotsTable)
    .select("state")
    .eq("id", snapshotId)
    .maybeSingle();

  if (error) throw error;
  return data?.state ? data.state as StoredAppState : null;
}

export async function saveRemoteAppState(state: AppState) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;

  const { error } = await supabase
    .from(snapshotsTable)
    .upsert({
      id: snapshotId,
      state,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

export async function restoreRemoteDemoState(state: AppState) {
  await saveRemoteAppState(state);
}
