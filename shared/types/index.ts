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

/** Bloque de contenido (el backend guarda el arreglo como JSON). Los hijos anidados van en `data.children`. */
export interface PageBlock {
  id: string;
  type: "paragraph" | "heading" | "image" | "video" | "link" | "table" | "file" | "callout" | "list" | "quote" | "divider" | "subpage" | "code";
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
  /** Solo al buscar (`?q=`): dónde coincidió y un fragmento del contenido con la palabra encontrada. */
  match?: "title" | "content";
  excerpt?: string | null;
}

/** Persona con acceso a una página o plantilla, con nombre y departamento (sin correo). */
export interface ShareEntry {
  userId: string;
  permission: PagePermission;
  user: { id: string; name: string; department: { name: string } };
}

export interface PageAncestor {
  id: string;
  title: string;
  icon: string | null;
}

/** `GET /api/pages/:id`. `contentJson` y `backgroundJson` llegan como texto JSON. */
export interface PageDetail extends PageSummary {
  icon: string | null;
  contentJson: string;
  backgroundJson: string | null;
  isWall: boolean;
  isCompanyWall: boolean;
  createdAt: string;
  owner: { id: string; name: string };
  tags: { name: string }[];
  shares: ShareEntry[];
  children: { id: string; title: string; icon: string | null; visibility: PageVisibility; updatedAt: string }[];
  /** Páginas superiores que la persona puede leer, de la raíz a la página padre. */
  ancestors: PageAncestor[];
  /** Visitas registradas; `null` en páginas privadas. */
  visitCount: number | null;
}

/** Enlace compartido activo (`GET /api/pages/:id/share-links`). El token solo se ve al crearlo. */
export interface ShareLinkSummary {
  id: string;
  permission: PagePermission;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

/** Respuesta al crear un enlace (`POST .../share-links`). */
export interface CreatedShareLink {
  id: string;
  token: string;
  permission: PagePermission;
  expiresAt: string | null;
  url: string;
}

/** `POST /api/share/:token/accept`. Aceptar nunca baja un permiso que ya se tenía. */
export type ShareAcceptResult =
  | { type: "page"; pageId: string; permission: PagePermission }
  | { type: "template"; templateId: string; permission: PagePermission };

/** Plantilla en `GET /api/templates` (incluye las compartidas con la persona). */
export interface TemplateListItem {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  backgroundJson: string | null;
  scope: TemplateScope;
  isDefault: boolean;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  departmentId: string | null;
  updatedAt: string;
  myPermission: MyPermission;
  /** Puede cambiar el contenido y compartirla (dueño, ADMIN o compartida con EDIT). */
  canEdit: boolean;
  /** Puede cambiar el alcance y eliminarla (dueño o ADMIN). */
  canManage: boolean;
}

/** `GET /api/templates/:id`. */
export interface TemplateDetail extends TemplateListItem {
  contentJson: string;
  createdAt: string;
  shares: ShareEntry[];
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
