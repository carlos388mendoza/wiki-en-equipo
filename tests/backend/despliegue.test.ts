import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const dockerfile = read("backend/Dockerfile");
const dockerignore = read("backend/.dockerignore").split("\n").map((line) => line.trim());
// La imagen final es la última etapa (desde el último FROM).
const finalStage = dockerfile.slice(dockerfile.lastIndexOf("\nFROM "));
/** Valor de una variable del ENV de la imagen final (sin mirar los comentarios). */
const env = (key: string) => finalStage.match(new RegExp(`^(?:ENV)?\\s+${key}=(\\S+?)(?:\\s+\\\\)?$`, "m"))?.[1] ?? null;

describe("imagen del backend (Back4App Containers + Turso)", () => {
  it("guarda los archivos en la base y escucha en el puerto que expone", () => {
    expect(env("FILE_STORAGE")).toBe("database");
    expect(env("PORT")).toBe("8080");
    expect(finalStage).toMatch(/^EXPOSE 8080$/m);
    expect(finalStage).toMatch(/^CMD \["node", "dist\/api\/server\.js"\]$/m);
  });

  it("mantiene el origen del frontend, los proxies y el límite de 4 MB", () => {
    expect(env("FRONTEND_ORIGIN")).toBe("https://wiki-en-equipo.vercel.app");
    expect(env("TRUST_PROXY")).toBe("2");
    expect(env("MAX_UPLOAD_BYTES")).toBe("4194304");
  });

  it("incluye las migraciones para aplicarlas en Turso al arrancar", () => {
    expect(finalStage).toMatch(/COPY --from=build \/app\/models\/migrations \.\/models\/migrations/);
  });

  it("nunca trae secretos: se pegan en el panel del servicio", () => {
    for (const key of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "JWT_SECRET", "BOOTSTRAP_SECRET", "DATABASE_URL"]) expect(env(key), key).toBeNull();
    for (const pattern of [".env", "models/*.db", "uploads", "node_modules"]) expect(dockerignore, pattern).toContain(pattern);
  });

  it("NODE_ENV=production solo en la imagen final (en la compilación pnpm no instalaría TypeScript ni Prisma)", () => {
    expect(dockerfile.slice(0, dockerfile.lastIndexOf("\nFROM "))).not.toMatch(/NODE_ENV/);
    expect(env("NODE_ENV")).toBe("production");
  });

  it("no corre como administrador del contenedor", () => {
    expect(finalStage).toMatch(/^USER node$/m);
  });

  it("el frontend espera hasta 60 s a que el backend responda", () => {
    for (const file of ["frontend/app/layout.tsx", "frontend/app/archivos/route.ts", "frontend/app/archivos/[id]/route.ts"]) {
      expect(read(file), file).toMatch(/export const maxDuration = 60;/);
    }
  });
});
