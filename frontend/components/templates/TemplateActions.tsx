"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Check, Copy, Eye, LoaderCircle, Lock, Pencil, Plus, Share2, Sparkles, StarOff, Trash2, Users } from "lucide-react";
import { createTemplate, deleteTemplate, installDefaultTemplates, updateTemplate } from "@/app/actions/pages";
import type { Template, TemplateScope } from "@/lib/types";
import { BlockRenderer } from "../page/BlockRenderer";
import { PageBackground } from "../page/PageBackground";
import { NewPageButton } from "../pages/NewPageDialog";
import { Modal } from "../ui/Modal";
import { PageIcon } from "../ui/PageIcon";

/** Acciones de una tarjeta de plantilla: usar, vista previa, editar y eliminar. */
export function TemplateActions({ template, canManage, isAdmin = false, autoOpen = false }: { template: Template; canManage: boolean; isAdmin?: boolean; autoOpen?: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState(autoOpen);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

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
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-saffron-soft hover:text-ink disabled:opacity-60">
          {template.isDefault ? <><StarOff size={13} aria-hidden /> Retirar</> : <><Sparkles size={13} aria-hidden /> Por defecto</>}
        </button>
      )}
      {error && !confirm && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
      {canManage && (
        <>
          <TemplateShareButton template={template} isAdmin={isAdmin} />
          <Link href={`/plantillas/${template.id}/editar`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink">
            <Pencil size={13} aria-hidden /> Editar
          </Link>
          <button type="button" onClick={() => setConfirm(true)} aria-label={`Eliminar plantilla ${template.title}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 size={13} aria-hidden />
          </button>
        </>
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title={template.title} description={template.description} size="lg">
        <div className="-mx-5 -mt-4 mb-4">
          <PageBackground background={template.background} seed={template.id} className="h-28" sizes="700px" />
        </div>
        <PageIcon icon={template.icon} size={52} className="relative z-10 -mt-12 mb-3" />
        <BlockRenderer blocks={template.blocks} subpages={{}} />
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
      })} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-basil disabled:opacity-60">
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
        setMessage(res.ok ? { ok: true, text: res.data.created ? `Se instalaron ${res.data.created} plantillas.` : "Ya estaban todas instaladas." } : { ok: false, text: res.message });
        router.refresh();
      })} className="inline-flex items-center gap-2 self-start rounded-lg border border-saffron bg-saffron-soft px-3 py-2 text-sm font-medium text-ink hover:bg-saffron hover:text-white disabled:opacity-60">
        {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />} Instalar plantillas de Grupo Comidas
      </button>
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-basil" : "text-danger"}`}>{message.text}</p>}
    </div>
  );
}

const scopeOptions: { value: TemplateScope; label: string; help: string; Icon: typeof Lock }[] = [
  { value: "PRIVATE", label: "Solo yo", help: "Nadie más la ve.", Icon: Lock },
  { value: "DEPARTMENT", label: "Mi departamento", help: "Todas las personas de tu departamento pueden usarla.", Icon: Users },
  { value: "COMPANY", label: "Toda la empresa", help: "Cualquier persona del grupo puede usarla. Solo administradores.", Icon: Building2 },
];

/** Compartir una plantilla: con quién está disponible y enlace directo. */
function TemplateShareButton({ template, isAdmin }: { template: Template; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<TemplateScope>(template.scope);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/plantillas?plantilla=${template.id}`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink">
        <Share2 size={13} aria-hidden /> Compartir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Compartir plantilla" description={template.title}>
        <div className="flex flex-col gap-5 text-sm">
          <section aria-labelledby={`alcance-${template.id}`}>
            <h3 id={`alcance-${template.id}`} className="mb-2 font-semibold">Quién puede usarla</h3>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {scopeOptions.map(({ value, label, help, Icon }) => {
                // Una plantilla por defecto debe seguir disponible para toda la empresa.
                const allowed = (value !== "COMPANY" || isAdmin) && (!template.isDefault || value === "COMPANY");
                const active = scope === value;
                return (
                  <button key={value} type="button" role="radio" aria-checked={active} disabled={pending || !allowed}
                    onClick={() => start(async () => {
                      const res = await updateTemplate(template.id, { scope: value });
                      setMessage(res.ok ? { ok: true, text: "Listo: se actualizó con quién está disponible." } : { ok: false, text: res.message });
                      if (res.ok) { setScope(value); router.refresh(); }
                    })}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left disabled:cursor-not-allowed ${active ? "border-basil bg-basil-soft" : "border-line hover:border-basil disabled:opacity-50"}`}>
                    <span className="flex items-center gap-1.5 font-medium"><Icon size={14} aria-hidden /> {label}</span>
                    <span className="text-xs text-muted">{help}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Enlace</h3>
            <p className="mb-2 text-xs text-muted">Abre la plantilla para quien ya tenga acceso según la opción de arriba.</p>
            <div className="flex gap-2">
              <input readOnly value={link} aria-label="Enlace a la plantilla" onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3" />
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3 font-medium text-white hover:bg-basil">
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </section>
          {template.isDefault && <p className="text-xs text-muted">Es una plantilla por defecto: para limitar quién la usa, primero retírala de las predeterminadas.</p>}
          <p className="rounded-lg bg-paper px-3 py-2 text-xs text-muted">
            Compartir una plantilla con una persona en particular o darle permiso de edición todavía no es posible: el servidor solo maneja estas tres opciones.
          </p>
          {message && <p role={message.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 ${message.ok ? "bg-basil-soft text-basil" : "bg-danger-soft text-danger"}`}>{message.text}</p>}
        </div>
      </Modal>
    </>
  );
}
