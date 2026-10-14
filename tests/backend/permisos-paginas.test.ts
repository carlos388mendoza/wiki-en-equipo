import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, luis: TestUser, maria: TestUser, pedro: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const compras = await createDepartment("Compras");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id);
  pedro = await createUser("Pedro Gómez", tecnologia.id);
  maria = await createUser("María Zelaya", compras.id);
  api = await startApi();
});
afterAll(() => api.close());

describe("páginas privadas", () => {
  it("otro usuario no puede abrir ni listar una página privada", async () => {
    const page = await createPage(api, luis, { title: "Mis notas" });
    expect((await api.as(luis).get(`/pages/${page.id}`)).status).toBe(200);
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(403);
    expect((await api.as(pedro).get(`/pages/${page.id}`)).status).toBe(403);
    const list = await api.as(maria).get("/pages");
    expect(list.body.pages.map((p: { id: string }) => p.id)).not.toContain(page.id);
  });

  it("sin sesión no hay acceso", async () => {
    const page = await createPage(api, luis);
    expect((await api.as(null).get(`/pages/${page.id}`)).status).toBe(401);
  });

  it("un administrador puede leerla", async () => {
    const page = await createPage(api, luis);
    expect((await api.as(ana).get(`/pages/${page.id}`)).status).toBe(200);
  });
});

describe("solo lectura", () => {
  it("quien tiene lectura no puede editar, sincronizar, compartir ni subir archivos", async () => {
    const page = await createPage(api, luis, { title: "Guía de VPN" });
    expect((await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "READ" })).status).toBe(200);

    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(200);
    expect((await api.as(maria).patch(`/pages/${page.id}`, { title: "Cambio", expectedVersion: page.version })).status).toBe(403);
    expect((await api.as(maria).post(`/sync/pages/${page.id}`, { operationId: crypto.randomUUID(), baseVersion: page.version, content: [] })).status).toBe(403);
    expect((await api.as(maria).put(`/pages/${page.id}/shares/${pedro.id}`, { permission: "READ" })).status).toBe(403);
    expect((await api.as(maria).post(`/pages/${page.id}/share-links`, { permission: "EDIT" })).status).toBe(403);
    expect((await api.as(maria).delete(`/pages/${page.id}`)).status).toBe(403);
  });

  it("con permiso de edición sí puede editar", async () => {
    const page = await createPage(api, luis);
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "EDIT" });
    const res = await api.as(maria).patch(`/pages/${page.id}`, { title: "Checklist actualizado", expectedVersion: page.version });
    expect(res.status).toBe(200);
    expect(res.body.page.title).toBe("Checklist actualizado");
  });
});

describe("publicación", () => {
  it("una página del departamento la lee el departamento, no otros", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT" });
    expect((await api.as(pedro).get(`/pages/${page.id}`)).status).toBe(200);
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(403);
    expect((await api.as(pedro).patch(`/pages/${page.id}`, { title: "x", expectedVersion: page.version })).status).toBe(403);
  });

  it("solo un administrador publica a la empresa", async () => {
    expect((await api.as(luis).post("/pages", { title: "Anuncio", visibility: "COMPANY" })).status).toBe(403);
    const page = await createPage(api, ana, { visibility: "COMPANY" });
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(200);
  });
});
