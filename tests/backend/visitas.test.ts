import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, prisma, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let luis: TestUser, pedro: TestUser, maria: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const compras = await createDepartment("Compras");
  luis = await createUser("Luis Paz", tecnologia.id);
  pedro = await createUser("Pedro Gómez", tecnologia.id);
  maria = await createUser("María Zelaya", compras.id);
  api = await startApi();
});
afterAll(() => api.close());

describe("conteo de visitas", () => {
  it("leer la página (editor, historial, recargas tras guardar) no cuenta visitas", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT" });
    for (let i = 0; i < 3; i++) expect((await api.as(pedro).get(`/pages/${page.id}`)).status).toBe(200);
    await api.as(pedro).get(`/pages/${page.id}/history`);
    expect(await prisma.pageVisit.count({ where: { pageId: page.id } })).toBe(0);
  });

  it("cuenta una visita por persona y no cuenta recargas seguidas", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT" });
    expect((await api.as(pedro).post(`/pages/${page.id}/visit`)).body).toEqual({ counted: true, visits: 1 });
    expect((await api.as(pedro).post(`/pages/${page.id}/visit`)).body).toEqual({ counted: false, visits: 1 });
    expect((await api.as(luis).post(`/pages/${page.id}/visit`)).body).toEqual({ counted: true, visits: 2 });
    expect((await api.as(pedro).get(`/pages/${page.id}`)).body.page.visitCount).toBe(2);
  });

  it("vuelve a contar pasada la ventana de 30 minutos", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT" });
    await prisma.pageVisit.create({ data: { pageId: page.id, userId: pedro.id, visitedAt: new Date(Date.now() - 31 * 60_000) } });
    expect((await api.as(pedro).post(`/pages/${page.id}/visit`)).body).toEqual({ counted: true, visits: 2 });
  });

  it("no cuenta visitas en páginas privadas", async () => {
    const page = await createPage(api, luis);
    expect((await api.as(luis).post(`/pages/${page.id}/visit`)).body).toEqual({ counted: false, visits: null });
    expect(await prisma.pageVisit.count({ where: { pageId: page.id } })).toBe(0);
    expect((await api.as(luis).get(`/pages/${page.id}`)).body.page.visitCount).toBeNull();
  });

  it("quien no puede leer la página no registra visitas", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT" });
    expect((await api.as(maria).post(`/pages/${page.id}/visit`)).status).toBe(403);
    expect(await prisma.pageVisit.count({ where: { pageId: page.id } })).toBe(0);
  });

  it("las más visitadas usan solo las visitas registradas", async () => {
    const leida = await createPage(api, luis, { visibility: "DEPARTMENT", title: "Solo leída" });
    const visitada = await createPage(api, luis, { visibility: "DEPARTMENT", title: "Visitada" });
    for (let i = 0; i < 5; i++) await api.as(pedro).get(`/pages/${leida.id}`);
    await api.as(pedro).post(`/pages/${visitada.id}/visit`);
    const popular = await api.as(pedro).get("/pages/popular");
    const ids = popular.body.pages.map((p: { id: string }) => p.id);
    expect(ids.indexOf(visitada.id)).toBeLessThan(ids.indexOf(leida.id));
    expect(popular.body.pages.find((p: { id: string }) => p.id === leida.id)._count.visits).toBe(0);
  });
});
