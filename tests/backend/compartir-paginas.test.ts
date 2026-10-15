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

const tokenOf = (url: string) => url.split("/share/")[1];

describe("personas con acceso", () => {
  it("la lista trae nombre y departamento de cada persona, sin correo", async () => {
    const page = await createPage(api, luis);
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "READ" });
    const res = await api.as(maria).get(`/pages/${page.id}`);
    expect(res.body.page.shares).toEqual([{ userId: maria.id, permission: "READ", user: { id: maria.id, name: "María Zelaya", department: { name: "Compras" } } }]);
    expect(JSON.stringify(res.body.page.shares)).not.toContain("@wiki.test");
  });
});

describe("ruta de páginas superiores", () => {
  it("incluye las páginas superiores que la persona puede leer", async () => {
    const raiz = await createPage(api, luis, { title: "Soporte", visibility: "DEPARTMENT", icon: "🛠️" });
    const medio = await createPage(api, luis, { title: "Sucursales", visibility: "DEPARTMENT", parentId: raiz.id });
    const hoja = await createPage(api, luis, { title: "Checklist", visibility: "DEPARTMENT", parentId: medio.id });
    const res = await api.as(pedro).get(`/pages/${hoja.id}`);
    expect(res.body.page.ancestors).toEqual([{ id: raiz.id, title: "Soporte", icon: "🛠️" }, { id: medio.id, title: "Sucursales", icon: null }]);
  });

  it("no revela el título de una página superior privada", async () => {
    const privada = await createPage(api, luis, { title: "Notas privadas de Luis" });
    const hija = await createPage(api, luis, { title: "Publicada", visibility: "DEPARTMENT", parentId: privada.id });
    const res = await api.as(pedro).get(`/pages/${hija.id}`);
    expect(res.body.page.ancestors).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain("Notas privadas de Luis");
  });
});

describe("enlaces compartidos", () => {
  it("quien edita puede listarlos (sin token) y desactivarlos", async () => {
    const page = await createPage(api, luis);
    const a = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ" });
    const b = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "EDIT", expiresInHours: 24 });
    const list = await api.as(luis).get(`/pages/${page.id}/share-links`);
    expect(list.status).toBe(200);
    expect(list.body.links.map((l: { id: string }) => l.id)).toEqual([b.body.id, a.body.id]);
    expect(list.body.links[0]).toMatchObject({ permission: "EDIT", createdBy: { id: luis.id, name: "Luis Paz" } });
    expect(JSON.stringify(list.body)).not.toContain(a.body.token);
    expect(list.body.links[0]).not.toHaveProperty("tokenHash");

    expect((await api.as(luis).delete(`/pages/${page.id}/share-links/${a.body.id}`)).status).toBe(204);
    expect((await api.as(luis).get(`/pages/${page.id}/share-links`)).body.links.map((l: { id: string }) => l.id)).toEqual([b.body.id]);
    expect((await api.as(pedro).post(`/share/${tokenOf(a.body.url)}/accept`)).status).toBe(404);
  });

  it("no lista enlaces vencidos", async () => {
    const page = await createPage(api, luis);
    const link = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ", expiresInHours: 1 });
    await prisma.pageShareLink.update({ where: { id: link.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await api.as(luis).get(`/pages/${page.id}/share-links`)).body.links).toEqual([]);
    expect((await api.as(pedro).post(`/share/${link.body.token}/accept`)).status).toBe(404);
  });

  it("quien solo lee no puede ver ni desactivar enlaces", async () => {
    const page = await createPage(api, luis);
    const link = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ" });
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "READ" });
    expect((await api.as(maria).get(`/pages/${page.id}/share-links`)).status).toBe(403);
    expect((await api.as(maria).delete(`/pages/${page.id}/share-links/${link.body.id}`)).status).toBe(403);
    expect((await api.as(pedro).get(`/pages/${page.id}/share-links`)).status).toBe(403);
  });

  it("aceptar un enlace de lectura no quita el permiso de edición", async () => {
    const page = await createPage(api, luis);
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "EDIT" });
    const link = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ" });
    const accepted = await api.as(maria).post(`/share/${link.body.token}/accept`);
    expect(accepted.body).toEqual({ type: "page", pageId: page.id, permission: "EDIT" });
    expect((await api.as(maria).patch(`/pages/${page.id}`, { title: "Sigo editando", expectedVersion: page.version })).status).toBe(200);
  });

  it("un enlace de edición sí sube el permiso de lectura", async () => {
    const page = await createPage(api, luis);
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "READ" });
    const link = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "EDIT" });
    expect((await api.as(maria).post(`/share/${link.body.token}/accept`)).body.permission).toBe("EDIT");
  });

  it("un enlace de lectura da solo lectura a quien no tenía acceso", async () => {
    const page = await createPage(api, luis);
    const link = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ" });
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(403);
    expect((await api.as(maria).post(`/share/${link.body.token}/accept`)).body.permission).toBe("READ");
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(200);
    expect((await api.as(maria).patch(`/pages/${page.id}`, { title: "No", expectedVersion: page.version })).status).toBe(403);
  });

  it("el dueño que abre su propio enlace no queda como invitado", async () => {
    const page = await createPage(api, luis);
    const link = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ" });
    expect((await api.as(luis).post(`/share/${link.body.token}/accept`)).body.permission).toBe("EDIT");
    expect(await prisma.pageShare.count({ where: { pageId: page.id } })).toBe(0);
  });

  it("un token inventado no sirve", async () => {
    expect((await api.as(maria).post(`/share/${"x".repeat(43)}/accept`)).status).toBe(404);
  });
});
