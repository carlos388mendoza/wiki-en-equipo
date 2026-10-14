import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { purgeExpiredTrash } from "../../backend/services/page-service.js";
import { uploadDirectory } from "../../backend/storage/files.js";
import { createDepartment, createPage, createUser, prisma, resetDatabase, startApi, uploadImage, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, luis: TestUser, maria: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id);
  maria = await createUser("María Zelaya", tecnologia.id);
  api = await startApi();
});
afterAll(() => api.close());

async function enPapelera(owner: TestUser, data: Record<string, unknown> = {}) {
  const page = await createPage(api, owner, data);
  expect((await api.as(owner).delete(`/pages/${page.id}`)).status).toBe(200);
  return page;
}

describe("eliminar definitivamente", () => {
  it("el dueño la elimina con su historial y sus archivos (también del disco)", async () => {
    const page = await createPage(api, luis);
    await api.as(luis).patch(`/pages/${page.id}`, { title: "Con historial", expectedVersion: page.version });
    const file = (await uploadImage(api, luis, { pageId: page.id })).body.file;
    const onDisk = path.join(uploadDirectory, file.storageName);
    expect(existsSync(onDisk)).toBe(true);
    await api.as(luis).delete(`/pages/${page.id}`);

    expect((await api.as(luis).delete(`/pages/${page.id}/permanent`)).status).toBe(204);
    expect(await prisma.page.findUnique({ where: { id: page.id } })).toBeNull();
    expect(await prisma.pageHistory.count({ where: { pageId: page.id } })).toBe(0);
    expect(await prisma.fileAsset.findUnique({ where: { id: file.id } })).toBeNull();
    expect(existsSync(onDisk)).toBe(false);
    expect((await api.as(luis).post(`/pages/${page.id}/restore`)).status).toBe(404);
  });

  it("también elimina sus subpáginas en la papelera", async () => {
    const padre = await createPage(api, luis);
    const hija = await createPage(api, luis, { parentId: padre.id });
    await api.as(luis).delete(`/pages/${padre.id}`);
    await api.as(luis).delete(`/pages/${padre.id}/permanent`);
    expect(await prisma.page.findUnique({ where: { id: hija.id } })).toBeNull();
  });

  it("nadie más puede eliminar definitivamente la página de otra persona (salvo un administrador)", async () => {
    const page = await enPapelera(luis);
    expect((await api.as(maria).delete(`/pages/${page.id}/permanent`)).status).toBe(403);
    expect((await api.as(ana).delete(`/pages/${page.id}/permanent`)).status).toBe(204);
  });

  it("una página que no está en la papelera no se elimina definitivamente", async () => {
    const page = await createPage(api, luis);
    expect((await api.as(luis).delete(`/pages/${page.id}/permanent`)).status).toBe(409);
    expect(await prisma.page.findUnique({ where: { id: page.id } })).not.toBeNull();
  });
});

describe("vaciar papelera", () => {
  it("borra solo las páginas propias", async () => {
    const mias = [await enPapelera(maria), await enPapelera(maria)];
    const deLuis = await enPapelera(luis);
    const res = await api.as(maria).delete("/pages/trash");
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);
    for (const page of mias) expect(await prisma.page.findUnique({ where: { id: page.id } })).toBeNull();
    expect(await prisma.page.findUnique({ where: { id: deLuis.id } })).not.toBeNull();
  });
});

describe("retención automática", () => {
  it("borra lo que lleva más días que el límite y deja lo reciente", async () => {
    const vieja = await enPapelera(luis);
    const reciente = await enPapelera(luis);
    await prisma.page.update({ where: { id: vieja.id }, data: { deletedAt: new Date(Date.now() - 31 * 86_400_000) } });
    expect(await purgeExpiredTrash(30)).toBe(1);
    expect(await prisma.page.findUnique({ where: { id: vieja.id } })).toBeNull();
    expect(await prisma.page.findUnique({ where: { id: reciente.id } })).not.toBeNull();
    expect(await purgeExpiredTrash(0)).toBe(0);
  });
});
