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

Lo que falta en el backend está en [PENDIENTES_BACKEND.md](PENDIENTES_BACKEND.md).
