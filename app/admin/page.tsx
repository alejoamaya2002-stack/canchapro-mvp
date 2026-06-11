"use client";

import { ArrowLeft, Building2, LogOut, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { loadCurrentProfile, signInWithPassword, signOut, type AuthProfile } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminComplex = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: string;
  public_slug: string | null;
};

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  status: string;
  complex_id: string | null;
};

type SnapshotInfo = {
  complex_id: string | null;
  updated_at: string;
};

function formatSnapshotDate(value?: string) {
  if (!value) return "No disponible con permisos actuales";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function AdminPage() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [complexes, setComplexes] = useState<AdminComplex[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [authError, setAuthError] = useState("");
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      let accessValidated = false;
      try {
        const currentProfile = await loadCurrentProfile();
        if (!active) return;
        setProfile(currentProfile);
        setAuthReady(true);

        if (!currentProfile || currentProfile.role !== "admin" || currentProfile.status !== "active") return;
        accessValidated = true;

        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
          setDataError("Supabase no esta configurado.");
          return;
        }

        setLoadingData(true);
        const complexesResult = await supabase
          .from("complexes")
          .select("id, name, address, phone, status, public_slug")
          .order("name");
        const usersResult = await supabase
          .from("profiles")
          .select("id, email, full_name, role, status, complex_id")
          .order("email");

        if (complexesResult.error) throw complexesResult.error;
        if (usersResult.error) throw usersResult.error;
        if (!active) return;

        setComplexes((complexesResult.data ?? []) as AdminComplex[]);
        setUsers((usersResult.data ?? []) as AdminUser[]);

        const snapshotsResult = await supabase
          .from("app_state_snapshots")
          .select("complex_id, updated_at");

        if (!snapshotsResult.error && active) {
          const snapshotMap = ((snapshotsResult.data ?? []) as SnapshotInfo[]).reduce<Record<string, string>>((result, snapshot) => {
            if (snapshot.complex_id) result[snapshot.complex_id] = snapshot.updated_at;
            return result;
          }, {});
          setSnapshots(snapshotMap);
        }
      } catch (error) {
        if (active) {
          setAuthReady(true);
          if (accessValidated) setDataError(error instanceof Error ? error.message : "No fue posible cargar el panel administrador.");
          else setAuthError(error instanceof Error ? error.message : "No fue posible validar el acceso.");
        }
      } finally {
        if (active) setLoadingData(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, []);

  const complexNames = useMemo(
    () => new Map(complexes.map((complex) => [complex.id, complex.name])),
    [complexes]
  );

  async function logout() {
    await signOut();
    window.location.replace("/admin");
  }

  if (!authReady) return <StatusScreen title="Verificando acceso" message="Validando la sesion administrativa." />;
  if (authError) return <AccessDenied message={authError} onLogout={logout} />;
  if (!profile) return <AdminLogin />;
  if (profile.status !== "active") {
    return <AccessDenied message="Tu usuario esta deshabilitado. Contacta al administrador del servicio." onLogout={logout} />;
  }
  if (profile.role !== "admin") {
    return <AccessDenied message="Esta seccion esta disponible unicamente para administradores generales." onLogout={logout} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 text-field-900">
      <header className="border-b border-line bg-field-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-lime-400 text-field-950"><ShieldCheck size={24} /></span>
            <div>
              <span className="text-xs font-black uppercase text-lime-400">CanchaPro</span>
              <h1 className="text-2xl font-black">Panel administrador</h1>
            </div>
          </div>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-field-900" type="button" onClick={logout}>
            <LogOut size={17} />Cambiar usuario
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <p className="text-sm text-slate-600">Sesion administrativa: <strong>{profile.email}</strong>. Este panel es solo lectura y no carga datos privados de reservas.</p>
        {dataError ? <Notice>{dataError}</Notice> : null}

        <AdminSection icon={<Building2 size={20} />} title="Complejos">
          {loadingData ? <EmptyState>Cargando complejos...</EmptyState> : complexes.length === 0 ? (
            <EmptyState>No hay complejos visibles con los permisos actuales.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-slate-500">
                  <tr><th className="p-3">Nombre</th><th className="p-3">Direccion</th><th className="p-3">Telefono</th><th className="p-3">Estado</th><th className="p-3">Slug publico</th><th className="p-3">Ultimo snapshot</th></tr>
                </thead>
                <tbody>
                  {complexes.map((complex) => (
                    <tr className="border-b border-line last:border-0" key={complex.id}>
                      <td className="p-3 font-black">{complex.name}</td>
                      <td className="p-3">{complex.address || "-"}</td>
                      <td className="p-3">{complex.phone || "-"}</td>
                      <td className="p-3"><StatusBadge value={complex.status} /></td>
                      <td className="p-3">{complex.public_slug || "-"}</td>
                      <td className="p-3">{formatSnapshotDate(snapshots[complex.id])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection icon={<UsersRound size={20} />} title="Usuarios">
          {loadingData ? <EmptyState>Cargando usuarios...</EmptyState> : users.length === 0 ? (
            <EmptyState>No hay usuarios visibles con los permisos actuales.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-slate-500">
                  <tr><th className="p-3">Email</th><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3">Complejo asociado</th></tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr className="border-b border-line last:border-0" key={user.id}>
                      <td className="p-3 font-black">{user.email || "-"}</td>
                      <td className="p-3">{user.full_name || "-"}</td>
                      <td className="p-3 uppercase">{user.role}</td>
                      <td className="p-3"><StatusBadge value={user.status} /></td>
                      <td className="p-3">{user.complex_id ? complexNames.get(user.complex_id) ?? user.complex_id : "Administrador general"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>
    </main>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signInWithPassword(email, password);
      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible iniciar sesion.");
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-field-900 px-4 py-8 text-white">
      <form className="w-full max-w-md rounded-lg bg-white p-6 text-field-900 shadow-soft" onSubmit={submit}>
        <span className="text-xs font-black uppercase text-lime-700">Acceso administrativo</span>
        <h1 className="mt-1 text-2xl font-black">Panel administrador</h1>
        <label className="mt-5 block text-sm font-black">Email<input className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 font-normal" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="mt-4 block text-sm font-black">Contrasena<input className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 font-normal" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
        <button className="mt-5 min-h-11 w-full rounded-lg bg-lime-500 px-4 text-sm font-black text-field-950 disabled:opacity-60" disabled={submitting} type="submit">{submitting ? "Ingresando..." : "Ingresar"}</button>
      </form>
    </main>
  );
}

function AccessDenied(props: { message: string; onLogout: () => Promise<void> }) {
  return (
    <main className="grid min-h-screen place-items-center bg-field-900 px-4 py-8 text-white">
      <section className="w-full max-w-lg rounded-lg bg-white p-6 text-field-900 shadow-soft">
        <span className="text-xs font-black uppercase text-red-700">Acceso denegado</span>
        <h1 className="mt-1 text-2xl font-black">Panel administrador</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{props.message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-black" href="/"><ArrowLeft size={17} />Volver a la app</Link>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-field-900 px-4 text-sm font-black text-white" type="button" onClick={props.onLogout}><LogOut size={17} />Cerrar sesion</button>
        </div>
      </section>
    </main>
  );
}

function StatusScreen(props: { title: string; message: string }) {
  return <main className="grid min-h-screen place-items-center bg-field-900 px-4 text-white"><div className="text-center"><h1 className="text-2xl font-black">{props.title}</h1><p className="mt-2 text-sm text-slate-300">{props.message}</p></div></main>;
}

function AdminSection(props: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm"><header className="flex items-center gap-2 border-b border-line p-4"><span className="text-lime-700">{props.icon}</span><h2 className="text-lg font-black">{props.title}</h2></header>{props.children}</section>;
}

function EmptyState(props: { children: ReactNode }) {
  return <p className="p-5 text-sm text-slate-600">{props.children}</p>;
}

function Notice(props: { children: ReactNode }) {
  return <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">{props.children}</p>;
}

function StatusBadge(props: { value: string }) {
  const active = props.value === "active";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-black uppercase ${active ? "bg-lime-100 text-lime-900" : "bg-slate-200 text-slate-700"}`}>{props.value}</span>;
}
