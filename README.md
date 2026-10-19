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

Todo con planes gratis y **sin tarjeta**: frontend en Vercel, backend en Back4App Containers y base de datos en Turso.

### Dónde corre cada parte

- **Frontend:** Vercel, con la carpeta raíz `frontend`. Dirección: https://wiki-en-equipo.vercel.app. Cada PR genera su propia vista previa.
- **Backend:** Back4App Containers, plan **Free**: un contenedor Docker construido con [`backend/Dockerfile`](backend/Dockerfile). Dirección: `https://<tu-backend>.b4a.run`.
- **Base de datos:** Turso, que es SQLite en la nube, también gratis. El backend usa el mismo esquema y las mismas migraciones que en local.
- **Archivos subidos:** dentro de la base de datos (`FILE_STORAGE=database`), porque el contenedor no tiene disco permanente. Límite de 4 MB por archivo.

### Por qué Back4App

Se compararon en octubre de 2026 los servicios que publican un servidor Node.js gratis:

| Servicio | Tarjeta | WebSockets | Resultado |
|---|---|---|---|
| **Back4App Containers** | No | Sí | Elegido. 0,25 CPU, 256 MB de RAM y 100 GB de tráfico al mes; el backend usa unos 60–90 MB |
| Koyeb | Sí, retención de US$29 desde febrero de 2026 | — | Descartado |
| Hugging Face Spaces | No | — | Descartado: Docker pide PRO desde julio de 2026 |
| SnapDeploy | No | Solo pagando "Always-On" | Descartado |
| Railway | No para la prueba | — | Descartado: crédito único de US$5, luego US$1 al mes |

Lo que hay que vigilar en Back4App, porque su documentación no lo aclara:
- si el contenedor gratis se detiene por inactividad o por tiempo;
- cuánto tarda en volver.

Si se reinicia no se pierde nada: todo vive en Turso. La edición en vivo se reconecta sola y el frontend espera hasta 60 s a que el backend responda.

### Cómo funciona la base en Turso

- Con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`, Prisma usa el adaptador de libSQL (`@prisma/adapter-libsql`). Sin ellas, en local y en las pruebas, usa el archivo de `DATABASE_URL` sin internet.
- `prisma migrate deploy` no llega a Turso. Por eso, **al arrancar**, el backend aplica las migraciones de `backend/models/migrations` que falten:
  - en orden, cada una en una transacción, junto con su registro en `_prisma_migrations`;
  - si una falla, se deshace completa y el servidor no arranca;
  - nunca borra datos.
- Para aplicarlas a mano: `cd backend && pnpm run db:deploy:turso`, con las dos variables definidas.
- Para probar todo como en producción, sin internet: `cd backend && corepack pnpm run test:turso`.

### La imagen del backend

`backend/Dockerfile` compila el backend en una etapa y deja una imagen final con solo lo necesario:
- Node 22;
- corre con el usuario `node`, sin permisos de administrador;
- las migraciones van dentro de la imagen.

Ya trae los valores fijos de producción:

| Variable | Valor |
|---|---|
| `PORT` | `8080` (el que expone la imagen) |
| `FILE_STORAGE` | `database` |
| `FRONTEND_ORIGIN` | `https://wiki-en-equipo.vercel.app` |
| `TRUST_PROXY` | `2` (el proxy del servicio y el servidor de Next en Vercel) |
| `MAX_UPLOAD_BYTES` | `4194304` (4 MB) |
| `NODE_ENV` | `production` |

Los secretos nunca van en la imagen: se pegan en el panel del servicio. `backend/.dockerignore` deja fuera `.env`, las bases locales y los archivos subidos.

Para probarla en local, con Docker y una base libSQL dentro del contenedor:

```bash
cd backend && docker build -t wiki-backend .
```

```bash
docker run --rm -p 4000:8080 -e TURSO_DATABASE_URL=file:/tmp/prueba.db -e JWT_SECRET=<32+ caracteres> -e BOOTSTRAP_SECRET=<texto> -e FRONTEND_ORIGIN=http://localhost:3000 wiki-backend
```

Después `curl http://localhost:4000/health` debe responder `{"status":"ok"}`, y con el frontend en local funcionan `npm run seed` y `npm test`.

### 1. Base de datos en Turso

1. Entra a https://turso.tech y crea una cuenta gratis con **GitHub**.
2. Crea una base (*Create Database*) llamada `wiki-en-equipo`, en la región **AWS US East (Virginia)**, la más cercana a Honduras.
3. Abre la base y copia su **URL**, que empieza con `libsql://`.
4. En la misma página crea un **token** (*Create Token* o *Generate Token*), con permiso de lectura y escritura y sin vencimiento. Cópialo: solo se muestra una vez.

