"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Copy, Link2, LoaderCircle, Lock, Search, Share2, Trash2, UserPlus, Users } from "lucide-react";
import { createShareLink, revokeShare, revokeShareLink, setVisibility, sharePage, type ShareLink } from "@/app/actions/sharing";
import { canPublishTo } from "@/lib/permissions";
import type { ManagedUser, Page, PagePermission, PageVisibility, User } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";

const permissionLabel: Record<PagePermission, string> = { READ: "Puede ver", EDIT: "Puede editar" };
const expirations = [
  { label: "Sin vencimiento", hours: 0 },
  { label: "24 horas", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
];

type SharePage = Pick<Page, "id" | "title" | "visibility" | "version" | "ownerId" | "departmentId" | "isWall" | "isCompanyWall" | "shares" | "owner">;

function PermissionSelect({ value, onChange, disabled, label }: { value: PagePermission; onChange: (v: PagePermission) => void; disabled?: boolean; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PagePermission)}
      className="h-9 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-basil disabled:opacity-60"
    >
      <option value="READ">{permissionLabel.READ}</option>
      <option value="EDIT">{permissionLabel.EDIT}</option>
    </select>
  );
}

export function ShareButton(props: { page: SharePage; viewer: User; people: ManagedUser[] | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-basil">
        <Share2 size={14} aria-hidden /> Compartir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Compartir página" description={props.page.title} size="lg">
        <ShareDialogBody {...props} />
      </Modal>
    </>
  );
}

