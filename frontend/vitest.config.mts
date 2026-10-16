import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Las pruebas viven en tests/frontend/ (carpeta compartida del repo).
export default defineConfig({
  // Para importar pantallas (.tsx) en las pruebas, por ejemplo su metadata.
  oxc: { jsx: { runtime: "automatic" } },
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
      // Pruebas que dibujan componentes (renderToStaticMarkup).
      "react-dom": here("./node_modules/react-dom"),
      react: here("./node_modules/react"),
    },
  },
  server: { fs: { allow: [here("..")] } },
  test: {
    root: here(".."),
    include: ["tests/frontend/**/*.test.{ts,tsx}"],
    environment: "node",
    testTimeout: 20_000,
  },
});
