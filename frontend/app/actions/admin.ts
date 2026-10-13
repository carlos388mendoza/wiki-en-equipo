"use server";

import { revalidatePath } from "next/cache";
import { backend } from "@/lib/api/client";
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
  if (input.password.length < 12) return { ok: false, message: "La contraseña temporal debe tener al menos 12 caracteres." };
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
    ? await backend<{ page: { id: string } }>(`/pages/from-template/${template.id}`, { method: "POST", body: { title } })
    : await backend<{ page: { id: string } }>("/pages", { method: "POST", body: { title, content: [], background: { type: "none", icon: target === "company" ? "🍽️" : "🏢" } } });
  if (!created.ok) return fail(created);
  const assigned = target === "company" ? await setCompanyWall(created.data.page.id) : await setDepartmentWall(target.departmentId, created.data.page.id);
  if (!assigned.ok) return assigned;
  return ok({ id: created.data.page.id });
}
