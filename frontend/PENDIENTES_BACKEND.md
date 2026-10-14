# Pendientes para el backend

Cosas que el frontend necesita y el backend todavía no ofrece. El frontend **no** modifica `backend/` ni `shared/`: mientras tanto usa la alternativa indicada. Cada punto dice qué tendría que cambiar el frontend cuando el backend lo resuelva.

Ordenados por impacto: 1–6 alta, 7–17 media, 18–21 baja.

## Alta prioridad

### 1. Directorio de usuarios para invitar
- **Problema:** `GET /api/users` es solo para administradores. Una persona normal no puede buscar a quién invitar, y `PUT /api/pages/:id/shares/:userId` necesita el `userId`.
- **Propuesta:** `GET /api/users/directory?q=` para cualquier usuario autenticado, que devuelva solo `{ id, name, email, departmentId }` de usuarios activos (máx. 20 resultados).
- **Mientras tanto:** la invitación directa solo funciona para administradores; el resto comparte por enlace.
- **Cambio en el frontend después:** en `app/(wiki)/paginas/[id]/page.tsx`, pasar a `ShareButton` el resultado del directorio para todos (hoy `people` es `null` si no eres ADMIN) y buscar mientras se escribe en `components/pages/ShareDialog.tsx`.

### 2. Límite de inicios de sesión compartido por todos (antes de producción)
- **Problema:** el login se hace desde el servidor de Next, así que el backend ve siempre la misma IP. El límite de 10 intentos cada 15 min se aplica a **toda la empresa junta**.
- **Propuesta:** en `backend/api/app.ts`, `app.set("trust proxy", <dirección del servidor de Next>)` (o `1` si hay un solo proxy). No usar `true` sin restricción: cualquiera podría falsear el encabezado.
- **Mientras tanto:** el frontend ya envía la IP real en `X-Forwarded-For` (`app/actions/session.ts`).
- **Cambio en el frontend después:** ninguno.

### 3. `GET /api/pages/:id` cuenta una visita en cada lectura
- **Problema:** abrir el editor, el historial o recargar tras guardar también suma visitas. Infla "Más visitadas".
- **Propuesta:** registrar visitas en una ruta aparte (`POST /api/pages/:id/visit`) o con `?visit=1`, y deduplicar por usuario y día.
- **Mientras tanto:** el frontend evita pedir páginas solo para títulos o rutas (usa el listado).
- **Cambio en el frontend después:** llamar a la ruta de visita solo desde la vista de lectura (`app/(wiki)/paginas/[id]/page.tsx`); quitar el aviso de visitas infladas del README.

### 4. Edición simultánea en vivo (Yjs) y presencia
- **Problema:** `/realtime` solo avisa `page.refresh` (máx. 16 KB); no retransmite cambios de Yjs ni quién está editando. Hoy los cambios de otra persona llegan cuando guarda.
- **Propuesta:** WebSocket con el protocolo `y-websocket` (Yjs v13, `y-protocols` sync + awareness), sala `pagina-<pageId>`:
  - Autenticar con el mismo JWT (`?token=`) y comprobar `canReadPage` al conectar.
  - Ignorar actualizaciones (sync paso 2 y `update`) de quien no tenga `canEditPage`, pero seguir enviándole los cambios.
  - Retransmitir *awareness* (nombre y color) para la presencia.
  - Guardar el estado Yjs para que no dependa de que alguien tenga la página abierta.
  - Referencia funcional: `frontend/scripts/collab-dev-server.mjs` (`npm run collab:dev`), **solo de desarrollo** (memoria, sin límites ni registros). Ojo: `@y/websocket-server` usa Yjs v14 y no es compatible.
- **Cambio en el frontend después:** solo configurar `NEXT_PUBLIC_COLLAB_URL` con la dirección pública (WSS). Si el backend guarda el estado Yjs, se puede quitar la carga inicial desde REST en `components/editor/PageEditor.tsx` (`onEditorReady`).

