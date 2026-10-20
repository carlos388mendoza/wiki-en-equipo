import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = (file: string) => new URL(`../../${file}`, import.meta.url);
const read = (file: string) => readFileSync(path(file), "utf8").replace(/\r\n/g, "\n");

type Service = {
  root?: string;
  framework?: string;
  entrypoint?: string;
  buildCommand?: string;
  installCommand?: string;
};
const vercel = JSON.parse(read("vercel.json")) as {
  services?: Record<string, Service>;
  rewrites?: { source: string; destination: { service: string } }[];
  crons?: { path: string; schedule: string }[];
  git?: { deploymentEnabled?: Record<string, boolean> };
};
const scripts = (JSON.parse(read("backend/package.json")) as { scripts: Record<string, string> }).scripts;

describe("un solo proyecto de Vercel (Services): interfaz web + API", () => {
  it("define dos servicios: web (Next.js) y api (Express), cada uno desde su carpeta", () => {
    expect(vercel.services?.web?.root).toBe("frontend/");
    expect(vercel.services?.api?.root).toBe("backend/");
    // La entrada del servicio api es un archivo .mjs: Vercel siempre lo carga como módulo ESM, nunca como
    // CommonJS (que rompía con "Cannot use import statement outside a module").
    expect(vercel.services?.api?.entrypoint).toBe("src/app.mjs");
    // La app de verdad (con `export default app;`) vive en http-app.ts; se empaqueta en bundle.mjs al compilar.
    expect(read("backend/src/http-app.ts")).toMatch(/^export default app;$/m);
    expect(read("backend/src/app.mjs")).toMatch(/bundle\.mjs/);
    // Vercel convierte cada archivo de api/ en una función aparte: el backend ya no usa esa carpeta.
    expect(existsSync(path("backend/api"))).toBe(false);
  });

  it("expone la API en /api y /health, y todo lo demás en la interfaz (mismo dominio)", () => {
    expect(vercel.rewrites).toEqual([
      { source: "/api/(.*)", destination: { service: "api" } },
      { source: "/health", destination: { service: "api" } },
      { source: "/(.*)", destination: { service: "web" } },
    ]);
    // Lo más específico primero; el catch-all al final.
    const general = vercel.rewrites!.findIndex((r) => r.source === "/(.*)");
    expect(general).toBe(vercel.rewrites!.length - 1);
  });

  it("la API compila con la migración al desplegar, no en cada petición", () => {
    expect(vercel.services?.api?.buildCommand).toBe("pnpm run vercel-build");
    expect(scripts["vercel-build"]).toMatch(/prisma generate/);
    expect(scripts["vercel-build"]).toMatch(/deploy-turso\.ts --opcional/);
    // Empaqueta la app en un solo archivo ESM con esbuild (dependencia declarada, o el binario no existe al compilar).
    expect(scripts["vercel-build"]).toMatch(/esbuild src\/http-app\.ts --bundle/);
    expect(scripts["vercel-build"]).toMatch(/--outfile=src\/bundle\.mjs/);
    const deps = (JSON.parse(read("backend/package.json")) as { devDependencies: Record<string, string> }).devDependencies;
    expect(deps.esbuild).toBeTruthy();
    expect(read("backend/models/schema.prisma")).toMatch(/binaryTargets\s*=\s*\[[^\]]*"rhel-openssl-3\.0\.x"/);
  });

  it("limpia la papelera con Vercel Cron una vez al día (lo máximo en Hobby)", () => {
    expect(vercel.crons).toEqual([{ path: "/api/cron/papelera", schedule: expect.stringMatching(/^\d+ \d+ \* \* \*$/) }]);
  });

  it("con Git conectado solo publica main: una rama sin unir nunca aplica migraciones a Turso", () => {
    expect(vercel.git?.deploymentEnabled).toEqual({ "**": false, main: true });
  });

  it("la configuración de cada servicio vive en su servicio (no en claves de nivel superior)", () => {
    const top = vercel as Record<string, unknown>;
    for (const key of ["framework", "buildCommand", "installCommand", "functions", "outputDirectory"]) {
      expect(top[key], `${key} no debe estar en el nivel superior`).toBeUndefined();
    }
  });

  it("la copia que publica Vercel se adelanta sola con main, sin forzar y solo en la copia", () => {
    const flujo = read(".github/workflows/sincronizar-copia.yml");
    expect(flujo).toContain(`cron: "*/5 * * * *"`);
    expect(flujo).toContain("if: github.repository == 'carlos388mendoza/wiki-en-equipo'");
    expect(flujo).toMatch(/merge-upstream" -f branch=main/);
    expect(flujo).not.toMatch(/--force|push -f/);
  });

  it("no hay secretos en la configuración", () => {
    const config = read("vercel.json") + read(".github/workflows/sincronizar-copia.yml") + read("frontend/.env.example") + read("backend/.env.example");
    expect(config).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // tokens JWT (Turso)
    expect(config).not.toMatch(/libsql:\/\/[a-z0-9-]+-[a-z0-9-]+\.turso\.io/i);
  });

  it("el frontend espera hasta 60 s a que el backend responda", () => {
    for (const file of ["frontend/app/layout.tsx", "frontend/app/archivos/route.ts", "frontend/app/archivos/[id]/route.ts"]) {
      expect(read(file), file).toMatch(/export const maxDuration = 60;/);
    }
  });
});
