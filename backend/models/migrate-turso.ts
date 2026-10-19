import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Client, InStatement } from "@libsql/client";

/**
 * `prisma migrate deploy` no se conecta a Turso. Esto aplica las mismas migraciones (models/migrations) al
 * arrancar en producción: solo las que faltan, en orden, cada una en una transacción junto con su registro en
 * `_prisma_migrations` (la tabla de Prisma, con las mismas columnas). Si una falla, se deshace completa y el
 * servidor no arranca. Nunca borra tablas ni datos que no borre la propia migración.
 */
export const MIGRATIONS_DIR = path.resolve(process.env.MIGRATIONS_DIR ?? "models/migrations");

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
)`;

export type Migration = { name: string; sql: string; checksum: string };

/** Migraciones de la carpeta, ordenadas por nombre (empiezan con la fecha). */
export function readMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(dir, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      // Mismo contenido en Windows y Linux: el checksum no depende de los saltos de línea.
      const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8").replace(/\r\n/g, "\n");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    });
}

/** Separa el SQL en sentencias por `;`, sin cortar dentro de textos, identificadores entre comillas ni comentarios. */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "-" && sql[i + 1] === "-") { const end = sql.indexOf("\n", i); i = end === -1 ? sql.length : end; current += "\n"; continue; }
    if (char === "/" && sql[i + 1] === "*") { const end = sql.indexOf("*/", i + 2); i = end === -1 ? sql.length : end + 1; continue; }
    if (char === "'" || char === '"' || char === "`") {
      let end = i + 1;
      while (end < sql.length && !(sql[end] === char && sql[end + 1] !== char)) end += sql[end] === char ? 2 : 1;
      current += sql.slice(i, end + 1);
      i = end;
      continue;
    }
    if (char === ";") { if (current.trim()) statements.push(current.trim()); current = ""; continue; }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

export async function applyMigrations(client: Client, { dir = MIGRATIONS_DIR, log = console.log }: { dir?: string; log?: (message: string) => void } = {}) {
  await client.execute(CREATE_TABLE);
  const rows = (await client.execute(`SELECT "migration_name", "checksum", "finished_at", "rolled_back_at" FROM "_prisma_migrations"`)).rows;
  const applied = new Map<string, { checksum: string; finished: boolean }>();
  for (const row of rows) {
    if (row.rolled_back_at) continue;
    applied.set(String(row.migration_name), { checksum: String(row.checksum), finished: row.finished_at !== null });
  }

  const done: string[] = [];
  for (const migration of readMigrations(dir)) {
    const record = applied.get(migration.name);
    if (record && !record.finished) throw new Error(`La migración ${migration.name} quedó a medias en un intento anterior. Revísala a mano antes de volver a arrancar.`);
    if (record) {
      if (record.checksum !== migration.checksum) log(`Aviso: la migración ${migration.name} cambió después de aplicarse; no se vuelve a aplicar.`);
      continue;
    }
    const statements: InStatement[] = splitStatements(migration.sql);
    statements.push({
      sql: `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count") VALUES (?, ?, current_timestamp, ?, current_timestamp, 1)`,
      args: [randomUUID(), migration.checksum, migration.name],
    });
    try {
      // batch "write": todo en una transacción; si una sentencia falla, no queda nada aplicado.
      await client.batch(statements, "write");
    } catch (error) {
      throw new Error(`No se pudo aplicar la migración ${migration.name} (se deshizo completa): ${error instanceof Error ? error.message : String(error)}`);
    }
    done.push(migration.name);
    log(`Base de datos: migración ${migration.name} aplicada.`);
  }
  return done;
}
