"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Eye, LoaderCircle, Pencil, Plus, Sparkles, StarOff, Trash2 } from "lucide-react";
import { createTemplate, deleteTemplate, installDefaultTemplates, loadTemplate, updateTemplate } from "@/app/actions/pages";
import type { TemplateSummary, User } from "@/lib/types";
import type { WikiBlock } from "@/lib/blocks";
import { BlockRenderer } from "../page/BlockRenderer";
import { PageBackground } from "../page/PageBackground";
import { NewPageButton } from "../pages/NewPageDialog";
import { TemplateShareButton } from "../pages/ShareDialog";
import { Modal } from "../ui/Modal";
import { PageIcon } from "../ui/PageIcon";

/**
 * Acciones de una tarjeta de plantilla: usar, vista previa, compartir, editar y eliminar.
 * Los permisos vienen del backend (`canEdit`: contenido y compartir; `canManage`: alcance y eliminar).
 */
export function TemplateActions({ template, viewer, autoOpen = false }: { template: TemplateSummary; viewer: User; autoOpen?: boolean }) {
  const router = useRouter();
  const isAdmin = viewer.role === "ADMIN";
  const [preview, setPreview] = useState(autoOpen);
  const [blocks, setBlocks] = useState<WikiBlock[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // El listado no trae el contenido: se pide al abrir la vista previa.
  useEffect(() => {
    if (!preview || blocks) return;
    void loadTemplate(template.id).then((res) => (res.ok ? setBlocks(res.data.blocks) : setPreviewError(res.message)));
  }, [preview, blocks, template.id]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <NewPageButton variant="small" initialTemplateId={template.id} label="Usar" />
      <button type="button" onClick={() => setPreview(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink">
        <Eye size={13} aria-hidden /> Ver
      </button>
      {isAdmin && (
        <button type="button" disabled={pending} title={template.isDefault ? "Deja de recomendarse a todos (sigue disponible)" : "Se recomienda a toda la empresa"}
          onClick={() => start(async () => {
            const res = await updateTemplate(template.id, template.isDefault ? { isDefault: false } : { isDefault: true, scope: "COMPANY" });
            if (!res.ok) { setError(res.message); return; }
            setError("");
            router.refresh();
          })}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-sun-soft hover:text-ink disabled:opacity-60">
          {template.isDefault ? <><StarOff size={13} aria-hidden /> Retirar</> : <><Sparkles size={13} aria-hidden /> Por defecto</>}
        </button>
      )}
      {error && !confirm && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
      {template.canEdit && (
        <>
          <TemplateShareButton template={template} viewer={viewer} />
          <Link href={`/plantillas/${template.id}/editar`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink">
            <Pencil size={13} aria-hidden /> Editar
          </Link>
        </>
      )}
      {template.canManage && (
        <button type="button" onClick={() => setConfirm(true)} aria-label={`Eliminar plantilla ${template.title}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-danger-soft hover:text-danger">
          <Trash2 size={13} aria-hidden />
        </button>
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title={template.title} description={template.description} size="lg">
        <div className="-mx-5 -mt-4 mb-4">
          <PageBackground background={template.background} seed={template.id} className="h-28" sizes="700px" />
        </div>
        <PageIcon icon={template.icon} size={52} className="relative z-10 -mt-12 mb-3" />
        {previewError ? <p role="alert" className="text-sm text-danger">{previewError}</p>
          : blocks ? <BlockRenderer blocks={blocks} subpages={{}} />
          : <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden /> Cargando vista previa…</p>}
      </Modal>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="¿Eliminar esta plantilla?" description={template.title}>
        <p className="text-sm text-muted">Las páginas creadas con ella no cambian. Esta acción no se puede deshacer.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Cancelar</button>
          <button type="button" disabled={pending} onClick={() => start(async () => {
            const res = await deleteTemplate(template.id);
            if (!res.ok) { setError(res.message); return; }
            setConfirm(false);
            router.refresh();
          })} className="inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function NewTemplateButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending} onClick={() => start(async () => {
        const res = await createTemplate({ title: "Plantilla sin título", description: "", scope: "PRIVATE", blocks: [], background: null, icon: "📄" });
        if (!res.ok) { setError(res.message); return; }
        router.push(`/plantillas/${res.data.id}/editar`);
      })} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-brand disabled:opacity-60">
        {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />} Nueva plantilla
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function InstallDefaultsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => {
        const res = await installDefaultTemplates();
        setMessage(res.ok ? { ok: true, text: res.data.created || res.data.updated || res.data.retired ? [res.data.created && `Se instalaron ${res.data.created} plantillas.`, res.data.updated && `Se puso foto de portada a ${res.data.updated}.`, res.data.retired && `Se ${res.data.retired === 1 ? "retiró 1 repetida" : `retiraron ${res.data.retired} repetidas`} de las recomendadas.`].filter(Boolean).join(" ") : "Ya estaban todas instaladas." } : { ok: false, text: res.message });
        router.refresh();
      })} className="inline-flex items-center gap-2 self-start rounded-lg border border-sun bg-sun-soft px-3 py-2 text-sm font-medium text-ink hover:bg-sun hover:text-ink disabled:opacity-60">
        {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />} Instalar plantillas de Grupo Comidas
      </button>
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-sky" : "text-danger"}`}>{message.text}</p>}
    </div>
  );
}
