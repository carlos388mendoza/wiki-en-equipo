# Wiki Grupo Comidas: frontend (Persona A)

Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + lucide-react + TypeScript.

## Arrancar en local

1. Levanta el backend (ver `../backend/README.md` o `../CLAUDE.md`). Queda en http://localhost:4000.
2. En esta carpeta:

```bash
npm install
cp .env.example .env.local   # opcional: BACKEND_URL si el backend no está en :4000
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

Casos para probar: María no puede abrir "Mis notas" de Luis (privada); ve "Borrador: guía de VPN" en solo lectura y puede editar "Checklist de soporte en sucursales". María no entra al muro de Tecnología. Carlos ve "Editar muro" en Contabilidad.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (incluye revisión de tipos) |
| `npm test` | Pruebas (Vitest) de `../tests/frontend`; las de integración se omiten si el backend o el seed no están |
| `npm run seed` | Datos de prueba en el backend local |

## Estructura

    app/
      login/                      Inicio de sesión (cookie httpOnly con el token del backend)
      (wiki)/layout.tsx           Barra lateral + contenido (requiere sesión)
      (wiki)/page.tsx             Muro de la empresa
      (wiki)/departamentos/[slug] Muro de departamento
      (wiki)/paginas/[id]         Vista de una página
      (wiki)/buscar               Búsqueda y filtro por etiquetas
      (wiki)/papelera             Páginas eliminadas
      archivos/[id]               Sirve archivos subidos (reenvía la sesión al backend)
      actions/                    Server actions (escrituras al backend)
    components/                   UI reutilizable
    lib/types.ts                  Tipos (base en ../shared/types)
    lib/blocks.ts                 Formato de bloques y fondo que se guarda en el backend
    lib/api/                      Capa de datos (lecturas) y cliente HTTP del backend
    lib/session.ts                Sesión real (GET /api/auth/me)
    lib/permissions.ts            Reglas para mostrar/ocultar botones (decide el backend)
    middleware.ts                 Redirige a /login sin sesión, recordando la ruta
    styles/globals.css            Colores y tipografía

Lo que falta en el backend está en [PENDIENTES_BACKEND.md](PENDIENTES_BACKEND.md).
