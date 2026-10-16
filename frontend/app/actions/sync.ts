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
    body: { operationId, baseVersion, title: state.title.trim() || "Página sin título", content: state.blocks, background: toStoredAppearance(state.background), icon: state.icon, tags: state.tags.slice(0, 30).map((t) => t.slice(0, 40)) },
  });
  if (!res.ok) {
    if (res.error === "conflicto") {
      const details = res.details as { currentVersion: number; current: { title: string; icon?: string | null; content: unknown; background: unknown; tags?: string[] } } | undefined;
      if (details?.current) {
        const { background, icon } = parseAppearance(details.current.background);
        return { ok: false, conflict: true, version: details.currentVersion, state: { title: details.current.title, blocks: parseContent(details.current.content), background, icon: parseAppearance({ icon: details.current.icon }).icon ?? icon, tags: details.current.tags ?? state.tags } };
      }
    }
    return { ok: false, message: res.message };
  }
  // Contenido y etiquetas se guardan en la misma operación: si falla, no se guarda nada a medias.
  revalidatePath(`/paginas/${pageId}`);
  return { ok: true, version: res.data.page.version };
}
