"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, LoaderCircle, Pencil, Plus, Sparkles, Star, X } from "lucide-react";
import { clearCompanyWall, clearDepartmentWall, createWallPage, setCompanyFeaturedPages, setCompanyWall, setDepartmentWall, setFeaturedPages, updateDepartmentInfo } from "@/app/actions/admin";
import { IconPicker } from "../editor/IconPicker";
import type { PageSummary } from "@/lib/types";
import { VisibilityBadge } from "../ui/VisibilityBadge";

type Target = { kind: "department"; departmentId: string; name: string } | { kind: "company" };

const MAX_FEATURED = 12;

function Feedback({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return <p role={message.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-basil-soft text-basil" : "bg-danger-soft text-danger"}`}>{message.text}</p>;
}

/** Elegir (o crear) la página que se muestra como muro. */
export function WallPagePicker({ target, wall, candidates }: { target: Target; wall: { id: string; title: string } | null; candidates: PageSummary[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string, after?: () => void) => start(async () => {
    const res = await fn();
    setMessage(res.ok ? { ok: true, text: success } : { ok: false, text: res.message ?? "No se pudo completar." });
    if (res.ok) { after?.(); router.refresh(); }
  });

  const options = candidates.filter((p) => p.id !== wall?.id);
  const chosen = options.find((p) => p.id === choice);
  // El backend publica la página del muro (departamento o empresa) al asignarla.
  // Advertir si la página va a cambiar de visibilidad (PRIVATE→DEPARTMENT/COMPANY, DEPARTMENT→COMPANY, COMPANY→DEPARTMENT).
  const willPublish = (p: PageSummary) => {
    if (target.kind === "company") return p.visibility !== "COMPANY";
    // target.kind === "department"
    return p.visibility === "PRIVATE" || p.visibility === "COMPANY";
  };

  return (
    <section aria-labelledby="pagina-muro" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="pagina-muro" className="font-display text-xl font-semibold">Página de inicio del muro</h2>
      <p className="mt-1 text-sm text-muted">
        {target.kind === "company"
          ? "Su contenido aparece en el inicio de la empresa y queda publicado para toda la empresa."
          : "Su contenido aparece arriba del muro. Solo la ven las personas del departamento y los administradores."}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {wall ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2">
            <Check size={16} className="text-basil" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium">{wall.title}</span>
            <Link href={`/paginas/${wall.id}/editar`} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-basil">
              <Pencil size={14} aria-hidden /> Editar contenido
            </Link>
            <button type="button" disabled={pending} onClick={() => run(() => (target.kind === "company" ? clearCompanyWall() : clearDepartmentWall(target.departmentId)), "El muro ya no tiene página de inicio. La página sigue existiendo.")}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-danger-soft hover:text-danger">
              <X size={14} aria-hidden /> Quitar
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted">Todavía no hay página de inicio.</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="muro-pagina">Usar otra página</label>
          <select id="muro-pagina" value={choice} onChange={(e) => setChoice(e.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-basil">
            <option value="">{options.length ? "Elegir una página existente…" : "No hay otras páginas disponibles"}</option>
            {options.map((p) => <option key={p.id} value={p.id}>{p.title}{willPublish(p) ? " (se publicará)" : ""}</option>)}
          </select>
          <button type="button" disabled={!choice || pending} onClick={() => run(() => (target.kind === "company" ? setCompanyWall(choice) : setDepartmentWall(target.departmentId, choice)), "Listo: esa página ahora es el inicio del muro.", () => setChoice(""))}
            className="h-10 rounded-lg border border-line px-3 text-sm font-medium hover:border-basil disabled:opacity-50">
            Usar como muro
          </button>
          <button type="button" disabled={pending} onClick={() => start(async () => {
            const res = await createWallPage(target.kind === "company" ? "company" : { departmentId: target.departmentId, name: target.name });
            if (!res.ok) { setMessage({ ok: false, text: res.message }); return; }
            router.push(`/paginas/${res.data.id}/editar`);
          })} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-basil disabled:opacity-60">
            {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />} Crear desde plantilla
          </button>
        </div>
        {chosen && willPublish(chosen) && (
          <p role="note" className="rounded-lg bg-saffron-soft px-3 py-2 text-sm">
            {(() => {
              const from = chosen.visibility === "PRIVATE" ? "privada" : chosen.visibility === "DEPARTMENT" ? "del departamento" : "de la empresa";
              const to = target.kind === "company" ? "toda la empresa" : "todo el departamento";
              return `“${chosen.title}” es ${from}. Al usarla como muro quedará visible para ${to}.`;
            })()}
          </p>
        )}
        <Feedback message={message} />
      </div>
    </section>
  );
}

/** Elegir y ordenar las páginas destacadas de un departamento o de la empresa (máx. 12). */
export function FeaturedEditor({ target, initial, candidates }: { target: Target; initial: PageSummary[]; candidates: PageSummary[] }) {
  const isCompany = target.kind === "company";
  const router = useRouter();
  const [selected, setSelected] = useState(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(selected.map((p) => p.id)) !== JSON.stringify(initial.map((p) => p.id));
  // La empresa solo destaca páginas publicadas a la empresa; un departamento, las del departamento o la empresa.
  const available = candidates.filter((c) => (isCompany ? c.visibility === "COMPANY" : c.visibility !== "PRIVATE") && !selected.some((s) => s.id === c.id));

  const move = (i: number, d: -1 | 1) => setSelected((list) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });

  return (
    <section aria-labelledby="destacadas-editor" className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="destacadas-editor" className="flex-1 font-display text-xl font-semibold">Páginas destacadas</h2>
        <span className="text-sm text-muted">{selected.length} de {MAX_FEATURED}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{isCompany ? "Aparecen en el inicio de la empresa. Solo se pueden destacar páginas publicadas para toda la empresa." : "Solo se pueden destacar páginas publicadas en el departamento o en la empresa."}</p>

      {selected.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted">Ninguna página destacada todavía.</p>
      ) : (
        <ol className="mt-4 flex flex-col divide-y divide-line rounded-lg border border-line">
          {selected.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2">
              <Star size={14} className="text-saffron" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir ${p.title}`} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-paper disabled:opacity-30"><ArrowUp size={14} /></button>
              <button type="button" disabled={i === selected.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar ${p.title}`} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-paper disabled:opacity-30"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => setSelected((l) => l.filter((x) => x.id !== p.id))} aria-label={`Quitar ${p.title} de destacadas`} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"><X size={14} /></button>
            </li>
          ))}
        </ol>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold">{isCompany ? "Páginas publicadas para toda la empresa" : "Páginas publicadas del departamento"}</h3>
      {available.length === 0 ? (
        <p className="text-sm text-muted">No hay más páginas publicadas para destacar. Publica páginas desde “Compartir”.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {available.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
              <VisibilityBadge visibility={p.visibility} />
              <button type="button" disabled={selected.length >= MAX_FEATURED} onClick={() => setSelected((l) => [...l, p])} aria-label={`Destacar ${p.title}`}
                className="grid h-8 w-8 place-items-center rounded-md text-basil hover:bg-basil-soft disabled:opacity-30"><Plus size={16} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!dirty || pending} onClick={() => start(async () => {
          const ids = selected.map((p) => p.id);
          const res = target.kind === "company" ? await setCompanyFeaturedPages(ids) : await setFeaturedPages(target.departmentId, ids);
          setMessage(res.ok ? { ok: true, text: "Destacadas guardadas." } : { ok: false, text: res.message });
          if (res.ok) router.refresh();
        })} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-basil disabled:opacity-50">
          {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Guardar destacadas
        </button>
        {dirty && <span className="text-sm text-muted">Tienes cambios sin guardar.</span>}
      </div>
      <div className="mt-3"><Feedback message={message} /></div>
    </section>
  );
}

/** Descripción e icono que se muestran en el encabezado del muro del departamento. */
export function DepartmentInfoEditor({ departmentId, initial }: { departmentId: string; initial: { description: string; icon: string | null } }) {
  const router = useRouter();
  const [description, setDescription] = useState(initial.description);
  const [icon, setIcon] = useState(initial.icon);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = description !== initial.description || icon !== initial.icon;

  return (
    <section aria-labelledby="info-departamento" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="info-departamento" className="font-display text-xl font-semibold">Presentación del departamento</h2>
      <p className="mt-1 text-sm text-muted">Aparece en el encabezado del muro.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="shrink-0"><IconPicker value={icon} onChange={setIcon} /></div>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Descripción</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2}
            placeholder="Por ejemplo: pagos a proveedores, facturación y cierres contables del grupo."
            className="rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-basil" />
          <span className="self-end text-xs text-muted">{description.length}/500</span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!dirty || pending} onClick={() => start(async () => {
          const res = await updateDepartmentInfo(departmentId, { description, icon });
          setMessage(res.ok ? { ok: true, text: "Presentación guardada." } : { ok: false, text: res.message });
          if (res.ok) router.refresh();
        })} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-basil disabled:opacity-50">
          {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Guardar presentación
        </button>
        <Feedback message={message} />
      </div>
    </section>
  );
}
