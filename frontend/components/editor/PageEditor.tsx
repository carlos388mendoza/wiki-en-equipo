"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CloudOff, ImageIcon, LayoutTemplate, LoaderCircle, Save, TriangleAlert, X } from "lucide-react";
import { createPage, savePage, updateTemplate, type PageDraft } from "@/app/actions/pages";
import { loadPageState, syncOffline } from "@/app/actions/sync";
import type { WikiBlock } from "@/lib/blocks";
import { useCollaboration } from "@/lib/collab/useCollaboration";
import { applyBlocks } from "@/lib/editor/apply";
import { blockNoteToWiki, trimTrailingEmpty, wikiToBlockNote, type BNBlock } from "@/lib/editor/convert";
import { mergePages, type MergeResult, type PageState } from "@/lib/editor/merge";
import type { Background, PageSummary, TemplateScope, User } from "@/lib/types";
import { allowedList, MAX_UPLOAD_MB, uploadToWiki } from "@/lib/uploads";
import { PageBackground } from "../page/PageBackground";
import { Modal } from "../ui/Modal";
import { BackgroundPicker } from "./BackgroundPicker";
import { CollabStatus } from "./CollabStatus";
import { ConflictDialog } from "./ConflictDialog";
import { IconPicker } from "./IconPicker";
import type { WikiEditor } from "./schema";
import { TagInput } from "./TagInput";
import { SaveTemplateDialog, TemplatePicker } from "./TemplateDialogs";

const BlockEditor = dynamic(() => import("./BlockEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando editor" className="flex flex-col gap-3 px-12 py-2">
      {[95, 80, 88, 60].map((w, i) => <div key={i} className="h-4 animate-pulse rounded bg-line/70" style={{ width: `${w}%` }} />)}
    </div>
  );
}

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
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const uuid = () => crypto.randomUUID();

