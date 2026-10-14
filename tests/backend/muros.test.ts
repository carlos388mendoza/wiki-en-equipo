import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, carlos: TestUser, luis: TestUser, maria: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const contabilidad = await createDepartment("Contabilidad");
  const compras = await createDepartment("Compras");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  carlos = await createUser("Carlos Mejía", contabilidad.id, "DEPARTMENT_ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id);
  maria = await createUser("María Zelaya", compras.id);
  api = await startApi();
});
afterAll(() => api.close());

const ids = (res: { body: { pages: { id: string }[] } }) => res.body.pages.map((p) => p.id);

describe("destacadas de la empresa", () => {
  it("un administrador elige y ordena páginas de la empresa; todos las ven", async () => {
    const a = await createPage(api, ana, { title: "Beneficios", visibility: "COMPANY", icon: "🎁" });
    const b = await createPage(api, ana, { title: "Calendario", visibility: "COMPANY" });
    const res = await api.as(ana).put("/company/featured", { pageIds: [b.id, a.id] });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([b.id, a.id]);
    const vista = await api.as(maria).get("/company/featured");
    expect(ids(vista)).toEqual([b.id, a.id]);
    expect(vista.body.pages[1]).toMatchObject({ icon: "🎁", owner: { name: "Ana Rivera" } });
  });

  it("solo un administrador puede cambiarlas", async () => {
    const page = await createPage(api, ana, { visibility: "COMPANY" });
    expect((await api.as(luis).put("/company/featured", { pageIds: [page.id] })).status).toBe(403);
    expect((await api.as(carlos).put("/company/featured", { pageIds: [page.id] })).status).toBe(403);
  });

  it("solo acepta páginas publicadas a la empresa, sin repetir y hasta 12", async () => {
    const departamento = await createPage(api, luis, { visibility: "DEPARTMENT" });
    const privada = await createPage(api, luis);
    expect((await api.as(ana).put("/company/featured", { pageIds: [departamento.id] })).status).toBe(400);
    expect((await api.as(ana).put("/company/featured", { pageIds: [privada.id] })).status).toBe(400);
    const page = await createPage(api, ana, { visibility: "COMPANY" });
    expect((await api.as(ana).put("/company/featured", { pageIds: [page.id, page.id] })).status).toBe(400);
    expect((await api.as(ana).put("/company/featured", { pageIds: Array.from({ length: 13 }, (_, i) => `p${i}`) })).status).toBe(400);
  });

  it("si una destacada deja de ser de la empresa o va a la papelera, ya no se muestra", async () => {
    const a = await createPage(api, ana, { visibility: "COMPANY" });
    const b = await createPage(api, ana, { visibility: "COMPANY" });
    await api.as(ana).put("/company/featured", { pageIds: [a.id, b.id] });
    await api.as(ana).patch(`/pages/${a.id}`, { visibility: "DEPARTMENT", expectedVersion: a.version });
    await api.as(ana).delete(`/pages/${b.id}`);
    expect(ids(await api.as(maria).get("/company/featured"))).toEqual([]);
  });
});
