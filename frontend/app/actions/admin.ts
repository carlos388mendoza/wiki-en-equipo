"use server";

import { revalidatePath } from "next/cache";
import { backend } from "@/lib/api/client";
import { BRAND_ICON } from "@/lib/icons";
import type { UserRole } from "@/lib/types";
import type { ActionResult } from "./sharing";

const ok = <T,>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (res: { error: string; message: string }, forbidden?: string): ActionResult<never> => ({
  ok: false,
  message: res.error === "sin_acceso" && forbidden ? forbidden : res.message,
});

function refreshAll() {
  revalidatePath("/", "layout");
}

/* ---------- Muros y destacadas ---------- */

export async function setDepartmentWall(departmentId: string, pageId: string): Promise<ActionResult> {
  const res = await backend(`/departments/${encodeURIComponent(departmentId)}/wall`, { method: "PUT", body: { pageId } });
  if (!res.ok) return fail(res, "Solo el administrador del departamento puede cambiar su muro.");
  refreshAll();
  return ok(undefined);
}

export async function clearDepartmentWall(departmentId: string): Promise<ActionResult> {
  const res = await backend(`/departments/${encodeURIComponent(departmentId)}/wall`, { method: "DELETE" });
  if (!res.ok) return fail(res, "Solo el administrador del departamento puede cambiar su muro.");
  refreshAll();
  return ok(undefined);
}

export async function setFeaturedPages(departmentId: string, pageIds: string[]): Promise<ActionResult> {
  if (pageIds.length > 12) return { ok: false, message: "Puedes destacar hasta 12 páginas." };
  const res = await backend(`/departments/${encodeURIComponent(departmentId)}/featured`, { method: "PUT", body: { pageIds } });
  if (!res.ok) return fail(res, "Solo el administrador del departamento puede elegir las destacadas.");
  refreshAll();
  return ok(undefined);
}

/** Destacadas del inicio de la empresa: solo administradores y solo páginas publicadas a la empresa. */
export async function setCompanyFeaturedPages(pageIds: string[]): Promise<ActionResult> {
  if (pageIds.length > 12) return { ok: false, message: "Puedes destacar hasta 12 páginas." };
  const res = await backend("/company/featured", { method: "PUT", body: { pageIds } });
  if (!res.ok) return fail(res, "Solo un administrador puede elegir las destacadas de la empresa.");
  refreshAll();
  return ok(undefined);
}

export async function setCompanyWall(pageId: string): Promise<ActionResult> {
  const res = await backend("/company/wall", { method: "PUT", body: { pageId } });
  if (!res.ok) return fail(res, "Solo un administrador puede cambiar el muro de la empresa.");
  refreshAll();
  return ok(undefined);
}

export async function clearCompanyWall(): Promise<ActionResult> {
  const res = await backend("/company/wall", { method: "DELETE" });
  if (!res.ok) return fail(res, "Solo un administrador puede cambiar el muro de la empresa.");
  refreshAll();
  return ok(undefined);
}

/* ---------- Papelera e historial ---------- */

export async function trashPage(pageId: string): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}`, { method: "DELETE" });
  if (!res.ok) return fail(res, "Solo quien creó la página (o un administrador) puede enviarla a la papelera.");
  refreshAll();
  return ok(undefined);
}

export async function restorePage(pageId: string): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}/restore`, { method: "POST" });
  if (!res.ok) return fail(res, "Solo quien creó la página (o un administrador) puede restaurarla.");
  refreshAll();
  revalidatePath("/papelera");
  return ok(undefined);
}

