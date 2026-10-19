import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const render = read("render.yaml");
/** Bloque de una variable de render.yaml: desde su `- key:` hasta la siguiente. */
const envVar = (key: string) => render.match(new RegExp(`- key: ${key}\\r?\\n((?:\\s+(?!- key:).*\\r?\\n?)*)`))?.[1] ?? null;

describe("render.yaml (Render gratis + Turso)", () => {
  it("usa el plan gratis, sin disco permanente", () => {
    expect(render).toMatch(/^\s+plan: free\s*$/m);
    expect(render).not.toMatch(/^\s+disk:/m);
    expect(render).not.toMatch(/- key: (DATABASE_URL|UPLOAD_DIR)\s*$/m);
  });

  it("los secretos los pide Render: sin valor en el archivo", () => {
    for (const key of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "JWT_SECRET", "BOOTSTRAP_SECRET"]) {
      const block = envVar(key);
      expect(block, key).toMatch(/sync: false/);
      expect(block, key).not.toMatch(/value:/);
    }
  });

  it("mantiene el origen del frontend, los proxies, los archivos en la base y el límite de 4 MB", () => {
    expect(envVar("FRONTEND_ORIGIN")).toMatch(/value: https:\/\/wiki-en-equipo\.vercel\.app/);
    expect(envVar("TRUST_PROXY")).toMatch(/value: "2"/);
    expect(envVar("FILE_STORAGE")).toMatch(/value: database/);
    expect(envVar("MAX_UPLOAD_BYTES")).toMatch(/value: "4194304"/);
    // NODE_ENV=production haría que pnpm no instale TypeScript ni Prisma y la compilación fallaría.
    expect(envVar("NODE_ENV")).toBeNull();
  });

  it("el frontend espera a que el backend despierte (hasta 60 s)", () => {
    for (const file of ["frontend/app/layout.tsx", "frontend/app/archivos/route.ts", "frontend/app/archivos/[id]/route.ts"]) {
      expect(read(file), file).toMatch(/export const maxDuration = 60;/);
    }
  });
});
