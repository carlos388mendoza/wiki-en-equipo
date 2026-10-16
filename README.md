# Wiki en equipo

Wiki en equipo es un proyecto para crear un espacio interno de documentación para Grupo Comidas. La idea es reunir páginas, procesos y recursos, organizados por departamentos y protegidos según el usuario y sus permisos.

> **Estado actual:** la API (`backend/`: Node.js, TypeScript, Express, Prisma, SQLite y edición en vivo con Yjs) y la interfaz (`frontend/`: Next.js, React y BlockNote) cumplen todos los requisitos. Solo falta preparar la infraestructura para varias instancias (ver `frontend/PENDIENTES_BACKEND.md`).

## Objetivo

Construir una plataforma de documentación colaborativa inspirada en herramientas como Notion. Los usuarios podrán crear páginas privadas y compartirlas con otras personas, publicarlas en su departamento o, con los permisos adecuados, hacerlas visibles para toda la empresa.

## Funcionalidades previstas

- Páginas con texto enriquecido, imágenes, videos, enlaces, tablas, etiquetas y fondos personalizados.
- Editor por bloques con reordenamiento de contenido.
- Páginas privadas por defecto, con opciones para compartir en lectura o edición.
- Acceso a nivel de departamento o de empresa, controlado por roles.
- Plantillas personales y plantillas predeterminadas administradas por la organización.
- Páginas de inicio o muros para departamentos y para la empresa.
- Colaboración en tiempo real y edición sin conexión con resolución de conflictos.
- Subpáginas, historial de ediciones, visitas a páginas públicas y papelera restaurable.
- Límites para archivos subidos y visualización optimizada de imágenes.

Estas funciones describen el alcance del proyecto. Consulta [backend/README.md](backend/README.md) para ver las rutas del servidor y [frontend/README.md](frontend/README.md) para las pantallas, el editor y la demostración paso a paso.

## Roles previstos

| Rol | Responsabilidades principales |
| --- | --- |
| Usuario | Crear páginas y publicarlas dentro de su departamento, según los permisos definidos. |
| Administrador de departamento | Administrar el muro de su departamento y usar las funciones de usuario. |
| Administrador | Gestionar usuarios, permisos generales y contenido público de la empresa. |

Cada usuario pertenecerá a un departamento, incluidos los administradores.

## Estructura del repositorio

```text
assets/       Imágenes y recursos visuales
backend/      API, autenticación, datos, permisos, archivos y sincronización
  api/
  auth/
  models/
  permissions/
  realtime/
  services/
  storage/
  sync/
docs/         Documentación y decisiones del proyecto
frontend/     Interfaz de usuario y componentes
  app/
  components/
    departments/
    editor/
    pages/
    templates/
  lib/
  styles/
shared/       Tipos y utilidades compartidas
  types/
  utils/
tests/        Pruebas de frontend y backend
  frontend/
  backend/
```

Los archivos `.gitkeep` conservan las carpetas mientras estén vacías; pueden quitarse cuando cada carpeta tenga contenido real.

## Reparto sugerido para dos personas

- **Persona 1 — Interfaz:** páginas y navegación, editor por bloques, componentes de contenido, plantillas y muros de departamento/empresa.
- **Persona 2 — Servicios y permisos:** modelo de datos, API, usuarios, departamentos, roles, privacidad, compartir páginas, historial, papelera y almacenamiento.
- **Trabajo conjunto:** definir primero los tipos de datos y contratos de API. Después, conectar las pantallas con los servicios. Dejar la edición simultánea y el modo sin conexión para una etapa posterior.

## Plan inicial

1. Elegir tecnologías y documentar cómo ejecutar el proyecto.
2. Definir usuarios, departamentos, páginas, bloques y permisos.
3. Implementar autenticación, creación y lectura de páginas privadas.
4. Añadir compartir, publicación por departamento y roles administrativos.
5. Construir el editor, las plantillas y los muros.
6. Incorporar historial, papelera, visitas y manejo de archivos.
7. Explorar colaboración en tiempo real y edición sin conexión.

## Desarrollo

Para preparar el servidor, consulta [backend/README.md](backend/README.md); para la interfaz, [frontend/README.md](frontend/README.md). Pruebas: `cd backend && corepack pnpm test` y `cd frontend && npm test`.

### Usuarios de prueba

`npm run seed` (en `frontend/`, con el backend en marcha y la base vacía) crea estos usuarios. Todos usan la contraseña **12345abc** (decisión del equipo; la regla del backend pide al menos 8 caracteres).

| Nombre | Correo | Rol | Departamento |
|---|---|---|---|
| Administrador | adminwiki@grupocomidas.com | Administrador | Tecnología |
| Admin Contabilidad | contabilidadwiki@grupocomidas.com | Admin. de departamento | Contabilidad |
| Usuario Tecnología | tecnologiawiki@grupocomidas.com | Usuario | Tecnología |
| Usuario Compras | compraswiki@grupocomidas.com | Usuario | Compras |

En producción, cada persona debe cambiar su contraseña al entrar por primera vez (su nombre en la barra lateral → **Mi cuenta** → Cambiar contraseña).

## Despliegue

### Dónde corre cada parte

- **Frontend:** Vercel, con la carpeta raíz `frontend`. Dirección: https://wiki-en-equipo.vercel.app. Cada PR genera su propia vista previa.
- **Backend:** Render, como *Blueprint* definido en [`render.yaml`](render.yaml): un servicio web siempre encendido, con un disco permanente de 1 GB montado en `/data`.
- **Base de datos:** SQLite en el disco de Render (`/data/wiki.db`). Los archivos subidos también quedan en el disco (`/data/uploads`).

### Por qué el backend no va en Vercel

