import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backfillSearchText, contentText } from "../../backend/services/search-text.js";
import { createDepartment, createPage, createUser, prisma, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let luis: TestUser, pedro: TestUser, maria: TestUser;
const block = (text: string, type = "paragraph") => ({ id: crypto.randomUUID(), type, data: { text, spans: [{ text, bold: true }] } });
const ids = (res: { body: { pages: { id: string }[] } }) => res.body.pages.map((p) => p.id);

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

describe("búsqueda en el contenido", () => {
  it("encuentra palabras del contenido, no solo del título", async () => {
    const page = await createPage(api, luis, { title: "Cierre de caja", visibility: "DEPARTMENT", content: [block("Revisa el arqueo con la nota de crédito del día.")] });
    const res = await api.as(pedro).get("/pages?q=arqueo");
    expect(ids(res)).toEqual([page.id]);
    expect(res.body.pages[0].match).toBe("content");
    expect(res.body.pages[0].excerpt).toContain("arqueo");
  });

  it("no distingue tildes ni mayúsculas y conserva el texto original en el fragmento", async () => {
    const page = await createPage(api, luis, { title: "Notas", visibility: "DEPARTMENT", content: [block("Política de CRÉDITO para proveedores")] });
    const res = await api.as(pedro).get("/pages?q=credito");
    expect(ids(res)).toContain(page.id);
    expect(res.body.pages.find((p: { id: string }) => p.id === page.id).excerpt).toContain("CRÉDITO");
  });

  it("busca en tablas, títulos de bloques y bloques anidados", async () => {
    const page = await createPage(api, luis, { title: "Contactos", visibility: "DEPARTMENT", content: [
      { id: "t", type: "table", data: { columns: ["Tema", "Contacto"], rows: [["Facturación", "Rosa Lainez"]] } },
      { id: "c", type: "callout", data: { title: "Horario extendido", text: "" } },
      { id: "l", type: "list", data: { text: "Padre", style: "bullet", children: [block("Hijo con palabra escondida")] } },
    ] });
    for (const q of ["lainez", "extendido", "escondida"]) expect(ids(await api.as(pedro).get(`/pages?q=${q}`))).toContain(page.id);
  });

  it("todas las palabras deben aparecer y el título va primero", async () => {
    const enContenido = await createPage(api, luis, { title: "Procedimiento", visibility: "DEPARTMENT", content: [block("Inventario mensual de bodega")] });
    const enTitulo = await createPage(api, luis, { title: "Inventario de bodega", visibility: "DEPARTMENT" });
    const res = await api.as(pedro).get(`/pages?q=${encodeURIComponent("bodega inventario")}`);
    expect(ids(res).slice(0, 2)).toEqual([enTitulo.id, enContenido.id]);
    expect(ids(await api.as(pedro).get(`/pages?q=${encodeURIComponent("bodega helado")}`))).toEqual([]);
  });

  it("no encuentra las llaves del JSON ni enlaces", async () => {
    await createPage(api, luis, { title: "Enlaces", visibility: "DEPARTMENT", content: [{ id: "x", type: "link", data: { url: "https://intranet.example.com/zzqqx", title: "Portal" } }] });
    for (const q of ["paragraph", "spans", "zzqqx"]) expect(ids(await api.as(pedro).get(`/pages?q=${q}`))).toEqual([]);
  });

  it("respeta los permisos: no se encuentra el contenido de una página privada ajena", async () => {
    const privada = await createPage(api, luis, { title: "Mis notas", content: [block("contraseña del wifi de bodega secreta")] });
    expect(ids(await api.as(maria).get("/pages?q=secreta"))).toEqual([]);
    expect(ids(await api.as(pedro).get("/pages?q=secreta"))).toEqual([]);
    expect(ids(await api.as(luis).get("/pages?q=secreta"))).toEqual([privada.id]);
  });

  it("se actualiza al editar, sincronizar y restaurar", async () => {
    const page = await createPage(api, luis, { title: "Cambiante", content: [block("versión uno manzana")] });
    const editada = await api.as(luis).patch(`/pages/${page.id}`, { content: [block("versión dos pera")], expectedVersion: page.version });
    expect(ids(await api.as(luis).get("/pages?q=pera"))).toEqual([page.id]);
    expect(ids(await api.as(luis).get("/pages?q=manzana"))).toEqual([]);
    await api.as(luis).post(`/sync/pages/${page.id}`, { operationId: crypto.randomUUID(), baseVersion: editada.body.page.version, content: [block("versión tres uva")] });
    expect(ids(await api.as(luis).get("/pages?q=uva"))).toEqual([page.id]);
    await api.as(luis).post(`/pages/${page.id}/history/${page.version}/restore`);
    expect(ids(await api.as(luis).get("/pages?q=manzana"))).toEqual([page.id]);
  });

  it("indexa las páginas anteriores a la migración sin cambiar su fecha", async () => {
    const page = await createPage(api, luis, { title: "Antigua", content: [block("palabra olvidada")] });
    await prisma.$executeRaw`UPDATE "Page" SET "searchText" = '' WHERE "id" = ${page.id}`;
    const before = (await prisma.page.findUnique({ where: { id: page.id } }))!.updatedAt;
    expect(await backfillSearchText()).toBeGreaterThanOrEqual(1);
    const after = await prisma.page.findUnique({ where: { id: page.id } });
    expect(after!.searchText).toContain("olvidada");
    expect(after!.updatedAt).toEqual(before);
  });

  it("extrae el texto sin repetir los fragmentos con formato", () => {
    expect(contentText([block("Hola")])).toBe("Hola");
  });
});
