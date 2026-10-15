import type { Department, Page, PageSummary, PageVisibility, User, UserRole } from "./types";

/**
 * Reglas de permisos del lado de la interfaz.
 * Sirven SOLO para mostrar u ocultar botones. La verificación real la hace
 * el backend (`backend/permissions/access.ts`); si difieren, manda el backend.
 */

type Viewer = Pick<User, "id" | "role" | "departmentId">;
type PageLike = Pick<Page, "ownerId" | "departmentId" | "visibility"> &
  Partial<Pick<Page, "shares" | "isWall" | "deletedAt">>;

export function shareFor(user: Viewer, page: PageLike) {
  return page.shares?.find((s) => s.userId === user.id);
}

export function canView(user: Viewer, page: PageLike): boolean {
  if (page.deletedAt) return false;
  if (user.role === "ADMIN") return true;
  if (page.ownerId === user.id || shareFor(user, page)) return true;
  if (page.isWall && user.departmentId === page.departmentId) return true;
  if (page.visibility === "COMPANY") return true;
  return page.visibility === "DEPARTMENT" && user.departmentId === page.departmentId;
}

export function canEdit(user: Viewer, page: PageLike): boolean {
  if (page.deletedAt) return false;
  if (user.role === "ADMIN" || page.ownerId === user.id) return true;
  if (shareFor(user, page)?.permission === "EDIT") return true;
  return Boolean(page.isWall && user.role === "DEPARTMENT_ADMIN" && user.departmentId === page.departmentId);
}

/** En el backend, quien puede editar también puede compartir. */
export function canShare(user: Viewer, page: PageLike): boolean {
  return canEdit(user, page);
}

export function canPublishTo(user: Viewer, page: PageLike, target: Exclude<PageVisibility, "PRIVATE">): boolean {
  if (!canEdit(user, page)) return false;
  return target === "DEPARTMENT" ? true : user.role === "ADMIN";
}

/** Enviar a la papelera y restaurar: solo quien la creó o un administrador. */
export function canDelete(user: Viewer, page: Pick<PageSummary, "ownerId">): boolean {
  return user.role === "ADMIN" || page.ownerId === user.id;
}

export function canEditWall(user: Viewer, department: Pick<Department, "id">): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "DEPARTMENT_ADMIN" && user.departmentId === department.id;
}

export function canManageUsers(user: Viewer): boolean {
  return user.role === "ADMIN";
}

export const roleLabel: Record<UserRole, string> = {
  USER: "Usuario",
  DEPARTMENT_ADMIN: "Admin. de departamento",
  ADMIN: "Administrador",
};

export const visibilityLabel: Record<PageVisibility, string> = {
  PRIVATE: "Privada",
  DEPARTMENT: "Departamento",
  COMPANY: "Toda la empresa",
};
