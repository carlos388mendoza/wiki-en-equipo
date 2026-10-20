/**
 * Capa de datos de la interfaz (lecturas). Todas las pantallas piden datos solo
 * a través de estas funciones, que llaman a las rutas reales del backend y
 * devuelven formas ya procesadas (`lib/types.ts`).
 *
 * Las escrituras (crear, editar, compartir…) están en `app/actions/*` como
 * server actions, que también usan `backend()` de `./client`.
 */
import "server-only";
import { cache } from "react";
import type { MyPermission, PageDetail, PageListItem, TemplateDetail, TemplateListItem } from "@shared/types";
import { linkedPageIds, normalizeBlocks, parseAppearance, parseContent } from "../blocks";
import type {
  ApiResult, Department, HistoryEntry, ManagedUser, Page, PageSummary,
  PageVisibility, Share, SidebarSections, Template, TemplateSummary, User,
} from "../types";
import { backend } from "./client";

/* ---------- Formas crudas del backend (tipos de shared/) ---------- */

type RawListPage = Partial<PageListItem> & Pick<PageListItem, "id" | "title" | "visibility"> & { deletedAt?: string | null };
type RawPopular = PageListItem & { _count: { visits: number } };
interface RawDepartment {
  id: string; name: string; slug: string; description?: string; icon?: string | null;
  wallPage: { id: string } | null; _count?: { users: number; pages: number };
}
type RawShare = { userId: string; permission: Share["permission"]; user?: Share["user"] };

/* ---------- Conversión ---------- */

/** El icono vive en su propia columna; las páginas anteriores lo tenían dentro del fondo. */
function appearance(icon: string | null | undefined, backgroundJson: string | null | undefined) {
  const parsed = parseAppearance(backgroundJson ?? null);
  return { background: parsed.background, icon: parseAppearance({ icon }).icon ?? parsed.icon };
}

const toShare = (s: RawShare): Share => ({ userId: s.userId, permission: s.permission, user: s.user ?? null });

export function toSummary(p: RawListPage): PageSummary {
  return {
    id: p.id, title: p.title, visibility: p.visibility,
    ...(p.version !== undefined && { version: p.version }),
    ...(p.ownerId !== undefined && { ownerId: p.ownerId }),
    ...(p.departmentId !== undefined && { departmentId: p.departmentId }),
    ...(p.parentId !== undefined && { parentId: p.parentId }),
    ...(p.updatedAt !== undefined && { updatedAt: p.updatedAt }),
    ...(p.owner !== undefined && { owner: p.owner }),
    ...(p.myPermission !== undefined && { myPermission: p.myPermission }),
    ...(p.excerpt !== undefined && { excerpt: p.excerpt }),
    ...(p.deletedAt !== undefined && { deletedAt: p.deletedAt }),
    ...(p.archivedAt !== undefined && { archivedAt: p.archivedAt }),
    ...((p.isWall !== undefined || p.isCompanyWall !== undefined) && { isWall: Boolean(p.isWall || p.isCompanyWall) }),
    tags: p.tags?.map((t) => t.name) ?? [],
    ...appearance(p.icon, p.backgroundJson),
  };
}

export function toPage(raw: PageDetail & { deletedAt?: string | null }): Page {
  return {
    id: raw.id,
    title: raw.title,
    ...appearance(raw.icon, raw.backgroundJson),
    ownerId: raw.ownerId,
    owner: raw.owner ?? null,
    departmentId: raw.departmentId,
    parentId: raw.parentId,
    visibility: raw.visibility,
    tags: raw.tags?.map((t) => t.name) ?? [],
    blocks: parseContent(raw.contentJson),
    shares: (raw.shares ?? []).map(toShare),
    version: raw.version,
    isWall: raw.isWall,
    isCompanyWall: raw.isCompanyWall,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt ?? null,
    archivedAt: raw.archivedAt ?? null,
    children: (raw.children ?? []).map((c) => toSummary({ ...c, parentId: raw.id })),
    ancestors: (raw.ancestors ?? []).map((a) => ({ ...a, icon: parseAppearance({ icon: a.icon }).icon })),
    views: raw.visitCount ?? null,
  };
}

function toTemplateSummary(t: TemplateListItem): TemplateSummary {
  const { backgroundJson, icon, ...rest } = t;
  return { ...rest, owner: t.owner ?? null, ...appearance(icon, backgroundJson) };
}

