import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Crea models/test.db desde cero con las migraciones del backend antes de correr las pruebas. */
export default function setup() {
  const backend = fileURLToPath(new URL("../../backend/", import.meta.url));
  for (const name of ["test.db", "test.db-journal"]) rmSync(fileURLToPath(new URL(`../../backend/models/${name}`, import.meta.url)), { force: true });
  execSync("corepack pnpm exec prisma migrate deploy --schema models/schema.prisma", {
    cwd: backend,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
