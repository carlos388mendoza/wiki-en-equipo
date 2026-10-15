import type { Page, Template, User } from "@prisma/client";
import { forbidden, notFound } from "../services/errors.js";

export type Actor = Pick<User, "id" | "role" | "departmentId">;
export type PageAccessRecord = Pick<Page, "id" | "ownerId" | "departmentId" | "visibility" | "isWall"> & {
  shares?: { userId: string; permission: string }[];
  departmentWall?: { id: string } | null;
};

export function canReadPage(page: PageAccessRecord, actor: Actor): boolean {
  if (actor.role === "ADMIN") return true;
  if (page.ownerId === actor.id || page.shares?.some((share) => share.userId === actor.id)) return true;
  if (page.isWall && actor.departmentId === page.departmentId) return true;
  if (page.visibility === "COMPANY") return true;
  if (page.visibility === "DEPARTMENT" && actor.departmentId === page.departmentId) return true;
  return false;
}

export function canEditPage(page: PageAccessRecord, actor: Actor): boolean {
  if (actor.role === "ADMIN") return true;
  if (page.ownerId === actor.id) return true;
  if (page.shares?.some((share) => share.userId === actor.id && share.permission === "EDIT")) return true;
  return Boolean(page.isWall && actor.role === "DEPARTMENT_ADMIN" && actor.departmentId === page.departmentId);
}

export function assertCanReadPage(page: PageAccessRecord, actor: Actor): void {
  if (!canReadPage(page, actor)) throw notFound("No se encontró la página.");
}

export function assertCanEditPage(page: PageAccessRecord, actor: Actor): void {
  if (!canEditPage(page, actor)) throw forbidden("Necesitas permiso de edición para cambiar esta página.");
}

export type TemplateAccessRecord = Pick<Template, "scope" | "ownerId" | "departmentId"> & { shares?: { userId: string; permission: string }[] };

/** Leer una plantilla (y usarla): ADMIN; empresa; su departamento; dueño; compartida con la persona. */
export function canReadTemplate(template: TemplateAccessRecord, actor: Actor): boolean {
  if (actor.role === "ADMIN" || template.scope === "COMPANY" || template.ownerId === actor.id) return true;
  if (template.scope === "DEPARTMENT" && template.departmentId === actor.departmentId) return true;
  return Boolean(template.shares?.some((share) => share.userId === actor.id));
}

/** Editar el contenido y compartirla (como las páginas): ADMIN, dueño o compartida con EDIT. */
export function canEditTemplate(template: TemplateAccessRecord, actor: Actor): boolean {
  if (actor.role === "ADMIN" || template.ownerId === actor.id) return true;
  return Boolean(template.shares?.some((share) => share.userId === actor.id && share.permission === "EDIT"));
}

/** Cambiar el alcance, marcarla como predeterminada o eliminarla: solo el dueño o un ADMIN. */
export function canManageTemplate(template: TemplateAccessRecord, actor: Actor): boolean {
  return actor.role === "ADMIN" || template.ownerId === actor.id;
}

export function canManageUsers(actor: Actor): boolean { return actor.role === "ADMIN"; }

export function canManageDepartment(actor: Actor, departmentId: string): boolean {
  return actor.role === "ADMIN" || (actor.role === "DEPARTMENT_ADMIN" && actor.departmentId === departmentId);
}
