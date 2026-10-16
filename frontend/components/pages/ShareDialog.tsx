"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Copy, Link2, LoaderCircle, Lock, Search, Share2, Trash2, UserPlus, Users } from "lucide-react";
import { loadTemplate, updateTemplate } from "@/app/actions/pages";
import {
  createShareLink, listShareLinks, revokeShare, revokeShareLink, searchPeople, setVisibility, shareWith,
  type ShareLink, type ShareTarget,
} from "@/app/actions/sharing";
import { canPublishTo } from "@/lib/permissions";
import type { DirectoryUser, Page, PagePermission, PageVisibility, Share, ShareLinkSummary, Template, TemplateScope, TemplateSummary, User } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";

const permissionLabel: Record<PagePermission, string> = { READ: "Puede ver", EDIT: "Puede editar" };
const expirations = [
  { label: "Sin vencimiento", hours: 0 },
  { label: "24 horas", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
];
const dateTime = (iso: string) => new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });

type SharePage = Pick<Page, "id" | "title" | "visibility" | "version" | "ownerId" | "departmentId" | "isWall" | "isCompanyWall" | "shares" | "owner">;
type ShareTemplate = Pick<Template, "id" | "title" | "scope" | "isDefault" | "ownerId" | "owner" | "shares" | "canManage">;

/** Lo que se comparte: una página (con su visibilidad) o una plantilla (con su alcance). */
type Subject = { kind: "page"; page: SharePage } | { kind: "template"; template: ShareTemplate };

const triggerClass = {
  normal: "inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-brand",
  small: "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink",
};

export function ShareButton({ page, viewer }: { page: SharePage; viewer: User }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass.normal}>
        <Share2 size={14} aria-hidden /> Compartir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Compartir página" description={page.title} size="lg">
        <ShareDialogBody subject={{ kind: "page", page }} viewer={viewer} />
      </Modal>
    </>
  );
}

/** Compartir una plantilla: las personas con acceso se cargan al abrir (el listado no las trae). */
export function TemplateShareButton({ template, viewer }: { template: TemplateSummary; viewer: User }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ShareTemplate | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || detail) return;
    void loadTemplate(template.id).then((res) => (res.ok ? setDetail(res.data) : setError(res.message)));
  }, [open, detail, template.id]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass.small}>
        <Share2 size={13} aria-hidden /> Compartir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Compartir plantilla" description={template.title} size="lg">
        {detail ? <ShareDialogBody subject={{ kind: "template", template: detail }} viewer={viewer} />
          : error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
          : <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden /> Cargando…</p>}
      </Modal>
    </>
  );
}

function PermissionSelect({ value, onChange, disabled, label }: { value: PagePermission; onChange: (v: PagePermission) => void; disabled?: boolean; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PagePermission)}
      className="h-9 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-brand disabled:opacity-60"
    >
      <option value="READ">{permissionLabel.READ}</option>
      <option value="EDIT">{permissionLabel.EDIT}</option>
    </select>
  );
}

function ShareDialogBody({ subject, viewer }: { subject: Subject; viewer: User }) {
  const router = useRouter();
  const item = subject.kind === "page" ? subject.page : subject.template;
  const target: ShareTarget = { kind: subject.kind, id: item.id };
  const noun = subject.kind === "page" ? "la página" : "la plantilla";
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [shares, setShares] = useState<Share[]>(item.shares);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      setMessage(null);
      const res = await fn();
      if (!res.ok) { setMessage({ tone: "error", text: res.message ?? "No se pudo completar la acción." }); return; }
      after?.();
      setMessage({ tone: "ok", text: success });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${message.tone === "error" ? "bg-danger-soft text-danger" : "bg-sky-soft text-sky"}`}>
          {message.text}
        </p>
      )}

      {subject.kind === "page"
        ? <VisibilitySection page={subject.page} viewer={viewer} pending={pending} run={run} />
        : <ScopeSection template={subject.template} viewer={viewer} pending={pending} run={run} />}

      <InviteSection
        target={target}
        excluded={new Set([viewer.id, ...(item.ownerId ? [item.ownerId] : []), ...shares.map((s) => s.userId)])}
        pending={pending}
        run={run}
        onInvited={(person, permission) => setShares((list) => [...list, { userId: person.id, permission, user: { id: person.id, name: person.name, department: person.department } }])}
      />

      <section aria-labelledby="con-acceso">
        <h3 id="con-acceso" className="mb-2 text-sm font-semibold">Personas con acceso</h3>
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          <li className="flex items-center gap-3 px-3 py-2">
            <Avatar name={item.owner?.name ?? "Propietario"} size={26} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.owner?.name ?? (subject.kind === "page" ? "Quien creó la página" : "Grupo Comidas")}{item.ownerId === viewer.id && " (tú)"}</span>
            <span className="text-xs text-muted">Propietario</span>
          </li>
          {shares.map((s) => {
            const name = s.user?.name ?? (s.userId === viewer.id ? viewer.name : "Persona con acceso");
            return (
              <li key={s.userId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Avatar name={name} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{name}{s.userId === viewer.id && " (tú)"}</span>
                  {s.user?.department && <span className="block truncate text-xs text-muted">{s.user.department.name}</span>}
                </span>
                {s.userId === viewer.id ? (
                  <span className="text-xs text-muted">{permissionLabel[s.permission]}</span>
                ) : (<>
                  <PermissionSelect
                    value={s.permission}
                    disabled={pending}
                    label={`Permiso de ${name}`}
                    onChange={(permission) => run(() => shareWith(target, s.userId, permission), `Permiso de ${name}: ${permissionLabel[permission].toLowerCase()}.`, () =>
                      setShares((list) => list.map((x) => (x.userId === s.userId ? { ...x, permission } : x))))}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Quitar acceso a ${name}`}
                    onClick={() => run(() => revokeShare(target, s.userId), `Se quitó el acceso a ${name}.`, () => setShares((list) => list.filter((x) => x.userId !== s.userId)))}
                    className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                  </button>
                </>)}
              </li>
            );
          })}
        </ul>
        {shares.length === 0 && <p className="mt-2 text-sm text-muted">Todavía no compartes {noun} con nadie en particular.</p>}
      </section>

      <LinksSection target={target} pending={pending} run={run} />
    </div>
  );
}