### 5. Nombres en la lista de personas con acceso
- **Problema:** `GET /api/pages/:id` devuelve `shares: [{ userId, permission }]` sin nombre.
- **Propuesta:** incluir `user: { id, name, email }` en cada `share`.
- **Mientras tanto:** los administradores ven nombres (cruzando con `GET /api/users`); el resto ve "Persona con acceso".
- **Cambio en el frontend después:** en `ShareDialog.tsx`, usar `share.user.name` en vez de `nameOf()`; agregar `user` al tipo `Share` de `lib/types.ts` y a `toPage()` de `lib/api/index.ts`.

### 6. Compartir plantillas como las páginas
- **Problema:** las plantillas solo tienen alcance (`PRIVATE`, `DEPARTMENT`, `COMPANY`) y solo quien la creó la edita. No se pueden compartir con una persona, por enlace ni con permiso de edición, como pide el requisito.
- **Propuesta:** `TemplateShare { templateId, userId, permission }` y `TemplateShareLink`, con las mismas rutas que las páginas (`PUT/DELETE /api/templates/:id/shares/:userId`, `POST /api/templates/:id/share-links`, aceptar enlace), y que `canReadTemplate` y la edición los consideren.
- **Mientras tanto:** el modal "Compartir plantilla" cambia el alcance y da un enlace directo (`/plantillas?plantilla=<id>`) para quien ya tiene acceso.
- **Cambio en el frontend después:** reutilizar `ShareDialog.tsx` para plantillas (las mismas secciones de invitar, personas con acceso y enlace) en `components/templates/TemplateActions.tsx`, y permitir editar a quien tenga `EDIT` en `app/(wiki)/plantillas/[id]/editar/page.tsx`.

## Media prioridad

### 7. Listado de páginas sin fondo, icono ni autor
- **Problema:** `GET /api/pages` (y destacadas y populares) no traen `backgroundJson` ni el autor; tarjetas y barra lateral usan icono y degradado por defecto.
- **Propuesta:** incluir `backgroundJson` y `owner: { id, name }`.
- **Cambio en el frontend después:** en `toSummary()` de `lib/api/index.ts`, leer `parseAppearance(p.backgroundJson)` y el autor; mostrar el autor en `PageCard.tsx`.

### 8. Campo de icono en páginas y plantillas
- **Problema:** no hay campo de icono; el frontend lo guarda dentro de `background` como `{ ..., icon }` (emoji, `lucide:<nombre>:<tono>` o `3d:<nombre>`).
- **Propuesta:** columna `icon String?` en `Page` y `Template` (hasta 48 caracteres).
- **Cambio en el frontend después:** leer y escribir `icon` directo en `parseAppearance`/`toStoredAppearance` (`lib/blocks.ts`) y en las server actions; migrar los iconos guardados en `background`.

### 9. Saber qué páginas están compartidas conmigo y con qué permiso
- **Problema:** el listado no lo indica; el frontend lo deduce (privada ajena = compartida), y no funciona para administradores.
- **Propuesta:** incluir `myPermission: "OWNER" | "EDIT" | "READ" | null` en el listado.
- **Cambio en el frontend después:** en `getSidebar()` de `lib/api/index.ts`, filtrar "Compartidas conmigo" por `myPermission` (también para administradores).

### 10. Conteo de visitas en la página
- **Problema:** `GET /api/pages/:id` no trae el total; solo el top 20 de `/pages/popular`.
- **Propuesta:** incluir `_count.visits` en la respuesta (solo si es pública).
- **Cambio en el frontend después:** usar ese dato en `getPage()` y quitar la consulta extra a `popularPages`.

### 11. Tipos de bloque en `shared/types`
- **Problema:** `PageBlock["type"]` no incluye `list`, `quote`, `divider`, `subpage` ni `code`, que el editor usa (el backend los acepta porque guarda JSON libre).
- **Propuesta:** ampliar la unión en `shared/types/index.ts` según `frontend/lib/blocks.ts`.
- **Cambio en el frontend después:** derivar `WikiBlockType` de `PageBlock["type"]` en `lib/blocks.ts`.

