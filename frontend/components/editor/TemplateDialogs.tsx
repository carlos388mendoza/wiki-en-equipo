"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { createTemplate, loadTemplate, loadTemplates } from "@/app/actions/pages";
import type { WikiBlock } from "@/lib/blocks";
import type { Background, Template, TemplateScope, TemplateSummary, User } from "@/lib/types";
import { TemplateCard } from "../templates/TemplateCard";
import { Modal } from "../ui/Modal";

/** Lista de plantillas disponibles; las carga al abrir. */
export function useTemplates(open: boolean) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || templates) return;
    loadTemplates().then((res) => (res.ok ? setTemplates(res.data) : setError(res.message))).catch(() => setError("No se pudieron cargar las plantillas."));
  }, [open, templates]);
  return { templates, error };
}

export function TemplatePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: Template) => void }) {
  const { templates, error } = useTemplates(open);
  const [pending, start] = useTransition();
  const [loadError, setLoadError] = useState("");

  return (
    <Modal open={open} onClose={onClose} title="Insertar desde una plantilla" description="Los bloques de la plantilla se agregan debajo del bloque donde está el cursor." size="lg">
      {error || loadError ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error || loadError}</p> : null}
      {!templates && !error ? (
        <div aria-busy="true" className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-line/70" />)}</div>
      ) : templates?.length === 0 ? (
        <p className="text-muted">Todavía no hay plantillas. <Link href="/plantillas" className="underline">Crea una</Link>.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {templates?.map((t) => (
            <li key={t.id}>
              <button type="button" disabled={pending} className="h-full w-full text-left disabled:opacity-60"
                onClick={() => start(async () => {
                  const res = await loadTemplate(t.id);
                  if (res.ok) onPick(res.data); else setLoadError(res.message);
                })}>
                <TemplateCard template={t} background={t.background} icon={t.icon} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden /> Insertando…</p>}
    </Modal>
  );
}

export function SaveTemplateDialog({ open, onClose, viewer, hasSelection, defaults, getBlocks }: {
  open: boolean; onClose: () => void; viewer: User; hasSelection: boolean;
  defaults: { title: string; icon: string | null; background: Background | null };
  getBlocks: (part: "page" | "selection") => WikiBlock[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<TemplateScope>("PRIVATE");
  const [part, setPart] = useState<"page" | "selection">("page");
  const [result, setResult] = useState<{ ok: boolean; text: string; id?: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) { setTitle(defaults.title ? `${defaults.title} (plantilla)` : ""); setPart(hasSelection ? "selection" : "page"); setResult(null); }
  }, [open, defaults.title, hasSelection]);

  return (
    <Modal open={open} onClose={onClose} title="Guardar como plantilla" description="Reutiliza esta estructura en páginas nuevas.">
      <form
        className="flex flex-col gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const blocks = getBlocks(part);
            if (!blocks.length) { setResult({ ok: false, text: "No hay bloques para guardar. Selecciona algunos o guarda la página completa." }); return; }
            const res = await createTemplate({ title, description, scope, blocks, icon: defaults.icon, background: part === "page" ? defaults.background : null });
            setResult(res.ok ? { ok: true, text: "Plantilla guardada.", id: res.data.id } : { ok: false, text: res.message });
          });
        }}
      >
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 font-medium">¿Qué quieres guardar?</legend>
          <label className="flex items-center gap-2"><input type="radio" name="part" checked={part === "page"} onChange={() => setPart("page")} className="accent-basil" /> Toda la página (con fondo e icono)</label>
          <label className={`flex items-center gap-2 ${hasSelection ? "" : "text-muted"}`}>
            <input type="radio" name="part" checked={part === "selection"} disabled={!hasSelection} onChange={() => setPart("selection")} className="accent-basil" />
            Solo los bloques seleccionados (plantilla de sección){!hasSelection && " — selecciona bloques en el editor"}
          </label>
        </fieldset>
        <label className="flex flex-col gap-1 font-medium">Nombre
          <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="h-10 rounded-lg border border-line px-3 font-normal outline-none focus:border-basil" />
        </label>
        <label className="flex flex-col gap-1 font-medium">Descripción
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="¿Cuándo conviene usarla?" className="h-10 rounded-lg border border-line px-3 font-normal outline-none focus:border-basil" />
        </label>
        <label className="flex flex-col gap-1 font-medium">Disponible para
          <select value={scope} onChange={(e) => setScope(e.target.value as TemplateScope)} className="h-10 rounded-lg border border-line bg-surface px-2 font-normal outline-none focus:border-basil">
            <option value="PRIVATE">Privada (solo con invitación)</option>
            <option value="DEPARTMENT">Mi departamento</option>
            {viewer.role === "ADMIN" && <option value="COMPANY">Toda la empresa</option>}
          </select>
        </label>
        {result && (
          <p role={result.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 ${result.ok ? "bg-basil-soft text-basil" : "bg-danger-soft text-danger"}`}>
            {result.text} {result.id && <Link href="/plantillas" className="font-medium underline">Ver plantillas</Link>}
          </p>
        )}
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink font-medium text-white hover:bg-basil disabled:opacity-60">
          {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Guardar plantilla
        </button>
      </form>
    </Modal>
  );
}
