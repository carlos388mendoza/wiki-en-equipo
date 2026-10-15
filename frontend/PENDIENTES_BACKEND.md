# Pendientes para el backend

Lo que el frontend necesitaba del backend se resolvió en el PR #2 (rama `backend-pendientes`): directorio para invitar, `trust proxy`, visitas, servidor Yjs, nombres con acceso, compartir plantillas, listados con fondo, icono y autor, campo de icono, `myPermission`, visitas en la página, tipos de bloque, departamentos (403/404, descripción e icono), enlaces compartidos, archivos de plantillas, historial con autoguardado, listado de plantillas con fondo, destacadas de la empresa, vaciar papelera, ruta de páginas superiores, usuarios inactivos y búsqueda en el contenido. El detalle está en `backend/README.md`.

Queda un punto, que no depende del código sino de decisiones de infraestructura.

## Varias instancias del backend (baja prioridad)

- **Problema:** las salas de edición en vivo (`/collab`) y de avisos (`/realtime`) viven en la memoria de un solo proceso, y los archivos se guardan en el disco local. Con dos o más instancias detrás de un balanceador, dos personas en instancias distintas no se verían en vivo y cada instancia tendría sus propios archivos.
- **Por qué no se resolvió:** necesita servicios que el equipo debe elegir y operar: un bus compartido (por ejemplo Redis, con un adaptador de Yjs para retransmitir las actualizaciones y la presencia) y un almacenamiento de objetos para los archivos (por ejemplo S3 o Azure Blob). Además, la base de datos de producción todavía es SQLite, que tampoco admite varias instancias.
- **Mientras tanto:** una sola instancia del backend. El estado de la edición en vivo ya se guarda en la base de datos (`PageCollabState`), así que un reinicio no pierde lo escrito.
- **Cambio en el frontend después:** ninguno.
