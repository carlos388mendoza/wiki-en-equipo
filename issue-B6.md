Archivo: frontend/app/share/[token]/page.tsx

Problema: Landing dice "página" también para plantillas → confusión UX.

Solución: Detectar type === 'TEMPLATE' y mostrar "plantilla".