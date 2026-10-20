#!/usr/bin/env node
/**
 * Copia los iconos 3D de `assets/templates/3dicons/` (fuente en el repo) a `public/iconos/3d/`, donde Next los
 * sirve. Se ejecuta antes de dev y build. `public/iconos/3d/` no se sube a git: si falta la carpeta fuente (por
 * ejemplo, un despliegue que solo incluye `frontend/`) y no hay iconos ya copiados, la compilación se detiene
 * en lugar de publicar la wiki sin iconos.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "..", "assets", "templates", "3dicons");
const to = join(root, "public", "iconos", "3d");
mkdirSync(to, { recursive: true });

if (existsSync(from)) {
  const files = readdirSync(from).filter((f) => f.endsWith(".webp"));
  for (const f of files) copyFileSync(join(from, f), join(to, f));
  console.log(`Iconos 3D: ${files.length} copiados a public/iconos/3d.`);
} else if (readdirSync(to).some((f) => f.endsWith(".webp"))) {
  console.log("Iconos 3D: no está assets/templates/3dicons; se usan los que ya hay en public/iconos/3d.");
} else {
  console.error("Iconos 3D: falta assets/templates/3dicons. Despliega desde la raíz del repositorio (carpeta raíz: frontend).");
  process.exit(1);
}

/*
 * Iconos de Lucide (#46): un SVG por icono en `public/iconos/lucide/<nombre>.svg`, hecho con los trazos de
 * lucide-react (la misma versión que la app). La wiki los dibuja como máscara, así una página con cualquier
 * icono no carga código de más. El índice con las etiquetas (en inglés, de lucide-static) va en `indice.json`
 * y el selector lo pide solo al abrirse.
 */
const lucideFrom = join(root, "node_modules", "lucide-react", "dist", "esm", "icons");
const lucideTo = join(root, "public", "iconos", "lucide");
const tagsFile = join(root, "..", "assets", "lucide", "etiquetas.json");
if (existsSync(lucideFrom) && existsSync(tagsFile)) {
  mkdirSync(lucideTo, { recursive: true });
  const { etiquetas } = JSON.parse(readFileSync(tagsFile, "utf8"));
  let made = 0;
  for (const name of Object.keys(etiquetas)) {
    const source = join(lucideFrom, `${name}.js`);
    if (!existsSync(source)) continue;
    const match = readFileSync(source, "utf8").match(/createLucideIcon\("[^"]+", (\[[\s\S]*\])\);/);
    if (!match) continue;
    const nodes = Function(`"use strict"; return (${match[1]});`)();
    const body = nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
    writeFileSync(join(lucideTo, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);
    made++;
  }
  writeFileSync(join(lucideTo, "indice.json"), JSON.stringify(etiquetas));
  console.log(`Iconos de Lucide: ${made} generados en public/iconos/lucide.`);
} else if (!existsSync(join(lucideTo, "indice.json"))) {
  console.error("Iconos de Lucide: falta lucide-react o assets/lucide/etiquetas.json.");
  process.exit(1);
}

/* Emojis con nombres y etiquetas en español (emojibase-data, #46): el selector los pide solo al abrirse. */
const emojisFrom = join(root, "..", "assets", "emojis", "es.json");
if (existsSync(emojisFrom)) {
  copyFileSync(emojisFrom, join(root, "public", "iconos", "emojis-es.json"));
  console.log("Emojis: índice en español copiado a public/iconos/emojis-es.json.");
} else if (!existsSync(join(root, "public", "iconos", "emojis-es.json"))) {
  console.error("Emojis: falta assets/emojis/es.json.");
  process.exit(1);
}