const byUpdated = (a: PageSummary, b: PageSummary) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");

/* ---------- Consultas base (cacheadas por petición) ---------- */

/** Páginas que el usuario puede ver (máx. 100, ordenadas por actualización). */
const accessiblePages = cache(async (): Promise<ApiResult<PageSummary[]>> => {
  const res = await backend<{ pages: RawListPage[] }>("/pages");
  return res.ok ? { ok: true, data: res.data.pages.map(toSummary) } : res;
});

const popularPages = cache(async (departmentId?: string): Promise<PageSummary[]> => {
  const res = await backend<{ pages: RawPopular[] }>(`/pages/popular${departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ""}`);
  if (!res.ok) return [];
  return res.data.pages.filter((p) => p._count.visits > 0).map((p) => ({ ...toSummary(p), views: p._count.visits }));
});

const toDepartment = (d: RawDepartment): Department => ({
  id: d.id, name: d.name, slug: d.slug, description: d.description ?? "", icon: parseAppearance({ icon: d.icon }).icon,
  wallPageId: d.wallPage?.id ?? null, memberCount: d._count?.users, pageCount: d._count?.pages,
});

const departmentsList = cache(async (): Promise<ApiResult<Department[]>> => {
  const res = await backend<{ departments: RawDepartment[] }>("/departments");
  return res.ok ? { ok: true, data: res.data.departments.map(toDepartment) } : res;
});

/* ---------- Usuarios y departamentos ---------- */

export const listUsers = cache(async (includeInactive = false): Promise<ApiResult<ManagedUser[]>> => {
  const res = await backend<{ users: ManagedUser[] }>(`/users${includeInactive ? "?includeInactive=1" : ""}`);
  return res.ok ? { ok: true, data: res.data.users } : res;
});

/** Departamentos visibles: un administrador ve todos; el resto, solo el suyo. */
export async function listDepartments(): Promise<Department[]> {
  const res = await departmentsList();
  return res.ok ? res.data : [];
}

/* ---------- Páginas ---------- */

/** Una sola petición por página y render (la usan la pantalla y el título de la pestaña). */
const rawPage = cache((id: string) => backend<{ page: PageDetail }>(`/pages/${encodeURIComponent(id)}`));

/** Lee una página. No registra visitas: la vista de lectura las registra aparte (`recordVisit`). */
export async function getPage(_viewer: User, id: string): Promise<ApiResult<Page>> {
  const res = await rawPage(id);
  return res.ok ? { ok: true, data: toPage(res.data.page) } : res;
}

/** Título de la pestaña para una página (sin revelar nada si no hay acceso). */
export async function pageTitle(id: string): Promise<string> {
  const res = await rawPage(id);
  if (res.ok) return res.data.page.title;
  return res.error === "no_encontrada" ? "Página no encontrada" : res.error === "sin_acceso" ? "Sin acceso" : "Página";
}

/** Todas las páginas que el usuario puede ver (máx. 100). */
export async function listAccessible(_viewer: User): Promise<PageSummary[]> {
  const res = await accessiblePages();
  return res.ok ? res.data : [];
}

/** Una petición por conjunto de ids y render (el backend devuelve solo las que la persona puede ver). */
const pagesByIds = cache(async (key: string): Promise<PageSummary[]> => {
  const res = await backend<{ pages: RawListPage[] }>(`/pages?ids=${encodeURIComponent(key)}`);
  return res.ok ? res.data.pages.map(toSummary) : [];
});

/**
 * Resúmenes de páginas por id, en el mismo orden (subpáginas y menciones del contenido). Se piden por id
 * y no se buscan en el listado, que solo trae las 100 más recientes.
 */
export async function getPageSummaries(_viewer: User, ids: string[]): Promise<PageSummary[]> {
  const unique = [...new Set(ids)].slice(0, 100);
  if (!unique.length) return [];
  const map = new Map((await pagesByIds(unique.join(","))).map((p) => [p.id, p]));
  return unique.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
}

export async function getChildren(_viewer: User, parentId: string): Promise<PageSummary[]> {
  const res = await backend<{ pages: RawListPage[] }>(`/pages?parentId=${encodeURIComponent(parentId)}`);
  return res.ok ? res.data.pages.map(toSummary) : [];
}

