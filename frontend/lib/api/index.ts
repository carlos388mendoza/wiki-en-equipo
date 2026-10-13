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
import { linkedPageIds, normalizeBlocks, parseAppearance, parseContent } from "../blocks";
import type {
  ApiResult, Department, HistoryEntry, ManagedUser, Page, PagePermission, PageSummary,
  PageVisibility, SidebarSections, Template, TemplateScope, TemplateSummary, User,
} from "../types";
import { backend, failure } from "./client";

/* ---------- Formas crudas del backend ---------- */

interface RawListPage {
  id: string; title: string; visibility: PageVisibility; version: number; ownerId: string;
  departmentId: string; parentId: string | null; updatedAt: string; tags?: { name: string }[];
}
interface RawPage extends RawListPage {
  contentJson: string; backgroundJson: string | null; isWall: boolean; isCompanyWall: boolean;
  createdAt: string; deletedAt: string | null;
  shares?: { userId: string; permission: PagePermission }[];
  children?: { id: string; title: string; visibility: PageVisibility; updatedAt: string }[];
  owner?: { id: string; name: string } | null;
}
interface RawDepartment {
  id: string; name: string; slug: string; wallPage: { id: string } | null; _count?: { users: number; pages: number };
}
interface RawPopular { id: string; title: string; visibility: PageVisibility; departmentId: string; _count: { visits: number } }

/* ---------- Conversión ---------- */

function toSummary(p: Partial<RawListPage> & Pick<RawListPage, "id" | "title" | "visibility">): PageSummary {
  return {
    id: p.id, title: p.title, visibility: p.visibility,
    ...(p.version !== undefined && { version: p.version }),
    ...(p.ownerId !== undefined && { ownerId: p.ownerId }),
    ...(p.departmentId !== undefined && { departmentId: p.departmentId }),
    ...(p.parentId !== undefined && { parentId: p.parentId }),
    ...(p.updatedAt !== undefined && { updatedAt: p.updatedAt }),
    tags: p.tags?.map((t) => t.name) ?? [],
    // El listado del backend no incluye el fondo ni el icono (ver PENDIENTES_BACKEND.md).
    icon: null,
    background: null,
  };
}

export function toPage(raw: RawPage, views: number | null = null): Page {
  const { background, icon } = parseAppearance(raw.backgroundJson);
  return {
    id: raw.id,
    title: raw.title,
    icon,
    background,
    ownerId: raw.ownerId,
    owner: raw.owner ?? null,
    departmentId: raw.departmentId,
    parentId: raw.parentId,
    visibility: raw.visibility,
    tags: raw.tags?.map((t) => t.name) ?? [],
    blocks: parseContent(raw.contentJson),
    shares: raw.shares ?? [],
    version: raw.version,
    isWall: raw.isWall,
    isCompanyWall: raw.isCompanyWall,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
    children: (raw.children ?? []).map((c) => toSummary({ ...c, parentId: raw.id })),
    views,
  };
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

const departmentsList = cache(async (): Promise<ApiResult<Department[]>> => {
  const res = await backend<{ departments: RawDepartment[] }>("/departments");
  if (!res.ok) return res;
  return {
    ok: true,
    data: res.data.departments.map((d) => ({
      id: d.id, name: d.name, slug: d.slug, wallPageId: d.wallPage?.id ?? null,
      memberCount: d._count?.users, pageCount: d._count?.pages,
    })),
  };
});

/** Completa resúmenes parciales (destacadas, populares) con lo que trae el listado. */
async function enrich(pages: PageSummary[]): Promise<PageSummary[]> {
  const all = await accessiblePages();
  if (!all.ok) return pages;
  const map = new Map(all.data.map((p) => [p.id, p]));
  return pages.map((p) => ({ ...map.get(p.id), ...p, tags: p.tags.length ? p.tags : map.get(p.id)?.tags ?? [] }));
}

/* ---------- Usuarios y departamentos ---------- */

export const listUsers = cache(async (): Promise<ApiResult<ManagedUser[]>> => {
  const res = await backend<{ users: ManagedUser[] }>("/users");
  return res.ok ? { ok: true, data: res.data.users } : res;
});

/** Departamentos visibles: un administrador ve todos; el resto, solo el suyo. */
export async function listDepartments(): Promise<Department[]> {
  const res = await departmentsList();
  return res.ok ? res.data : [];
}

/* ---------- Páginas ---------- */

export async function getPage(viewer: User, id: string): Promise<ApiResult<Page>> {
  const res = await backend<{ page: RawPage }>(`/pages/${encodeURIComponent(id)}`);
  if (!res.ok) return res;
  const raw = res.data.page;
  let views: number | null = null;
  if (raw.visibility !== "PRIVATE") {
    const popular = await popularPages(viewer.role === "ADMIN" || raw.departmentId === viewer.departmentId ? raw.departmentId : undefined);
    views = popular.find((p) => p.id === raw.id)?.views ?? null;
  }
  return { ok: true, data: toPage(raw, views) };
}

/** Todas las páginas que el usuario puede ver (máx. 100). */
export async function listAccessible(_viewer: User): Promise<PageSummary[]> {
  const res = await accessiblePages();
  return res.ok ? res.data : [];
}

/** Resúmenes de páginas por id, sin abrirlas (abrir una página registra una visita). */
export async function getPageSummaries(_viewer: User, ids: string[]): Promise<PageSummary[]> {
  const all = await accessiblePages();
  if (!all.ok) return [];
  const map = new Map(all.data.map((p) => [p.id, p]));
  return ids.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
}

export async function getChildren(_viewer: User, parentId: string): Promise<PageSummary[]> {
  const res = await backend<{ pages: RawListPage[] }>(`/pages?parentId=${encodeURIComponent(parentId)}`);
  return res.ok ? res.data.pages.map(toSummary) : [];
}

/** Ruta de páginas superiores (de la raíz hacia la página), usando el listado. */
export async function getAncestors(_viewer: User, page: { parentId: string | null }): Promise<PageSummary[]> {
  const all = await accessiblePages();
  if (!all.ok || !page.parentId) return [];
  const map = new Map(all.data.map((p) => [p.id, p]));
  const chain: PageSummary[] = [];
  let current = page.parentId ? map.get(page.parentId) : undefined;
  while (current && chain.length < 8 && !chain.some((c) => c.id === current!.id)) {
    chain.unshift(current);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return chain;
}

/** Lo que aparece en la barra lateral, agrupado por sección. */
export async function getSidebar(viewer: User): Promise<SidebarSections> {
  const res = await accessiblePages();
  const visible = res.ok ? res.data : [];
  const mine = (p: PageSummary) => p.ownerId === viewer.id;
  return {
    empresa: visible.filter((p) => p.visibility === "COMPANY"),
    departamento: visible.filter((p) => p.visibility === "DEPARTMENT" && p.departmentId === viewer.departmentId),
    // Sin campo de "compartida" en el listado: para quien no es administrador, una página
    // privada ajena o de otro departamento solo puede verse porque se la compartieron.
    compartidas: viewer.role === "ADMIN" ? [] : visible.filter((p) => !mine(p) && (p.visibility === "PRIVATE" || (p.visibility === "DEPARTMENT" && p.departmentId !== viewer.departmentId))),
    privadas: visible.filter((p) => mine(p) && p.visibility === "PRIVATE"),
  };
}

export async function getCompanyWall(viewer: User) {
  const [wallRes, popular, all] = await Promise.all([
    backend<{ page: RawPage }>("/company/wall"),
    popularPages(undefined),
    accessiblePages(),
  ]);
  const wall = wallRes.ok ? toPage(wallRes.data.page) : null;
  const publicPages = all.ok ? all.data.filter((p) => p.visibility === "COMPANY" && p.id !== wall?.id) : [];
  const linked = wall ? await getPageSummaries(viewer, linkedPageIds(wall.blocks)) : [];
  return {
    wall,
    featured: linked.filter((p) => p.id !== wall?.id).slice(0, 6),
    mostVisited: await enrich(popular.filter((p) => p.visibility === "COMPANY" && p.id !== wall?.id).slice(0, 5)),
    recent: [...publicPages].sort(byUpdated).slice(0, 6),
  };
}

export async function getDepartmentWall(viewer: User, slug: string): Promise<ApiResult<{
  department: Department; wall: Page | null; featured: PageSummary[]; mostVisited: PageSummary[]; recent: PageSummary[];
}>> {
  const deps = await departmentsList();
  if (!deps.ok) return deps;
  const department = deps.data.find((d) => d.slug === slug);
  // Quien no es administrador solo recibe su propio departamento: cualquier otro es "sin acceso".
  if (!department) return failure(viewer.role === "ADMIN" ? "no_encontrada" : "sin_acceso", "Este muro es solo para los miembros del departamento.");

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
      featured: featuredRes.ok ? await enrich(featuredRes.data.pages.map(toSummary)) : [],
      mostVisited: await enrich(popular.filter((p) => p.departmentId === department.id && p.id !== department.wallPageId).slice(0, 5)),
      recent: published.sort(byUpdated).slice(0, 6),
    },
  };
}

