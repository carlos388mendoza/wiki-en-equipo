import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, prisma, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let luis: TestUser, maria: TestUser;
const texto = (text: string) => [{ id: "p", type: "paragraph", data: { text } }];

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  luis = await createUser("Luis Paz", tecnologia.id);
  maria = await createUser("María Zelaya", tecnologia.id);
  api = await startApi();
});
afterAll(() => api.close());

async function guardar(user: TestUser, pageId: string, version: number, body: Record<string, unknown>) {
  const res = await api.as(user).patch(`/pages/${pageId}`, { ...body, expectedVersion: version });
  expect(res.status).toBe(200);
  return res.body.page.version as number;
}
const versiones = async (user: TestUser, pageId: string) => (await api.as(user).get(`/pages/${pageId}/history`)).body.history.map((h: { version: number }) => h.version);

describe("historial con autoguardado", () => {
  it("una página privada ajena responde igual que la página (403); si no existe, ambas rutas dan 404", async () => {
    const page = await createPage(api, luis, { visibility: "PRIVATE" });
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(403);
    expect((await api.as(maria).get(`/pages/${page.id}/history`)).status).toBe(403);

    expect((await api.as(maria).get("/pages/no-existe")).status).toBe(404);
    expect((await api.as(maria).get("/pages/no-existe/history")).status).toBe(404);
  });

  it("los autoguardados seguidos de la misma persona forman una sola versión", async () => {
    const page = await createPage(api, luis, { content: texto("v1") });
    let v = await guardar(luis, page.id, page.version, { content: texto("v2"), autosave: true });
    v = await guardar(luis, page.id, v, { content: texto("v3"), autosave: true });
    v = await guardar(luis, page.id, v, { content: texto("v4"), autosave: true });
    expect(v).toBe(4);
    expect(await versiones(luis, page.id)).toEqual([1]);
  });

  it("un guardado normal siempre crea una versión", async () => {
    const page = await createPage(api, luis, { content: texto("a") });
    let v = await guardar(luis, page.id, page.version, { content: texto("b"), autosave: true });
    v = await guardar(luis, page.id, v, { title: "Nuevo título" });
    expect(await versiones(luis, page.id)).toEqual([2, 1]);
  });

  it("si otra persona editó en medio, se guarda una versión con su trabajo", async () => {
    const page = await createPage(api, luis, { content: texto("luis") });
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "EDIT" });
    let v = await guardar(luis, page.id, page.version, { content: texto("luis 2"), autosave: true });
    v = await guardar(maria, page.id, v, { content: texto("maría"), autosave: true });
    v = await guardar(luis, page.id, v, { content: texto("luis 3"), autosave: true });
    expect(await versiones(luis, page.id)).toEqual([3, 2, 1]);
  });

  it("pasados 10 minutos el autoguardado vuelve a crear una versión", async () => {
    const page = await createPage(api, luis, { content: texto("uno") });
    const v = await guardar(luis, page.id, page.version, { content: texto("dos"), autosave: true });
    await prisma.pageHistory.updateMany({ where: { pageId: page.id }, data: { createdAt: new Date(Date.now() - 11 * 60_000) } });
    await guardar(luis, page.id, v, { content: texto("tres"), autosave: true });
    expect(await versiones(luis, page.id)).toEqual([2, 1]);
    const restaurada = await api.as(luis).post(`/pages/${page.id}/history/1/restore`);
    expect(JSON.parse(restaurada.body.page.contentJson)).toEqual(texto("uno"));
  });

  it("autosave solo no es un cambio válido", async () => {
    const page = await createPage(api, luis);
    expect((await api.as(luis).patch(`/pages/${page.id}`, { autosave: true, expectedVersion: page.version })).status).toBe(400);
  });
});
