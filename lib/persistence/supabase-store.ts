import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppState } from "@/lib/types";
import type { StoredAppState } from "@/lib/persistence/types";

const snapshotsTable = "app_state_snapshots";

type AppStateSnapshotRow = {
  id: string;
  complex_id: string | null;
  state: StoredAppState;
  updated_at: string;
};

type AppStateSnapshotUpsert = {
  id: string;
  complex_id: string;
  state: AppState;
  updated_at: string;
};

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export async function loadRemoteAppState(complexId: string): Promise<StoredAppState | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: rawData, error } = await supabase
    .from(snapshotsTable)
    .select("state")
    .eq("complex_id", complexId)
    .maybeSingle();

  if (error) throw error;
  const data = rawData as Pick<AppStateSnapshotRow, "state"> | null;
  return data?.state ?? null;
}

export async function saveRemoteAppState(state: AppState, complexId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;

  const { data: rawExisting, error: lookupError } = await supabase
    .from(snapshotsTable)
    .select("id")
    .eq("complex_id", complexId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  const existing = rawExisting as Pick<AppStateSnapshotRow, "id"> | null;

  const payload: AppStateSnapshotUpsert = {
    id: existing?.id ?? complexId,
    complex_id: complexId,
    state,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from(snapshotsTable)
    // The browser client has no generated Database type, so this table's write type is inferred as never.
    .upsert(payload as never);

  if (error) throw error;
}

export async function restoreRemoteDemoState(state: AppState, complexId: string) {
  await saveRemoteAppState(state, complexId);
}
