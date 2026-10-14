import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDatabase, startApi, type TestApi } from "./helpers";

let api: TestApi;

beforeAll(async () => {
  await resetDatabase();
  api = await startApi();
});
afterAll(() => api.close());

describe("configuración inicial", () => {
  it("crea el primer administrador y las plantillas predeterminadas con su icono, una sola vez", async () => {
    const body = { name: "Ana Rivera", email: "ana@wiki.test", password: "contraseña-segura-1234", departmentName: "Tecnología", secret: process.env.BOOTSTRAP_SECRET };
    expect((await api.call("POST", "/auth/bootstrap", { body: { ...body, secret: "incorrecta" } })).status).toBe(403);
    const res = await api.call("POST", "/auth/bootstrap", { body });
    expect(res.status).toBe(201);
    const templates = (await api.as(res.body).get("/templates")).body.templates;
    expect(templates.map((t: { icon: string }) => t.icon).sort()).toEqual(["3d:bienvenida", "3d:documentacion", "3d:inicio-departamento"]);
    expect(templates.every((t: { isDefault: boolean; scope: string }) => t.isDefault && t.scope === "COMPANY")).toBe(true);
    expect((await api.call("POST", "/auth/bootstrap", { body })).status).toBe(409);
  });
});
