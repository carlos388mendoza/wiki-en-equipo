Archivo: frontend/lib/api/index.ts

Problema: take: 100 en listados oculta bloques de sub-página si hay >100.

Solución: Paginación real (cursor/offset) o take: -1 con límite server-side razonable.