#!/usr/bin/env node
/**
 * Copia los iconos 3D de `assets/templates/3dicons/` (fuente en el repo) a `public/iconos/3d/`, donde Next los
 * sirve. Se ejecuta antes de dev y build. `public/iconos/3d/` no se sube a git: si falta la carpeta fuente (por
 * ejemplo, un despliegue que solo incluye `frontend/`) y no hay iconos ya copiados, la compilación se detiene
 * en lugar de publicar la wiki sin iconos.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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