/** Páginas publicadas de un departamento (para elegir destacadas o el muro). */
export async function listDepartmentPages(_viewer: User, departmentId: string): Promise<PageSummary[]> {
  const res = await backend<{ pages: RawListPage[] }>(`/pages?departmentId=${encodeURIComponent(departmentId)}`);
  return res.ok ? res.data.pages.map(toSummary).sort(byUpdated) : [];
}

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

export async function listTrash(_viewer: User): Promise<ApiResult<PageSummary[]>> {
  const res = await backend<{ pages: { id: string; title: string; deletedAt: string; ownerId: string }[] }>("/pages/trash");
  if (!res.ok) return res;
  return { ok: true, data: res.data.pages.map((p) => ({ id: p.id, title: p.title, visibility: "PRIVATE", ownerId: p.ownerId, deletedAt: p.deletedAt, tags: [], icon: null, background: null })) };
}

export async function getHistory(_viewer: User, pageId: string): Promise<ApiResult<HistoryEntry[]>> {
  const res = await backend<{ history: { id: string; version: number; createdAt: string; snapshotJson: string; changedBy: { id: string; name: string } | null }[] }>(`/pages/${encodeURIComponent(pageId)}/history`);
  if (!res.ok) return res;
  return {
    ok: true,
    data: res.data.history.map((h) => {
      let snap: Record<string, unknown> = {};
      try { snap = JSON.parse(h.snapshotJson); } catch { /* versión ilegible */ }
      const { background, icon } = parseAppearance(snap.backgroundJson);
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
  const res = await backend<{ templates: (TemplateSummary & { scope: TemplateScope })[] }>("/templates");
  return res.ok ? { ok: true, data: res.data.templates } : res;
}

export async function getTemplate(_viewer: User, id: string): Promise<ApiResult<Template>> {
  const res = await backend<{ template: TemplateSummary & { contentJson: string; backgroundJson: string | null } }>(`/templates/${encodeURIComponent(id)}`);
  if (!res.ok) return res;
  const { contentJson, backgroundJson, ...rest } = res.data.template;
  return { ok: true, data: { ...rest, ...parseAppearance(backgroundJson), blocks: normalizeBlocks(safeParse(contentJson)) } };
}

function safeParse(text: string): unknown {
  try { return JSON.parse(text); } catch { return []; }
}
