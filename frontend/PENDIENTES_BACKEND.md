# Pendientes para el backend

Cosas que el frontend necesita y el backend todavía no ofrece. El frontend **no** modifica `backend/` ni `shared/`: mientras tanto usa la alternativa indicada. Ordenadas por impacto.

## Alta prioridad

### 1. Directorio de usuarios para compartir
- **Problema:** `GET /api/users` es solo para administradores. Un usuario normal no puede buscar a quién invitar, y `PUT /api/pages/:id/shares/:userId` necesita el `userId`.
- **Propuesta:** `GET /api/users/directory?q=` para cualquier usuario autenticado, que devuelva solo `{ id, name, email, departmentId }` de usuarios activos (máx. 20 resultados).
- **Mientras tanto:** la invitación directa solo funciona para administradores; el resto comparte por enlace.

### 2. Nombres en la lista de personas con acceso
- **Problema:** `GET /api/pages/:id` devuelve `shares: [{ userId, permission }]` sin el nombre.
- **Propuesta:** incluir `user: { id, name, email }` en cada `share`.
- **Mientras tanto:** los administradores ven nombres (cruzando con `GET /api/users`); los demás ven "Persona con acceso".

### 3. `GET /api/pages/:id` registra una visita en cada lectura
- **Problema:** cualquier lectura cuenta como visita (incluido recargar tras guardar, abrir el editor o el historial). Infla el conteo.
- **Propuesta:** registrar visitas en una ruta aparte (`POST /api/pages/:id/visit`) o con `?visit=1`, y deduplicar por usuario/día.
- **Mientras tanto:** el frontend evita pedir páginas solo para títulos o rutas (usa el listado).

### 4. Edición simultánea real (Yjs)
- **Problema:** el WebSocket `/realtime` solo notifica `page.refresh` (máx. 16 KB por mensaje); no retransmite actualizaciones de Yjs ni presencia (quién está editando).
- **Propuesta:** un endpoint compatible con `y-websocket` (por ejemplo `/collab/:pageId`) que autentique con el mismo JWT y los mismos permisos de lectura/edición, retransmita actualizaciones y *awareness*, y guarde el estado del documento.
- **Mientras tanto:** ver la sección de la fase 5 en el README del frontend.

## Media prioridad

### 5. Listado de páginas sin fondo, icono ni autor
- `GET /api/pages` no incluye `backgroundJson` (donde el frontend guarda el icono) ni el nombre del autor. Las tarjetas y la barra lateral usan un icono y degradado por defecto.
- **Propuesta:** incluir `backgroundJson` y `owner: { id, name }` en el listado (y en destacadas y populares).

### 6. Campo de icono para páginas y plantillas
- El modelo `Page` no tiene icono/emoji. El frontend lo guarda dentro de `background` como `{ ..., icon: "📄" }`.
- **Propuesta:** columna `icon String?` en `Page` y `Template`.

### 7. Saber qué páginas fueron compartidas conmigo
- El listado no indica si una página está compartida con el usuario ni con qué permiso. El frontend lo deduce (privada ajena = compartida), lo que no funciona para administradores.
- **Propuesta:** incluir `myPermission: "OWNER" | "EDIT" | "READ" | null` en el listado.

### 8. Conteo de visitas en la página
- `GET /api/pages/:id` no trae el total de visitas; solo `GET /api/pages/popular` (top 20). Fuera del top 20 no se muestra el conteo.
- **Propuesta:** incluir `_count.visits` en la respuesta de la página (solo si es pública).

### 9. Tipos de bloque en `shared/types`
- `PageBlock["type"]` no incluye `list`, `quote`, `divider`, `subpage` ni `code`, que el editor usa. El backend los acepta porque guarda JSON libre.
- **Propuesta:** ampliar la unión en `shared/types/index.ts` (formato en `frontend/lib/blocks.ts`).

### 10. Departamentos
- Un usuario que no es administrador solo recibe su propio departamento: no se puede distinguir "no existe" de "no tienes acceso", y no hay nombres para mostrar otros departamentos.
- `Department` no tiene descripción ni icono para el muro (el frontend usa los de la página del muro).

## Baja prioridad

- **Rutas de páginas superiores:** no hay forma de pedir la ruta (padres) sin abrir cada página; el frontend usa el listado (máx. 100 páginas).
- **Límite de inicios de sesión:** 10 intentos cada 15 min por IP. En una oficina con IP compartida puede bloquear a varias personas a la vez.
- **Listado de usuarios inactivos:** `GET /api/users` solo devuelve activos, así que un administrador no puede ver ni reactivar cuentas desactivadas.
