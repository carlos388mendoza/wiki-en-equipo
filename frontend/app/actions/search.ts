"use server";

import { searchPages } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export type PaletteResult = { id: string; title: string; icon: string | null; excerpt?: string | null; tag?: boolean; tags: string[] };

/**
 * Búsqueda de la ventana Ctrl/⌘ + K (#67): por título y contenido, o por etiqueta si empieza con "#". La hace el
 * backend con la sesión de quien busca, así solo salen las páginas que esa persona puede ver.
 */
export async function searchForPalette(query: string): Promise<PaletteResult[]> {
  const text = query.trim().slice(0, 100);
  if (text.length < 2) return [];
  const viewer = await getCurrentUser();
  if (!viewer) return [];
  const tag = text.startsWith("#") ? text.slice(1).trim().toLowerCase() : "";
  const res = tag ? await searchPages(viewer, "", tag) : await searchPages(viewer, text);
  if (!res.ok) return [];
  return res.data.slice(0, 8).map((p) => ({
    id: p.id, title: p.title, icon: p.icon, tags: p.tags,
    ...(tag ? { tag: true } : { excerpt: p.excerpt }),
  }));
}
