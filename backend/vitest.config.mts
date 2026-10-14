import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Las pruebas viven en tests/backend/ (carpeta compartida del repo) y usan una base SQLite aparte
// (models/test.db) que global-setup.ts crea desde cero con las migraciones.
export default defineConfig({
  // La raíz de las pruebas es el repo: la caché va dentro de backend/ para no crear node_modules/ en la raíz.
  cacheDir: here("./node_modules/.vite"),
  resolve: {
    alias: {
      // tests/ está fuera de backend/: sus importaciones de paquetes se resuelven en backend/node_modules.
      yjs: here("./node_modules/yjs"),
      "y-protocols": here("./node_modules/y-protocols"),
      lib0: here("./node_modules/lib0"),
      ws: here("./node_modules/ws"),
    },
  },
  server: { fs: { allow: [here("..")] } },
  test: {
    root: here(".."),
    include: ["tests/backend/**/*.test.ts"],
    environment: "node",
    globalSetup: [here("../tests/backend/global-setup.ts")],
    // Todas las pruebas comparten la misma base: se ejecutan de una en una.
    fileParallelism: false,
    testTimeout: 20_000,
    fsModuleCachePath: here("./node_modules/.vitest-cache"),
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "clave-solo-para-pruebas-automaticas-del-backend-0123456789",
      BOOTSTRAP_SECRET: "clave-de-configuracion-de-pruebas",
      FRONTEND_ORIGIN: "http://localhost:3000",
      UPLOAD_DIR: path.join(tmpdir(), "wiki-en-equipo-test-uploads"),
      TRUST_PROXY: "loopback",
      TRASH_RETENTION_DAYS: "0",
    },
  },
});
