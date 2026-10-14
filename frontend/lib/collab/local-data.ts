"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import type { DraftInfo } from "./drafts";

/**
 * Datos que la wiki guarda en este dispositivo para trabajar sin conexión:
 *   IndexedDB  wiki-pagina-<pagina>-<usuario>, wiki-borradores-<usuario>, wiki-borrador-<usuario>-<id>
 *   Cache Storage  wiki-*  (páginas y archivos del service worker)
 *   localStorage   wiki-ultimo-usuario
 * Al cerrar sesión se borra todo; antes se avisa si hay cambios sin subir.
 */
export type Unsynced = { kind: "pagina" | "borrador"; title: string };

async function databaseNames(): Promise<string[]> {
  try {
    return (await indexedDB.databases()).map((d) => d.name ?? "").filter((n) => n.startsWith("wiki-"));
  } catch {
    return []; // Navegadores sin indexedDB.databases(): solo se conoce el índice de borradores.
  }
}

async function readDoc(name: string) {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(name, doc);
  await persistence.whenSynced;
  return { doc, close: () => persistence.destroy() };
}

/** Páginas con cambios sin subir y borradores de esta persona en este dispositivo. */
export async function findUnsynced(userId: string): Promise<Unsynced[]> {
  const out: Unsynced[] = [];
  for (const name of await databaseNames()) {
    if (!name.startsWith("wiki-pagina-") || !name.endsWith(`-${userId}`)) continue;
    const { doc, close } = await readDoc(name);
    const meta = doc.getMap<unknown>("meta");
    if (meta.get("dirty") === true) {
      const fields = meta.get("fields") as { title?: string } | undefined;
      out.push({ kind: "pagina", title: fields?.title || "Página sin título" });
    }
    await close();
  }
  const index = await readDoc(`wiki-borradores-${userId}`);
  for (const d of index.doc.getMap<DraftInfo>("drafts").values()) out.push({ kind: "borrador", title: d.title || "Borrador sin título" });
  await index.close();
  return out;
}

function deleteDatabase(name: string) {
  return new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/** Borra la caché de páginas del service worker (por ejemplo, al cambiar de persona en el equipo). */
export async function clearPageCache() {
  try {
    for (const key of await caches.keys()) if (key.startsWith("wiki-") && key.endsWith("-paginas")) await caches.delete(key);
  } catch { /* sin Cache Storage */ }
  navigator.serviceWorker?.controller?.postMessage("limpiar");
}

/** Borra todo lo que la wiki guardó en este dispositivo para esta persona. */
export async function clearLocalData(userId: string) {
  const names = new Set(await databaseNames());
  // Sin indexedDB.databases(): al menos los borradores que lista el índice.
  const index = await readDoc(`wiki-borradores-${userId}`);
  for (const id of index.doc.getMap<DraftInfo>("drafts").keys()) names.add(`wiki-borrador-${userId}-${id}`);
  await index.close();
  names.add(`wiki-borradores-${userId}`);
  await Promise.all([...names].filter((n) => n.endsWith(`-${userId}`) || n.includes(`-${userId}-`)).map(deleteDatabase));
  await clearPageCache();
  try { localStorage.removeItem("wiki-ultimo-usuario"); } catch { /* sin almacenamiento */ }
}
