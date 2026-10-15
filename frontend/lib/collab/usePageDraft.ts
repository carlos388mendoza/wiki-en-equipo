"use client";

import { useEffect, useRef, useState } from "react";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { WikiBlock } from "@/lib/blocks";
import type { Background } from "@/lib/types";

/** Esquema de IndexedDB para borradores por usuario y página (NO compartidos). */
interface DraftDBSchema extends DBSchema {
  drafts: {
    key: string;
    value: {
      id: string;
      pageId: string;
      userId: string;
      fields: { title: string; background: Background | null; icon: string | null; tags: string[] };
      dirty: boolean;
      baseVersion: number;
      base: string; // JSON stringified PageState
      operationId: string | null;
      updatedAt: number;
    };
    indexes: { "by-page-user": [string, string] };
  };
}

let dbPromise: Promise<IDBPDatabase<DraftDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DraftDBSchema>("wiki-page-drafts", 1, {
      upgrade(db) {
        const store = db.createObjectStore("drafts", { keyPath: "id" });
        store.createIndex("by-page-user", ["pageId", "userId"], { unique: true });
      },
    });
  }
  return dbPromise;
}

function draftKey(pageId: string, userId: string) {
  return `draft:${pageId}:${userId}`;
}

/** Estado de borrador local (por usuario+dispositivo+página). */
export interface PageDraftState {
  fields: { title: string; background: Background | null; icon: string | null; tags: string[] };
  dirty: boolean;
  baseVersion: number;
  base: PageState | null;
  operationId: string | null;
}

/** Estado de página para merge (igual que en PageEditor). */
export interface PageState {
  title: string;
  blocks: WikiBlock[];
  background: Background | null;
  icon: string | null;
  tags: string[];
}

/**
 * Hook para gestionar el borrador local de una página (offline, por usuario+dispositivo).
 * NO usa Yjs ni se comparte con otros usuarios.
 */
export function usePageDraft(pageId: string, userId: string, enabled = true) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PageDraftState>({
    fields: { title: "", background: null, icon: null, tags: [] },
    dirty: false,
    baseVersion: 0,
    base: null,
    operationId: null,
  });
  const loadingRef = useRef(false);

  // Cargar al montar
  useEffect(() => {
    if (!enabled) { setReady(true); return; }
    let cancelled = false;
    loadingRef.current = true;
    getDB().then((db) => db.get("drafts", draftKey(pageId, userId))).then((record) => {
      if (cancelled) return;
      if (record) {
        setState({
          fields: record.fields,
          dirty: record.dirty,
          baseVersion: record.baseVersion,
          base: record.base ? JSON.parse(record.base) : null,
          operationId: record.operationId,
        });
      }
      setReady(true);
      loadingRef.current = false;
    }).catch(() => {
      if (!cancelled) { setReady(true); loadingRef.current = false; }
    });
    return () => { cancelled = true; };
  }, [pageId, userId, enabled]);

  // Guardar en IndexedDB
  const persist = async (partial: Partial<PageDraftState>) => {
    if (!enabled) return;
    const next = { ...state, ...partial };
    setState(next);
    try {
      const db = await getDB();
      await db.put("drafts", {
        id: draftKey(pageId, userId),
        pageId,
        userId,
        fields: next.fields,
        dirty: next.dirty,
        baseVersion: next.baseVersion,
        base: next.base ? JSON.stringify(next.base) : "",
        operationId: next.operationId,
        updatedAt: Date.now(),
      });
    } catch { /* silencioso: el estado en memoria sigue funcionando */ }
  };

  const setFields = (fields: PageDraftState["fields"]) => persist({ fields });
  const setDirty = (dirty: boolean) => persist({ dirty });
  const setBase = (baseVersion: number, base: PageState) => persist({ baseVersion, base, dirty: false, operationId: null });
  const setOperationId = (operationId: string | null) => persist({ operationId });
  const clear = async () => {
    if (!enabled) return;
    setState({ fields: { title: "", background: null, icon: null, tags: [] }, dirty: false, baseVersion: 0, base: null, operationId: null });
    try {
      const db = await getDB();
      await db.delete("drafts", draftKey(pageId, userId));
    } catch { /* silencioso */ }
  };

  return { ready, state, setFields, setDirty, setBase, setOperationId, clear, loading: loadingRef.current };
}