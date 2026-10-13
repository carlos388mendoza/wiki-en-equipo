"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backend } from "@/lib/api/client";
import type { PagePermission, PageVisibility } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string; conflict?: boolean };

const fail = (res: { error: string; message: string }): ActionResult<never> => ({
  ok: false,
  message: res.error === "sin_acceso" ? "No tienes permiso para compartir esta página." : res.message,
  ...(res.error === "conflicto" && { conflict: true }),
});

function refresh(pageId: string) {
  revalidatePath(`/paginas/${pageId}`);
  revalidatePath("/", "layout");
}

export async function sharePage(pageId: string, userId: string, permission: PagePermission): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}/shares/${encodeURIComponent(userId)}`, { method: "PUT", body: { permission } });
  if (!res.ok) return fail(res);
  refresh(pageId);
  return { ok: true, data: undefined };
}

export async function revokeShare(pageId: string, userId: string): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}/shares/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!res.ok) return fail(res);
  refresh(pageId);
  return { ok: true, data: undefined };
}

export type ShareLink = { id: string; url: string; permission: PagePermission; expiresAt: string | null };

export async function createShareLink(pageId: string, permission: PagePermission, expiresInHours?: number): Promise<ActionResult<ShareLink>> {
  const res = await backend<{ id: string; token: string; permission: PagePermission; expiresAt: string | null }>(
    `/pages/${encodeURIComponent(pageId)}/share-links`,
    { method: "POST", body: { permission, ...(expiresInHours && { expiresInHours }) } },
  );
  if (!res.ok) return fail(res);
  // La URL se arma con el origen real de la petición (el backend usa FRONTEND_ORIGIN, que puede no estar configurado).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { ok: true, data: { id: res.data.id, permission: res.data.permission, expiresAt: res.data.expiresAt, url: `${proto}://${host}/share/${res.data.token}` } };
}

export async function revokeShareLink(pageId: string, linkId: string): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}/share-links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
  if (!res.ok) return fail(res);
  return { ok: true, data: undefined };
}

export async function setVisibility(pageId: string, visibility: PageVisibility, expectedVersion: number): Promise<ActionResult<{ version: number }>> {
  const res = await backend<{ page: { version: number } }>(`/pages/${encodeURIComponent(pageId)}`, { method: "PATCH", body: { visibility, expectedVersion } });
  if (!res.ok) {
    if (res.error === "conflicto") return { ok: false, conflict: true, message: "La página cambió mientras la veías. Recarga e intenta de nuevo." };
    if (res.error === "sin_acceso") return { ok: false, message: visibility === "COMPANY" ? "Solo un administrador puede publicar para toda la empresa." : "No tienes permiso para cambiar quién ve esta página." };
    return fail(res);
  }
  refresh(pageId);
  return { ok: true, data: { version: res.data.page.version } };
}

/** Acepta un enlace compartido y abre la página. */
export async function acceptShareLink(token: string): Promise<ActionResult> {
  const res = await backend<{ pageId: string }>(`/share/${encodeURIComponent(token)}/accept`, { method: "POST" });
  if (!res.ok) {
    return { ok: false, message: res.error === "no_encontrada" ? "El enlace no existe, venció o fue revocado. Pide uno nuevo a quien te lo envió." : res.message };
  }
  revalidatePath("/", "layout");
  redirect(`/paginas/${res.data.pageId}`);
}