Esos dos valores van en Back4App, nunca en el repositorio. Las tablas las crea el backend la primera vez que arranca.

### 2. Backend en Back4App Containers

1. Entra a https://www.back4app.com/signup-containers y crea una cuenta con **GitHub**. El plan Free no pide tarjeta.
2. Crea una app nueva de **Containers** y elige **Import GitHub Repo**. GitHub te pide instalar la app de Back4App: dale acceso solo al repositorio `vbgjptt89g-beep/wiki-en-equipo`.
3. Configura la app:
   - **App Name:** `wiki-en-equipo-backend`
   - **Branch:** `main`
   - **Root** (carpeta raíz): `./backend`, donde está el Dockerfile
   - **Auto-Deploy:** activado
4. En **Environment Variables** agrega estas cuatro, cada una con su valor:
   - `TURSO_DATABASE_URL`: la URL `libsql://…` de Turso
   - `TURSO_AUTH_TOKEN`: el token de Turso
   - `JWT_SECRET`: un texto aleatorio de 32 caracteres o más
   - `BOOTSTRAP_SECRET`: otro texto aleatorio, distinto

   Las demás ya vienen en la imagen. Para generar cada texto aleatorio:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Create App** o **Deploy**. En los registros (*Logs*) deben aparecer las migraciones aplicadas y `Wiki en equipo API escuchando…`.
6. Copia la dirección de la app (`https://….b4a.run`) y abre `/health` en ella. Debe responder `{"status":"ok"}`.

### 3. Frontend en Vercel

En *Settings → Environment Variables*, en **Production**, define estas variables y vuelve a desplegar:

- `BACKEND_URL=https://<tu-backend>.b4a.run`
- `NEXT_PUBLIC_REALTIME_URL=wss://<tu-backend>.b4a.run/realtime`
- `NEXT_PUBLIC_COLLAB_URL=wss://<tu-backend>.b4a.run/collab`
- `NEXT_PUBLIC_MAX_UPLOAD_MB=4`: las subidas pasan por el servidor de Next, y en Vercel una función no acepta más de 4,5 MB.

Las variables `NEXT_PUBLIC_*` quedan dentro del código del navegador, así que hay que volver a desplegar después de cambiarlas.

### Copias de seguridad

Toda la información de la wiki vive en Turso. Antes de un cambio grande, saca una copia desde el panel de Turso o con su herramienta de línea de comandos (`turso db shell wiki-en-equipo .dump > copia.sql`).

### Crear o actualizar los 4 usuarios en producción

> **Advertencia:** este repositorio es público y la contraseña `12345abc` está escrita en él. El equipo decidió usarla también en producción, pero así cualquier persona que lea el repositorio puede entrar con esas cuentas, incluida la de administrador. Conviene cambiar las contraseñas en cuanto el equipo empiece a usar la wiki (cada persona: su nombre en la barra lateral → **Mi cuenta** → Cambiar contraseña).

**Nunca** borres ni reinicies la base de producción y **nunca** corras `npm run seed` contra ella (crea páginas de ejemplo y solo sirve con una base vacía). Primero despliega en el backend la versión que acepta contraseñas de 8 caracteres.

1. **Si la base de producción todavía no tiene usuarios**, crea el administrador una sola vez (pide `BOOTSTRAP_SECRET` a quien configuró el backend):

   ```bash
   curl -X POST https://<tu-backend>.b4a.run/api/auth/bootstrap -H "Content-Type: application/json" -d '{"name":"Administrador","email":"adminwiki@grupocomidas.com","password":"12345abc","departmentName":"Tecnología","secret":"<BOOTSTRAP_SECRET>"}'
   ```

   Si responde 409, la base ya tiene usuarios: no pasa nada, sigue con el paso 2.
2. Entra a la wiki con un administrador y abre **Administración → Usuarios**.
3. Si faltan los departamentos **Contabilidad** o **Compras**, créalos en esa misma pantalla.
4. Crea cada usuario que falte con **Nuevo usuario**, con su nombre, correo, rol y departamento de la tabla de [Usuarios de prueba](#usuarios-de-prueba) y la contraseña `12345abc`.
5. **Si alguno de esos correos ya existe**, no lo crees otra vez: en **Administración → Usuarios** puedes corregir su nombre, rol y departamento. La wiki no deja que un administrador cambie la contraseña de otra persona; esa persona tiene que entrar con su contraseña actual y cambiarla en **Mi cuenta**.
6. Comprueba que cada uno puede iniciar sesión.

## Seguridad

No guardes contraseñas, tokens, claves privadas ni datos reales de usuarios en este repositorio. Antes de publicar cambios, revisa que no incluyan secretos ni información interna que no deba ser pública.
