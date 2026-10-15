# Issues B1–B11 (Hallazgos bajos de la revisión de PRs)

## B1: Restaurar visible en páginas COMPANY para no-ADMIN con mensaje erróneo
**Archivo**: `frontend/app/(wiki)/paginas/[id]/historial/page.tsx:37`
**Problema**: El botón "Restaurar" se muestra en páginas con `visibility: "COMPANY"` para usuarios que no son ADMIN, pero el mensaje dice "solo ADMIN puede restaurar".
**Solución**: Gate: `canEditPage && (page.visibility !== 'COMPANY' || session.role === 'ADMIN')`.

---

## B2: `deletePage` fija `visibility: "PRIVATE"` hardcodeado al mover a papelera
**Archivo**: `frontend/lib/api/index.ts:259`
**Problema**: Al mover a papelera se pierde la visibilidad original; al restaurar no se recupera.
**Solución**: Guardar `originalVisibility` en `PageCollabState` o campo nuevo; restaurar ese valor.

---

## B3: Niveles de heading incoherentes entre `blocks.ts` y `convert.ts`
**Archivos**: `frontend/components/editor/blocks.ts:120` (usa 1) vs `frontend/lib/editor/convert.ts:166` (usa 3)
**Problema**: Inconsistencia visual/export.
**Solución**: Unificar a convención única (recomendado: 1–6 según profundidad real).

---

## B4: Retry de conflicto sin límite en `PageEditor.tsx`
**Archivo**: `frontend/components/editor/PageEditor.tsx:248`
**Problema**: `while (true)` sin `maxRetries` → posible bucle infinito bajo contención alta.
**Solución**: Añadir `maxRetries` (ej. 3) + backoff exponencial; tras agotar, notificar al usuario.

---

## B5: `getDirectoryUsers` carga todos los usuarios en memoria sin paginación
**Archivo**: `backend/services/auth-service.ts:93`
**Problema**: OOM en empresas grandes.
**Solución**: Añadir `take`/`skip` + búsqueda server-side; exponer paginación en API.

---

## B6: Landing `/share/[token]` dice "página" también para plantillas
**Archivo**: `frontend/app/share/[token]/page.tsx`
**Problema**: Confusión UX.
**Solución**: Detectar `type === 'TEMPLATE'` y mostrar "plantilla".

---

## B7: `app/(wiki)/page.tsx` sin `metadata` export
**Archivo**: `frontend/app/(wiki)/page.tsx`
**Problema**: SEO/og nulos.
**Solución**: Añadir `export const metadata = { title: 'Wiki Grupo Comidas', ... }`.

---

## B8: `canView` exportado pero no usado (código muerto)
**Archivo**: `frontend/lib/permissions.ts`
**Problema**: Duplicado de `canReadPage`.
**Solución**: Eliminar o usar en lugar de `canReadPage` duplicado.

---

## B9: 403 vs 404 inconsistente en recursos inexistentes (preexistente en `main`)
**Archivo**: `backend/api/routes.ts`
**Problema**: Fuga de existencia de recursos.
**Solución**: Normalizar a 404 para "no encontrado" salvo que exista y falte permiso (403).

---

## B10: Tags perdidos en fallo de sync; borrador offline huérfano
**Archivo**: `frontend/app/actions/sync.ts:49-51`
**Problema**: Transacción no atómica.
**Solución**: Guardar tags + contenido juntos; limpiar borrador offline en `finally`.

---

## B11: `take: 100` en listados oculta bloques de sub-página si hay >100
**Archivo**: `frontend/lib/api/index.ts`
**Problema**: Paginación dura.
**Solución**: Paginación real (`cursor`/`offset`) o `take: -1` con límite server-side razonable.