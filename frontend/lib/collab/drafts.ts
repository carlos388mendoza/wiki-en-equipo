"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

/**
 * Borradores creados sin conexión. Viven en IndexedDB (y-indexeddb) de este
 * dispositivo hasta que se suben a la wiki.
 *   wiki-borradores-<usuario>           índice (id → título, fecha)
 *   wiki-borrador-<usuario>-<id>        contenido de cada borrador (Yjs)
 */
export type DraftInfo = { id: string; title: string; updatedAt: string };

const LAST_USER_KEY = "wiki-ultimo-usuario";

export function rememberUser(user: { id: string; name: string }) {
  try { localStorage.setItem(LAST_USER_KEY, JSON.stringify({ id: user.id, name: user.name })); } catch { /* sin almacenamiento */ }
}

export function lastUser(): { id: string; name: string } | null {
  try { return JSON.parse(localStorage.getItem(LAST_USER_KEY) ?? "null"); } catch { return null; }
}

export async function openDraftIndex(userId: string) {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`wiki-borradores-${userId}`, doc);
  await persistence.whenSynced;
  const map = doc.getMap<DraftInfo>("drafts");
  return { doc, map, close: () => { void persistence.destroy(); } };
}

export async function openDraft(userId: string, draftId: string) {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`wiki-borrador-${userId}-${draftId}`, doc);
  await persistence.whenSynced;
  return { doc, fragment: doc.getXmlFragment("document-store"), persistence };
}

export async function deleteDraft(userId: string, draftId: string) {
  const { persistence } = await openDraft(userId, draftId);
  await persistence.clearData();
}
