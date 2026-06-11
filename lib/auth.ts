import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export type AuthProfile = {
  id: string;
  complex_id: string | null;
  email: string | null;
  full_name: string;
  role: Role;
  status: "active" | "disabled";
};

function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("invalid refresh token") || message.includes("refresh token not found");
}

async function clearInvalidSession() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The invalid session may already have been removed by Supabase.
  }
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error && !isInvalidRefreshTokenError(error)) throw error;
    if (error) await clearInvalidSession();
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) throw error;
    await clearInvalidSession();
  }
}

export async function loadCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no esta configurado.");

  let sessionResult;
  try {
    sessionResult = await supabase.auth.getSession();
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) throw error;
    await clearInvalidSession();
    return null;
  }

  const { data: { session }, error: sessionError } = sessionResult;
  if (sessionError) {
    if (!isInvalidRefreshTokenError(sessionError)) throw sessionError;
    await clearInvalidSession();
    return null;
  }
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, complex_id, email, full_name, role, status")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("La cuenta no tiene un perfil de CanchaPro asociado.");
  return data as AuthProfile;
}