type Run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string, after?: () => void) => void;

function VisibilitySection({ page, viewer, pending, run }: { page: SharePage; viewer: User; pending: boolean; run: Run }) {
  const [visibility, setVis] = useState<PageVisibility>(page.visibility);
  const [version, setVersion] = useState(page.version);
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
              className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed ${active ? "border-brand bg-brand-soft" : "border-line hover:border-brand disabled:opacity-50 disabled:hover:border-line"}`}
            >
              <span className="flex items-center gap-1.5 font-medium"><Icon size={14} aria-hidden /> {label} {active && <Check size={14} className="text-brand-strong" aria-label="(actual)" />}</span>
              <span className="text-xs text-muted">{!allowed && !active && reason ? reason : help}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const scopeOptions: { value: TemplateScope; label: string; help: string; Icon: typeof Lock }[] = [
  { value: "PRIVATE", label: "Solo con invitación", help: "Tú y las personas que invites.", Icon: Lock },
  { value: "DEPARTMENT", label: "Mi departamento", help: "Todas las personas de tu departamento pueden usarla.", Icon: Users },
  { value: "COMPANY", label: "Toda la empresa", help: "Cualquier persona del grupo puede usarla. Solo administradores.", Icon: Building2 },
];

function ScopeSection({ template, viewer, pending, run }: { template: ShareTemplate; viewer: User; pending: boolean; run: Run }) {
  const [scope, setScope] = useState<TemplateScope>(template.scope);
  return (
    <section aria-labelledby={`alcance-${template.id}`}>
      <h3 id={`alcance-${template.id}`} className="mb-2 text-sm font-semibold">Quién puede usarla</h3>
      <div role="radiogroup" aria-labelledby={`alcance-${template.id}`} className="grid gap-2 sm:grid-cols-3">
        {scopeOptions.map(({ value, label, help, Icon }) => {
          // Solo quien la creó (o un administrador) cambia el alcance; una predeterminada sigue siendo de toda la empresa.
          const allowed = template.canManage && (value !== "COMPANY" || viewer.role === "ADMIN") && (!template.isDefault || value === "COMPANY");
          const active = scope === value;
          return (
            <button key={value} type="button" role="radio" aria-checked={active} disabled={pending || (!allowed && !active)}
              onClick={() => {
                if (active) return;
                run(async () => {
                  const res = await updateTemplate(template.id, { scope: value });
                  if (res.ok) setScope(value);
                  return res;
                }, "Listo: se actualizó con quién está disponible.");
              }}
              className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed ${active ? "border-brand bg-brand-soft" : "border-line hover:border-brand disabled:opacity-50"}`}>
              <span className="flex items-center gap-1.5 font-medium"><Icon size={14} aria-hidden /> {label} {active && <Check size={14} className="text-brand-strong" aria-label="(actual)" />}</span>
              <span className="text-xs text-muted">{help}</span>
            </button>
          );
        })}
      </div>
      {!template.canManage && <p className="mt-2 text-xs text-muted">Solo quien creó la plantilla puede cambiar su alcance. Tú puedes invitar personas y crear enlaces.</p>}
      {template.isDefault && <p className="mt-2 text-xs text-muted">Es una plantilla por defecto: para limitar quién la usa, primero retírala de las predeterminadas.</p>}
    </section>
  );
}

