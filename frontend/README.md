# Wiki Grupo Comidas: frontend (Persona A)

Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + lucide-react + TypeScript.
Editor BlockNote, Yjs + y-indexeddb para edición simultánea y modo sin conexión.

## Arrancar en local

1. Levanta el backend (ver `../backend/README.md` o `../CLAUDE.md`). Queda en http://localhost:4000.
2. En esta carpeta:

```bash
npm install
cp .env.example .env.local   # opcional, ver variables abajo
npm run seed                 # solo la primera vez, con la base recién migrada
npm run dev
```

Abre http://localhost:3000 e inicia sesión con un usuario de `.dev-users.local.json` (lo crea `npm run seed`; no se sube a git).

| Usuario | Rol | Departamento |
|---|---|---|
| Ana Rivera | Administrador | Tecnología |
| Carlos Mejía | Admin. de departamento | Contabilidad |
| Luis Paz | Usuario | Tecnología |
| María Zelaya | Usuario | Compras |

Casos para probar: María no puede abrir "Mis notas" de Luis (privada); ve "Borrador: guía de VPN" en solo lectura y puede editar "Checklist de soporte en sucursales". María no entra al muro de Tecnología. Carlos edita el muro de Contabilidad. Ana ve "Administración".

> **OneDrive:** si el repositorio está dentro de una carpeta sincronizada con OneDrive, `.next` puede quedar con archivos "solo en la nube" y Next falla con `EINVAL: readlink`. Borra `.next` y vuelve a arrancar, o excluye la carpeta de la sincronización.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (revisa tipos y genera la lista del service worker) |
| `npm start` | Sirve la compilación de producción (aquí se activa el modo sin conexión) |
| `npm test` | Pruebas (Vitest) de `../tests/frontend`; las de integración se omiten si el backend o el seed no están |
| `npm run seed` | Datos de prueba en el backend local (usuarios, páginas, muros y plantillas de Grupo Comidas) |
| `npm run collab:dev` | Servidor Yjs **solo de desarrollo** para probar la edición en vivo (ver abajo) |

No corras `npm run build` con `npm run dev` abierto: ambos usan `.next`.

## Variables (`.env.local`)

`BACKEND_URL`, `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_COLLAB_URL`, `NEXT_PUBLIC_MAX_UPLOAD_MB`, `UNSPLASH_ACCESS_KEY`, `NEXT_PUBLIC_ENABLE_SW`. Detalle en [.env.example](.env.example).

## Estructura

    app/
      login/                       Inicio de sesión (cookie httpOnly con el token del backend)
      share/[token]                Aceptar enlaces compartidos
      sin-conexion/                Borradores sin conexión (funciona sin internet)
      archivos/                    Subir (POST) y ver (GET /archivos/:id) archivos con la sesión
      fondos/buscar                Búsqueda opcional en Unsplash
      actions/                     Server actions: sesión, compartir, páginas/plantillas, administración, sincronización
      (wiki)/                      Pantallas con sesión: muros, páginas (ver, editar, historial), buscar,
                                   plantillas, papelera, administración
    components/
      editor/                      BlockNote, bloques propios, fondos, icono, etiquetas, plantillas, conflictos, presencia
      pages/ templates/ departments/ admin/ offline/ layout/ page/ ui/
    lib/
      types.ts                     Tipos (base en ../shared/types)
      blocks.ts                    Formato de bloques y fondo que se guarda en el backend
      editor/convert.ts            Conversión backend ↔ BlockNote
      editor/merge.ts              Fusión de tres vías para conflictos
      collab/                      Yjs, y-indexeddb, canal en tiempo real, borradores
      api/                         Capa de datos (lecturas) y cliente HTTP del backend
      session.ts permissions.ts uploads.ts default-templates.ts backgrounds.ts
    public/sw.js                   Service worker (páginas visitadas disponibles sin conexión)
    scripts/                       seed, servidor Yjs de desarrollo y lista de archivos del service worker

## Edición simultánea y sin conexión (fase 5)

