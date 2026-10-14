"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backend } from "@/lib/api/client";
import type { DirectoryUser, PagePermission, PageVisibility, ShareLinkSummary } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string; conflict?: boolean };

/** Qué se comparte: una página o una plantilla (las dos se comparten igual). */
export type ShareTarget = { kind: "page" | "template"; id: string };

const path = (target: ShareTarget) => `/${target.kind === "page" ? "pages" : "templates"}/${encodeURIComponent(target.id)}`;
const noun = (target: ShareTarget) => (target.kind === "page" ? "esta página" : "esta plantilla");

const fail = (target: ShareTarget, res: { error: string; message: string }): ActionResult<never> => ({
  ok: false,
  message: res.error === "sin_acceso" ? `No tienes permiso para compartir ${noun(target)}.` : res.message,
  ...(res.error === "conflicto" && { conflict: true }),
});

function refresh(target: ShareTarget) {
  revalidatePath(target.kind === "page" ? `/paginas/${target.id}` : "/plantillas");
  revalidatePath("/", "layout");
}

/** Busca personas para invitar: cualquier usuario puede hacerlo (solo nombre y departamento). */
export async function searchPeople(query: string): Promise<ActionResult<DirectoryUser[]>> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return { ok: true, data: [] };
  const res = await backend<{ users: DirectoryUser[] }>(`/users/directory?q=${encodeURIComponent(q)}&limit=8`);
  if (!res.ok) return { ok: false, message: res.error === "demasiados_intentos" ? "Demasiadas búsquedas seguidas. Espera un momento." : res.message };
  return { ok: true, data: res.data.users };
}

export async function shareWith(target: ShareTarget, userId: string, permission: PagePermission): Promise<ActionResult> {
  const res = await backend(`${path(target)}/shares/${encodeURIComponent(userId)}`, { method: "PUT", body: { permission } });
  if (!res.ok) return fail(target, res);
  refresh(target);
  return { ok: true, data: undefined };
}

export async function revokeShare(target: ShareTarget, userId: string): Promise<ActionResult> {
  const res = await backend(`${path(target)}/shares/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!res.ok) return fail(target, res);
  refresh(target);
  return { ok: true, data: undefined };
}

export type ShareLink = ShareLinkSummary & { url: string };

export async function createShareLink(target: ShareTarget, permission: PagePermission, expiresInHours?: number): Promise<ActionResult<ShareLink>> {
  const res = await backend<{ id: string; token: string; permission: PagePermission; expiresAt: string | null }>(
    `${path(target)}/share-links`,
    { method: "POST", body: { permission, ...(expiresInHours && { expiresInHours }) } },
  );
  if (!res.ok) return fail(target, res);
  // La URL se arma con el origen real de la petición (el backend usa FRONTEND_ORIGIN, que puede no estar configurado).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    ok: true,
    data: { id: res.data.id, permission: res.data.permission, expiresAt: res.data.expiresAt, createdAt: new Date().toISOString(), createdBy: null, url: `${proto}://${host}/share/${res.data.token}` },
  };
}

/** Enlaces activos (sin el token: solo se ve al crearlo). */
export async function listShareLinks(target: ShareTarget): Promise<ActionResult<ShareLinkSummary[]>> {
  const res = await backend<{ links: ShareLinkSummary[] }>(`${path(target)}/share-links`);
  return res.ok ? { ok: true, data: res.data.links } : fail(target, res);
}

export async function revokeShareLink(target: ShareTarget, linkId: string): Promise<ActionResult> {
  const res = await backend(`${path(target)}/share-links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
  if (!res.ok) return fail(target, res);
  return { ok: true, data: undefined };
}

export async function setVisibility(pageId: string, visibility: PageVisibility, expectedVersion: number): Promise<ActionResult<{ version: number }>> {
  const target: ShareTarget = { kind: "page", id: pageId };
  const res = await backend<{ page: { version: number } }>(`/pages/${encodeURIComponent(pageId)}`, { method: "PATCH", body: { visibility, expectedVersion } });
  if (!res.ok) {
    if (res.error === "conflicto") return { ok: false, conflict: true, message: "La página cambió mientras la veías. Recarga e intenta de nuevo." };
    if (res.error === "sin_acceso") return { ok: false, message: visibility === "COMPANY" ? "Solo un administrador puede publicar para toda la empresa." : "No tienes permiso para cambiar quién ve esta página." };
    return fail(target, res);
  }
  refresh(target);
  return { ok: true, data: { version: res.data.page.version } };
}

/** Acepta un enlace compartido (de página o de plantilla) y abre lo compartido. */
export async function acceptShareLink(token: string): Promise<ActionResult> {
  const res = await backend<{ type?: "page" | "template"; pageId?: string; templateId?: string }>(`/share/${encodeURIComponent(token)}/accept`, { method: "POST" });
  if (!res.ok) {
    return { ok: false, message: res.error === "no_encontrada" ? "El enlace no existe, venció o fue revocado. Pide uno nuevo a quien te lo envió." : res.message };
  }
  revalidatePath("/", "layout");
  if (res.data.type === "template" && res.data.templateId) redirect(`/plantillas?plantilla=${encodeURIComponent(res.data.templateId)}`);
  redirect(`/paginas/${res.data.pageId}`);
}

/** Registra una visita al ver la página (el backend solo cuenta las públicas, una vez cada 30 min por persona). */
export async function recordVisit(pageId: string): Promise<number | null> {
  const res = await backend<{ counted: boolean; visits: number | null }>(`/pages/${encodeURIComponent(pageId)}/visit`, { method: "POST" });
  return res.ok ? res.data.visits : null;
}
