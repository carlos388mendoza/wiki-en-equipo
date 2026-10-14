"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, LoaderCircle, Plus } from "lucide-react";
import { createPage } from "@/app/actions/pages";
import { TemplateCard } from "../templates/TemplateCard";
import { useTemplates } from "../editor/TemplateDialogs";
import { Modal } from "../ui/Modal";

/** Botón + diálogo para crear una página (o subpágina) en blanco o desde una plantilla. */
export function NewPageButton({ parentId, parentTitle, variant = "primary", initialTemplateId, label }: {
  parentId?: string; parentTitle?: string; variant?: "primary" | "secondary" | "small"; initialTemplateId?: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const cls = {
    primary: "flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-basil",
    secondary: "inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-basil",
    small: "inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-xs font-medium text-white hover:bg-basil",
  }[variant];
  return (
    <>
      <button type="button" onClick={() => (navigator.onLine ? setOpen(true) : router.push("/sin-conexion?nuevo=1"))} className={cls}>
        {parentId ? <FilePlus2 size={14} aria-hidden /> : <Plus size={variant === "small" ? 13 : 16} aria-hidden />} {label ?? (parentId ? "Subpágina" : "Nueva página")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} size="xl"
        title={parentId ? "Nueva subpágina" : "Nueva página"}
        description={parentId ? `Dentro de “${parentTitle ?? "esta página"}”. Queda privada hasta que la compartas.` : "Las páginas nuevas son privadas hasta que las compartas o publiques."}>
        <NewPageForm parentId={parentId} initialTemplateId={initialTemplateId} />
      </Modal>
    </>
  );
}

function NewPageForm({ parentId, initialTemplateId }: { parentId?: string; initialTemplateId?: string }) {
  const router = useRouter();
  const { templates, error: loadError } = useTemplates(true);
  const [templateId, setTemplateId] = useState<string | undefined>(initialTemplateId);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const defaults = templates?.filter((t) => t.isDefault) ?? [];
  const others = templates?.filter((t) => !t.isDefault) ?? [];
  const chosen = templates?.find((t) => t.id === templateId);

  const option = (id: string | undefined, content: React.ReactNode, label: string) => (
    <li key={id ?? "blank"}>
      <button type="button" aria-pressed={templateId === id} aria-label={label} onClick={() => setTemplateId(id)} className="h-full w-full text-left">{content}</button>
    </li>
  );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createPage({ title: title || chosen?.title || "Página sin título", parentId, templateId });
          if (!res.ok) { setError(res.message); return; }
          router.push(`/paginas/${res.data.id}/editar`);
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Título
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={chosen?.title ?? "Página sin título"}
          className="h-11 rounded-lg border border-line px-3 text-base font-normal outline-none focus:border-basil" />
      </label>

      <section aria-labelledby="empezar">
        <h3 id="empezar" className="mb-2 text-sm font-semibold">Empezar con</h3>
        {loadError && <p role="alert" className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{loadError}</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {option(undefined, <TemplateCard template={{ id: "blank", title: "Página en blanco", description: "Empieza desde cero.", scope: "PRIVATE", isDefault: false }} icon="📄" background={{ type: "color", value: "#ffffff" }} selected={templateId === undefined} />, "Página en blanco")}
          {!templates && !loadError && [0, 1, 2].map((i) => <li key={i} className="h-36 animate-pulse rounded-xl bg-line/70" />)}
          {[...defaults, ...others].map((t) => option(t.id, <TemplateCard template={t} background={t.background} icon={t.icon} selected={templateId === t.id} />, `Plantilla ${t.title}`))}
        </ul>
      </section>

      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 font-medium text-white hover:bg-basil disabled:opacity-60">
          {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Crear y editar
        </button>
      </div>
    </form>
  );
}
