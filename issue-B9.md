Archivo: backend/api/routes.ts (preexistente en main)

Problema: 403 vs 404 inconsistente en recursos inexistentes → fuga de existencia.

Solución: Normalizar a 404 para "no encontrado" salvo que exista y falte permiso (403).