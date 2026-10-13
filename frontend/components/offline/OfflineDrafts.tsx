"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CloudOff, CloudUpload, FilePlus2, LoaderCircle, Trash2, Wifi } from "lucide-react";
import type { CollaborationOptions } from "@blocknote/core/yjs";
import { createPage, savePage } from "@/app/actions/pages";
import type { WikiBlock } from "@/lib/blocks";
import { blockNoteToWiki, trimTrailingEmpty, type BNBlock } from "@/lib/editor/convert";
import type { WikiEditor } from "../editor/schema";
import { colorFor } from "@/lib/collab/useCollaboration";
import { deleteDraft, lastUser, openDraft, openDraftIndex, type DraftInfo } from "@/lib/collab/drafts";

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

/** Borradores locales: se escriben sin internet y se suben a la wiki al reconectar. */
export function OfflineDrafts() {
  const online = useOnline();
  const [user, setUser] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [collaboration, setCollaboration] = useState<CollaborationOptions | null>(null);
  const [title, setTitle] = useState("");
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
    setTitle(index.current?.map.get(current)?.title ?? "");
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
      const created = await createPage({ title: title || "Borrador sin título" });
      if (!created.ok) { setMessage({ ok: false, text: created.message }); return; }
      const content = editorRef.current ? trimTrailingEmpty(blockNoteToWiki(editorRef.current.document as BNBlock[])) : blocks.current;
      const saved = await savePage(created.data.id, { title: title || "Borrador sin título", blocks: content, background: null, icon: "📝", tags: [] }, 1);
      if (!saved.ok) { setMessage({ ok: false, text: saved.message }); return; }
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

  if (user === undefined) return null;
  if (user === null) {
    return <p className="rounded-xl border border-dashed border-line p-6 text-muted">Para escribir sin conexión, primero inicia sesión una vez con internet en este dispositivo.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-3">
        <p className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${online ? "bg-basil-soft text-basil" : "bg-saffron-soft text-ink"}`}>
          {online ? <Wifi size={14} aria-hidden /> : <CloudOff size={14} aria-hidden />}
          {online ? "Tienes conexión" : "Sin conexión"}
        </p>
        <button type="button" onClick={newDraft} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-basil">
          <FilePlus2 size={16} aria-hidden /> Nuevo borrador
        </button>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted">No tienes borradores en este dispositivo.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {drafts.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setCurrent(d.id)} aria-current={current === d.id ? "true" : undefined}
                  className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm ${current === d.id ? "bg-basil-soft font-semibold text-basil" : "hover:bg-line/60"}`}>
                  {d.title || "Borrador sin título"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section aria-label="Borrador" className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-6">
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-basil-soft text-basil" : "bg-danger-soft text-danger"}`}>
            {message.text} {message.href && <Link href={message.href} className="font-medium underline">Abrir la página</Link>}
          </p>
        )}
        {!current ? (
          <p className="text-muted">Elige un borrador o crea uno nuevo. Se guarda en este dispositivo mientras escribes.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input value={title} onChange={(e) => { setTitle(e.target.value); touch({ title: e.target.value }); }} placeholder="Borrador sin título" aria-label="Título del borrador" maxLength={200}
                className="min-w-0 flex-1 bg-transparent font-display text-3xl font-bold outline-none placeholder:text-line" />
              <button type="button" disabled={!online || busy} onClick={publish} title={online ? "Crear la página en la wiki" : "Necesitas conexión para publicar"}
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-basil disabled:opacity-50">
                {busy ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <CloudUpload size={14} aria-hidden />} Subir a la wiki
              </button>
              <button type="button" onClick={async () => { if (!confirm("¿Borrar este borrador? No se puede deshacer.")) return; await deleteDraft(user.id, current); index.current?.map.delete(current); setCurrent(null); }}
                aria-label="Borrar borrador" className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={16} /></button>
            </div>
            <div className="-mx-4 mt-4 sm:-mx-6">
              {collaboration ? (
                <BlockEditor key={current} initialBlocks={[]} pages={[]} collaboration={collaboration} uploadFile={uploadOffline} editorRef={editorRef}
                  onChange={(b) => { blocks.current = b; touch({}); }} />
              ) : (
                <div aria-busy="true" className="h-24 animate-pulse rounded bg-line/50" />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
