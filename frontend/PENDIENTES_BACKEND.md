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

### 4. Edición simultánea real (Yjs) y presencia
- **Problema:** el WebSocket `/realtime` solo notifica `page.refresh` (máx. 16 KB por mensaje); no retransmite actualizaciones de Yjs ni presencia (quién está editando). Sin eso, dos personas no ven sus cambios al instante: el frontend combina al guardar.
- **Propuesta:** un endpoint WebSocket con el protocolo de `y-websocket` (Yjs v13, `y-protocols` sync + awareness), por ejemplo `/collab/pagina-<pageId>`:
  - Autenticar con el mismo JWT (el frontend lo envía como `?token=`) y comprobar `canReadPage` al conectar.
  - Ignorar actualizaciones (sync paso 2 y `update`) de quien no tenga `canEditPage`; seguir enviándole los cambios.
  - Retransmitir *awareness* (nombre y color de cada persona) para mostrar presencia.
  - Opcional: guardar el estado Yjs para que el documento no dependa de que alguien tenga la página abierta.
- **Mientras tanto:** el frontend funciona con `/realtime` + fusión de tres vías. Para probar el modo en vivo en local hay un servidor de desarrollo en `frontend/scripts/collab-dev-server.mjs` (`npm run collab:dev`) que ya hace la validación de lectura/edición contra el backend; puede servir de referencia, pero **no** es para producción (documentos en memoria, sin límites ni registros).

### 4b. Límite de inicios de sesión compartido por todos (importante antes de producción)
- **Problema:** el frontend llama a `POST /api/auth/login` desde el servidor de Next, así que el backend ve siempre la IP de ese servidor. El límite de 10 intentos cada 15 minutos por IP se aplica a **toda la empresa junta**: diez contraseñas mal escritas bloquean a todo el mundo.
- **Ya hecho en el frontend:** el login envía la IP real de la persona en `X-Forwarded-For`.
- **Propuesta:** en `backend/api/app.ts`, `app.set("trust proxy", <dirección del servidor de Next>)` (o `1` si hay un solo proxy delante) para que `express-rate-limit` use esa IP. No usar `true` sin restricción: cualquiera podría falsear el encabezado.

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

### 11. Enlaces compartidos
- No hay ruta para **listar** los enlaces activos de una página: solo se puede desactivar el que se acaba de crear en el modal.
  **Propuesta:** `GET /api/pages/:id/share-links` (sin el token, con permiso, vencimiento y fecha).
- **Aceptar un enlace puede bajar el permiso:** `acceptShareLink` hace `upsert` y reemplaza un permiso `EDIT` existente por el `READ` del enlace.
  **Propuesta:** conservar el permiso más alto.
- La URL usa `FRONTEND_ORIGIN`; si no está configurada sale relativa. El frontend arma la URL con el origen de la petición.

### 12. Archivos en plantillas y páginas copiadas
- Un archivo subido sin `pageId` (por ejemplo, en el editor de plantillas) solo lo puede ver quien lo subió. Si la plantilla se comparte, otras personas no ven esas imágenes.
- Al crear una página desde una plantilla o copiar bloques, los archivos siguen ligados a la página original; quien no pueda leer esa página no los verá.
- **Propuesta:** permitir ligar archivos a plantillas (`templateId`) con los mismos permisos de lectura de la plantilla, y copiar/religar archivos al crear desde plantilla.

### 13. Historial con autoguardado
- El editor guarda automáticamente (1,5 s después de dejar de escribir) y cada guardado crea una versión en el historial.
- **Propuesta:** agrupar versiones del mismo usuario dentro de una ventana de tiempo (por ejemplo, 10 minutos) o aceptar `createHistory: false` en guardados automáticos.

### 14. Listado de plantillas sin fondo
- `GET /api/templates` no incluye `backgroundJson`; la pantalla de plantillas pide cada una por separado para mostrar la vista previa.

### 15. Destacadas de la empresa
- Hay destacadas por departamento (`/departments/:id/featured`) pero no para el muro de la empresa. El frontend usa como destacadas las páginas enlazadas en la página del muro.
- **Propuesta:** `GET/PUT /api/company/featured` (solo ADMIN, páginas COMPANY).

### 16. Compartir plantillas como las páginas
- **Problema:** las plantillas solo tienen alcance (`PRIVATE`, `DEPARTMENT`, `COMPANY`) y solo quien la creó puede editarla. No se pueden compartir con una persona, por enlace, ni dar permiso de edición, como pide el requisito ("compartirlas como privadas igual que las páginas").
- **Propuesta:** `TemplateShare { templateId, userId, permission: READ | EDIT }` y `TemplateShareLink` con las mismas rutas que las páginas (`PUT/DELETE /api/templates/:id/shares/:userId`, `POST /api/templates/:id/share-links`, aceptar enlace) y que `canReadTemplate` y el permiso de edición los consideren.
- **Mientras tanto:** el modal "Compartir plantilla" cambia el alcance y da un enlace directo (`/plantillas?plantilla=<id>`) que funciona para quien ya tiene acceso; explica que lo demás todavía no es posible.

## Baja prioridad

- **Vaciar papelera:** no hay borrado definitivo; las páginas quedan para siempre en la papelera (las pruebas de integración dejan ahí sus páginas de prueba).

- **Rutas de páginas superiores:** no hay forma de pedir la ruta (padres) sin abrir cada página; el frontend usa el listado (máx. 100 páginas).
- **Límite de inicios de sesión:** 10 intentos cada 15 min por IP. En una oficina con IP compartida puede bloquear a varias personas a la vez.
- **Listado de usuarios inactivos:** `GET /api/users` solo devuelve activos, así que un administrador no puede ver ni reactivar cuentas desactivadas.
