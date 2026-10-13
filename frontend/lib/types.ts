/**
 * Tipos del dominio.
 * IMPORTANTE: cuando conectes con el backend, reemplaza este archivo por los
 * tipos de `shared/` de tu compañero (o reexpórtalos desde aquí) para que
 * ambos lados usen exactamente la misma forma de datos.
 */

export type Role = "usuario" | "admin_departamento" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  featuredPageIds: string[];
}

export type Visibility = "privada" | "departamento" | "empresa";
export type Permission = "lectura" | "edicion";

export interface Share {
  userId: string;
  permission: Permission;
}

export type Background =
  | { type: "color"; value: string }
  | { type: "gradiente"; from: string; to: string; angle?: number }
  | { type: "imagen"; url: string; credit?: string }
  | { type: "patron"; emoji: string; color: string };

/** Fragmento de texto con formato. */
export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  /** Enlace externo (se muestra con icono). */
  href?: string;
  /** Enlace a otra página de la wiki. */
  pageId?: string;
}

export type Block =
  | { id: string; type: "parrafo"; content: TextSpan[] }
  | { id: string; type: "titulo"; level: 1 | 2 | 3; content: TextSpan[] }
  | { id: string; type: "lista"; ordered: boolean; items: TextSpan[][] }
  | { id: string; type: "cita"; content: TextSpan[] }
  | { id: string; type: "aviso"; emoji: string; content: TextSpan[] }
  | { id: string; type: "imagen"; url: string; alt: string; width: number; height: number; caption?: string }
  | { id: string; type: "video"; url: string; caption?: string }
  | { id: string; type: "tabla"; header: string[]; rows: string[][] }
  | { id: string; type: "subpagina"; pageId: string }
  | { id: string; type: "separador" };

export interface Page {
  id: string;
  title: string;
  emoji: string;
  background: Background | null;
  ownerId: string;
  departmentId: string;
  parentId: string | null;
  visibility: Visibility;
  tags: string[];
  blocks: Block[];
  shares: Share[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Solo se registra en páginas públicas (departamento o empresa). */
  views: number;
  featuredInCompany: boolean;
}

/** Resumen ligero para listas, tarjetas y la barra lateral. */
export type PageSummary = Pick<
  Page,
  "id" | "title" | "emoji" | "background" | "ownerId" | "departmentId" | "parentId" | "visibility" | "tags" | "updatedAt" | "views" | "deletedAt"
>;

/** Resultado de la API: o datos, o un error con un código que la interfaz sabe mostrar. */
export type ApiError = "no_autenticado" | "sin_acceso" | "no_encontrada" | "error_servidor";
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