/** Buscador del directorio: cualquier persona puede invitar (el backend solo devuelve nombre y departamento). */
function InviteSection({ target, excluded, pending, run, onInvited }: {
  target: ShareTarget; excluded: Set<string>; pending: boolean; run: Run;
  onInvited: (person: DirectoryUser, permission: PagePermission) => void;
}) {
  const [query, setQuery] = useState("");
  const [permission, setPermission] = useState<PagePermission>("READ");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); setSearchError(""); return; }
    const ticket = ++latest.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchPeople(q);
      if (ticket !== latest.current) return;
      setSearching(false);
      if (res.ok) { setResults(res.data); setSearchError(""); } else { setResults([]); setSearchError(res.message); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const candidates = results.filter((p) => !excluded.has(p.id));

  return (
    <section aria-labelledby="invitar">
      <h3 id="invitar" className="mb-2 text-sm font-semibold">Invitar a una persona</h3>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-brand">
            {searching ? <LoaderCircle size={16} className="animate-spin text-muted" aria-hidden /> : <Search size={16} className="text-muted" aria-hidden />}
            <span className="sr-only">Buscar por nombre o correo completo</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o correo completo" autoComplete="off" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <PermissionSelect value={permission} onChange={setPermission} label="Permiso para la invitación" />
        </div>
        {query.trim().length === 1 && <p className="text-xs text-muted">Escribe al menos 2 letras.</p>}
        {searchError && <p role="alert" className="text-sm text-danger">{searchError}</p>}
        {query.trim().length >= 2 && !searching && !searchError && (
          candidates.length === 0 ? (
            <p className="text-sm text-muted">No hay personas que coincidan (o ya tienen acceso).</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
              {candidates.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={p.name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{p.department.name}</span>
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => shareWith(target, p.id, permission), `${p.name} ya tiene acceso (${permissionLabel[permission].toLowerCase()}).`, () => {
                      onInvited(p, permission);
                      setQuery("");
                    })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-brand disabled:opacity-60"
                  >
                    <UserPlus size={14} aria-hidden /> Invitar
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

/** Enlaces: crear uno nuevo, ver los activos y desactivarlos. */
function LinksSection({ target, pending, run }: { target: ShareTarget; pending: boolean; run: Run }) {
  const [links, setLinks] = useState<ShareLinkSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [created, setCreated] = useState<ShareLink | null>(null);
  const [linkPermission, setLinkPermission] = useState<PagePermission>("READ");
  const [linkHours, setLinkHours] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listShareLinks(target).then((res) => {
      if (cancelled) return;
      if (res.ok) setLinks(res.data); else setLoadError(res.message);
    });
    return () => { cancelled = true; };
  }, [target.kind, target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-labelledby="enlace">
      <h3 id="enlace" className="mb-1 text-sm font-semibold">Enlaces para compartir</h3>
      <p className="mb-2 text-xs text-muted">Quien lo abra debe iniciar sesión con su cuenta de la wiki. Al aceptarlo recibe el permiso del enlace (si ya podía editar, conserva la edición).</p>

      {created && (
        <div className="mb-3 flex flex-col gap-2 rounded-lg border border-brand/40 bg-brand-soft/40 p-3">
          <p className="text-xs font-medium text-brand-strong">Enlace nuevo: cópialo ahora, después solo se muestra en la lista sin la dirección.</p>
          <div className="flex gap-2">
            <input readOnly value={created.url} aria-label="Enlace para compartir" onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm" />
            <button
              type="button"
              onClick={async () => { await navigator.clipboard.writeText(created.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-brand"
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <PermissionSelect value={linkPermission} onChange={setLinkPermission} label="Permiso del enlace" />
        <select aria-label="Vencimiento del enlace" value={linkHours} onChange={(e) => setLinkHours(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-brand">
          {expirations.map((x) => <option key={x.hours} value={x.hours}>{x.label}</option>)}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(async () => {
            const res = await createShareLink(target, linkPermission, linkHours || undefined);
            if (res.ok) { setCreated(res.data); setLinks((list) => [res.data, ...(list ?? [])]); }
            return res;
          }, "Enlace creado. Cópialo y envíalo.")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-brand disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Link2 size={14} aria-hidden />} Crear enlace
        </button>
      </div>

      <h4 className="mb-1 mt-4 text-xs font-semibold text-muted">Enlaces activos</h4>
      {loadError ? (
        <p role="alert" className="text-sm text-danger">{loadError}</p>
      ) : links === null ? (
        <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden /> Cargando enlaces…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted">No hay enlaces activos.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <Link2 size={14} className="text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{permissionLabel[link.permission]}</span>
                <span className="block text-xs text-muted">
                  {link.expiresAt ? `Vence el ${dateTime(link.expiresAt)}` : "Sin vencimiento"} · creado el {dateTime(link.createdAt)}{link.createdBy ? ` por ${link.createdBy.name}` : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => revokeShareLink(target, link.id), "El enlace se desactivó. Quienes ya lo aceptaron conservan el acceso.", () => {
                  setLinks((list) => (list ?? []).filter((x) => x.id !== link.id));
                  if (created?.id === link.id) setCreated(null);
                })}
                className="rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
              >
                Desactivar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
