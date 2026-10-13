"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CloudOff, ImageIcon, LayoutTemplate, LoaderCircle, Save, TriangleAlert } from "lucide-react";
import { createPage, savePage, updateTemplate, type PageDraft } from "@/app/actions/pages";
import type { WikiBlock } from "@/lib/blocks";
import { wikiToBlockNote } from "@/lib/editor/convert";
import type { Background, PageSummary, TemplateScope, User } from "@/lib/types";
import { allowedList, MAX_UPLOAD_MB, uploadToWiki } from "@/lib/uploads";
import { PageBackground } from "../page/PageBackground";
import { Modal } from "../ui/Modal";
import { BackgroundPicker } from "./BackgroundPicker";
import { IconPicker } from "./IconPicker";
import type { WikiEditor } from "./schema";
import { TagInput } from "./TagInput";
import { SaveTemplateDialog, TemplatePicker } from "./TemplateDialogs";

const BlockEditor = dynamic(() => import("./BlockEditor"), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" aria-label="Cargando editor" className="flex flex-col gap-3 py-2">
      {[95, 80, 88, 60].map((w, i) => <div key={i} className="h-4 animate-pulse rounded bg-line/70" style={{ width: `${w}%` }} />)}
    </div>
  ),
});

type Status = "saved" | "dirty" | "saving" | "error" | "conflict" | "offline";

export type EditorInitial = {
  title: string;
  blocks: WikiBlock[];
  background: Background | null;
  icon: string | null;
  tags: string[];
  version: number;
  parentId: string | null;
  /** Solo plantillas. */
  description?: string;
  scope?: TemplateScope;
};

const AUTOSAVE_MS = 1500;

