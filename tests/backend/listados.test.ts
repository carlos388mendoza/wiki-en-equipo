import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, prisma, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, luis: TestUser, pedro: TestUser, maria: TestUser;
const fondo = { type: "gradient", value: "linear-gradient(135deg, #eef6ff 0%, #f7f3ff 100%)" };

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const compras = await createDepartment("Compras");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id, "DEPARTMENT_ADMIN");
  pedro = await createUser("Pedro Gómez", tecnologia.id);
  maria = await createUser("María Zelaya", compras.id);
  api = await startApi();
});
afterAll(() => api.close());

const find = (list: { id: string }[], id: string) => list.find((p) => p.id === id) as any;

describe("listados con fondo, icono, autor y permiso propio", () => {
  it("GET /pages trae icono, fondo, autor y myPermission", async () => {
    const page = await createPage(api, luis, { title: "Guía de soporte", icon: "lucide:book:verde", background: fondo, visibility: "DEPARTMENT" });
    const item = find((await api.as(pedro).get("/pages")).body.pages, page.id);
    expect(item).toMatchObject({ icon: "lucide:book:verde", owner: { id: luis.id, name: "Luis Paz" }, myPermission: null, tags: [] });
    expect(JSON.parse(item.backgroundJson)).toEqual(fondo);
    expect(find((await api.as(luis).get("/pages")).body.pages, page.id).myPermission).toBe("OWNER");
    // El administrador la ve por su rol: no es una página compartida con él.
    expect(find((await api.as(ana).get("/pages")).body.pages, page.id).myPermission).toBeNull();
  });

  it("myPermission distingue lectura y edición compartidas", async () => {
    const lectura = await createPage(api, luis);
    const edicion = await createPage(api, luis);
    await api.as(luis).put(`/pages/${lectura.id}/shares/${maria.id}`, { permission: "READ" });
    await api.as(luis).put(`/pages/${edicion.id}/shares/${maria.id}`, { permission: "EDIT" });
    const pages = (await api.as(maria).get("/pages")).body.pages;
    expect(find(pages, lectura.id).myPermission).toBe("READ");
    expect(find(pages, edicion.id).myPermission).toBe("EDIT");
  });

  it("destacadas y más visitadas traen los mismos campos", async () => {
    const page = await createPage(api, luis, { icon: "📌", background: fondo, visibility: "DEPARTMENT" });
    expect((await api.as(luis).put(`/departments/${luis.departmentId}/featured`, { pageIds: [page.id] })).status).toBe(200);
    const featured = (await api.as(pedro).get(`/departments/${luis.departmentId}/featured`)).body.pages;
    expect(featured[0]).toMatchObject({ id: page.id, icon: "📌", owner: { name: "Luis Paz" }, myPermission: null });
    await api.as(pedro).post(`/pages/${page.id}/visit`);
    const popular = find((await api.as(pedro).get("/pages/popular")).body.pages, page.id);
    expect(popular).toMatchObject({ icon: "📌", owner: { name: "Luis Paz" }, _count: { visits: 1 } });
    expect(popular.backgroundJson).toBeTruthy();
  });
});

describe("campo de icono", () => {
  it("se guarda, se cambia, se quita y se valida", async () => {
    const page = await createPage(api, luis, { icon: "3d:acta" });
    expect((await api.as(luis).get(`/pages/${page.id}`)).body.page.icon).toBe("3d:acta");
    const quitado = await api.as(luis).patch(`/pages/${page.id}`, { icon: null, expectedVersion: page.version });
    expect(quitado.body.page.icon).toBeNull();
    expect((await api.as(luis).patch(`/pages/${page.id}`, { icon: "x".repeat(49), expectedVersion: quitado.body.page.version })).status).toBe(400);
  });

  it("restaurar una versión del historial recupera el icono", async () => {
    const page = await createPage(api, luis, { icon: "🍕" });
    await api.as(luis).patch(`/pages/${page.id}`, { icon: "🌮", expectedVersion: page.version });
    const restored = await api.as(luis).post(`/pages/${page.id}/history/${page.version}/restore`);
    expect(restored.body.page.icon).toBe("🍕");
  });

  it("las plantillas tienen icono y las páginas creadas desde ellas lo copian", async () => {
    const template = await api.as(luis).post("/templates", { title: "Acta", icon: "3d:acta", content: [] });
    expect(template.body.template.icon).toBe("3d:acta");
    expect(find((await api.as(luis).get("/templates")).body.templates, template.body.template.id).icon).toBe("3d:acta");
    const page = await api.as(luis).post(`/pages/from-template/${template.body.template.id}`, {});
    expect(page.body.page.icon).toBe("3d:acta");
  });

  it("la migración copia a la columna los iconos guardados dentro del fondo", async () => {
    const page = await createPage(api, luis, { background: { type: "none", icon: "🍕" } });
    const template = (await api.as(luis).post("/templates", { title: "Vieja", background: { type: "none", icon: "lucide:star:rojo" } })).body.template;
    const dir = new URL("../../backend/models/migrations/", import.meta.url);
    const folder = readdirSync(dir).find((name) => name.endsWith("_icono_paginas_plantillas"))!;
    const sql = readFileSync(new URL(`${folder}/migration.sql`, dir), "utf8");
    for (const statement of sql.split(";").map((part) => part.replace(/--.*$/gm, "").trim()).filter((part) => part.startsWith("UPDATE"))) await prisma.$executeRawUnsafe(statement);
    expect((await prisma.page.findUnique({ where: { id: page.id } }))?.icon).toBe("🍕");
    expect((await prisma.template.findUnique({ where: { id: template.id } }))?.icon).toBe("lucide:star:rojo");
  });
});
