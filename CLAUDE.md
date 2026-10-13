# CLAUDE.md — Wiki en equipo (Grupo Comidas)

Wiki interna tipo Notion para Grupo Comidas: documentación, procesos y guías organizados por departamento.

## Reparto del trabajo

| Persona | Área | Carpetas |
| --- | --- | --- |
| **A (frontend)** | Navegación, pantallas, editor por bloques, fondos, plantillas, compartir, estados de carga/error/acceso, diseño adaptable | `frontend/` (app, components, lib, styles), `assets/` |
| **B (backend, terminado)** | Datos, rutas REST, sesión y roles, permisos, publicación, subpáginas, historial, papelera, visitas, archivos | `backend/`, `shared/` |
| Ambos | Pruebas | `tests/` |

## Reglas

- **No modificar `backend/` ni `shared/`.** Si al backend le falta algo, anotarlo en `frontend/PENDIENTES_BACKEND.md` y seguir.
- Textos de la interfaz en español, claros y en el tono de la empresa.
- Imágenes siempre con `next/image`; dominios en `frontend/next.config.ts`.
- Todo debe verse bien en celular, tablet y escritorio.
- Cada pantalla nueva: estado de carga, error, vacío y acceso denegado.
- Los permisos del frontend (`frontend/lib/permissions.ts`) solo muestran u ocultan botones; **decide el backend**.
- Mantener el estilo visual de `frontend/styles/globals.css` (paper, surface, ink, muted, line, basil `#2e6a4f`, saffron, danger; Bricolage Grotesque para títulos y Figtree para texto).
- Nunca subir contraseñas, claves ni `.env`.
- Nunca commit/push/merge a `main` ni force push. Se trabaja en la rama `frontend` y se abre un PR.
- Commits: `feat(frontend): ...`, `fix(frontend): ...`, `docs: ...`, `test: ...`.
- Al terminar cada fase: `npm run build` + pruebas, commit y push. No avanzar si no compila.
- Casos que siempre hay que comprobar: otro usuario **no** puede abrir una página privada; quien solo tiene **lectura no** puede editar.
- `docs/` no tiene reglas propias de GitHub (está vacío a la fecha del primer commit).

## Requisitos funcionales (resumen)

- Páginas privadas por defecto. Se comparten en lectura o edición (modal), por enlace o invitando a un usuario. Se publican al departamento (cualquier usuario) o a la empresa (solo administradores).
- Contenido: texto con formato, imágenes, videos embebidos, enlaces externos (siempre con icono), enlaces a otras páginas, tablas, subpáginas. Fondos: Unsplash, degradados, colores, patrones de emojis. Etiquetas para filtrar.
- Editor por bloques arrastrables (BlockNote), edición simultánea (Yjs) y modo sin conexión (y-indexeddb) con conflictos.
- Plantillas propias (privadas/departamento/empresa) y por defecto de alta calidad; un administrador agrega o retira las predeterminadas.
- Muros: empresa (público) y departamento (solo miembros o administrador) con destacadas y más visitadas.
- Roles: `USER` (crea y publica en su departamento), `DEPARTMENT_ADMIN` (además edita el muro de su departamento), `ADMIN` (gestiona usuarios y permisos; lee todo lo público y todos los muros). Todos pertenecen a un departamento.
- Extras: subpáginas, historial, visitas (solo páginas públicas), papelera restaurable, límites de subida.

## Fases del frontend

Todas las fases están hechas en la rama `frontend` (un commit `feat(frontend): fase N …` por fase):

0. Base (fase 1 original con datos de ejemplo).
1. Conectar al backend real (tipos de `shared/`, `lib/api` con fetch, sesión real, login).
2. Compartir y publicar (modal).
3. Contenido: editor BlockNote, crear páginas/subpáginas, fondos, etiquetas, plantillas.
4. Administración: muros, destacadas, historial, papelera, usuarios, plantillas por defecto, límites de archivos.
5. Avanzado: Yjs (presencia) y modo sin conexión (y-indexeddb + service worker).

Para saber en qué fase se va: `git log --oneline` (cada fase es un commit `feat(frontend): fase N ...`) y este archivo.

## Backend (lo que hay que saber)

Node 20+, Express 5, Prisma + SQLite, Zod, JWT. Gestor: **pnpm** (vía `corepack pnpm`).

### Correrlo en local

