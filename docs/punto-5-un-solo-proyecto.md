# Punto 5 — Un solo proyecto de Vercel (Paso A: plan)

Fecha: 20/10/2026. Estado: **propuesta, sin cambiar nada todavía**. Falta tu confirmación para el Paso B.

## Lo que se busca

Que la wiki viva en **un solo proyecto de Vercel** (`wiki-grupo-comidas`), con el backend servido **dentro del mismo proyecto** en la misma dirección (`https://wiki-grupo-comidas.vercel.app/api/*`), sin tocar los datos ni cambiar la dirección ni el diseño, todo en el plan gratis y sin tarjeta.

## Cómo está hoy

| Pieza | Proyecto | Carpeta raíz | Dirección |
|---|---|---|---|
| Interfaz (Next.js) | `wiki-grupo-comidas` | `frontend` | https://wiki-grupo-comidas.vercel.app |
| API (Express + Prisma + Turso) | `wiki-en-equipo-backend` | `backend` | https://wiki-en-equipo-backend.vercel.app |

- Los dos están conectados a **tu copia** `carlos388mendoza/wiki-en-equipo` (rama `main`), que se sincroniza con `main` del repo principal.
- El servidor de Next llama al backend con `BACKEND_URL` (hoy la dirección del proyecto del backend).
- La IP real del login viaja de Next al backend en `X-Wiki-Client-Ip` firmada con `PROXY_SECRET`, porque Vercel reescribe `X-Forwarded-For` entre funciones.
- En producción la edición en vivo va por **consultas HTTP** (`https://…backend…/api/collab`), no por WebSocket.
- Los archivos se guardan en Turso (`FILE_STORAGE=database`) y se entregan por streaming; las subidas grandes van en partes de 3 MB.

## La forma más simple y segura de unirlos: **Vercel Services**

Vercel tiene una función pensada justo para esto: **Services** (en Beta, **disponible en todos los planes, incluido el gratis**). Permite que **un mismo proyecto** tenga varios "servicios" (la interfaz en `/` y la API en `/api`) con **un solo dominio**, **una sola publicación** y **las mismas variables de entorno**.

Lo confirmé hoy en la documentación oficial:
- `vercel.com/docs/services`: "Services are available in Beta on **all plans**".
- `vercel.com/docs/services/pricing`: en Hobby (gratis) incluye **1.000.000 de peticiones entre servicios** al mes, y el cómputo se cobra igual que las funciones de Vercel (ya cubierto por lo que usamos hoy).
- Funciona con `framework: "express"` (nuestro backend) junto a Next.js, y **soporta WebSockets**.

### Cómo se vería (idea, no definitivo)

Un `vercel.json` en la raíz del repo:

```json
{
  "services": {
    "web":  { "root": "frontend/" },
    "api":  { "root": "backend/", "entrypoint": "src/app.ts" }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "api" } },
    { "source": "/(.*)",     "destination": { "service": "web" } }
  ]
}
```

- Todo lo que empiece con `/api/` va a la API; lo demás, a la interfaz. **Misma dirección**, un solo proyecto.
- La configuración de compilación de cada parte (`framework`, `buildCommand`, `installCommand`) se mueve **dentro** de cada servicio (Vercel lo exige cuando hay `services`).
- El proyecto pasa a tener **carpeta raíz = la del repo** (hoy es `frontend`), porque necesita ver `frontend/`, `backend/`, `shared/` y `assets/`.

### ¿Por qué esta y no otra?

- **Reescritura interna** (`rewrites` a otro dominio): funcionaría, pero seguiría habiendo **dos proyectos** y no es lo que pediste.
- **Meter la API como funciones de Next** (`app/api/…`): obligaría a reescribir todo el backend (Express → rutas de Next), mucho más riesgo y trabajo.
- **Vercel Services** es lo único que logra *un solo proyecto, una sola dirección, sin reescribir el backend*.

## Todo lo que hay que revisar (y cómo queda)

| Tema | Hoy | Con el proyecto único | Riesgo |
|---|---|---|---|
| Dirección | `https://wiki-grupo-comidas.vercel.app` | igual | ninguno |
| Login y cookies | Next llama al backend por `BACKEND_URL`; cookie `wiki_token` httpOnly | igual, solo cambia que `BACKEND_URL` apunta al mismo dominio | bajo |
| IP real del login | `X-Wiki-Client-Ip` firmada con `PROXY_SECRET` | **igual** (el flujo no cambia; `PROXY_SECRET` se mantiene) | bajo |
| Edición en vivo `/api/collab` | HTTP cada 5 s contra el proyecto del backend | igual, contra el mismo dominio (`/api/collab`) | bajo |
| WebSockets locales | `/collab` y `/realtime` en `localhost:4000` | **igual** (el modo local no se toca) | ninguno |
| Archivos y límites | subidas en partes de 3 MB, entrega por streaming, 20 MB | igual | ninguno |
| Migraciones de Turso al compilar | `vercel-build` del proyecto del backend | se mueve al servicio `api`; **la misma base, sin borrar nada** | medio (probar) |
| Cron de la papelera | `crons` en `backend/vercel.json` | pasa al `vercel.json` de la raíz, con la misma ruta `/api/cron/papelera` | bajo |
| CORS | cruzado (dos dominios) | **ya no hace falta** (mismo origen); se deja igual por si acaso o se retira si el local sigue bien | bajo |
| `BACKEND_URL` | dirección del proyecto del backend | la del proyecto único | bajo |
| Service worker | guarda páginas y estáticos | sin cambios | ninguno |
| Publicación automática | la copia se sincroniza y Vercel publica **dos** proyectos | Vercel publica **uno**; hay que ajustar el flujo (ver abajo) | medio |

