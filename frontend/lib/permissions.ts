import type { Department, Page, PageSummary, User } from "./types";

/**
 * Reglas de permisos del lado de la interfaz.
 * Sirven SOLO para mostrar u ocultar botones. La verificación real la hace
 * el backend; si estas reglas y las del backend difieren, manda el backend.
 */

type PageLike = Page | (PageSummary & { shares?: Page["shares"] });

export function shareFor(user: User, page: PageLike) {
  return page.shares?.find((s) => s.userId === user.id);
}

export function canView(user: User, page: PageLike): boolean {
  if (page.ownerId === user.id) return true;
  if (page.deletedAt) return false;
  if (shareFor(user, page)) return true;
  if (page.visibility === "empresa") return true;
  if (page.visibility === "departamento") {
    return user.role === "admin" || user.departmentId === page.departmentId;
  }
  return false;
}

export function canEdit(user: User, page: PageLike): boolean {
  if (page.deletedAt) return false;
  if (page.ownerId === user.id) return true;
  return shareFor(user, page)?.permission === "edicion";
}

export function canShare(user: User, page: PageLike): boolean {
  return page.ownerId === user.id && !page.deletedAt;
}

export function canPublishTo(user: User, page: PageLike, target: "departamento" | "empresa"): boolean {
  if (page.ownerId !== user.id) return false;
  return target === "departamento" ? true : user.role === "admin";
}

export function canEditWall(user: User, department: Department): boolean {
  if (user.role === "admin") return true;
  return user.role === "admin_departamento" && user.departmentId === department.id;
}

export function canEnterDepartment(user: User, department: Department): boolean {
  return user.role === "admin" || user.departmentId === department.id;
}

export const roleLabel: Record<User["role"], string> = {
  usuario: "Usuario",
  admin_departamento: "Admin. de departamento",
  admin: "Administrador",
};
