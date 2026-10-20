# Iconos 3D

Fuente: [3dicons](https://3dicons.co) de Vijay Verma, colección v1, estilo "color", ángulo "dynamic" (WEBP).
Licencia: **CC0** (dominio público). Se pueden usar en proyectos personales y comerciales sin atribución.

- 120 iconos (unos 540 KB en total). El fondo blanco original se volvió transparente.
- Los 8 primeros tienen nombre en español porque los usan las plantillas por defecto (400 px). Los demás
  conservan su nombre de 3dicons (200 px, 20 de octubre de 2026). Se dejaron fuera los logos de marcas
  (Figma, Minecraft, Blender) y los que repetían alguno de los 8.
- Las palabras en español para buscarlos están en `frontend/lib/icons-3d.ts` (`THREE_D_KEYWORDS`).

| Archivo | Icono original | Plantilla |
|---|---|---|
| documentacion.webp | 628100-notebook | Documentación general |
| bienvenida.webp | 1acc3d-heart | Bienvenido al departamento |
| inicio-departamento.webp | e9828b-flag | Página de inicio de departamento |
| proceso.webp | 1b714e-tick | Proceso paso a paso |
| acta.webp | 781f28-calendar | Acta de reunión |
| receta.webp | abab3a-takeway-cup | Receta estándar |
| apertura-cierre.webp | 778c78-key | Apertura y cierre de sucursal |
| preguntas.webp | eec43d-chat-bubble | Preguntas frecuentes |

Los demás se bajaron de `https://bvconuycpdvgzbvbkijl.supabase.co/storage/v1/object/public/sizes/<id>-<nombre>/dynamic/200/color.webp`.

El frontend los copia a `frontend/public/iconos/3d/` antes de `npm run dev` y `npm run build`
(`frontend/scripts/copy-assets.mjs`). Para agregar uno: ponlo aquí y súmalo a `THREE_D_KEYWORDS` en `frontend/lib/icons-3d.ts`.