### 12. Departamentos
- **Problema:** quien no es administrador solo recibe su departamento (no se distingue "no existe" de "sin acceso"), y `Department` no tiene descripción ni icono.
- **Propuesta:** `GET /api/departments/:slug` que responda 403 o 404 según el caso, y campos `description` e `icon`.
- **Cambio en el frontend después:** en `getDepartmentWall()`, usar esa ruta y mostrar el mensaje correcto; usar descripción e icono en el encabezado del muro.

### 13. Enlaces compartidos
- **Problema:** no se pueden **listar** los enlaces activos (solo desactivar el recién creado); aceptar un enlace de lectura **baja** un permiso `EDIT` existente; la URL depende de `FRONTEND_ORIGIN`.
- **Propuesta:** `GET /api/pages/:id/share-links` (sin token, con permiso, vencimiento y fecha) y conservar el permiso más alto al aceptar.
- **Cambio en el frontend después:** lista de enlaces activos con "Desactivar" en `ShareDialog.tsx`.

### 14. Archivos en plantillas y páginas copiadas
- **Problema:** un archivo subido sin `pageId` (editor de plantillas) solo lo ve quien lo subió; al crear desde plantilla, los archivos siguen ligados a la página original.
- **Propuesta:** ligar archivos a plantillas (`templateId`) con los permisos de la plantilla, y copiar o religar archivos al crear desde plantilla.
- **Cambio en el frontend después:** enviar `templateId` en `uploadToWiki()` (`lib/uploads.ts`) desde el editor de plantillas.

### 15. Historial con autoguardado
- **Problema:** cada autoguardado (1,5 s sin escribir) crea una versión.
- **Propuesta:** agrupar versiones del mismo usuario dentro de una ventana (por ejemplo, 10 min) o aceptar `createHistory: false`.
- **Cambio en el frontend después:** enviar el indicador en `savePage()` (`app/actions/pages.ts`) para los autoguardados.

### 16. Listado de plantillas sin fondo
- **Problema:** `GET /api/templates` no trae `backgroundJson`; la pantalla de plantillas pide cada una por separado.
- **Propuesta:** incluir `backgroundJson` en el listado.
- **Cambio en el frontend después:** quitar el `Promise.all(getTemplate…)` de `app/(wiki)/plantillas/page.tsx` y usar el fondo del listado también en el diálogo "Nueva página".

### 17. Destacadas de la empresa
- **Problema:** hay destacadas por departamento pero no para el muro de la empresa; el frontend usa las páginas enlazadas en la página del muro.
- **Propuesta:** `GET/PUT /api/company/featured` (solo ADMIN, páginas COMPANY).
- **Cambio en el frontend después:** reutilizar `FeaturedEditor` (`components/departments/WallEditor.tsx`) en `app/(wiki)/admin/muro/page.tsx` y leerlas en `getCompanyWall()`.

## Baja prioridad

### 18. Vaciar papelera
- **Problema:** no hay borrado definitivo (las pruebas de integración también dejan ahí sus páginas).
- **Propuesta:** `DELETE /api/pages/:id/permanent` (dueño o ADMIN) y retención automática.
- **Cambio en el frontend después:** botón "Eliminar definitivamente" en `app/(wiki)/papelera/page.tsx` y limpieza en las pruebas.

### 19. Ruta de páginas superiores
- **Problema:** no se puede pedir la ruta (padres) sin abrir cada página; el frontend la arma con el listado (máx. 100).
- **Propuesta:** incluir `ancestors: [{ id, title }]` en `GET /api/pages/:id`.
- **Cambio en el frontend después:** usarlo en lugar de `getAncestors()`.

### 20. Usuarios inactivos
- **Problema:** `GET /api/users` solo devuelve activos: no se puede ver ni reactivar una cuenta desactivada.
- **Propuesta:** `GET /api/users?includeInactive=1`.
- **Cambio en el frontend después:** filtro "Inactivos" y botón "Reactivar" en `components/admin/UsersAdmin.tsx`.

### 21. Varias instancias del backend
- **Problema:** `/realtime` guarda las salas en memoria y los archivos son locales al proceso.
- **Propuesta:** bus compartido (Redis o similar) para `/realtime` y almacenamiento de objetos para archivos.
- **Cambio en el frontend después:** ninguno.
