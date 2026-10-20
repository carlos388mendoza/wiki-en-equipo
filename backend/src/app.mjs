/**
 * Entrada del servicio "api" en el proyecto único de Vercel (ver vercel.json de la raíz).
 *
 * Por qué existe: en el modelo de Servicios, Vercel exige que el `entrypoint` exista antes de compilar y,
 * como el servicio usa el framework Express, carga la entrada con `require()` si la ve como CommonJS. Un
 * archivo `.mjs` siempre se carga como módulo ESM, así que el servicio arranca bien.
 *
 * `bundle.mjs` lo genera la compilación (`pnpm run vercel-build`, ver package.json): es la aplicación
 * completa (src/app.ts y todo lo suyo) empaquetada en un solo archivo ESM. No se versiona.
 *
 * La importación de "express" de abajo solo sirve para que Vercel reconozca este archivo como la entrada
 * del framework Express (busca esa palabra en el contenido); el paquete real está en bundle.mjs.
 */
import "express";
export { default } from "./bundle.mjs";