- Vercel enciende el servidor solo cuando llega una petición y después lo apaga. Su disco es temporal, así que **la base SQLite y los archivos subidos se borrarían**.
- La **edición en vivo** necesita una conexión (WebSocket) que quede abierta mientras alguien edita. Las funciones de Vercel no mantienen esas conexiones.
- El límite de intentos de inicio de sesión y la limpieza automática de la papelera viven en un proceso que tiene que seguir encendido.

### Backend en Render (Blueprint)

`render.yaml` ya trae todo:

- la carpeta raíz `backend` y Node 22;
- compilación: `corepack enable && pnpm install --frozen-lockfile && pnpm run db:generate && pnpm run build`;
- arranque: `pnpm run db:deploy && pnpm start`. `db:deploy` solo aplica las migraciones nuevas y **no borra datos**;
- la ruta de salud `/health`, el disco y las variables.

1. En https://render.com crea una cuenta con **GitHub** y autoriza el acceso al repositorio `vbgjptt89g-beep/wiki-en-equipo`.
2. **New → Blueprint** y elige ese repositorio y la rama `main`. Render lee `render.yaml` y muestra el servicio `wiki-en-equipo-backend` con el plan **Starter**. El plan gratuito no admite discos.
3. Te pide dos secretos. Pega valores aleatorios y largos, de 32 caracteres o más, y no los guardes en el repositorio:
   - `JWT_SECRET`
   - `BOOTSTRAP_SECRET`
4. **Apply**. Cuando el servicio diga **Live**, abre `https://<tu-backend>.onrender.com/health`: debe responder `{"status":"ok"}`.
5. Cada vez que se une un PR a `main`, Render vuelve a desplegar solo, con un corte de unos segundos mientras se reinicia; con disco no hay despliegue sin corte.

Las variables que ya trae `render.yaml` son:

- `DATABASE_URL=file:/data/wiki.db` y `UPLOAD_DIR=/data/uploads`
- `FRONTEND_ORIGIN=https://wiki-en-equipo.vercel.app`: CORS y origen permitido para la edición en vivo
- `TRUST_PROXY=2`: el proxy de Render y el servidor de Next en Vercel; así el límite de inicios de sesión ve la IP real
- `MAX_UPLOAD_BYTES=4194304` (4 MB)

### Frontend en Vercel

En *Settings → Environment Variables*, en **Production**, define estas variables y vuelve a desplegar:

- `BACKEND_URL=https://<tu-backend>.onrender.com`
- `NEXT_PUBLIC_REALTIME_URL=wss://<tu-backend>.onrender.com/realtime`
- `NEXT_PUBLIC_COLLAB_URL=wss://<tu-backend>.onrender.com/collab`
- `NEXT_PUBLIC_MAX_UPLOAD_MB=4`: las subidas pasan por el servidor de Next, y en Vercel una función no acepta más de 4,5 MB.

Las variables `NEXT_PUBLIC_*` quedan dentro del código del navegador, así que hay que volver a desplegar después de cambiarlas.

### Copias de seguridad

Toda la información de la wiki vive en el disco de Render. Render guarda instantáneas diarias del disco y se pueden restaurar desde el panel del servicio, en *Disks*. Antes de un cambio grande, descarga una copia de `/data/wiki.db` desde la *Shell* del servicio.

Cuando haga falta más de una instancia, el siguiente paso es PostgreSQL, almacenamiento de objetos y Redis (ver [frontend/PENDIENTES_BACKEND.md](frontend/PENDIENTES_BACKEND.md)).

### Crear o actualizar los 4 usuarios en producción

> **Advertencia:** este repositorio es público y la contraseña `12345abc` está escrita en él. El equipo decidió usarla también en producción, pero así cualquier persona que lea el repositorio puede entrar con esas cuentas, incluida la de administrador. Conviene cambiar las contraseñas en cuanto el equipo empiece a usar la wiki (cada persona: su nombre en la barra lateral → **Mi cuenta** → Cambiar contraseña).

**Nunca** borres ni reinicies la base de producción y **nunca** corras `npm run seed` contra ella (crea páginas de ejemplo y solo sirve con una base vacía). Primero despliega en el backend la versión que acepta contraseñas de 8 caracteres.

1. **Si la base de producción todavía no tiene usuarios**, crea el administrador una sola vez (pide `BOOTSTRAP_SECRET` a quien configuró el backend):

   ```bash
   curl -X POST https://<tu-backend>.onrender.com/api/auth/bootstrap -H "Content-Type: application/json" -d '{"name":"Administrador","email":"adminwiki@grupocomidas.com","password":"12345abc","departmentName":"Tecnología","secret":"<BOOTSTRAP_SECRET>"}'
   ```

   Si responde 409, la base ya tiene usuarios: no pasa nada, sigue con el paso 2.
2. Entra a la wiki con un administrador y abre **Administración → Usuarios**.
3. Si faltan los departamentos **Contabilidad** o **Compras**, créalos en esa misma pantalla.
4. Crea cada usuario que falte con **Nuevo usuario**, con su nombre, correo, rol y departamento de la tabla de [Usuarios de prueba](#usuarios-de-prueba) y la contraseña `12345abc`.
5. **Si alguno de esos correos ya existe**, no lo crees otra vez: en **Administración → Usuarios** puedes corregir su nombre, rol y departamento. La wiki no deja que un administrador cambie la contraseña de otra persona; esa persona tiene que entrar con su contraseña actual y cambiarla en **Mi cuenta**.
6. Comprueba que cada uno puede iniciar sesión.

## Seguridad

No guardes contraseñas, tokens, claves privadas ni datos reales de usuarios en este repositorio. Antes de publicar cambios, revisa que no incluyan secretos ni información interna que no deba ser pública.
