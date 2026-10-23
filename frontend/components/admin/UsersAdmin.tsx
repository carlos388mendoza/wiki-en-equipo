"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, LoaderCircle, Plus, Search, UserCheck, UserX } from "lucide-react";
import { createDepartment, createUser, updateUser, type UserForm } from "@/app/actions/admin";
import { roleLabel } from "@/lib/permissions";
import type { Department, ManagedUser, UserRole } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";

const roles: UserRole[] = ["USER", "DEPARTMENT_ADMIN", "ADMIN"];
const input = "h-10 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return [...bytes].map((b) => chars[b % chars.length]).join("");
}

export function UsersAdmin({ users, departments, viewerId }: { users: ManagedUser[]; departments: Department[]; viewerId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmOff, setConfirmOff] = useState<ManagedUser | null>(null);
  const [show, setShow] = useState<"activos" | "inactivos">("activos");
  const inactiveCount = users.filter((u) => u.active === false).length;

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";
  const q = query.trim().toLowerCase();
  const filtered = users
    .filter((u) => (show === "inactivos" ? u.active === false : u.active !== false))
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || deptName(u.departmentId).toLowerCase().includes(q));

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string, after?: () => void) => start(async () => {
    const res = await fn();
    setMessage(res.ok ? { ok: true, text: success } : { ok: false, text: res.message ?? "No se pudo completar." });
    if (res.ok) { after?.(); router.refresh(); }
  });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="usuarios">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 id="usuarios" className="flex-1 font-display text-xl font-semibold">Usuarios</h2>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-brand">
            <Search size={16} className="text-muted" aria-hidden />
            <span className="sr-only">Buscar usuarios</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o depto." className="h-10 w-full bg-transparent text-sm outline-none sm:w-64" />
          </label>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-medium text-on-ink hover:bg-brand hover:text-white">
            <Plus size={16} aria-hidden /> Nuevo usuario
          </button>
        </div>

        <div role="tablist" aria-label="Estado de las cuentas" className="mt-3 inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm">
          {([["activos", "Activos"], ["inactivos", `Inactivos (${inactiveCount})`]] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={show === value} onClick={() => setShow(value)}
              className={`rounded-md px-3 py-1.5 font-medium ${show === value ? "bg-sky-soft text-sky" : "text-muted hover:text-ink"}`}>{label}</button>
          ))}
        </div>

        {message && <p role={message.ok ? "status" : "alert"} className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-sky-soft text-sky" : "bg-danger-soft text-danger"}`}>{message.text}</p>}

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-muted">{show === "inactivos" && !q ? "No hay cuentas desactivadas." : "No hay usuarios que coincidan."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {filtered.map((u) => {
              const self = u.id === viewerId;
              const inactive = u.active === false;
              return (
                <li key={u.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}{self && " (tú)"}{inactive && <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs font-normal text-muted">Desactivada</span>}</p>
                      <p className="truncate text-sm text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label={`Rol de ${u.name}`} value={u.role} disabled={pending || self} title={self ? "No puedes cambiar tu propio rol" : undefined}
                      onChange={(e) => run(() => updateUser(u.id, { role: e.target.value as UserRole }), `${u.name} ahora es ${roleLabel[e.target.value as UserRole].toLowerCase()}.`)}
                      className={`${input} h-9`}>
                      {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                    </select>
                    <select aria-label={`Departamento de ${u.name}`} value={u.departmentId} disabled={pending}
                      onChange={(e) => run(() => updateUser(u.id, { departmentId: e.target.value }), `${u.name} pasó a ${deptName(e.target.value)}.`)}
                      className={`${input} h-9`}>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {inactive ? (
                      <button type="button" disabled={pending} onClick={() => run(() => updateUser(u.id, { active: true }), `Se reactivó la cuenta de ${u.name}.`)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium hover:border-brand disabled:opacity-60">
                        <UserCheck size={16} aria-hidden /> Reactivar
                      </button>
                    ) : !self && (
                      <button type="button" onClick={() => setConfirmOff(u)} aria-label={`Desactivar a ${u.name}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-danger-soft hover:text-danger">
                        <UserX size={16} aria-hidden /> <span className="md:sr-only">Desactivar</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Roles: Usuario crea y publica en su departamento · Admin. de departamento además edita el muro de su departamento · Administrador gestiona usuarios y ve todo lo público.</p>
      </section>

      <DepartmentsSection departments={departments} pending={pending} run={run} />

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo usuario" description="Comparte la contraseña temporal por un canal seguro. La persona puede cambiarla en “Mi cuenta” (clic en su nombre, abajo en el menú).">
        <NewUserForm departments={departments} onDone={(text) => { setCreating(false); setMessage({ ok: true, text }); router.refresh(); }} />
      </Modal>

      <Modal open={confirmOff !== null} onClose={() => setConfirmOff(null)} title={`¿Desactivar a ${confirmOff?.name ?? ""}?`}>
        <p className="text-sm text-muted">Perderá el acceso de inmediato. Sus páginas se conservan. Para reactivar la cuenta hará falta ayuda técnica (ver pendientes del backend).</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmOff(null)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Cancelar</button>
          <button type="button" disabled={pending} onClick={() => { const u = confirmOff!; setConfirmOff(null); run(() => updateUser(u.id, { active: false }), `Se desactivó la cuenta de ${u.name}.`); }}
            className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-on-danger disabled:opacity-60">Desactivar</button>
        </div>
      </Modal>
    </div>
  );
}

function NewUserForm({ departments, onDone }: { departments: Department[]; onDone: (text: string) => void }) {
  const [form, setForm] = useState<UserForm>({ name: "", email: "", password: tempPassword(), role: "USER", departmentId: departments[0]?.id ?? "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form className="flex flex-col gap-3 text-sm" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await createUser(form);
        if (!res.ok) { setError(res.message); return; }
        onDone(`Se creó la cuenta de ${form.name}. Contraseña temporal: ${form.password}`);
      });
    }}>
      <label className="flex flex-col gap-1 font-medium">Nombre completo<input required value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} className={input} /></label>
      <label className="flex flex-col gap-1 font-medium">Correo<input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nombre@grupocomidas.com" className={input} /></label>
      <label className="flex flex-col gap-1 font-medium">Contraseña temporal
        <span className="flex gap-2">
          <input required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} className={`${input} min-w-0 flex-1 font-mono`} />
          <button type="button" onClick={() => set("password", tempPassword())} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 hover:border-brand"><KeyRound size={14} aria-hidden /> Generar</button>
        </span>
        <span className="text-xs font-normal text-muted">Mínimo 8 caracteres.</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-medium">Rol
          <select value={form.role} onChange={(e) => set("role", e.target.value as UserRole)} className={input}>{roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 font-medium">Departamento
          <select required value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)} className={input}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-danger">{error}</p>}
      <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink font-medium text-on-ink hover:bg-brand hover:text-white disabled:opacity-60">
        {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Crear usuario
      </button>
    </form>
  );
}

function DepartmentsSection({ departments, pending, run }: {
  departments: Department[]; pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; message?: string }>, success: string, after?: () => void) => void;
}) {
  const [name, setName] = useState("");
  return (
    <section id="departamentos" aria-labelledby="titulo-departamentos">
      <h2 id="titulo-departamentos" className="font-display text-xl font-semibold">Departamentos</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <li key={d.id} className="rounded-xl border border-line bg-surface p-4">
            <a href={`/departamentos/${d.slug}`} className="font-medium hover:underline">{d.name}</a>
            <p className="text-sm text-muted">{plural(d.memberCount ?? 0, "persona", "personas")} · {plural(d.pageCount ?? 0, "página", "páginas")}{d.wallPageId ? " · con muro" : ""}</p>
          </li>
        ))}
      </ul>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) run(() => createDepartment(name), `Se creó el departamento ${name.trim()}.`, () => setName("")); }}>
        <label className="sr-only" htmlFor="nuevo-depto">Nombre del nuevo departamento</label>
        <input id="nuevo-depto" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} placeholder="Nombre del nuevo departamento" className={`${input} flex-1`} />
        <button type="submit" disabled={pending || name.trim().length < 2} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-medium hover:border-brand disabled:opacity-50">
          <Plus size={16} aria-hidden /> Crear departamento
        </button>
      </form>
    </section>
  );
}
