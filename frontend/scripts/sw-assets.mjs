#!/usr/bin/env node
/**
 * Se ejecuta después de `npm run build` (postbuild). Genera `public/sw-build.js`
 * con el id de la compilación y la lista de archivos estáticos, para que el
 * service worker los guarde y el editor funcione sin conexión.
 * El archivo generado no se sube al repositorio.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = join(root, ".next", "static");
const buildId = readFileSync(join(root, ".next", "BUILD_ID"), "utf8").trim();

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(js|css|woff2?)$/.test(name)) files.push(`/_next/static/${relative(staticDir, full).split(sep).join("/")}`);
  }
})(staticDir);

writeFileSync(
  join(root, "public", "sw-build.js"),
  `// Generado por scripts/sw-assets.mjs. No editar.\nself.WIKI_BUILD = ${JSON.stringify(buildId)};\nself.WIKI_ASSETS = ${JSON.stringify(files)};\n`,
);
console.log(`Service worker: ${files.length} archivos estáticos (compilación ${buildId}).`);
