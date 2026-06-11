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

export async function signInWithPassword(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
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
