export type UserRole = "USER" | "DEPARTMENT_ADMIN" | "ADMIN";
export type PageVisibility = "PRIVATE" | "DEPARTMENT" | "COMPANY";
export type PagePermission = "READ" | "EDIT";
export type TemplateScope = "PRIVATE" | "DEPARTMENT" | "COMPANY";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  /** Solo en `GET /api/users?includeInactive=1` (administradores). */
  active?: boolean;
}

/** Persona del directorio para invitar (`GET /api/users/directory?q=`): sin correo ni rol. */
export interface DirectoryUser {
  id: string;
  name: string;
  departmentId: string;
  department: { name: string };
}

export interface PageBlock {
  id: string;
  type: "paragraph" | "heading" | "image" | "video" | "link" | "table" | "file" | "callout";
  data: Record<string, unknown>;
}

export interface PageSummary {
  id: string;
  title: string;
  visibility: PageVisibility;
  version: number;
  ownerId: string;
  departmentId: string;
  parentId: string | null;
  updatedAt: string;
}

/** Relación directa con una página: dueño o permiso compartido. `null` si se ve por estar publicada o por ser administrador. */
export type MyPermission = "OWNER" | PagePermission | null;

/** Página en listados: `GET /api/pages`, destacadas (departamento y empresa) y más visitadas. */
export interface PageListItem extends PageSummary {
  /** Emoji, `lucide:<nombre>:<tono>` o `3d:<nombre>` (hasta 48 caracteres). */
  icon: string | null;
  /** Fondo como texto JSON, igual que en `GET /api/pages/:id`. */
  backgroundJson: string | null;
  owner: { id: string; name: string };
  tags: { name: string }[];
  myPermission: MyPermission;
}

/**
 * Respuesta de `POST /api/pages/:id/visit` (solo la vista de lectura la llama). Cuenta una vez cada
 * 30 minutos por persona y solo en páginas publicadas; en las privadas `visits` es `null`.
 */
export interface VisitResult {
  counted: boolean;
  visits: number | null;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
