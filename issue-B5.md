Archivo: backend/services/auth-service.ts:93

Problema: getDirectoryUsers carga todos los usuarios en memoria (sin paginación) → OOM en empresas grandes.

Solución: Añadir take/skip + búsqueda server-side; exponer paginación en API.