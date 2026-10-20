/**
 * Tipos del dominio en la interfaz.
 * Los enumerados y formas base vienen de `shared/` (los define el backend);
 * aquí solo se agregan las formas ya procesadas que usan las pantallas.
 */
import type {
  DirectoryUser,
  MyPermission,
  PageBlock,
  PagePermission,
  PageSummary as SharedPageSummary,
  PageVisibility,
  ShareLinkSummary,
  TemplateScope,
  UserRole,
  UserSummary,
} from "@shared/types";
import type { WikiBlock } from "./blocks";

export type { DirectoryUser, MyPermission, PageBlock, PagePermission, PageVisibility, ShareLinkSummary, TemplateScope, UserRole, UserSummary };

/** Usuario con sesión (respuesta de `GET /api/auth/me`). */
export interface User extends UserSummary {
  department: { name: string; slug: string } | null;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  wallPageId: string | null;
  memberCount?: number;
  pageCount?: number;
}

/** Persona con acceso a una página o plantilla. */
export interface Share {
  userId: string;
  permission: PagePermission;
  /** Nombre y departamento (sin correo). */
  user: { id: string; name: string; department: { name: string } | null } | null;
}

/** Fondo de una página o plantilla. */
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
  archivedAt: string | null;
  children: PageSummary[];
  /** Páginas superiores que la persona puede leer, de la raíz a la página padre. */
  ancestors: { id: string; title: string; icon: string | null }[];
  /** Visitas registradas (solo páginas públicas); `null` en las privadas. */
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
  owner?: { id: string; name: string } | null;
  /** Dueño o permiso compartido; `null` si se ve por estar publicada o por ser administrador. */
  myPermission?: MyPermission;
  views?: number;
  deletedAt?: string | null;
  /** Archivada: no sale en la barra lateral ni en los listados. */
  archivedAt?: string | null;
  /** Página de un muro (no se archiva ni se elimina desde la barra lateral). */
  isWall?: boolean;
  /** Solo en búsquedas: fragmento del contenido con la palabra encontrada. */
  excerpt?: string | null;
}

/** Secciones de la barra lateral. */
export type SidebarSections = { ancladas: PageSummary[]; empresa: PageSummary[]; departamento: PageSummary[]; compartidas: PageSummary[]; privadas: PageSummary[] };

export interface TemplateSummary {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  background: Background | null;
  scope: TemplateScope;
  isDefault: boolean;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  departmentId: string | null;
  updatedAt: string;
  myPermission: MyPermission;
  /** Puede cambiar el contenido y compartirla (dueño, administrador o compartida con edición). */
  canEdit: boolean;
  /** Puede cambiar el alcance y eliminarla (dueño o administrador). */
  canManage: boolean;
}

export interface Template extends TemplateSummary {
  blocks: WikiBlock[];
  shares: Share[];
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