- Cada página que se edita tiene un documento **Yjs** guardado en **IndexedDB** (y-indexeddb). Si se cae la red, se sigue editando; al volver se sube con `POST /api/sync/pages/:id` (con `operationId` para no duplicar).
- Si alguien más cambió la página, se hace una **fusión de tres vías por bloque** (`lib/editor/merge.ts`): lo que no choca se combina solo; si dos personas editaron el mismo bloque, se muestra un diálogo para elegir.
- **Modo actual con el backend:** el canal `/realtime` avisa cuando otra persona guarda y el editor incorpora sus cambios. El indicador muestra "En línea", "Conectando…" o "Sin conexión".
- **Modo en vivo (con presencia):** si se define `NEXT_PUBLIC_COLLAB_URL`, el documento Yjs se sincroniza al instante y se ve quién más está editando. El backend aún no ofrece ese servidor ([PENDIENTES_BACKEND.md](PENDIENTES_BACKEND.md), punto 4); para probarlo en local: `npm run collab:dev` y `NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234`.
- **Sin conexión fuera del editor:** en producción, el service worker guarda las páginas visitadas y los archivos de la aplicación. Sin internet se pueden abrir y editar esas páginas, y crear **borradores nuevos** en `/sin-conexion` que luego se suben como páginas privadas. Al cerrar sesión se borra la copia de páginas del dispositivo.

### Demostración paso a paso

Necesitas tres terminales y dos navegadores (o uno normal y una ventana de incógnito, para tener dos sesiones distintas).

1. **Backend** (terminal 1): `cd backend && corepack pnpm run dev`. Si la base está vacía, en `frontend/` corre `npm run seed`.
2. **Servidor Yjs de desarrollo** (terminal 2): `cd frontend && npm run collab:dev` → `ws://localhost:1234`.
3. **Frontend** (terminal 3): crea `frontend/.env.local` con la línea `NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234` y corre `npm run dev`.
4. En el navegador A entra como **Luis** y en el B como **María** (contraseñas en `frontend/.dev-users.local.json`). Ambos abren **Checklist de soporte en sucursales** → **Editar** (Luis es el dueño; María tiene permiso de edición).
5. Arriba a la derecha cada uno ve **En vivo** y el avatar de la otra persona ("También editando"). Lo que escribe uno aparece al instante en el otro, con su cursor.
6. **Solo lectura:** María abre **Borrador: guía de VPN**: no tiene botón Editar y, si entra a `/editar`, ve "Solo puedes leer esta página". El servidor de desarrollo también ignora cambios de quien solo tiene lectura.
7. **Sin conexión y conflictos:** en el navegador B abre las herramientas de desarrollo → *Network* → *Offline*. María cambia un bloque; Luis cambia **el mismo** bloque y agrega otro. Al volver a *Online*, María ve el diálogo para elegir en el bloque en conflicto; el bloque nuevo de Luis se combina solo.
8. **Sin servidor Yjs** (como funciona hoy con el backend): borra `.env.local` y reinicia. El indicador dice **En línea**: cuando una persona guarda, los cambios aparecen en la otra a los pocos segundos (aviso por `/realtime` y fusión), pero sin presencia.
9. **Borradores sin conexión:** `npm run build && npm start`, abre algunas páginas, corta la red y entra a `/sin-conexion` → **Nuevo borrador**. Al volver la red, **Subir a la wiki**.

### Qué falta para producción

- **Backend:** un servidor Yjs con el protocolo y-websocket que valide el JWT y los permisos de lectura y edición, retransmita la presencia y guarde el estado (pendiente 4). `frontend/scripts/collab-dev-server.mjs` sirve de referencia, pero guarda los documentos en memoria, no tiene límites ni registros y no aguanta varias instancias.
- **Backend:** `app.set("trust proxy", …)` para que el límite de inicios de sesión use la IP real que ya envía el frontend (pendiente 4b).
- **Backend:** el canal `/realtime` y las salas viven en memoria: con varias instancias hace falta un bus compartido (Redis o similar).
- **Infraestructura:** HTTPS y WSS; configurar `BACKEND_URL`, `NEXT_PUBLIC_REALTIME_URL` y `NEXT_PUBLIC_COLLAB_URL` con las direcciones públicas; el token viaja en la URL del WebSocket (`?token=`), así que conviene que los registros del proxy no guarden la consulta.
- **Datos locales:** el contenido que se guarda en el dispositivo para trabajar sin conexión debe tener una política acordada para equipos compartidos (ver la decisión pendiente en el PR).

Lo que falta en el backend está en [PENDIENTES_BACKEND.md](PENDIENTES_BACKEND.md).
