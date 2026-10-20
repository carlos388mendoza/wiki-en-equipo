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
  maria = await createUser("María Zelaya", tecnologia.id);
  pedro = await createUser("Pedro Castro", compras.id);
  api = await startApi();
});
afterAll(() => api.close());

const ids = (pages: { id: string }[]) => pages.map((page) => page.id);

describe("anclar páginas", () => {
  it("es personal: cada persona ve solo las suyas, en el orden en que las ancló", async () => {
    const primera = await createPage(api, luis, { visibility: "DEPARTMENT", title: "Primera" });
    const segunda = await createPage(api, luis, { visibility: "DEPARTMENT", title: "Segunda" });
    expect((await api.as(luis).put(`/pages/${segunda.id}/pin`)).body).toEqual({ pageId: segunda.id, pinned: true });
    await api.as(luis).put(`/pages/${primera.id}/pin`);
    await api.as(luis).put(`/pages/${primera.id}/pin`); // dos veces no la repite
    expect(ids((await api.as(luis).get("/pages/pinned")).body.pages)).toEqual([segunda.id, primera.id]);
    expect((await api.as(maria).get("/pages/pinned")).body.pages).toEqual([]);

    expect((await api.as(luis).delete(`/pages/${segunda.id}/pin`)).body.pinned).toBe(false);
    expect(ids((await api.as(luis).get("/pages/pinned")).body.pages)).toEqual([primera.id]);
  });

  it("lo puede hacer quien solo lee la página, pero no alguien sin acceso a una página privada", async () => {
    const publica = await createPage(api, luis, { visibility: "DEPARTMENT" });
    const privada = await createPage(api, luis);
    expect((await api.as(maria).put(`/pages/${publica.id}/pin`)).status).toBe(200);
    expect((await api.as(pedro).put(`/pages/${privada.id}/pin`)).status).toBe(403);
    expect((await api.as(maria).put(`/pages/${privada.id}/pin`)).status).toBe(403);
    expect((await api.as(pedro).put("/pages/no-existe-0000/pin")).status).toBe(404);
  });

  it("deja de mostrar la anclada si la persona pierde el acceso, si va a la papelera o si se archiva", async () => {
    const compartida = await createPage(api, luis);
    await api.as(luis).put(`/pages/${compartida.id}/shares/${maria.id}`, { permission: "READ" });
    const enPapelera = await createPage(api, luis, { visibility: "DEPARTMENT" });
    const archivada = await createPage(api, luis, { visibility: "DEPARTMENT" });
    for (const page of [compartida, enPapelera, archivada]) expect((await api.as(maria).put(`/pages/${page.id}/pin`)).status).toBe(200);

    await api.as(luis).delete(`/pages/${compartida.id}/shares/${maria.id}`);
    await api.as(luis).delete(`/pages/${enPapelera.id}`);
    await api.as(luis).post(`/pages/${archivada.id}/archive`);
    const pinned = ids((await api.as(maria).get("/pages/pinned")).body.pages);
    for (const page of [compartida, enPapelera, archivada]) expect(pinned).not.toContain(page.id);
  });
});

describe("archivar páginas", () => {
  it("la archivada no sale en los listados ni en las búsquedas, pero se puede abrir y no se borra", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT", title: "Inventario archivado de prueba" });
    const archived = await api.as(luis).post(`/pages/${page.id}/archive`);
    expect(archived.status).toBe(200);
    expect(archived.body.archivedAt).toEqual(expect.any(String));

    expect(ids((await api.as(luis).get("/pages")).body.pages)).not.toContain(page.id);
    expect(ids((await api.as(maria).get("/pages")).body.pages)).not.toContain(page.id);
    expect(ids((await api.as(luis).get(`/pages?q=${encodeURIComponent("inventario archivado")}`)).body.pages)).not.toContain(page.id);
    // Por enlace se sigue abriendo (y las subpáginas y menciones la encuentran por id).
    const opened = await api.as(maria).get(`/pages/${page.id}`);
    expect(opened.status).toBe(200);
    expect(opened.body.page.archivedAt).toEqual(expect.any(String));
    expect(ids((await api.as(maria).get(`/pages?ids=${page.id}`)).body.pages)).toEqual([page.id]);
  });

  it("solo su dueño o un ADMIN la archiva y desarchiva; quien solo lee o edita, no", async () => {
    const page = await createPage(api, luis, { visibility: "DEPARTMENT" });
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "EDIT" });
    expect((await api.as(maria).post(`/pages/${page.id}/archive`)).status).toBe(403);
    expect((await api.as(pedro).post(`/pages/${page.id}/archive`)).status).toBe(403);
    expect((await api.as(ana).post(`/pages/${page.id}/archive`)).status).toBe(200);
    expect((await api.as(maria).post(`/pages/${page.id}/unarchive`)).status).toBe(403);
    expect((await api.as(luis).post(`/pages/${page.id}/unarchive`)).body.archivedAt).toBeNull();
    expect(ids((await api.as(maria).get("/pages")).body.pages)).toContain(page.id);
  });

  it("la sección Archivadas lista las de la persona (un ADMIN ve todas)", async () => {
    const deLuis = await createPage(api, luis, { visibility: "DEPARTMENT" });
    const deMaria = await createPage(api, maria, { visibility: "DEPARTMENT" });
    await api.as(luis).post(`/pages/${deLuis.id}/archive`);
    await api.as(maria).post(`/pages/${deMaria.id}/archive`);

    const deLuisLista = ids((await api.as(luis).get("/pages?archived=1")).body.pages);
    expect(deLuisLista).toContain(deLuis.id);
    expect(deLuisLista).not.toContain(deMaria.id);
    const admin = ids((await api.as(ana).get("/pages?archived=1")).body.pages);
    expect(admin).toEqual(expect.arrayContaining([deLuis.id, deMaria.id]));
  });

  it("no se archiva la página de un muro", async () => {
    const wall = (await api.as(ana).get("/company/wall")).body.page;
    if (!wall) return; // sin muro creado en esta base no hay nada que comprobar
    expect((await api.as(ana).post(`/pages/${wall.id}/archive`)).status).toBe(400);
  });
});