## Tamaño del cambio

- **Pequeño en código:** un `vercel.json` nuevo en la raíz, mover la config del backend a un servicio, y quitar el CORS cruzado si el local sigue bien. **Nada de tocar la lógica ni los datos.**
- **Medio en configuración de Vercel:** cambiar la carpeta raíz del proyecto y su tipo (de Next.js a Services), mover las variables de entorno del backend al proyecto único, y ajustar el `vercel.json` del backend.
- **Medio en publicaciones:** de "dos proyectos" a "uno".

## Riesgos y cómo los cubro

1. **Variables de entorno.** El backend necesita `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `PROXY_SECRET`, `CRON_SECRET`, `FILE_STORAGE`, `MAX_UPLOAD_BYTES`, etc. Hay que **copiarlas** al proyecto único. Si alguna no se puede leer (Vercel marca algunas como sensibles), **te aviso cuál y te digo exactamente dónde pegarla**, sin imprimirla ni subirla al repo.
2. **`JWT_SECRET`.** **No lo cambio.** Si se pierde, se cierran todas las sesiones. Lo copio tal cual.
3. **La base de datos.** Es la **misma de Turso**; no se borra ni se reescribe. La migración que ya corrió (anclar/archivar/subidas) no se repite con daño: es aditiva.
4. **Volver atrás.** Mientras no borre el proyecto del backend, si algo falla en producción puedo devolver `BACKEND_URL` a la dirección vieja y todo queda como hoy. **Solo borro `wiki-en-equipo-backend` cuando tú confirmes que todo funciona.**
5. **Modo local.** No se toca: SQLite, WebSockets y las pruebas siguen igual.

## Publicación automática: lo que encontré (importante)

Hoy la publicación automática **está rota** y hay que arreglarla aparte del punto 5:

- El flujo `Sincronizar la copia que publica Vercel` **sí corre en el repo principal** (ahí no hace nada a propósito).
- Pero en **tu copia** (`carlos388mendoza/wiki-en-equipo`) **nunca corre el temporizador**: GitHub **desactiva los flujos programados en las copias por defecto**, y hay que **activarlos una vez a mano** en la página de Actions de la copia. Lo comprobé: en el repo principal hay 2 ejecuciones programadas; en la copia, **0**.

**Opciones (elige una):**

- **A (la más simple):** tú entras una vez a `https://github.com/carlos388mendoza/wiki-en-equipo/actions` y presionas **Enable workflow** (o "I understand my workflows, go ahead and enable them"). Es un clic. A partir de ahí debería correr cada 5 minutos.
- **B (sin entrar a GitHub):** dejo el flujo en el repo principal (que sí corre) y le agrego un paso que avise a tu copia usando un **token personal**. Requiere que crees un token y lo pegues como *secret* (te digo exactamente dónde y cómo). Nunca lo veré ni lo subiré al repo.

Con el **punto 5**, además, la publicación se simplifica: como todo es **un solo proyecto**, Vercel publica la interfaz y la API juntas en cada sincronización de la copia.

## Qué haría en el Paso B (después de tu "sí")

1. Rama nueva desde `main`.
2. `vercel.json` en la raíz con los dos servicios y las reescrituras.
3. Mover la configuración del backend a su servicio; arreglar `.vercelignore` (hoy **excluye `backend/`**, lo que impediría compilar la API en el proyecto único).
4. Quitar el CORS cruzado y `BACKEND_URL` cruzado **solo si el local sigue funcionando**; si no, se dejan.
5. Mover las variables del backend al proyecto `wiki-grupo-comidas` (sin imprimirlas ni escribirlas en el repo) y avisarte de cualquiera que no pueda leer.
6. Correr **todas** las pruebas y compilaciones, y probar en local simulando producción: login, crear/editar, subir imagen, compartir, edición en vivo con dos usuarios, los dos casos de permisos y el menú ⋯.
7. PR → unir a `main` → comprobar que la publicación automática deja todo andando en producción.
8. Ajustar la publicación automática al esquema de un solo proyecto.
9. Borrar `wiki-en-equipo-backend` **solo cuando tú confirmes** que todo funciona (o te digo cómo).
10. Actualizar `CLAUDE.md` y `README.md`.

## Lo que necesito de ti para seguir

1. **¿De acuerdo con el plan?** (sí / no / cambiar algo)
2. **Publicación automática:** ¿opción **A** (activar el flujo en la copia, un clic) u **opción **B** (token personal)?