function ShareDialogBody({ page, viewer, people }: { page: SharePage; viewer: User; people: ManagedUser[] | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [shares, setShares] = useState(page.shares);
  const [visibility, setVis] = useState<PageVisibility>(page.visibility);
  const [version, setVersion] = useState(page.version);
  const [query, setQuery] = useState("");
  const [invitePermission, setInvitePermission] = useState<PagePermission>("READ");
  const [linkPermission, setLinkPermission] = useState<PagePermission>("READ");
  const [linkHours, setLinkHours] = useState(0);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const nameOf = (id: string) => people?.find((p) => p.id === id);
  const sharedIds = new Set(shares.map((s) => s.userId));
  const q = query.trim().toLowerCase();
  const candidates = (people ?? [])
    .filter((p) => p.id !== viewer.id && p.id !== page.ownerId && !sharedIds.has(p.id))
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    .slice(0, 6);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      setMessage(null);
      const res = await fn();
      if (!res.ok) { setMessage({ tone: "error", text: res.message ?? "No se pudo completar la acción." }); return; }
      after?.();
      setMessage({ tone: "ok", text: success });
      router.refresh();
    });

  const options: { value: PageVisibility; label: string; help: string; Icon: typeof Lock; allowed: boolean; reason?: string }[] = [
    {
      value: "PRIVATE", label: "Privada", Icon: Lock, help: "Solo tú y las personas que invites.",
      allowed: !page.isWall && !page.isCompanyWall,
      reason: page.isWall ? "El muro del departamento debe ser visible para el departamento." : page.isCompanyWall ? "El muro de la empresa debe estar publicado para toda la empresa." : undefined,
    },
    {
      value: "DEPARTMENT", label: "Departamento", Icon: Users, help: `Todas las personas de ${viewer.departmentId === page.departmentId ? viewer.department?.name ?? "tu departamento" : "su departamento"}.`,
      allowed: canPublishTo(viewer, page, "DEPARTMENT") && !page.isCompanyWall,
      reason: page.isCompanyWall ? "El muro de la empresa debe estar publicado para toda la empresa." : undefined,
    },
    {
      value: "COMPANY", label: "Toda la empresa", Icon: Building2, help: "Todo Grupo Comidas.",
      allowed: canPublishTo(viewer, page, "COMPANY"),
      reason: "Solo un administrador puede publicar para toda la empresa.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${message.tone === "error" ? "bg-danger-soft text-danger" : "bg-basil-soft text-basil"}`}>
          {message.text}
        </p>
      )}

      <section aria-labelledby="publicar">
        <h3 id="publicar" className="mb-2 text-sm font-semibold">Quién puede verla</h3>
        <div role="radiogroup" aria-labelledby="publicar" className="grid gap-2 sm:grid-cols-3">
          {options.map(({ value, label, help, Icon, allowed, reason }) => {
            const active = visibility === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending || (!allowed && !active)}
                title={!allowed ? reason : undefined}
                onClick={() => {
                  if (active) return;
                  run(async () => {
                    const res = await setVisibility(page.id, value, version);
                    if (res.ok) { setVis(value); setVersion(res.data.version); }
                    return res;
                  }, value === "PRIVATE" ? "La página ahora es privada." : value === "DEPARTMENT" ? "Publicada en el departamento." : "Publicada para toda la empresa.");
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed ${active ? "border-basil bg-basil-soft" : "border-line hover:border-basil disabled:opacity-50 disabled:hover:border-line"}`}
              >
                <span className="flex items-center gap-1.5 font-medium"><Icon size={14} aria-hidden /> {label} {active && <Check size={14} className="text-basil" aria-label="(actual)" />}</span>
                <span className="text-xs text-muted">{!allowed && !active && reason ? reason : help}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="invitar">
        <h3 id="invitar" className="mb-2 text-sm font-semibold">Invitar a una persona</h3>
        {people ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-basil">
                <Search size={16} className="text-muted" aria-hidden />
                <span className="sr-only">Buscar por nombre o correo</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o correo" className="h-10 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <PermissionSelect value={invitePermission} onChange={setInvitePermission} label="Permiso para la invitación" />
            </div>
            {query.trim() && (
              candidates.length === 0 ? (
                <p className="text-sm text-muted">No hay personas que coincidan (o ya tienen acceso).</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                  {candidates.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <Avatar name={p.name} size={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted">{p.email}</span>
                      </span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => sharePage(page.id, p.id, invitePermission), `${p.name} ya tiene acceso (${permissionLabel[invitePermission].toLowerCase()}).`, () => {
                          setShares((s) => [...s, { userId: p.id, permission: invitePermission }]);
                          setQuery("");
                        })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-basil disabled:opacity-60"
                      >
                        <UserPlus size={14} aria-hidden /> Invitar
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-paper px-3 py-2 text-sm text-muted">
            Por ahora la invitación directa está disponible solo para administradores. Comparte un enlace (abajo): la persona lo abre con su cuenta y obtiene el permiso que elijas.
          </p>
        )}
      </section>

      <section aria-labelledby="con-acceso">
        <h3 id="con-acceso" className="mb-2 text-sm font-semibold">Personas con acceso</h3>
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          <li className="flex items-center gap-3 px-3 py-2">
            <Avatar name={page.owner?.name ?? "Propietario"} size={26} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{page.owner?.name ?? "Quien creó la página"}{page.ownerId === viewer.id && " (tú)"}</span>
            <span className="text-xs text-muted">Propietario</span>
          </li>
          {shares.map((s) => {
            const person = nameOf(s.userId);
            const name = person?.name ?? (s.userId === viewer.id ? viewer.name : "Persona con acceso");
            return (
              <li key={s.userId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Avatar name={name} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{name}{s.userId === viewer.id && " (tú)"}</span>
                  {person && <span className="block truncate text-xs text-muted">{person.email}</span>}
                </span>
                {s.userId === viewer.id ? (
                  <span className="text-xs text-muted">{permissionLabel[s.permission]}</span>
                ) : (<>
                <PermissionSelect
                  value={s.permission}
                  disabled={pending}
                  label={`Permiso de ${name}`}
                  onChange={(permission) => run(() => sharePage(page.id, s.userId, permission), `Permiso actualizado: ${permissionLabel[permission].toLowerCase()}.`, () =>
                    setShares((list) => list.map((x) => (x.userId === s.userId ? { ...x, permission } : x))))}
                />
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Quitar acceso a ${name}`}
                  onClick={() => run(() => revokeShare(page.id, s.userId), `Se quitó el acceso a ${name}.`, () => setShares((list) => list.filter((x) => x.userId !== s.userId)))}
                  className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                >
                  <Trash2 size={16} />
                </button>
                </>)}
              </li>
            );
          })}
        </ul>
        {shares.length === 0 && <p className="mt-2 text-sm text-muted">Todavía no la compartes con nadie.</p>}
      </section>

      <section aria-labelledby="enlace">
        <h3 id="enlace" className="mb-1 text-sm font-semibold">Enlace para compartir</h3>
        <p className="mb-2 text-xs text-muted">Quien lo abra debe iniciar sesión con su cuenta de la wiki. Al aceptarlo, recibe el permiso elegido.</p>
        {link ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input readOnly value={link.url} aria-label="Enlace para compartir" onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-sm" />
              <button
                type="button"
                onClick={async () => { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-basil"
              >
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-xs text-muted">
              {permissionLabel[link.permission]} · {link.expiresAt ? `vence el ${new Date(link.expiresAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}` : "sin vencimiento"} ·{" "}
              <button type="button" disabled={pending} onClick={() => run(() => revokeShareLink(page.id, link.id), "El enlace se desactivó. Quienes ya lo aceptaron conservan el acceso.", () => setLink(null))} className="text-danger underline">
                Desactivar enlace
              </button>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <PermissionSelect value={linkPermission} onChange={setLinkPermission} label="Permiso del enlace" />
            <select aria-label="Vencimiento del enlace" value={linkHours} onChange={(e) => setLinkHours(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-basil">
              {expirations.map((x) => <option key={x.hours} value={x.hours}>{x.label}</option>)}
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(async () => {
                const res = await createShareLink(page.id, linkPermission, linkHours || undefined);
                if (res.ok) setLink(res.data);
                return res;
              }, "Enlace creado. Cópialo y envíalo.")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-basil disabled:opacity-60"
            >
              {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Link2 size={14} aria-hidden />} Crear enlace
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
