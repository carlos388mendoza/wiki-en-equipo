Archivo: frontend/components/editor/PageEditor.tsx:248

Problema: Retry de conflicto sin límite (while (true)) → posible bucle infinito bajo contención alta.

Solución: Añadir maxRetries (ej. 3) + backoff exponencial; tras agotar, notificar al usuario.