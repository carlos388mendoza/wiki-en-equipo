#!/usr/bin/env node
/** Copia los iconos 3D de `assets/templates/3dicons/` (fuente en el repo) a `public/iconos/3d/`, donde Next los sirve. Se ejecuta antes de dev y build. */
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "..", "assets", "templates", "3dicons");
const to = join(root, "public", "iconos", "3d");
mkdirSync(to, { recursive: true });

// Si la carpeta fuente existe, copiarla; si no, los iconos ya deberían estar en public/iconos/3d
try {
  const files = readdirSync(from).filter((f) => f.endsWith(".webp"));
  for (const f of files) copyFileSync(join(from, f), join(to, f));
  console.log(`Iconos 3D: ${files.length} copiados a public/iconos/3d.`);
} catch {
  console.log("Iconos 3D: carpeta fuente ausente; se usan iconos preexistentes.");
}