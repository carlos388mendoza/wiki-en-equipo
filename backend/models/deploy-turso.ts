import "dotenv/config";
import { createClient } from "@libsql/client";
import { tursoConfig } from "./client.js";
import { applyMigrations } from "./migrate-turso.js";

// Aplica a mano las migraciones que falten en Turso (`pnpm run db:deploy:turso`). En producción el servidor lo hace solo al arrancar.
const turso = tursoConfig();
if (!turso) { console.error("Falta TURSO_DATABASE_URL."); process.exit(1); }
const client = createClient(turso);
try {
  const applied = await applyMigrations(client);
  console.log(applied.length ? `Listo: ${applied.length} migraciones aplicadas.` : "La base ya tenía todas las migraciones.");
} finally { client.close(); }