const sharedWithMe = (permission: MyPermission | undefined) => permission === "EDIT" || permission === "READ";

/** Lo que aparece en la barra lateral, agrupado por sección. */
export async function getSidebar(viewer: User): Promise<SidebarSections> {
  const [res, pinned] = await Promise.all([accessiblePages(), backend<{ pages: RawListPage[] }>("/pages/pinned")]);
  const visible = res.ok ? res.data : [];
  const mine = (p: PageSummary) => p.ownerId === viewer.id;
  return {
    // Personales: cada persona ancla las suyas (en el orden en que las ancló).
    ancladas: pinned.ok ? pinned.data.pages.map(toSummary) : [],
    empresa: visible.filter((p) => p.visibility === "COMPANY"),
    departamento: visible.filter((p) => p.visibility === "DEPARTMENT" && p.departmentId === viewer.departmentId),
    // El backend indica si la página se compartió con la persona (también para administradores).
    compartidas: visible.filter((p) => sharedWithMe(p.myPermission) && !(p.visibility === "COMPANY" || (p.visibility === "DEPARTMENT" && p.departmentId === viewer.departmentId))),
    privadas: visible.filter((p) => mine(p) && p.visibility === "PRIVATE"),
  };
}

export async function getCompanyWall(viewer: User) {
  const [wallRes, featuredRes, popular, all] = await Promise.all([
    backend<{ page: PageDetail }>("/company/wall"),
    backend<{ pages: RawListPage[] }>("/company/featured"),
    popularPages(undefined),
    accessiblePages(),
  ]);
  const wall = wallRes.ok ? toPage(wallRes.data.page) : null;
  const publicPages = all.ok ? all.data.filter((p) => p.visibility === "COMPANY" && p.id !== wall?.id) : [];
  const chosen = featuredRes.ok ? featuredRes.data.pages.map(toSummary) : [];
  // Si un administrador aún no eligió destacadas, se usan las páginas enlazadas en el muro.
  const featured = chosen.length ? chosen : wall ? (await getPageSummaries(viewer, linkedPageIds(wall.blocks))).filter((p) => p.id !== wall.id).slice(0, 6) : [];
  return {
    wall,
    featured,
    featuredChosen: chosen,
    mostVisited: popular.filter((p) => p.visibility === "COMPANY" && p.id !== wall?.id).slice(0, 5),
    recent: [...publicPages].sort(byUpdated).slice(0, 6),
  };
}

export const getDepartment = cache(async (slug: string): Promise<ApiResult<Department>> => {
  const res = await backend<{ department: RawDepartment }>(`/departments/${encodeURIComponent(slug)}`);
  return res.ok ? { ok: true, data: toDepartment(res.data.department) } : res;
});

export async function getDepartmentWall(viewer: User, slug: string): Promise<ApiResult<{
  department: Department; wall: Page | null; featured: PageSummary[]; mostVisited: PageSummary[]; recent: PageSummary[];
}>> {
  // El backend distingue "no existe" (404) de "no es tu departamento" (403).
  const dep = await getDepartment(slug);
  if (!dep.ok) return dep;
  const department = dep.data;

  const [wallRes, featuredRes, popular, listRes] = await Promise.all([
    department.wallPageId ? getPage(viewer, department.wallPageId) : Promise.resolve(null),
    backend<{ pages: RawListPage[] }>(`/departments/${department.id}/featured`),
    popularPages(department.id),
    backend<{ pages: RawListPage[] }>(`/pages?departmentId=${encodeURIComponent(department.id)}`),
  ]);
  if (featuredRes.ok === false && featuredRes.error === "sin_acceso") return featuredRes;

  const published = listRes.ok
    ? listRes.data.pages.map(toSummary).filter((p) => p.visibility !== "PRIVATE" && p.id !== department.wallPageId)
    : [];
  return {
    ok: true,
    data: {
      department,
      wall: wallRes?.ok ? wallRes.data : null,
      featured: featuredRes.ok ? featuredRes.data.pages.map(toSummary) : [],
      mostVisited: popular.filter((p) => p.departmentId === department.id && p.id !== department.wallPageId).slice(0, 5),
      recent: published.sort(byUpdated).slice(0, 6),
    },
  };
}

