import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Crea models/test.db desde cero con las migraciones del backend antes de correr las pruebas. */
export default function setup() {
  const backend = fileURLToPath(new URL("../../backend/", import.meta.url));
  for (const name of ["test.db", "test.db-journal"]) rmSync(fileURLToPath(new URL(`../../backend/models/${name}`, import.meta.url)), { force: true });
  // Con --mode turso, las migraciones las aplica el migrador de Turso (como en producción) en lugar de Prisma.
  const turso = process.env.WIKI_TEST_TURSO === "1";
  const testDb = fileURLToPath(new URL("../../backend/models/test.db", import.meta.url)).replaceAll("\\", "/");
  execSync(turso ? "corepack pnpm exec tsx models/deploy-turso.ts" : "corepack pnpm exec prisma migrate deploy --schema models/schema.prisma", {
    cwd: backend,
    env: { ...process.env, DATABASE_URL: "file:./test.db", ...(turso && { TURSO_DATABASE_URL: `file:${testDb}`, TURSO_AUTH_TOKEN: "" }) },
    stdio: "pipe",
  });
}
