import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createPage, createUser, prisma, readFileStatus, resetDatabase, startApi, uploadImage, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, luis: TestUser, pedro: TestUser, maria: TestUser;
const fondo = { type: "gradient", value: "linear-gradient(135deg, #fff4df 0%, #fff0ed 100%)" };

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

async function plantillaDeLuis(data: Record<string, unknown> = {}) {
  const res = await api.as(luis).post("/templates", { title: "Acta de reunión", content: [{ id: "a", type: "paragraph", data: { text: "Asistentes" } }], ...data });
  expect(res.status).toBe(201);
  return res.body.template as { id: string; version?: number };
}
const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe("compartir plantillas con una persona", () => {
  it("una plantilla privada no la ve nadie más hasta compartirla", async () => {
    const t = await plantillaDeLuis();
    expect((await api.as(maria).get(`/templates/${t.id}`)).status).toBe(404);
    expect(ids((await api.as(maria).get("/templates")).body.templates)).not.toContain(t.id);
    expect((await api.as(maria).post(`/pages/from-template/${t.id}`, {})).status).toBe(404);
  });

  it("con lectura la ve, la usa y ve quién tiene acceso, pero no la edita ni la comparte", async () => {
    const t = await plantillaDeLuis();
    expect((await api.as(luis).put(`/templates/${t.id}/shares/${maria.id}`, { permission: "READ" })).status).toBe(200);
    const detalle = await api.as(maria).get(`/templates/${t.id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.template).toMatchObject({ myPermission: "READ", canEdit: false, canManage: false });
    expect(detalle.body.template.shares).toEqual([{ userId: maria.id, permission: "READ", user: { id: maria.id, name: "María Zelaya", department: { name: "Compras" } } }]);
    const item = (await api.as(maria).get("/templates")).body.templates.find((x: { id: string }) => x.id === t.id);
    expect(item).toMatchObject({ myPermission: "READ", owner: { id: luis.id, name: "Luis Paz" } });
    expect((await api.as(maria).post(`/pages/from-template/${t.id}`, {})).status).toBe(201);

    expect((await api.as(maria).patch(`/templates/${t.id}`, { title: "Cambio" })).status).toBe(403);
    expect((await api.as(maria).put(`/templates/${t.id}/shares/${pedro.id}`, { permission: "READ" })).status).toBe(403);
    expect((await api.as(maria).post(`/templates/${t.id}/share-links`, { permission: "READ" })).status).toBe(403);
    expect((await api.as(maria).delete(`/templates/${t.id}`)).status).toBe(403);
  });

  it("con edición cambia el contenido y comparte, pero no el alcance ni la elimina", async () => {
    const t = await plantillaDeLuis();
    await api.as(luis).put(`/templates/${t.id}/shares/${maria.id}`, { permission: "EDIT" });
    const editada = await api.as(maria).patch(`/templates/${t.id}`, { title: "Acta (revisada)", icon: "3d:acta" });
    expect(editada.status).toBe(200);
    expect(editada.body.template.title).toBe("Acta (revisada)");
    expect((await api.as(maria).put(`/templates/${t.id}/shares/${pedro.id}`, { permission: "READ" })).status).toBe(200);
    expect((await api.as(maria).patch(`/templates/${t.id}`, { scope: "DEPARTMENT" })).status).toBe(403);
    // El editor guarda enviando el alcance actual: eso no es un cambio de alcance.
    expect((await api.as(maria).patch(`/templates/${t.id}`, { title: "Acta", scope: "PRIVATE" })).status).toBe(200);
    expect((await api.as(maria).delete(`/templates/${t.id}`)).status).toBe(403);
    expect((await api.as(luis).patch(`/templates/${t.id}`, { scope: "DEPARTMENT" })).body.template.departmentId).toBe(luis.departmentId);
  });

  it("quitar el acceso lo quita", async () => {
    const t = await plantillaDeLuis();
    await api.as(luis).put(`/templates/${t.id}/shares/${maria.id}`, { permission: "READ" });
    expect((await api.as(luis).delete(`/templates/${t.id}/shares/${maria.id}`)).status).toBe(204);
    expect((await api.as(maria).get(`/templates/${t.id}`)).status).toBe(404);
  });

  it("no se comparte con uno mismo ni con quien la creó", async () => {
    const t = await plantillaDeLuis();
    expect((await api.as(luis).put(`/templates/${t.id}/shares/${luis.id}`, { permission: "READ" })).status).toBe(400);
    await api.as(luis).put(`/templates/${t.id}/shares/${maria.id}`, { permission: "EDIT" });
    expect((await api.as(maria).put(`/templates/${t.id}/shares/${luis.id}`, { permission: "READ" })).status).toBe(400);
  });

  it("solo un administrador marca plantillas predeterminadas", async () => {
    const t = await plantillaDeLuis();
    expect((await api.as(luis).patch(`/templates/${t.id}`, { isDefault: true, scope: "COMPANY" })).status).toBe(403);
    expect((await api.as(ana).patch(`/templates/${t.id}`, { isDefault: true, scope: "COMPANY" })).status).toBe(200);
  });
});

describe("enlaces de plantillas", () => {
  it("se crean, se listan sin token, se aceptan y se desactivan", async () => {
    const t = await plantillaDeLuis();
    const link = await api.as(luis).post(`/templates/${t.id}/share-links`, { permission: "READ", expiresInHours: 48 });
    expect(link.status).toBe(201);
    expect(link.body.url).toMatch(/\/share\//);
    const list = await api.as(luis).get(`/templates/${t.id}/share-links`);
    expect(list.body.links).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain(link.body.token);

    expect((await api.as(maria).post(`/share/${link.body.token}/accept`)).body).toEqual({ type: "template", templateId: t.id, permission: "READ" });
    expect((await api.as(maria).get(`/templates/${t.id}`)).status).toBe(200);

    expect((await api.as(luis).delete(`/templates/${t.id}/share-links/${link.body.id}`)).status).toBe(204);
    expect((await api.as(pedro).post(`/share/${link.body.token}/accept`)).status).toBe(404);
  });

  it("aceptar un enlace de lectura no quita la edición", async () => {
    const t = await plantillaDeLuis();
    await api.as(luis).put(`/templates/${t.id}/shares/${maria.id}`, { permission: "EDIT" });
    const link = await api.as(luis).post(`/templates/${t.id}/share-links`, { permission: "READ" });
    expect((await api.as(maria).post(`/share/${link.body.token}/accept`)).body.permission).toBe("EDIT");
    expect((await api.as(maria).patch(`/templates/${t.id}`, { title: "Sigue editable" })).status).toBe(200);
  });

  it("un enlace de edición permite editar", async () => {
    const t = await plantillaDeLuis();
    const link = await api.as(luis).post(`/templates/${t.id}/share-links`, { permission: "EDIT" });
    await api.as(pedro).post(`/share/${link.body.token}/accept`);
    expect((await api.as(pedro).patch(`/templates/${t.id}`, { description: "Con acuerdos" })).status).toBe(200);
  });
});

describe("qué abre un enlace antes de aceptarlo (#8)", () => {
  it("dice si es una plantilla o una página y con qué permiso, sin dar acceso", async () => {
    const t = await plantillaDeLuis();
    const enlacePlantilla = await api.as(luis).post(`/templates/${t.id}/share-links`, { permission: "EDIT" });
    const page = await createPage(api, luis);
    const enlacePagina = await api.as(luis).post(`/pages/${page.id}/share-links`, { permission: "READ" });

    expect((await api.as(maria).get(`/share/${enlacePlantilla.body.token}`)).body).toEqual({ type: "template", permission: "EDIT" });
    expect((await api.as(maria).get(`/share/${enlacePagina.body.token}`)).body).toEqual({ type: "page", permission: "READ" });
    // Consultar no acepta: sigue sin acceso.
    expect((await api.as(maria).get(`/templates/${t.id}`)).status).toBe(404);
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(403);
  });

  it("un enlace desactivado o inventado responde 404", async () => {
    const t = await plantillaDeLuis();
    const link = await api.as(luis).post(`/templates/${t.id}/share-links`, { permission: "READ" });
    await api.as(luis).delete(`/templates/${t.id}/share-links/${link.body.id}`);
    expect((await api.as(maria).get(`/share/${link.body.token}`)).status).toBe(404);
    expect((await api.as(maria).get(`/share/${"x".repeat(43)}`)).status).toBe(404);
  });
});

describe("listado de plantillas", () => {
  it("trae fondo, icono, autor y permisos", async () => {
    const t = await plantillaDeLuis({ background: fondo, icon: "3d:proceso" });
    const item = (await api.as(luis).get("/templates")).body.templates.find((x: { id: string }) => x.id === t.id);
    expect(item).toMatchObject({ icon: "3d:proceso", owner: { name: "Luis Paz" }, myPermission: "OWNER", canEdit: true, canManage: true });
    expect(JSON.parse(item.backgroundJson)).toEqual(fondo);
  });
});

describe("archivos de plantillas", () => {
  it("se suben a la plantilla con permiso de edición y los ve quien puede leerla", async () => {
    const t = await plantillaDeLuis();
    await api.as(luis).put(`/templates/${t.id}/shares/${maria.id}`, { permission: "READ" });
    expect((await uploadImage(api, maria, { templateId: t.id })).status).toBe(403);
    expect((await uploadImage(api, pedro, { templateId: t.id })).status).toBe(404);
    const subida = await uploadImage(api, luis, { templateId: t.id });
    expect(subida.status).toBe(201);
    expect(subida.body.file.templateId).toBe(t.id);
    expect(await readFileStatus(api, maria, subida.body.file.id)).toBe(200);
    expect(await readFileStatus(api, pedro, subida.body.file.id)).toBe(403);
  });

  it("al crear una página desde la plantilla, sus archivos se copian a la página", async () => {
    const t = await plantillaDeLuis();
    const subida = await uploadImage(api, luis, { templateId: t.id });
    const fileId = subida.body.file.id;
    await api.as(luis).patch(`/templates/${t.id}`, { content: [{ id: "img", type: "image", data: { url: `/archivos/${fileId}`, fileId } }], background: { type: "image", url: `/archivos/${fileId}` } });

    const page = (await api.as(luis).post(`/pages/from-template/${t.id}`, { title: "Acta del lunes" })).body.page;
    const [block] = JSON.parse(page.contentJson);
    expect(block.data.fileId).not.toBe(fileId);
    expect(block.data.url).toBe(`/archivos/${block.data.fileId}`);
    expect(JSON.parse(page.backgroundJson).url).toBe(`/archivos/${block.data.fileId}`);
    expect((await prisma.fileAsset.findUnique({ where: { id: block.data.fileId } }))?.pageId).toBe(page.id);

    // María puede leer la página pero no la plantilla privada: aun así ve la imagen.
    await api.as(luis).put(`/pages/${page.id}/shares/${maria.id}`, { permission: "READ" });
    expect(await readFileStatus(api, maria, block.data.fileId)).toBe(200);
    expect(await readFileStatus(api, maria, fileId)).toBe(403);
  });

  it("guardar una página como plantilla copia sus archivos a la plantilla", async () => {
    const page = await createPage(api, luis, { title: "Receta" });
    const subida = await uploadImage(api, luis, { pageId: page.id });
    const fileId = subida.body.file.id;
    const t = await api.as(luis).post("/templates", { title: "Receta base", scope: "DEPARTMENT", content: [{ id: "img", type: "image", data: { url: `/archivos/${fileId}`, fileId } }] });
    const copiedId = JSON.parse(t.body.template.contentJson)[0].data.fileId;
    expect(copiedId).not.toBe(fileId);
    expect(await readFileStatus(api, pedro, copiedId)).toBe(200);
    expect(await readFileStatus(api, pedro, fileId)).toBe(403);
  });

  it("no copia archivos que la persona no puede ver", async () => {
    const privada = await createPage(api, maria);
    const ajeno = (await uploadImage(api, maria, { pageId: privada.id })).body.file.id;
    const t = await api.as(luis).post("/templates", { title: "Intento", content: [{ id: "img", type: "image", data: { url: `/archivos/${ajeno}`, fileId: ajeno } }] });
    expect(JSON.parse(t.body.template.contentJson)[0].data.fileId).toBe(ajeno);
    expect(await prisma.fileAsset.count({ where: { templateId: t.body.template.id } })).toBe(0);
  });
});
