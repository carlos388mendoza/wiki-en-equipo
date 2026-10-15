Archivo: frontend/lib/api/index.ts:259

Problema: deletePage fija visibility: "PRIVATE" hardcodeado al mover a papelera → pierde visibilidad original al restaurar.

Solución: Guardar originalVisibility en PageCollabState o campo nuevo; restaurar ese valor.