```bash
cd backend
corepack pnpm install
cp .env.example .env        # poner JWT_SECRET (>= 32 caracteres) y BOOTSTRAP_SECRET aleatorios
corepack pnpm run db:generate
corepack pnpm exec prisma migrate deploy --schema models/schema.prisma   # aplica la migración sin crear archivos nuevos
corepack pnpm run dev       # http://localhost:4000 (CORS para http://localhost:3000)
```

Datos de prueba: `cd frontend && npm run seed` (crea el primer administrador con `POST /api/auth/bootstrap`, departamentos, usuarios, páginas, compartidos y muros). Las contraseñas generadas se guardan en `frontend/.dev-users.local.json` (ignorado por git). Para empezar de cero: borrar `backend/models/dev.db` y volver a aplicar la migración.

### Sesión

- `POST /api/auth/login {email, password}` → `{ user, token }`. JWT de 8 h. Peticiones autenticadas con `Authorization: Bearer <token>`.
- `GET /api/auth/me` → `{ user: { id, name, email, role, departmentId, department: { name, slug } } }`.
- No hay registro público: los usuarios los crea un ADMIN (`POST /api/users`). El primer ADMIN se crea una sola vez con `POST /api/auth/bootstrap` (necesita `BOOTSTRAP_SECRET`).
- Cambiar contraseña invalida las sesiones (`sessionVersion`).
- En el frontend: el token vive en la cookie httpOnly `wiki_token` (8 h). Server components y server actions lo leen y llaman al backend; el navegador nunca ve el token salvo para el WebSocket.

### Formato de errores

`{ "error": { "code": string, "message": string, "details"?: unknown } }`. Códigos: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `BAD_REQUEST`/`VALIDATION_ERROR` (400), `CONFLICT`/`ALREADY_EXISTS` (409, `details.currentVersion`), `FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE_TYPE` (415), `INTERNAL_ERROR` (500). El frontend los traduce a `ApiError` (`no_autenticado`, `sin_acceso`, `no_encontrada`, `conflicto`, `datos_invalidos`, `archivo_rechazado`, `error_servidor`) en `frontend/lib/api/client.ts`.

### Tipos (`shared/types/index.ts`)

`UserRole = "USER" | "DEPARTMENT_ADMIN" | "ADMIN"`, `PageVisibility = "PRIVATE" | "DEPARTMENT" | "COMPANY"`, `PagePermission = "READ" | "EDIT"`, `TemplateScope`, `UserSummary`, `PageBlock { id, type, data }`, `PageSummary`, `ApiError`. El frontend los importa con `import type` desde `@shared/types`.

### Rutas principales

| Ruta | Respuesta / notas |
| --- | --- |
| `GET /api/pages?q&tag&departmentId&parentId` | `{ pages: [{ id, title, visibility, version, ownerId, departmentId, parentId, updatedAt, tags: [{name}] }] }` (máx. 100, sin fondo ni autor) |
| `GET /api/pages/:id` | `{ page }` con `contentJson` y `backgroundJson` **como texto JSON**, `shares [{userId, permission}]`, `tags [{name}]`, `children`, `owner {id,name}`, `isWall`, `isCompanyWall`. **Cada GET registra una visita** si la página es pública: no pedir páginas solo para títulos/rutas. |
| `POST /api/pages` | `{ title, content?, background?, visibility?, parentId?, tags? }` |
| `PATCH /api/pages/:id` | igual + `expectedVersion` obligatorio; `409` si cambió |
| `DELETE /api/pages/:id` | a la papelera (solo dueño o ADMIN; incluye subpáginas) |
| `GET /api/pages/trash`, `POST /api/pages/:id/restore` | papelera |
| `GET /api/pages/popular?departmentId` | `[{ id, title, visibility, departmentId, _count: { visits } }]` (top 20) |
| `GET /api/pages/:id/history`, `POST /api/pages/:id/history/:version/restore` | historial (`snapshotJson` en texto) |
| `PUT/DELETE /api/pages/:id/shares/:userId` `{permission}` | compartir con usuario (requiere permiso de edición) |
| `POST /api/pages/:id/share-links {permission, expiresInHours?}` | `{ id, token, permission, expiresAt, url }`; la URL apunta a `FRONTEND_ORIGIN/share/<token>` |
| `POST /api/share/:token/accept` | `{ pageId, permission }` |
| `POST /api/pages/from-template/:templateId {title?, parentId?}` | crea página desde plantilla |
| `GET /api/departments` | ADMIN: todos; resto: solo el propio. `{ id, name, slug, wallPage, _count }` |
| `PUT/DELETE /api/departments/:id/wall`, `GET/PUT /api/departments/:id/featured {pageIds}` | muro y destacadas (máx. 12, solo páginas públicas del depto.) |
| `GET/PUT/DELETE /api/company/wall` | muro de empresa (una página COMPANY) |
| `GET/POST /api/users`, `PATCH /api/users/:id` | solo ADMIN; `GET` lista solo activos |
| `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/:id` | `isDefault` solo ADMIN y exige `scope: COMPANY` |
| `POST /api/files` (multipart `file`, `pageId?`) | `{ file, url: "/api/files/:id/content" }`. Límite 10 MB (`MAX_UPLOAD_BYTES`), 1000 archivos por usuario; tipos: jpg, png, webp, gif, mp4, webm, pdf, txt, csv, docx, xlsx |
| `GET /api/files/:id/content` | requiere token → el frontend lo sirve por su propia ruta `/archivos/:id` |
| `POST /api/sync/pages/:id {operationId (uuid), baseVersion, title?, content, background?}` | sincronización offline; `409` con `details.current` |
| WebSocket `/realtime` | `{type:"auth", token, pageId}` → `ready`; enviar `{type:"page.changed"}` → los demás reciben `page.refresh`. Solo notifica, no transmite contenido. |

