/**
 * Capa de datos de la interfaz.
 * Hoy responde con datos de ejemplo. Para conectar con el backend, cambia el
 * cuerpo de cada función por una llamada a su ruta (fetch) y conserva la
 * misma firma: las pantallas no tienen que cambiar.
 */
import { canEnterDepartment, canView } from "../permissions";
import type { ApiResult, Department, Page, PageSummary, User } from "../types";
import { departments, pages, users } from "./mock-data";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function summarize(p: Page): PageSummary {
  const { id, title, emoji, background, ownerId, departmentId, parentId, visibility, tags, updatedAt, views, deletedAt } = p;
  return { id, title, emoji, background, ownerId, departmentId, parentId, visibility, tags, updatedAt, views, deletedAt };
}

const byUpdated = (a: PageSummary, b: PageSummary) => b.updatedAt.localeCompare(a.updatedAt);

export async function getUser(id: string): Promise<User | null> {
  return users.find((u) => u.id === id) ?? null;
}

export async function listUsers(): Promise<User[]> {
  return users;
}

export async function listDepartments(): Promise<Department[]> {
  return departments;
}

export async function getPage(viewer: User, id: string): Promise<ApiResult<Page>> {
  await delay();
  const page = pages.find((p) => p.id === id);
  if (!page) return { ok: false, error: "no_encontrada" };
  if (!canView(viewer, page)) return { ok: false, error: "sin_acceso" };
  return { ok: true, data: page };
}

export async function getPageSummaries(viewer: User, ids: string[]): Promise<PageSummary[]> {
  return pages.filter((p) => ids.includes(p.id) && canView(viewer, p) && !p.deletedAt).map(summarize);
}

export async function getChildren(viewer: User, parentId: string): Promise<PageSummary[]> {
  return pages.filter((p) => p.parentId === parentId && !p.deletedAt && canView(viewer, p)).map(summarize);
}

/** Lo que aparece en la barra lateral, agrupado por sección. */
export async function getSidebar(viewer: User) {
  const visible = pages.filter((p) => !p.deletedAt && canView(viewer, p));
  return {
    empresa: visible.filter((p) => p.visibility === "empresa").map(summarize),
    departamento: visible.filter((p) => p.visibility === "departamento" && p.departmentId === viewer.departmentId).map(summarize),
    compartidas: visible.filter((p) => p.ownerId !== viewer.id && p.shares.some((s) => s.userId === viewer.id)).map(summarize),
    privadas: visible.filter((p) => p.ownerId === viewer.id && p.visibility === "privada").map(summarize),
  };
}

export async function getCompanyWall(viewer: User) {
  await delay();
  const publicPages = pages.filter((p) => p.visibility === "empresa" && !p.deletedAt && canView(viewer, p));
  return {
    featured: publicPages.filter((p) => p.featuredInCompany).map(summarize),
    mostVisited: [...publicPages].sort((a, b) => b.views - a.views).slice(0, 5).map(summarize),
    recent: publicPages.map(summarize).sort(byUpdated).slice(0, 6),
  };
}

export async function getDepartmentWall(viewer: User, slug: string): Promise<ApiResult<{
  department: Department; featured: PageSummary[]; mostVisited: PageSummary[]; recent: PageSummary[];
}>> {
  await delay();
  const department = departments.find((d) => d.slug === slug);
  if (!department) return { ok: false, error: "no_encontrada" };
  if (!canEnterDepartment(viewer, department)) return { ok: false, error: "sin_acceso" };
  const deptPages = pages.filter((p) => p.departmentId === department.id && p.visibility === "departamento" && !p.deletedAt);
  return {
    ok: true,
    data: {
      department,
      featured: deptPages.filter((p) => department.featuredPageIds.includes(p.id)).map(summarize),
      mostVisited: [...deptPages].sort((a, b) => b.views - a.views).slice(0, 5).map(summarize),
      recent: deptPages.map(summarize).sort(byUpdated).slice(0, 6),
    },
  };
}

export async function searchPages(viewer: User, query: string, tag?: string) {
  await delay();
  const q = query.trim().toLowerCase();
  return pages
    .filter((p) => !p.deletedAt && canView(viewer, p))
    .filter((p) => !tag || p.tags.includes(tag))
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)))
    .map(summarize)
    .sort(byUpdated);
}

export async function listTags(viewer: User): Promise<string[]> {
  const set = new Set<string>();
  pages.filter((p) => !p.deletedAt && canView(viewer, p)).forEach((p) => p.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

export async function listTrash(viewer: User) {
  await delay();
  return pages.filter((p) => p.deletedAt && p.ownerId === viewer.id).map(summarize);
}
