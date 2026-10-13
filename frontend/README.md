# Wiki Grupo Comidas: frontend (Persona A)

Next.js 15 (App Router) + Tailwind CSS 4 + lucide-react.

## Arrancar

    npm install
    npm run dev

Abre http://localhost:3000. Sin sesión te manda a `/login`, donde puedes entrar
como cualquiera de los 4 usuarios de prueba para revisar permisos.

## Estructura

    app/
      login/                    Inicio de sesión (con usuarios de prueba)
      (wiki)/layout.tsx         Barra lateral + contenido (requiere sesión)
      (wiki)/page.tsx           Muro de la empresa
      (wiki)/departamentos/[slug]  Muro de departamento
      (wiki)/paginas/[id]       Vista de una página
      (wiki)/buscar             Búsqueda y filtro por etiquetas
      (wiki)/papelera           Páginas eliminadas
    components/                 UI reutilizable
    lib/types.ts                Tipos del dominio  ← sustituir por shared/ del backend
    lib/api/                    Capa de datos      ← aquí se conecta el backend
    lib/permissions.ts          Reglas para mostrar/ocultar botones (el backend manda)
    styles/globals.css          Colores y tipografía

## Conectar con el backend

1. Reemplaza `lib/types.ts` por los tipos de `shared/` (o reexpórtalos).
2. En `lib/api/index.ts` cambia el cuerpo de cada función por un `fetch` a la ruta
   correspondiente. Mantén la firma y devuelve `{ ok: false, error }` con los
   códigos `sin_acceso`, `no_encontrada`, `no_autenticado` o `error_servidor`.
3. En `lib/session.ts` lee la sesión real en lugar de la cookie de prueba.
4. Agrega en `next.config.ts` el dominio donde se guardan los archivos subidos.

## Usuarios de prueba

| Usuario | Rol | Departamento |
|---|---|---|
| Ana Rivera | Administrador | Tecnología |
| Carlos Mejía | Admin. de departamento | Contabilidad |
| Luis Paz | Usuario | Tecnología |
| María Zelaya | Usuario | Compras |

Casos para probar: María no puede abrir "Mis notas" de Luis (privada), pero sí
"Borrador: guía de VPN" en solo lectura porque Luis se la compartió. María no
entra al muro de Tecnología. Carlos ve "Editar muro" en Contabilidad.

## Siguientes fases

2. Modal de compartir (lectura/edición, enlace o invitación) y publicar.
3. Editor por bloques (BlockNote), selector de fondos, plantillas.
4. Edición de muros, historial, restaurar desde papelera, administración.
5. Edición simultánea y modo sin conexión (Yjs + y-indexeddb).