### Permisos del backend (`backend/permissions/access.ts`)

- Leer: ADMIN; dueño; compartida; muro de su departamento; `COMPANY`; `DEPARTMENT` del mismo departamento.
- Editar: ADMIN; dueño; compartida con `EDIT`; muro del propio departamento si es `DEPARTMENT_ADMIN`.
- Compartir = editar. Publicar a `COMPANY` solo ADMIN. Papelera y restaurar: dueño o ADMIN.

### Cómo se guardan los bloques y el fondo

El backend guarda `content` y `background` como JSON libre. Acuerdo del frontend (`frontend/lib/blocks.ts`):

- `content`: arreglo de bloques `{ id, type, data }` compatible con `PageBlock`. Tipos usados por las plantillas del backend: `heading {level, text}`, `paragraph {text}`, `callout {title?, text}`, `table {columns, rows}`. El frontend añade `spans` (texto con formato), `image`, `video`, `link`, `file`, y tipos extra (`list`, `quote`, `divider`, `subpage`, `code`), con hijos anidados en `data.children`. El editor BlockNote convierte desde y hacia este formato.
- `background`: `{ type: "color" | "gradient" | "image" | "pattern", ... }` (las plantillas del backend usan `{type:"gradient", value:"linear-gradient(...)"}`), más `icon` (emoji de la página), porque el modelo de página no tiene campo de icono.

## Frontend

Next.js 15.5 (App Router) + React 19 + Tailwind CSS 4 + lucide-react + TypeScript + BlockNote 0.55 (Mantine) + Yjs 13. `cd frontend && npm install && npm run dev` (necesita el backend en `:4000`; variables en `frontend/.env.example`). Detalle de carpetas y modos en `frontend/README.md`.

- `app/(wiki)/…` pantallas con sesión; `app/login`; `app/share/[token]` acepta enlaces; `app/sin-conexion` borradores offline.
- `lib/api/` única capa de lecturas (`{ ok: true, data } | { ok: false, error, message }`); escrituras en `app/actions/*` (server actions). `lib/session.ts` sesión real; `lib/permissions.ts` reglas de visibilidad de botones.
- Editor: `components/editor/PageEditor.tsx` (autoguardado con `expectedVersion`, conflictos, copia Yjs local) + `BlockEditor.tsx` (BlockNote con `withCollaboration` de `@blocknote/core/yjs`). Conversión en `lib/editor/convert.ts`, fusión en `lib/editor/merge.ts`.
- Tiempo real: `lib/collab/useCollaboration.ts`. Sin `NEXT_PUBLIC_COLLAB_URL` usa `/realtime` del backend (avisos); con ella, y-websocket (en vivo + presencia). Servidor de prueba: `npm run collab:dev`. Ojo: `@y/websocket-server` usa Yjs v14 y **no** es compatible con BlockNote (Yjs v13).
- Pruebas: `npm test` (Vitest, en `tests/frontend/`). Las de integración usan el backend local y los usuarios del seed (reutilizan sus tokens porque el backend limita los inicios de sesión: 10 cada 15 min por IP).
- Lecciones: cada `GET /api/pages/:id` suma una visita; no correr `build` con `dev` abierto (comparten `.next`); dentro de OneDrive borrar `.next` si aparece `EINVAL readlink`; el service worker solo se registra en producción.
