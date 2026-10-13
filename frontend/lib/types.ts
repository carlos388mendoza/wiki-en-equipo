/**
 * Tipos del dominio en la interfaz.
 * Los enumerados y formas base vienen de `shared/` (los define el backend);
 * aquí solo se agregan las formas ya procesadas que usan las pantallas.
 */
import type {
  PageBlock,
  PagePermission,
  PageSummary as SharedPageSummary,
  PageVisibility,
  TemplateScope,
  UserRole,
  UserSummary,
} from "@shared/types";
import type { WikiBlock } from "./blocks";

export type { PageBlock, PagePermission, PageVisibility, TemplateScope, UserRole, UserSummary };

/** Usuario con sesión (respuesta de `GET /api/auth/me`). */
export interface User extends UserSummary {
  department: { name: string; slug: string } | null;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  wallPageId: string | null;
  memberCount?: number;
  pageCount?: number;
}

export interface Share {
  userId: string;
  permission: PagePermission;
}

/** Fondo de una página o plantilla. Se guarda en `background` junto con el icono. */
export type Background =
  | { type: "color"; value: string }
  | { type: "gradient"; value: string }
  | { type: "image"; url: string; credit?: string; creditUrl?: string }
  | { type: "pattern"; emoji: string; color: string }
  /** Patrón de figuras geométricas: `ink` es el color de las figuras. */
  | { type: "shapes"; shape: ShapePattern; color: string; ink: string };

export type ShapePattern = "puntos" | "rayas" | "cuadricula" | "zigzag" | "circulos";

export interface Page {
  id: string;
  title: string;
  icon: string | null;
  background: Background | null;
  ownerId: string;
  owner: { id: string; name: string } | null;
  departmentId: string;
  parentId: string | null;
  visibility: PageVisibility;
  tags: string[];
  blocks: WikiBlock[];
  shares: Share[];
  version: number;
  isWall: boolean;
  isCompanyWall: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  children: PageSummary[];
  /** Visitas registradas (solo páginas públicas); `null` si el backend no las informa. */
  views: number | null;
}

/**
 * Resumen ligero para listas, tarjetas y la barra lateral.
 * Extiende el `PageSummary` de `shared/`; algunas rutas devuelven menos campos,
 * por eso varios son opcionales.
 */
export interface PageSummary extends Pick<SharedPageSummary, "id" | "title" | "visibility">,
  Partial<Omit<SharedPageSummary, "id" | "title" | "visibility">> {
  icon: string | null;
  background: Background | null;
  tags: string[];
  views?: number;
  deletedAt?: string | null;
}

/** Secciones de la barra lateral. */
export type SidebarSections = { empresa: PageSummary[]; departamento: PageSummary[]; compartidas: PageSummary[]; privadas: PageSummary[] };

export interface TemplateSummary {
  id: string;
  title: string;
  description: string;
  scope: TemplateScope;
  isDefault: boolean;
  ownerId: string | null;
  departmentId: string | null;
  updatedAt: string;
}

export interface Template extends TemplateSummary {
  icon: string | null;
  background: Background | null;
  blocks: WikiBlock[];
}

export interface HistoryEntry {
  id: string;
  version: number;
  createdAt: string;
  changedBy: { id: string; name: string } | null;
  snapshot: { title: string; visibility: PageVisibility; tags: string[]; blocks: WikiBlock[]; icon: string | null; background: Background | null };
}

export interface ManagedUser extends UserSummary {
  active?: boolean;
  department?: { name: string; slug: string } | null;
}

/** Errores que la interfaz sabe mostrar. */
export type ApiError =
  | "no_autenticado"
  | "sin_acceso"
  | "no_encontrada"
  | "conflicto"
  | "datos_invalidos"
  | "archivo_rechazado"
  | "demasiados_intentos"
  | "error_servidor";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; message: string; details?: unknown };
