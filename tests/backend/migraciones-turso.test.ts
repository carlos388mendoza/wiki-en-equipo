import { cpSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { afterAll, describe, expect, it } from "vitest";
import { tursoConfig } from "../../backend/models/client.js";
import { applyMigrations, readMigrations, splitStatements } from "../../backend/models/migrate-turso.js";

const migrationsDir = fileURLToPath(new URL("../../backend/models/migrations", import.meta.url));
const testDb = fileURLToPath(new URL("../../backend/models/test.db", import.meta.url));
const work = mkdtempSync(path.join(tmpdir(), "wiki-migraciones-"));
const clients: Client[] = [];
// En Windows el archivo puede seguir bloqueado un instante: es una carpeta temporal, no importa si queda.
afterAll(() => { for (const client of clients) client.close(); try { rmSync(work, { recursive: true, force: true }); } catch {} });

const open = (file: string) => { const client = createClient({ url: `file:${path.join(work, file).replaceAll("\\", "/")}` }); clients.push(client); return client; };
const quiet = { log: () => {} };
/** Copia de las primeras `count` migraciones, para simular una base que se creó con una versión anterior. */
function firstMigrations(count: number, extra?: { name: string; sql: string }) {
  const dir = mkdtempSync(path.join(work, "migraciones-"));
  for (const name of readdirSync(migrationsDir).filter((n) => !n.endsWith(".toml")).sort().slice(0, count)) cpSync(path.join(migrationsDir, name), path.join(dir, name), { recursive: true });
  if (extra) { mkdirSync(path.join(dir, extra.name)); writeFileSync(path.join(dir, extra.name, "migration.sql"), extra.sql); }
  return dir;
}
const schema = async (client: Client) => (await client.execute(`SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY type, name`)).rows.map((r) => `${r.type} ${r.name}: ${String(r.sql ?? "").replace(/\s+/g, " ")}`);

describe("migraciones en Turso", () => {
  it("aplica todas en una base vacía y la segunda vez no aplica ninguna", async () => {
    const client = open("vacia.db");
    expect(await applyMigrations(client, { dir: migrationsDir, ...quiet })).toEqual(readMigrations(migrationsDir).map((m) => m.name));
    expect(await applyMigrations(client, { dir: migrationsDir, ...quiet })).toEqual([]);
    const recorded = (await client.execute(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`)).rows.map((r) => r.migration_name);
    expect(recorded).toEqual(readMigrations(migrationsDir).map((m) => m.name));
  });

  it("deja el mismo esquema que prisma migrate deploy", async () => {
    const client = open("comparar.db");
    await applyMigrations(client, { dir: migrationsDir, ...quiet });
    const prismaDb = createClient({ url: `file:${testDb.replaceAll("\\", "/")}` });
    clients.push(prismaDb);
    expect(await schema(client)).toEqual(await schema(prismaDb));
  });

  it("en una base con datos aplica solo las que faltan y no pierde nada", async () => {
    const client = open("con-datos.db");
    const total = readMigrations(migrationsDir).length;
    expect(await applyMigrations(client, { dir: firstMigrations(total - 1), ...quiet })).toHaveLength(total - 1);
    await client.execute(`INSERT INTO "Department" ("id", "name", "slug") VALUES ('d1', 'Tecnología', 'tecnologia')`);
    await client.execute(`INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "departmentId", "updatedAt") VALUES ('u1', 'María Zúñiga', 'maria@wiki.test', 'x', 'USER', 'd1', current_timestamp)`);

    expect(await applyMigrations(client, { dir: migrationsDir, ...quiet })).toEqual([readMigrations(migrationsDir).at(-1)!.name]);
    const user = (await client.execute(`SELECT name, email, searchName FROM "User" WHERE id = 'u1'`)).rows[0];
    expect(user).toMatchObject({ name: "María Zúñiga", email: "maria@wiki.test" });
    expect((await client.execute(`SELECT count(*) AS n FROM "Department"`)).rows[0].n).toBe(1);
  });

  it("si una migración falla, se deshace completa y no queda registrada", async () => {
    const client = open("falla.db");
    const total = readMigrations(migrationsDir).length;
    const dir = firstMigrations(total, { name: "99999999999999_rota", sql: `CREATE TABLE "Nueva" ("id" TEXT PRIMARY KEY);\nINSERT INTO "NoExiste" VALUES (1);` });
    await expect(applyMigrations(client, { dir, ...quiet })).rejects.toThrow(/99999999999999_rota.*se deshizo/);
    expect((await client.execute(`SELECT name FROM sqlite_master WHERE name = 'Nueva'`)).rows).toHaveLength(0);
    expect((await client.execute(`SELECT count(*) AS n FROM _prisma_migrations WHERE migration_name = '99999999999999_rota'`)).rows[0].n).toBe(0);
    // Las anteriores sí quedaron y no se repiten.
    expect(await applyMigrations(client, { dir: migrationsDir, ...quiet })).toEqual([]);
  });

  it("no vuelve a aplicar una migración que quedó a medias: pide revisarla", async () => {
    const client = open("a-medias.db");
    await applyMigrations(client, { dir: firstMigrations(1), ...quiet });
    await client.execute(`UPDATE _prisma_migrations SET finished_at = NULL`);
    await expect(applyMigrations(client, { dir: migrationsDir, ...quiet })).rejects.toThrow(/a medias/);
  });

  it("separa las sentencias sin cortar textos, identificadores ni comentarios", () => {
    expect(splitStatements(`-- comentario; con punto y coma\nUPDATE "T" SET "a" = 'x;y''z';\n/* otro; */ CREATE TABLE "b;c" ("id" TEXT);\n`)).toEqual([
      `UPDATE "T" SET "a" = 'x;y''z'`,
      `CREATE TABLE "b;c" ("id" TEXT)`,
    ]);
  });

  it("el checksum no depende de los saltos de línea de Windows", () => {
    const dir = firstMigrations(1);
    const [name] = readdirSync(dir);
    const before = readMigrations(dir)[0].checksum;
    const file = path.join(dir, name, "migration.sql");
    writeFileSync(file, readMigrations(dir)[0].sql.replace(/\n/g, "\r\n"));
    expect(readMigrations(dir)[0].checksum).toBe(before);
  });

  it("con --mode turso las pruebas del backend usan el adaptador de Turso", () => {
    expect(Boolean(tursoConfig())).toBe(process.env.WIKI_TEST_TURSO === "1");
  });
});
