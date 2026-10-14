"use server";

import { revalidatePath } from "next/cache";
import { backend } from "@/lib/api/client";
import { parseAppearance, parseContent, toStoredAppearance } from "@/lib/blocks";
import type { PageState } from "@/lib/editor/merge";
import type { ActionResult } from "./sharing";

type RawPage = { version: number; title: string; icon: string | null; contentJson: string; backgroundJson: string | null; tags?: { name: string }[] };

function toState(raw: RawPage): PageState {
  const { background, icon } = parseAppearance(raw.backgroundJson);
  return { title: raw.title, icon: parseAppearance({ icon: raw.icon }).icon ?? icon, background, blocks: parseContent(raw.contentJson), tags: raw.tags?.map((t) => t.name) ?? [] };
}

/** Estado actual de una página en el servidor (para combinar cambios). */
export async function loadPageState(pageId: string): Promise<ActionResult<{ version: number; state: PageState }>> {
  const res = await backend<{ page: RawPage }>(`/pages/${encodeURIComponent(pageId)}`);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, data: { version: res.data.page.version, state: toState(res.data.page) } };
}

/**
 * Sube cambios hechos sin conexión con `POST /api/sync/pages/:id`.
 * `operationId` evita aplicar dos veces la misma operación si se reintenta.
 * Si la página cambió, devuelve la versión del servidor para combinar.
 */
export async function syncOffline(pageId: string, state: PageState, baseVersion: number, operationId: string): Promise<
  | { ok: true; version: number }
  | { ok: false; conflict: true; version: number; state: PageState }
  | { ok: false; conflict?: false; message: string }
> {
  const res = await backend<{ status: string; page: { version: number } }>(`/sync/pages/${encodeURIComponent(pageId)}`, {
    method: "POST",
    body: { operationId, baseVersion, title: state.title.trim() || "Página sin título", content: state.blocks, background: toStoredAppearance(state.background), icon: state.icon },
  });
  if (!res.ok) {
    if (res.error === "conflicto") {
      const details = res.details as { currentVersion: number; current: { title: string; icon?: string | null; content: unknown; background: unknown } } | undefined;
      if (details?.current) {
        const { background, icon } = parseAppearance(details.current.background);
        // El endpoint de sincronización no devuelve etiquetas: se conservan las tuyas.
        return { ok: false, conflict: true, version: details.currentVersion, state: { title: details.current.title, blocks: parseContent(details.current.content), background, icon: parseAppearance({ icon: details.current.icon }).icon ?? icon, tags: state.tags } };
      }
    }
    return { ok: false, message: res.message };
  }
  // El endpoint de sincronización no guarda etiquetas: se actualizan aparte.
  const tagged = await backend<{ page: { version: number } }>(`/pages/${encodeURIComponent(pageId)}`, { method: "PATCH", body: { tags: state.tags, expectedVersion: res.data.page.version } });
  revalidatePath(`/paginas/${pageId}`);
  return { ok: true, version: tagged.ok ? tagged.data.page.version : res.data.page.version };
}