export function PageEditor({ mode, id, initial, pages, tagSuggestions, viewer, backHref }: {
  mode: "page" | "template";
  id: string;
  initial: EditorInitial;
  pages: PageSummary[];
  tagSuggestions: string[];
  viewer: User;
  backHref: string;
}) {
  const isPage = mode === "page";
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
  const [notice, setNotice] = useState("");
  const [bgOpen, setBgOpen] = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState<null | "page" | "selection">(null);
  const [merge, setMerge] = useState<{ result: MergeResult; version: number; theirs: PageState; origin: "reconnect" | "concurrent" } | null>(null);
  const [subpagePrompt, setSubpagePrompt] = useState<{ resolve: (v: { id: string; title: string } | null) => void } | null>(null);
  const [subpageTitle, setSubpageTitle] = useState("");

  const blocksRef = useRef<WikiBlock[]>(initial.blocks);
  const versionRef = useRef(initial.version);
  const baseRef = useRef<PageState>({ title: initial.title, blocks: initial.blocks, background: initial.background, icon: initial.icon, tags: initial.tags });
  const editorRef = useRef<WikiEditor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const pendingAgain = useRef(false);
  const parentChanged = useRef(false);
  const initDone = useRef(false);

  const handleRemoteRef = useRef<(version: number) => void>(() => {});
  const collab = useCollaboration({ pageId: id, user: viewer, enabled: isPage, onRemoteSave: (v) => handleRemoteRef.current(v) });

  const draft = useCallback((): PageDraft => ({ title, blocks: blocksRef.current, background, icon, tags, ...(parentChanged.current && { parentId }) }), [title, background, icon, tags, parentId]);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const currentState = (): PageState => {
    const d = draftRef.current();
    return { title: d.title, blocks: d.blocks, background: d.background, icon: d.icon, tags: d.tags };
  };

  /* ---------- Copia local (Yjs + IndexedDB) ---------- */

  const persistLocal = useCallback((dirty: boolean) => {
    if (!isPage) return;
    const s = draftRef.current();
    collab.meta.set("fields", { title: s.title, background: s.background, icon: s.icon, tags: s.tags });
    collab.meta.set("dirty", dirty);
  }, [isPage, collab.meta]);

  const markSynced = useCallback((version: number, state: PageState) => {
    versionRef.current = version;
    baseRef.current = state;
    if (!isPage) return;
    collab.meta.set("baseVersion", version);
    collab.meta.set("base", JSON.stringify(state));
    collab.meta.set("dirty", false);
    collab.meta.delete("operationId");
  }, [isPage, collab.meta]);

  // Las claves sirven para no volver a guardar lo que acaba de llegar del servidor.
  const fieldsKeyOf = (f: { title: string; background: Background | null; icon: string | null; tags: string[]; parentId: string | null; description: string; scope: TemplateScope }) => JSON.stringify(f);
  const fieldsKey = fieldsKeyOf({ title, background, icon, tags, parentId, description, scope });
  const lastFields = useRef(fieldsKey);
  const lastBlocks = useRef(JSON.stringify(initial.blocks));

  /** Pone un estado en pantalla (campos y bloques) sin marcarlo como cambio propio. */
  const applyState = (state: PageState) => {
    lastFields.current = fieldsKeyOf({ title: state.title, background: state.background, icon: state.icon, tags: state.tags, parentId, description, scope });
    setTitle(state.title); setBackground(state.background); setIcon(state.icon); setTags(state.tags);
    const editor = editorRef.current;
    if (editor) {
      lastBlocks.current = JSON.stringify(state.blocks);
      applyBlocks(editor as never, blocksRef.current, state.blocks);
    }
    blocksRef.current = state.blocks;
  };

  /* ---------- Guardar ---------- */

  const saveRef = useRef<(force?: number) => Promise<void>>(async () => {});

  /** Combina tus cambios con la versión del servidor. Sin choques, guarda solo; con choques, pregunta. */
  const resolveAgainst = (version: number, theirs: PageState, origin: "reconnect" | "concurrent") => {
    const result = mergePages(baseRef.current, currentState(), theirs);
    if (result.conflicts.length || result.fieldConflicts.length) {
      setMerge({ result, version, theirs, origin });
      setStatus("conflict");
      return;
    }
    applyState(result.merged);
    versionRef.current = version;
    baseRef.current = theirs;
    if (same(result.merged, theirs)) {
      markSynced(version, theirs);
      setStatus("saved");
    } else {
      setStatus("dirty");
      void saveRef.current();
    }
    setNotice(origin === "concurrent" ? "Se combinaron los cambios que guardó otra persona." : "Tus cambios sin conexión se combinaron con la versión más reciente.");
  };

  const goOffline = () => {
    persistLocal(true);
    if (isPage && !collab.meta.get("operationId")) collab.meta.set("operationId", uuid());
    setStatus("offline");
    // Si el navegador cree tener red pero el servidor no respondió, el evento "online" no llegará:
    // se reintenta cada 15 s hasta que el guardado funcione.
    if (navigator.onLine) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveRef.current(), 15_000);
    }
  };

  const save = async (force?: number) => {
    if (saving.current) { pendingAgain.current = true; return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { goOffline(); return; }
    try {
      await saveOnline(force);
    } catch {
      // El servidor no respondió: se trata como sin conexión y se reintenta al reconectar.
      saving.current = false;
      goOffline();
    }
  };
  saveRef.current = save;

  const saveOnline = async (force?: number) => {
    saving.current = true;
    setStatus("saving");
    const d = draftRef.current();
    const state: PageState = { title: d.title, blocks: d.blocks, background: d.background, icon: d.icon, tags: d.tags };

    if (!isPage) {
      const res = await updateTemplate(id, { title: d.title, blocks: d.blocks, background: d.background, icon: d.icon, description, scope });
      saving.current = false;
      if (res.ok) { setError(""); setStatus(pendingAgain.current ? "dirty" : "saved"); if (pendingAgain.current) { pendingAgain.current = false; void saveRef.current(); } }
      else { setError(res.message); setStatus("error"); }
      return;
    }

    // Cambios pendientes de una sesión sin conexión: se suben con el endpoint de sincronización.
    const operationId = collab.meta.get("operationId") as string | undefined;
    if (operationId && force === undefined) {
      const res = await syncOffline(id, state, versionRef.current, operationId);
      saving.current = false;
      if (res.ok) {
        markSynced(res.version, state);
        setError("");
        setNotice("Se subieron los cambios que hiciste sin conexión.");
        setStatus("saved");
      } else if (res.conflict) {
        collab.meta.delete("operationId");
        resolveAgainst(res.version, res.state, "reconnect");
      } else {
        setError(res.message);
        setStatus("error");
      }
      return;
    }

    const res = await savePage(id, d, force ?? versionRef.current);
    saving.current = false;
    if (res.ok) {
      parentChanged.current = false;
      markSynced(res.data.version, state);
      setError("");
      if (pendingAgain.current) { pendingAgain.current = false; persistLocal(true); void saveRef.current(); return; }
      setStatus("saved");
      return;
    }
    if ("conflict" in res && res.conflict) {
      const latest = await loadPageState(id);
      if (!latest.ok) { setError(latest.message); setStatus("error"); return; }
      // Con edición en vivo el documento ya incluye los cambios de los demás: basta con reintentar.
      if (collab.live && collab.peers.length) { void saveRef.current(latest.data.version); return; }
      resolveAgainst(latest.data.version, latest.data.state, "concurrent");
      return;
    }
    setError(res.message);
    setStatus("error");
  };

  const markDirty = useCallback(() => {
    persistLocal(true);
    setStatus((s) => (s === "conflict" ? s : "dirty"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), AUTOSAVE_MS);
  }, [persistLocal]);

  useEffect(() => {
    if (fieldsKey === lastFields.current) return;
    lastFields.current = fieldsKey;
    markDirty();
  }, [fieldsKey, markDirty]);

  /* ---------- Cambios de otras personas (aviso del backend) ---------- */

  handleRemoteRef.current = async (version: number) => {
    if (version <= versionRef.current || saving.current) return;
    const latest = await loadPageState(id);
    if (!latest.ok || latest.data.version <= versionRef.current) return;
    if (status === "saved") {
      applyState(latest.data.state);
      markSynced(latest.data.version, latest.data.state);
      setNotice("Se cargaron los cambios que guardó otra persona.");
    } else {
      resolveAgainst(latest.data.version, latest.data.state, "concurrent");
    }
  };

  /* ---------- Al abrir: recuperar la copia local ---------- */

  const onEditorReady = (editor: WikiEditor) => {
    if (!isPage || initDone.current) return;
    initDone.current = true;
    const meta = collab.meta;
    const server: PageState = { title: initial.title, blocks: initial.blocks, background: initial.background, icon: initial.icon, tags: initial.tags };
    const localVersion = meta.get("baseVersion") as number | undefined;
    const editorBlocks = trimTrailingEmpty(blockNoteToWiki(editor.document as BNBlock[]));

    if (localVersion === undefined) {
      // Primera vez en este dispositivo. Si nadie más llenó el documento compartido, se carga el del servidor.
      if (editorBlocks.length === 0) {
        editor.replaceBlocks(editor.document, wikiToBlockNote(initial.blocks) as never);
        lastBlocks.current = JSON.stringify(initial.blocks);
        blocksRef.current = initial.blocks;
      } else {
        blocksRef.current = editorBlocks;
      }
      markSynced(initial.version, server);
      return;
    }

    let base = server;
    try { base = JSON.parse(String(meta.get("base"))) as PageState; } catch { /* sin base guardada */ }
    const fields = (meta.get("fields") as Partial<PageState> | undefined) ?? {};
    blocksRef.current = editorBlocks;
    lastBlocks.current = JSON.stringify(editorBlocks);

    if (meta.get("dirty") !== true) {
      if (localVersion !== initial.version) {
        // La copia local quedó vieja: manda el servidor.
        applyState(server);
      }
      markSynced(initial.version, server);
      return;
    }

    // Hay cambios hechos sin conexión (o sin guardar) en este dispositivo.
    const local: PageState = { title: fields.title ?? initial.title, background: fields.background ?? null, icon: fields.icon ?? null, tags: fields.tags ?? [], blocks: editorBlocks };
    lastFields.current = fieldsKeyOf({ title: local.title, background: local.background, icon: local.icon, tags: local.tags, parentId, description, scope });
    setTitle(local.title); setBackground(local.background); setIcon(local.icon); setTags(local.tags);
    versionRef.current = localVersion;
    baseRef.current = base;
    setNotice("Recuperamos cambios que no se habían subido.");
    if (localVersion === initial.version) {
      setStatus("dirty");
      void saveRef.current();
    } else {
      resolveAgainst(initial.version, server, "reconnect");
    }
  };

  /* ---------- Conexión ---------- */

  useEffect(() => {
    // Sin conexión los cambios ya están en este dispositivo; para plantillas no hay copia local, así que se avisa.
    const handler = (e: BeforeUnloadEvent) => { if (status !== "saved" && (status !== "offline" || !isPage)) e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  useEffect(() => {
    const online = () => { if (status === "offline" || status === "error") void saveRef.current(); };
    const offline = () => { if (status !== "saved") setStatus("offline"); };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [status]);

  const finish = async () => {
    if (timer.current) clearTimeout(timer.current);
    if (status !== "saved" && navigator.onLine) await saveRef.current();
    router.push(backHref);
    router.refresh();
  };

  /* ---------- Archivos, subpáginas y plantillas ---------- */

  const upload = async (file: File) => {
    try {
      const res = await uploadToWiki(file, isPage ? id : undefined);
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
    conflict: { text: "Hay que resolver un conflicto", Icon: TriangleAlert, cls: "text-danger" },
    offline: { text: isPage ? "Guardado en este dispositivo" : "Sin conexión: no cierres hasta reconectar", Icon: CloudOff, cls: "text-saffron" },
  };
  const S = statusView[status];

  return (
    <div className="min-h-dvh overflow-x-clip">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2 backdrop-blur sm:px-6 max-lg:top-[53px]">
        <Link href={backHref} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-line/60 hover:text-ink">
          <ArrowLeft size={16} aria-hidden /> <span className="hidden sm:inline">Volver</span>
        </Link>
        <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-sm ${S.cls}`}>
          <S.Icon size={14} className={status === "saving" ? "animate-spin" : ""} aria-hidden /> <span className="max-md:sr-only">{S.text}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isPage && <CollabStatus status={collab.status} peers={collab.peers} live={collab.live} />}
          <button type="button" onClick={() => setSaveTemplate(selectionBlocks().length ? "selection" : "page")} className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-basil lg:inline-flex" title="Guardar toda la página o los bloques seleccionados como plantilla">
            <LayoutTemplate size={14} aria-hidden /> Guardar como plantilla
          </button>
          <button type="button" onClick={finish} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-basil">
            <Check size={14} aria-hidden /> Listo
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-auto mt-3 max-w-3xl rounded-lg bg-danger-soft px-4 py-2 text-sm text-danger">
          {error} {status === "error" && <button type="button" onClick={() => void saveRef.current()} className="ml-2 font-medium underline">Reintentar</button>}
        </p>
      )}
      {notice && (
        <p role="status" className="mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-lg bg-basil-soft px-4 py-2 text-sm text-basil">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso" className="rounded p-0.5 hover:bg-surface"><X size={14} /></button>
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
          placeholder={isPage ? "Página sin título" : "Plantilla sin título"}
          maxLength={200}
          className="mt-4 w-full resize-none bg-transparent font-display text-4xl font-bold leading-tight outline-none [field-sizing:content] placeholder:text-line sm:text-5xl"
        />

        <div className="mt-3 flex flex-col gap-2 text-sm">
          {isPage ? (
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
          {isPage && !collab.collaboration ? (
            <EditorSkeleton />
          ) : (
            <BlockEditor
              initialBlocks={initial.blocks}
              pages={pages}
              editorRef={editorRef}
              collaboration={collab.collaboration}
              onEditorReady={onEditorReady}
              uploadFile={upload}
              onChange={(blocks) => {
                const key = JSON.stringify(blocks);
                if (key === lastBlocks.current) return;
                lastBlocks.current = key;
                blocksRef.current = blocks;
                markDirty();
              }}
              onCreateSubpage={isPage ? createSubpage : undefined}
              onInsertTemplate={() => setTemplatePicker(true)}
            />
          )}
        </div>
        <p className="mt-6 text-xs text-muted">
          Presiona “/” para insertar bloques y “@” para enlazar páginas. Archivos de hasta {MAX_UPLOAD_MB} MB: {allowedList()}.
          {isPage && " Los cambios también se guardan en este dispositivo, así puedes seguir sin conexión."}
        </p>
        <div className="h-32" />
      </div>

      <BackgroundPicker open={bgOpen} onClose={() => setBgOpen(false)} value={background} onChange={setBackground} pageId={isPage ? id : undefined} />
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

      <ConflictDialog
        result={merge?.result ?? null}
        origin={merge?.origin ?? "concurrent"}
        onCancel={() => setMerge(null)}
        onResolve={(state) => {
          if (!merge) return;
          applyState(state);
          versionRef.current = merge.version;
          baseRef.current = merge.theirs;
          setMerge(null);
          setStatus("dirty");
          void saveRef.current();
        }}
      />
    </div>
  );
}