/** Páginas publicadas de un departamento (para elegir destacadas o el muro). */
export async function listDepartmentPages(_viewer: User, departmentId: string): Promise<PageSummary[]> {
  const res = await backend<{ pages: RawListPage[] }>(`/pages?departmentId=${encodeURIComponent(departmentId)}`);
  return res.ok ? res.data.pages.map(toSummary).sort(byUpdated) : [];
}

/** Busca en el título y en el contenido; cada resultado trae un fragmento con lo encontrado. */
export async function searchPages(_viewer: User, query: string, tag?: string): Promise<ApiResult<PageSummary[]>> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim().slice(0, 100));
  if (tag) params.set("tag", tag.slice(0, 40));
  const res = await backend<{ pages: RawListPage[] }>(`/pages${params.size ? `?${params}` : ""}`);
  return res.ok ? { ok: true, data: res.data.pages.map(toSummary) } : res;
}

export async function listTags(_viewer: User): Promise<string[]> {
  const res = await accessiblePages();
  if (!res.ok) return [];
  return [...new Set(res.data.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b, "es"));
}

/** Páginas archivadas que la persona puede desarchivar (las suyas; un ADMIN, todas). */
export async function listArchived(_viewer: User): Promise<ApiResult<PageSummary[]>> {
  const res = await backend<{ pages: RawListPage[] }>("/pages?archived=1");
  if (!res.ok) return res;
  return { ok: true, data: res.data.pages.map(toSummary) };
}

export async function listTrash(_viewer: User): Promise<ApiResult<PageSummary[]>> {
  const res = await backend<{ pages: { id: string; title: string; icon: string | null; deletedAt: string; ownerId: string; visibility: PageVisibility }[] }>("/pages/trash");
  if (!res.ok) return res;
  return { ok: true, data: res.data.pages.map((p) => ({ id: p.id, title: p.title, visibility: p.visibility, ownerId: p.ownerId, deletedAt: p.deletedAt, tags: [], icon: parseAppearance({ icon: p.icon }).icon, background: null })) };
}

export async function getHistory(_viewer: User, pageId: string): Promise<ApiResult<HistoryEntry[]>> {
  const res = await backend<{ history: { id: string; version: number; createdAt: string; snapshotJson: string; changedBy: { id: string; name: string } | null }[] }>(`/pages/${encodeURIComponent(pageId)}/history`);
  if (!res.ok) return res;
  return {
    ok: true,
    data: res.data.history.map((h) => {
      let snap: Record<string, unknown> = {};
      try { snap = JSON.parse(h.snapshotJson); } catch { /* versión ilegible */ }
      const { background, icon } = appearance(typeof snap.icon === "string" ? snap.icon : null, typeof snap.backgroundJson === "string" ? snap.backgroundJson : null);
      return {
        id: h.id, version: h.version, createdAt: h.createdAt, changedBy: h.changedBy,
        snapshot: {
          title: typeof snap.title === "string" ? snap.title : "Sin título",
          visibility: (snap.visibility as PageVisibility) ?? "PRIVATE",
          tags: Array.isArray(snap.tags) ? snap.tags.filter((t): t is string => typeof t === "string") : [],
          blocks: parseContent(snap.contentJson),
          icon, background,
        },
      };
    }),
  };
}

/* ---------- Plantillas ---------- */

export async function listTemplates(_viewer: User): Promise<ApiResult<TemplateSummary[]>> {
  const res = await backend<{ templates: TemplateListItem[] }>("/templates");
  return res.ok ? { ok: true, data: res.data.templates.map(toTemplateSummary) } : res;
}

const rawTemplate = cache((id: string) => backend<{ template: TemplateDetail }>(`/templates/${encodeURIComponent(id)}`));

/** Título de la pestaña para una plantilla. */
export async function templateTitle(id: string): Promise<string> {
  const res = await rawTemplate(id);
  return res.ok ? res.data.template.title : res.error === "no_encontrada" ? "Plantilla no encontrada" : "Plantilla";
}

export async function getTemplate(_viewer: User, id: string): Promise<ApiResult<Template>> {
  const res = await rawTemplate(id);
  if (!res.ok) return res;
  const { contentJson, shares, ...rest } = res.data.template;
  return { ok: true, data: { ...toTemplateSummary(rest), blocks: normalizeBlocks(safeParse(contentJson)), shares: (shares ?? []).map(toShare) } };
}

function safeParse(text: string): unknown {
  try { return JSON.parse(text); } catch { return []; }
}