export function PageEditor({ mode, id, initial, pages, tagSuggestions, viewer, backHref }: {
  mode: "page" | "template";
  id: string;
  initial: EditorInitial;
  pages: PageSummary[];
  tagSuggestions: string[];
  viewer: User;
  backHref: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [background, setBackground] = useState(initial.background);
  const [icon, setIcon] = useState(initial.icon);
  const [tags, setTags] = useState(initial.tags);
  const [parentId, setParentId] = useState(initial.parentId);
  const [description, setDescription] = useState(initial.description ?? "");
  const [scope, setScope] = useState<TemplateScope>(initial.scope ?? "PRIVATE");
  const [status, setStatus] = useState<Status>("saved");
  const [error, setError] = useState("");
  const [bgOpen, setBgOpen] = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState<null | "page" | "selection">(null);
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);
  const [subpagePrompt, setSubpagePrompt] = useState<{ resolve: (v: { id: string; title: string } | null) => void } | null>(null);
  const [subpageTitle, setSubpageTitle] = useState("");

  const blocksRef = useRef<WikiBlock[]>(initial.blocks);
  const versionRef = useRef(initial.version);
  const editorRef = useRef<WikiEditor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const pendingAgain = useRef(false);
  const parentChanged = useRef(false);

  const draft = useCallback((): PageDraft => ({ title, blocks: blocksRef.current, background, icon, tags, ...(parentChanged.current && { parentId }) }), [title, background, icon, tags, parentId]);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const save = useCallback(async (force?: number) => {
    if (saving.current) { pendingAgain.current = true; return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { setStatus("offline"); return; }
    saving.current = true;
    setStatus("saving");
    const d = draftRef.current();
    const res = mode === "page"
      ? await savePage(id, d, force ?? versionRef.current)
      : await updateTemplate(id, { title: d.title, blocks: d.blocks, background: d.background, icon: d.icon, description, scope });
    saving.current = false;
    if (res.ok) {
      if (mode === "page" && res.data && "version" in res.data) versionRef.current = res.data.version;
      parentChanged.current = false;
      setError("");
      if (pendingAgain.current) { pendingAgain.current = false; void save(); return; }
      setStatus("saved");
      return;
    }
    if ("conflict" in res && res.conflict) {
      setConflictVersion(("currentVersion" in res && typeof res.currentVersion === "number") ? res.currentVersion : null);
      setStatus("conflict");
      return;
    }
    setError(res.message);
    setStatus("error");
  }, [id, mode, description, scope]);

  const markDirty = useCallback(() => {
    setStatus((s) => (s === "conflict" ? s : "dirty"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }, [save]);

  // Guarda cuando cambian los campos respecto de lo último visto (no al montar).
  const fieldsKey = JSON.stringify({ title, background, icon, tags, parentId, description, scope });
  const lastFields = useRef(fieldsKey);
  useEffect(() => {
    if (fieldsKey === lastFields.current) return;
    lastFields.current = fieldsKey;
    markDirty();
  }, [fieldsKey, markDirty]);
  const lastBlocks = useRef(JSON.stringify(initial.blocks));

  // Avisa antes de salir con cambios sin guardar.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (status !== "saved") { e.preventDefault(); } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  // Reintenta al volver la conexión.
  useEffect(() => {
    const online = () => { if (status === "offline" || status === "error") void save(); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [status, save]);

  const finish = async () => {
    if (timer.current) clearTimeout(timer.current);
    if (status !== "saved") await save();
    router.push(backHref);
    router.refresh();
  };

  const upload = async (file: File) => {
    try {
      const res = await uploadToWiki(file, mode === "page" ? id : undefined);
      setError("");
      return res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      throw e;
    }
  };

  const createSubpage = () =>
    new Promise<{ id: string; title: string } | null>((resolve) => {
      setSubpageTitle("");
      setSubpagePrompt({ resolve });
    });

  const insertTemplateBlocks = (blocks: WikiBlock[]) => {
    const editor = editorRef.current;
    if (!editor || !blocks.length) return;
    const current = editor.getTextCursorPosition().block;
    editor.insertBlocks(wikiToBlockNote(blocks) as never, current, "after");
  };

  const selectionBlocks = (): WikiBlock[] => {
    const editor = editorRef.current;
    const ids = new Set(editor?.getSelection()?.blocks.map((b) => b.id) ?? []);
    return ids.size ? blocksRef.current.filter((b) => ids.has(b.id)) : [];
  };

  // Páginas válidas como superior: no la misma ni sus descendientes.
  const descendants = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of pages) if (p.parentId && descendants.has(p.parentId) && !descendants.has(p.id)) { descendants.add(p.id); grew = true; }
  }
  const parentOptions = pages.filter((p) => !descendants.has(p.id));

  const statusView: Record<Status, { text: string; Icon: typeof Check; cls: string }> = {
    saved: { text: "Guardado", Icon: Check, cls: "text-basil" },
    dirty: { text: "Cambios sin guardar", Icon: Save, cls: "text-muted" },
    saving: { text: "Guardando…", Icon: LoaderCircle, cls: "text-muted" },
    error: { text: "No se pudo guardar", Icon: TriangleAlert, cls: "text-danger" },
    conflict: { text: "Conflicto de edición", Icon: TriangleAlert, cls: "text-danger" },
    offline: { text: "Sin conexión: se guardará al reconectar", Icon: CloudOff, cls: "text-saffron" },
  };
  const S = statusView[status];

  return (
    <div className="min-h-dvh overflow-x-clip">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2 backdrop-blur sm:px-6 max-lg:top-[53px]">
        <Link href={backHref} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-line/60 hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> <span className="hidden sm:inline">Volver</span>
        </Link>
        <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-sm ${S.cls}`}>
          <S.Icon size={14} className={status === "saving" ? "animate-spin" : ""} aria-hidden /> <span className="max-sm:sr-only">{S.text}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setSaveTemplate(selectionBlocks().length ? "selection" : "page")} className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-basil sm:inline-flex" title="Guardar toda la página o los bloques seleccionados como plantilla">
            <LayoutTemplate size={14} aria-hidden /> Guardar como plantilla
          </button>
          <button type="button" onClick={finish} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-basil">
            <Check size={14} aria-hidden /> Listo
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-auto mt-3 max-w-3xl rounded-lg bg-danger-soft px-4 py-2 text-sm text-danger">
          {error} {status === "error" && <button type="button" onClick={() => void save()} className="ml-2 font-medium underline">Reintentar</button>}
        </p>
      )}

      <div className="group relative">
        <PageBackground background={background} seed={id} className="h-40 sm:h-52" />
        <button type="button" onClick={() => setBgOpen(true)} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-surface/90 px-3 py-1.5 text-sm font-medium shadow hover:bg-surface sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
          <ImageIcon size={14} aria-hidden /> {background ? "Cambiar fondo" : "Agregar fondo"}
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <div className="-mt-10"><IconPicker value={icon} onChange={setIcon} /></div>

        <label className="sr-only" htmlFor="titulo">Título</label>
        <textarea
          id="titulo"
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          placeholder={mode === "page" ? "Página sin título" : "Plantilla sin título"}
          maxLength={200}
          className="mt-4 w-full resize-none bg-transparent font-display text-4xl font-bold leading-tight outline-none [field-sizing:content] placeholder:text-line sm:text-5xl"
        />

        <div className="mt-3 flex flex-col gap-2 text-sm">
          {mode === "page" ? (
            <>
              <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
              <label className="flex flex-wrap items-center gap-2 text-muted">
                Dentro de
                <select value={parentId ?? ""} onChange={(e) => { parentChanged.current = true; setParentId(e.target.value || null); }}
                  className="h-8 max-w-full rounded-lg border border-line bg-surface px-2 text-ink outline-none focus:border-basil">
                  <option value="">— Sin página superior —</option>
                  {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>
            </>
          ) : (
            <>
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="Descripción breve: ¿para qué sirve esta plantilla?" aria-label="Descripción de la plantilla"
                className="h-9 w-full rounded-lg border border-line bg-surface px-3 outline-none focus:border-basil" />
              <label className="flex flex-wrap items-center gap-2 text-muted">
                Disponible para
                <select value={scope} onChange={(e) => setScope(e.target.value as TemplateScope)} className="h-8 rounded-lg border border-line bg-surface px-2 text-ink outline-none focus:border-basil">
                  <option value="PRIVATE">Solo yo</option>
                  <option value="DEPARTMENT">Mi departamento</option>
                  {viewer.role === "ADMIN" && <option value="COMPANY">Toda la empresa</option>}
                </select>
              </label>
            </>
          )}
        </div>

        <hr className="my-6 border-line" />

        <div className="-mx-4 sm:-mx-12">
          <BlockEditor
            initialBlocks={initial.blocks}
            pages={pages}
            editorRef={editorRef}
            uploadFile={upload}
            onChange={(blocks) => {
              const key = JSON.stringify(blocks);
              if (key === lastBlocks.current) return;
              lastBlocks.current = key;
              blocksRef.current = blocks;
              markDirty();
            }}
            onCreateSubpage={mode === "page" ? createSubpage : undefined}
            onInsertTemplate={() => setTemplatePicker(true)}
          />
        </div>
        <p className="mt-6 text-xs text-muted">Presiona “/” para insertar bloques y “@” para enlazar páginas. Archivos de hasta {MAX_UPLOAD_MB} MB: {allowedList()}.</p>
        <div className="h-32" />
      </div>

      <BackgroundPicker open={bgOpen} onClose={() => setBgOpen(false)} value={background} onChange={setBackground} pageId={mode === "page" ? id : undefined} />
      <TemplatePicker open={templatePicker} onClose={() => setTemplatePicker(false)} onPick={(t) => { insertTemplateBlocks(t.blocks); setTemplatePicker(false); }} />
      <SaveTemplateDialog
        open={saveTemplate !== null}
        onClose={() => setSaveTemplate(null)}
        viewer={viewer}
        hasSelection={saveTemplate === "selection"}
        defaults={{ title, icon, background }}
        getBlocks={(part) => (part === "selection" ? selectionBlocks() : blocksRef.current)}
      />

      <Modal open={subpagePrompt !== null} onClose={() => { subpagePrompt?.resolve(null); setSubpagePrompt(null); }} title="Nueva subpágina" description="Se crea dentro de esta página y queda privada hasta que la compartas.">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await createPage({ title: subpageTitle || "Nueva subpágina", parentId: id });
            if (!res.ok) { setError(res.message); subpagePrompt?.resolve(null); }
            else subpagePrompt?.resolve(res.data);
            setSubpagePrompt(null);
          }}
        >
          <input autoFocus value={subpageTitle} onChange={(e) => setSubpageTitle(e.target.value)} placeholder="Título de la subpágina" aria-label="Título de la subpágina" maxLength={200}
            className="h-11 rounded-lg border border-line px-3 outline-none focus:border-basil" />
          <button type="submit" className="h-10 rounded-lg bg-ink font-medium text-white hover:bg-basil">Crear subpágina</button>
        </form>
      </Modal>

      <Modal open={status === "conflict"} onClose={() => setStatus("dirty")} title="Alguien más guardó cambios" description="Mientras editabas, otra persona guardó una versión nueva de esta página.">
        <div className="flex flex-col gap-3 text-sm">
          <p>Elige qué hacer con tus cambios:</p>
          <button type="button" onClick={() => { window.location.href = `/paginas/${id}`; }} className="rounded-lg border border-line px-4 py-3 text-left hover:border-basil">
            <span className="block font-medium">Ver su versión</span>
            <span className="text-muted">Descarta lo que cambiaste desde el último guardado y abre la versión más reciente.</span>
          </button>
          <button type="button" onClick={() => { const v = conflictVersion; setStatus("saving"); if (v) void save(v); else setStatus("error"); }} className="rounded-lg border border-line px-4 py-3 text-left hover:border-basil">
            <span className="block font-medium">Guardar mi versión</span>
            <span className="text-muted">Reemplaza la versión de la otra persona por la tuya. La anterior queda en el historial.</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