/** Elimina para siempre una página de la papelera (con sus subpáginas propias y sus archivos). */
export async function deletePermanently(pageId: string): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}/permanent`, { method: "DELETE" });
  if (!res.ok) return fail(res, "Solo quien creó la página (o un administrador) puede eliminarla definitivamente.");
  revalidatePath("/papelera");
  return ok(undefined);
}

/** Vacía la papelera: elimina para siempre las páginas propias que están en ella. */
export async function emptyTrash(): Promise<ActionResult> {
  const res = await backend<{ deleted: number }>("/pages/trash", { method: "DELETE" });
  if (!res.ok) return fail(res);
  revalidatePath("/papelera");
  return ok(undefined);
}

export async function restoreVersion(pageId: string, version: number): Promise<ActionResult> {
  const res = await backend(`/pages/${encodeURIComponent(pageId)}/history/${version}/restore`, { method: "POST" });
  if (!res.ok) return fail(res, "Necesitas permiso de edición para restaurar una versión.");
  refreshAll();
  revalidatePath(`/paginas/${pageId}/historial`);
  return ok(undefined);
}

/* ---------- Usuarios y departamentos (solo administradores) ---------- */

export type UserForm = { name: string; email: string; password: string; role: UserRole; departmentId: string };

export async function createUser(input: UserForm): Promise<ActionResult> {
  if (input.password.length < 8) return { ok: false, message: "La contraseña temporal debe tener al menos 8 caracteres." };
  const res = await backend("/users", { method: "POST", body: { ...input, name: input.name.trim(), email: input.email.trim() } });
  if (!res.ok) {
    if (res.error === "conflicto") return { ok: false, message: "Ya existe una cuenta con ese correo." };
    return fail(res, "Solo un administrador puede crear usuarios.");
  }
  revalidatePath("/admin/usuarios");
  return ok(undefined);
}

export async function updateUser(userId: string, patch: { name?: string; role?: UserRole; departmentId?: string; active?: boolean }): Promise<ActionResult> {
  const res = await backend(`/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: patch });
  if (!res.ok) {
    if (res.error === "conflicto") return { ok: false, message: res.message || "Debe quedar al menos un administrador activo." };
    return fail(res, "No puedes quitarte tu propio acceso de administrador.");
  }
  revalidatePath("/admin/usuarios");
  return ok(undefined);
}

export async function createDepartment(name: string): Promise<ActionResult> {
  const res = await backend("/departments", { method: "POST", body: { name: name.trim() } });
  if (!res.ok) {
    if (res.error === "conflicto") return { ok: false, message: "Ya existe un departamento con ese nombre." };
    return fail(res, "Solo un administrador puede crear departamentos.");
  }
  revalidatePath("/admin/usuarios");
  refreshAll();
  return ok(undefined);
}

/** Crea la página del muro desde la plantilla de inicio de departamento (o en blanco) y la asigna. */
export async function createWallPage(target: { departmentId: string; name: string } | "company"): Promise<ActionResult<{ id: string }>> {
  const templates = await backend<{ templates: { id: string; title: string; isDefault: boolean }[] }>("/templates");
  const preferred = ["Página de inicio de departamento", "Inicio del departamento"];
  const template = templates.ok ? preferred.map((t) => templates.data.templates.find((x) => x.title === t)).find(Boolean) : undefined;
  const title = target === "company" ? "Lo que todo el grupo necesita saber" : `Inicio de ${target.name}`;
  const created = template
    ? await backend<{ page: { id: string; version: number } }>(`/pages/from-template/${template.id}`, { method: "POST", body: { title } })
    : await backend<{ page: { id: string; version: number } }>("/pages", { method: "POST", body: { title, content: [], icon: target === "company" ? BRAND_ICON : "🏢", background: { type: "none" } } });
  if (!created.ok) return fail(created);
  // El muro de la empresa lleva el logo de Grupo Comidas como icono.
  if (target === "company" && template) await backend(`/pages/${created.data.page.id}`, { method: "PATCH", body: { icon: BRAND_ICON, expectedVersion: created.data.page.version } });
  const assigned = target === "company" ? await setCompanyWall(created.data.page.id) : await setDepartmentWall(target.departmentId, created.data.page.id);
  if (!assigned.ok) return assigned;
  return ok({ id: created.data.page.id });
}

/** Descripción e icono del departamento (su administrador o un administrador general). */
export async function updateDepartmentInfo(departmentId: string, input: { description: string; icon: string | null }): Promise<ActionResult> {
  const res = await backend(`/departments/${encodeURIComponent(departmentId)}`, { method: "PATCH", body: { description: input.description.slice(0, 500), icon: input.icon } });
  if (!res.ok) return fail(res, "Solo el administrador del departamento puede cambiar su descripción.");
  refreshAll();
  return ok(undefined);
}
