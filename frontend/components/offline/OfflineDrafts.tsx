"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CloudOff, CloudUpload, FilePlus2, ImageIcon, LoaderCircle, Trash2, Wifi } from "lucide-react";
import type { CollaborationOptions } from "@blocknote/core/yjs";
import { createPage } from "@/app/actions/pages";
import type { WikiBlock } from "@/lib/blocks";
import { blockNoteToWiki, trimTrailingEmpty, type BNBlock } from "@/lib/editor/convert";
import type { Background } from "@/lib/types";
import type { WikiEditor } from "../editor/schema";
import { colorFor } from "@/lib/collab/useCollaboration";
import { deleteDraft, lastUser, openDraft, openDraftIndex, type DraftInfo } from "@/lib/collab/drafts";
import { BackgroundPicker } from "../editor/BackgroundPicker";
import { IconPicker } from "../editor/IconPicker";
import { TagInput } from "../editor/TagInput";
import { PageBackground } from "../page/PageBackground";
import { BrandLogo } from "../ui/BrandLogo";
import { PageIcon } from "../ui/PageIcon";

const BlockEditor = dynamic(() => import("../editor/BlockEditor"), { ssr: false });

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

const uploadOffline = async () => { throw new Error("Sin conexión no se pueden subir archivos. Agrégalos cuando publiques el borrador."); };
const DEFAULT_ICON = "📝";

/**
 * Borradores locales: se escriben sin internet y se suben a la wiki al reconectar. La pantalla de edición es la misma
 * que con internet (portada, icono, fondo, título, etiquetas y editor por bloques), con el aviso de que se guarda en
 * este dispositivo (#42).
 */
