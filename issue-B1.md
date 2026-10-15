Archivo: frontend/app/(wiki)/paginas/[id]/historial/page.tsx:37

Problema: El botón "Restaurar" se muestra en páginas con visibility: "COMPANY" para usuarios que no son ADMIN, pero el mensaje dice "solo ADMIN puede restaurar".

Solución: Gate: canEditPage && (page.visibility !== 'COMPANY' || session.role === 'ADMIN').