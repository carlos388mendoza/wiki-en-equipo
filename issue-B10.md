Archivo: frontend/app/actions/sync.ts:49-51

Problema: Tags perdidos en fallo de sync; borrador offline huérfano → transacción no atómica.

Solución: Guardar tags + contenido juntos; limpiar borrador offline en finally.