export function OfflineDrafts() {
  const online = useOnline();
  const [user, setUser] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [collaboration, setCollaboration] = useState<CollaborationOptions | null>(null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<string | null>(DEFAULT_ICON);
  const [background, setBackground] = useState<Background | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [bgOpen, setBgOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; href?: string } | null>(null);
  const index = useRef<Awaited<ReturnType<typeof openDraftIndex>> | null>(null);
  const blocks = useRef<WikiBlock[]>([]);
  const editorRef = useRef<WikiEditor | null>(null);
  const started = useRef(false);

  useEffect(() => { setUser(lastUser()); }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void openDraftIndex(user.id).then((idx) => {
      if (!alive) { idx.close(); return; }
      index.current = idx;
      const refresh = () => setDrafts([...idx.map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      idx.map.observe(refresh);
      refresh();
      // Se lee en el navegador: la copia guardada sin conexión no incluye la consulta de la URL.
      const startNew = new URLSearchParams(location.search).get("nuevo") === "1";
      if (startNew && !started.current) { started.current = true; newDraft(); }
    });
    return () => { alive = false; index.current?.close(); };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !current) { setCollaboration(null); return; }
    let alive = true;
    void openDraft(user.id, current).then(({ fragment }) => {
      if (alive) setCollaboration({ fragment, user: { name: user.name, color: colorFor(user.id) } });
    });
    const info = index.current?.map.get(current);
    setTitle(info?.title ?? "");
    setIcon(info?.icon === undefined ? DEFAULT_ICON : info.icon);
    setBackground(info?.background ?? null);
    setTags(info?.tags ?? []);
    blocks.current = [];
    return () => { alive = false; };
  }, [user, current]);

  function newDraft() {
    const id = crypto.randomUUID();
    index.current?.map.set(id, { id, title: "", updatedAt: new Date().toISOString() });
    setCurrent(id);
    setMessage(null);
  }

  const touch = (patch: Partial<DraftInfo>) => {
    if (!current || !index.current) return;
    const info = index.current.map.get(current);
    if (info) index.current.map.set(current, { ...info, ...patch, updatedAt: new Date().toISOString() });
  };

  async function publish() {
    if (!user || !current) return;
    setBusy(true);
    setMessage(null);
    try {
      const content = editorRef.current ? trimTrailingEmpty(blockNoteToWiki(editorRef.current.document as BNBlock[])) : blocks.current;
      // La página se crea ya con el contenido (una sola petición): si falla, no queda una página vacía
      // y el borrador sigue en este dispositivo para reintentar. Solo se borra cuando la página existe.
      const created = await createPage({ title: title || "Borrador sin título", blocks: content, icon: icon ?? undefined, background, tags });
      if (!created.ok) { setMessage({ ok: false, text: created.message }); return; }
      await deleteDraft(user.id, current);
      index.current?.map.delete(current);
      setCurrent(null);
      setMessage({ ok: true, text: "Borrador publicado como página privada.", href: `/paginas/${created.data.id}/editar` });
    } catch {
      setMessage({ ok: false, text: "No se pudo publicar. Revisa tu conexión e intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user || !current || !confirm("¿Borrar este borrador? No se puede deshacer.")) return;
    await deleteDraft(user.id, current);
    index.current?.map.delete(current);
    setCurrent(null);
  }

  if (user === undefined) return null;
  if (user === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="rounded-xl border border-dashed border-line p-6 text-muted">Para escribir sin conexión, primero inicia sesión una vez con internet en este dispositivo.</p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Como la barra lateral de la wiki, pero con los borradores de este dispositivo. */}
      <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-4 px-3 py-4 lg:h-full lg:overflow-y-auto">
          <Link href="/" className="flex items-center gap-2.5 px-2" aria-label="Wiki Grupo Comidas: inicio">
            <BrandLogo size={40} priority decorative />
            <span className="font-display text-lg font-bold leading-tight">Wiki Grupo Comidas</span>
          </Link>
          <p className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${online ? "bg-sky-soft text-sky" : "bg-sun-soft text-ink"}`}>
            {online ? <Wifi size={14} aria-hidden /> : <CloudOff size={14} aria-hidden />}
            {online ? "Tienes conexión" : "Sin conexión"}
          </p>
          <button type="button" onClick={newDraft} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-brand">
            <FilePlus2 size={16} aria-hidden /> Nuevo borrador
          </button>
          <section className="flex flex-col gap-1">
            <h2 className="px-2 text-xs font-semibold text-muted">Borradores en este dispositivo</h2>
            {drafts.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted">No tienes borradores en este dispositivo.</p>
            ) : (
              <ul>
                {drafts.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setCurrent(d.id)} aria-current={current === d.id ? "true" : undefined}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${current === d.id ? "bg-brand-soft font-semibold text-brand-strong" : "hover:bg-line/60"}`}>
                      <PageIcon icon={d.icon === undefined ? DEFAULT_ICON : d.icon} size={16} />
                      <span className="truncate">{d.title || "Borrador sin título"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="mt-auto px-2 text-xs text-muted">
            Las páginas que ya abriste también se pueden consultar y editar sin conexión; tus cambios se suben al reconectar.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`mx-auto mt-3 max-w-3xl rounded-lg px-4 py-2 text-sm ${message.ok ? "bg-sky-soft text-sky" : "bg-danger-soft text-danger"}`}>
            {message.text} {message.href && <Link href={message.href} className="font-medium underline">Abrir la página</Link>}
          </p>
        )}
        {!current ? (
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <CloudOff size={32} className="mx-auto text-muted" aria-hidden />
            <h1 className="mt-3 font-display text-2xl font-bold">Trabajar sin conexión</h1>
            <p className="mt-2 text-muted">Escribe borradores aunque no tengas internet. Se guardan en este dispositivo y, cuando vuelvas a estar en línea, los subes a la wiki como páginas privadas.</p>
            <button type="button" onClick={newDraft} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand">
              <FilePlus2 size={16} aria-hidden /> Nuevo borrador
            </button>
          </div>
        ) : (
          <div className="min-h-dvh overflow-x-clip">
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2 backdrop-blur sm:px-6">
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-line/60 hover:text-ink">
                <ArrowLeft size={16} aria-hidden /> <span className="hidden sm:inline">Volver a la wiki</span>
              </Link>
              <span role="status" className="inline-flex items-center gap-1.5 text-sm text-sun-ink">
                <CloudOff size={14} aria-hidden /> <span className="max-md:sr-only">Guardado en este dispositivo</span>
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={remove} aria-label="Borrar borrador" title="Borrar borrador" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={16} /></button>
                <button type="button" disabled={!online || busy} onClick={publish} title={online ? "Crear la página en la wiki" : "Necesitas conexión para publicar"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-brand disabled:opacity-50">
                  {busy ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <CloudUpload size={14} aria-hidden />} Subir a la wiki
                </button>
              </div>
            </div>

            <p role="note" className="mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-lg bg-sun-soft px-4 py-2 text-sm text-ink">
              <CloudOff size={14} aria-hidden className="shrink-0" />
              Este borrador se guarda en este dispositivo. {online ? "Cuando quieras, súbelo a la wiki como página privada." : "Súbelo a la wiki cuando vuelvas a tener conexión."}
            </p>

            <div className="group relative mt-3">
              <PageBackground background={background} seed={current} className="h-40 sm:h-52" />
              <button type="button" onClick={() => setBgOpen(true)} title={background ? "Cambiar fondo" : "Agregar fondo"} className="absolute bottom-3 right-3 z-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface/90 px-3 py-1.5 text-sm font-medium shadow hover:bg-surface focus-visible:opacity-100 [@media(any-hover:hover)]:opacity-0 [@media(any-hover:hover)]:group-hover:opacity-100 [@media(any-hover:none)]:h-9 [@media(any-hover:none)]:w-9 [@media(any-hover:none)]:rounded-full [@media(any-hover:none)]:bg-surface/75 [@media(any-hover:none)]:p-0">
                <ImageIcon size={14} aria-hidden /><span className="[@media(any-hover:none)]:sr-only">{background ? "Cambiar fondo" : "Agregar fondo"}</span>
              </button>
            </div>

            <div className="mx-auto max-w-3xl px-4 sm:px-8">
              <div className="relative -mt-10 w-fit"><IconPicker value={icon} onChange={(v) => { setIcon(v); touch({ icon: v }); }} /></div>

              <label className="sr-only" htmlFor="titulo-borrador">Título</label>
              <textarea id="titulo-borrador" value={title} rows={1} maxLength={200} placeholder="Borrador sin título"
                onChange={(e) => { const v = e.target.value.replace(/\n/g, ""); setTitle(v); touch({ title: v }); }}
                className="mt-4 w-full resize-none bg-transparent font-display text-4xl font-bold leading-tight outline-none [field-sizing:content] placeholder:text-line sm:text-5xl" />

              <div className="mt-3 flex flex-col gap-2 text-sm">
                <TagInput value={tags} onChange={(v) => { setTags(v); touch({ tags: v }); }} suggestions={[]} />
              </div>

              <hr className="my-6 border-line" />

              <div className="-mx-4 sm:-mx-12">
                {collaboration ? (
                  <BlockEditor key={current} initialBlocks={[]} pages={[]} collaboration={collaboration} uploadFile={uploadOffline} editorRef={editorRef}
                    onChange={(b) => { blocks.current = b; touch({}); }} />
                ) : (
                  <div aria-busy="true" className="mx-4 h-24 animate-pulse rounded bg-line/50 sm:mx-12" />
                )}
              </div>
              <p className="mt-6 text-xs text-muted">Presiona “/” para insertar bloques. Sin conexión no se pueden subir archivos: agrégalos después de publicar el borrador.</p>
              <div className="h-32" />
            </div>

            <BackgroundPicker open={bgOpen} onClose={() => setBgOpen(false)} value={background} onChange={(bg) => { setBackground(bg); touch({ background: bg }); }} />
          </div>
        )}
      </main>
    </div>
  );
}
