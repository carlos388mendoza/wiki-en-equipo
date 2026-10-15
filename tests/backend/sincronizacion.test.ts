import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let luis: TestUser;
const texto = (text: string) => [{ id: "p", type: "paragraph", data: { text } }];
const tagsOf = async (pageId: string) => (await api.as(luis).get(`/pages/${pageId}`)).body.page.tags.map((t: { name: string }) => t.name).sort();

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  luis = await createUser("Luis Paz", tecnologia.id);
  api = await startApi();
});
afterAll(() => api.close());

describe("sincronizar cambios hechos sin conexión (#12)", () => {
  it("guarda contenido y etiquetas en la misma operación", async () => {
    const page = await createPage(api, luis, { tags: ["vieja"] });
    const res = await api.as(luis).post(`/sync/pages/${page.id}`, { operationId: crypto.randomUUID(), baseVersion: page.version, content: texto("sin conexión"), tags: ["procesos", "sucursales"] });
    expect(res.status).toBe(200);
    expect(res.body.page.version).toBe(page.version + 1);
    expect(await tagsOf(page.id)).toEqual(["procesos", "sucursales"]);
  });

  it("si hay conflicto no guarda nada a medias y devuelve las etiquetas actuales", async () => {
    const page = await createPage(api, luis, { tags: ["original"] });
    await api.as(luis).patch(`/pages/${page.id}`, { title: "Cambio en línea", expectedVersion: page.version });
    const res = await api.as(luis).post(`/sync/pages/${page.id}`, { operationId: crypto.randomUUID(), baseVersion: page.version, content: texto("viejo"), tags: ["no-debe-quedar"] });
    expect(res.status).toBe(409);
    expect(res.body.error.details.current.tags).toEqual(["original"]);
    expect(await tagsOf(page.id)).toEqual(["original"]);
  });

  it("reintentar la misma operación no la aplica dos veces", async () => {
    const page = await createPage(api, luis);
    const body = { operationId: crypto.randomUUID(), baseVersion: page.version, content: texto("una vez"), tags: ["x"] };
    const first = await api.as(luis).post(`/sync/pages/${page.id}`, body);
    const again = await api.as(luis).post(`/sync/pages/${page.id}`, body);
    expect(again.body).toEqual(first.body);
    expect((await api.as(luis).get(`/pages/${page.id}`)).body.page.version).toBe(page.version + 1);
  });

  it("sin etiquetas en la operación, se conservan las que había", async () => {
    const page = await createPage(api, luis, { tags: ["queda"] });
    await api.as(luis).post(`/sync/pages/${page.id}`, { operationId: crypto.randomUUID(), baseVersion: page.version, content: texto("solo contenido") });
    expect(await tagsOf(page.id)).toEqual(["queda"]);
  });

  it("un borrador se publica creando la página ya con su contenido (sin página vacía intermedia)", async () => {
    const res = await api.as(luis).post("/pages", { title: "Borrador", icon: "📝", content: texto("escrito sin conexión") });
    expect(res.status).toBe(201);
    expect(JSON.parse(res.body.page.contentJson)).toEqual(texto("escrito sin conexión"));
    expect(res.body.page.version).toBe(1);
  });
});
