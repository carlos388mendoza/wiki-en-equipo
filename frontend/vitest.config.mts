import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Las pruebas viven en tests/frontend/ (carpeta compartida del repo).
export default defineConfig({
  resolve: {
    alias: {
      "@shared": here("../shared"),
      "@": here("."),
      // `server-only` falla fuera de Next; en pruebas se reemplaza por un módulo vacío.
      "server-only": here("./test-support/empty.ts"),
      // tests/ está fuera de frontend/: sus importaciones de paquetes se resuelven en frontend/node_modules.
      "fake-indexeddb/auto": here("./node_modules/fake-indexeddb/auto/index.mjs"),
      "y-indexeddb": here("./node_modules/y-indexeddb"),
      yjs: here("./node_modules/yjs"),
    },
  },
  server: { fs: { allow: [here("..")] } },
  test: {
    root: here(".."),
    include: ["tests/frontend/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
  },
});
