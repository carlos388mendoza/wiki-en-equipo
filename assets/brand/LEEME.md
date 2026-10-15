# Logo de Grupo Comidas

`logo-grupo-comidas.png` es el logo oficial original: circular, con borde rojo y fondo blanco, 1024 × 1024 px y las esquinas transparentes. Es propiedad de Grupo Comidas: úsalo solo en herramientas internas del grupo.

La wiki usa copias redimensionadas (con alta calidad y las esquinas transparentes):

| Archivo | Tamaño | Uso |
|---|---|---|
| `frontend/public/brand/logo-grupo-comidas.png` | 512 × 512 | Logo en la barra lateral, la barra superior del celular, el inicio de sesión, el icono `marca:grupo-comidas` de las páginas y el icono de 512 px de la app instalable |
| `frontend/public/brand/icon-192.png` | 192 × 192 | Icono de 192 px de la app instalable (`frontend/app/manifest.ts`) |
| `frontend/app/icon.png` | 32 × 32 | Favicon de la pestaña (convención de Next.js) |
| `frontend/app/icon1.png` | 192 × 192 | Favicon para pantallas de alta densidad |
| `frontend/app/apple-icon.png` | 180 × 180 | Icono de la pantalla de inicio en iPhone y iPad. Lleva fondo blanco porque iOS pinta de negro las zonas transparentes |

Si cambia el logo, reemplaza este archivo y vuelve a generar las copias con los mismos tamaños, conservando la transparencia de las esquinas excepto en `apple-icon.png`.
