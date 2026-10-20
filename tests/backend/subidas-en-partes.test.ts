import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { purgeStaleUploads } from "../../backend/services/file-service.js";
import { UPLOAD_PART_BYTES } from "../../backend/storage/files.js";
import { createDepartment, createPage, createUser, prisma, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

// Vercel no acepta cuerpos de más de 4,5 MB: los archivos de más de 3 MB se suben en partes y se entregan por streaming.
let api: TestApi;
let duena: TestUser, lectora: TestUser, otra: TestUser;
const before = process.env.FILE_STORAGE;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  duena = await createUser("Usuario Tecnología", tecnologia.id);
  lectora = await createUser("María Zelaya", tecnologia.id);
  otra = await createUser("Usuario Compras", (await createDepartment("Compras")).id);
  api = await startApi();
});
afterAll(() => { api.close(); process.env.FILE_STORAGE = before; });

const putPart = (user: TestUser, uploadId: string, part: number, data: Buffer) =>
  fetch(`${api.base}/api/files/uploads/${uploadId}/parts/${part}`, { method: "PUT", headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/octet-stream" }, body: new Uint8Array(data) });
const content = (user: TestUser, id: string) => fetch(`${api.base}/api/files/${id}/content`, { headers: { Authorization: `Bearer ${user.token}` } });

/** Sube `data` en partes como lo hace el navegador y devuelve el archivo creado. */
async function uploadInParts(user: TestUser, data: Buffer, target: { pageId?: string } = {}) {
  const start = await api.as(user).post("/files/uploads", { name: "video.mp4", mimeType: "video/mp4", size: data.length, ...target });
  expect(start.status).toBe(201);
  const { uploadId, partSize, partCount } = start.body;
  for (let part = 0; part < partCount; part++) expect((await putPart(user, uploadId, part, data.subarray(part * partSize, (part + 1) * partSize))).status).toBe(200);
  return api.as(user).post(`/files/uploads/${uploadId}/complete`);
}

for (const mode of ["disk", "database"] as const) {
  describe(`subidas en partes (FILE_STORAGE=${mode})`, () => {
    beforeAll(() => { process.env.FILE_STORAGE = mode; });

    it("junta las partes de un archivo de 7 MB y lo entrega igual, sin dejar partes a medias", async () => {
      const page = await createPage(api, duena, { visibility: "DEPARTMENT" });
      const data = randomBytes(7 * 1024 * 1024 + 123);
      const done = await uploadInParts(duena, data, { pageId: page.id });
      expect(done.status).toBe(201);
      expect(done.body.file.sizeBytes).toBe(data.length);
      if (mode === "database") expect(await prisma.fileBlobPart.count({ where: { storageName: done.body.file.storageName } })).toBe(Math.ceil(data.length / UPLOAD_PART_BYTES));
      expect(await prisma.fileUpload.count()).toBe(0);
      expect(await prisma.fileUploadPart.count()).toBe(0);

      const res = await content(lectora, done.body.file.id);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-length")).toBe(String(data.length));
      expect(Buffer.from(await res.arrayBuffer()).equals(data)).toBe(true);
      // Otra persona sin acceso a la página no lo ve.
      expect((await content(otra, done.body.file.id)).status).toBe(403);
    });
  });
}

describe("subidas en partes: límites y permisos", () => {
  beforeAll(() => { process.env.FILE_STORAGE = "database"; });

  it("rechaza archivos de más de 20 MB y tipos no permitidos antes de recibir bytes", async () => {
    const big = await api.as(duena).post("/files/uploads", { name: "grande.mp4", mimeType: "video/mp4", size: 20 * 1024 * 1024 + 1 });
    expect(big.status).toBe(413);
    expect(big.body.error).toEqual({ code: "FILE_TOO_LARGE", message: "El archivo supera el límite de 20 MB." });
    expect((await api.as(duena).post("/files/uploads", { name: "x.html", mimeType: "text/html", size: 10 })).status).toBe(415);
    expect(await prisma.fileUpload.count()).toBe(0);
  });

  it("quien solo lee la página no puede subirle archivos, y otra persona no puede tocar una subida ajena", async () => {
    const page = await createPage(api, duena, { visibility: "DEPARTMENT" });
    expect((await api.as(lectora).post("/files/uploads", { name: "v.mp4", mimeType: "video/mp4", size: 5_000_000, pageId: page.id })).status).toBe(403);

    const start = (await api.as(duena).post("/files/uploads", { name: "v.mp4", mimeType: "video/mp4", size: 5_000_000, pageId: page.id })).body;
    expect((await putPart(otra, start.uploadId, 0, Buffer.alloc(UPLOAD_PART_BYTES))).status).toBe(404);
    expect((await api.as(otra).post(`/files/uploads/${start.uploadId}/complete`)).status).toBe(404);
  });

  it("revisa el tamaño de cada parte y no completa si falta alguna", async () => {
    const start = (await api.as(duena).post("/files/uploads", { name: "v.mp4", mimeType: "video/mp4", size: 5_000_000 })).body;
    expect(start.partCount).toBe(2);
    expect((await putPart(duena, start.uploadId, 0, Buffer.alloc(100))).status).toBe(400);
    expect((await putPart(duena, start.uploadId, 2, Buffer.alloc(10))).status).toBe(400);
    expect((await putPart(duena, start.uploadId, 0, Buffer.alloc(UPLOAD_PART_BYTES))).status).toBe(200);
    const incomplete = await api.as(duena).post(`/files/uploads/${start.uploadId}/complete`);
    expect(incomplete.status).toBe(400);
    expect(incomplete.body.error.message).toBe("Faltan partes del archivo. Vuelve a intentarlo.");
  });

  it("si mientras se subía le quitan el permiso de edición, no se completa", async () => {
    const page = await createPage(api, duena);
    await api.as(duena).put(`/pages/${page.id}/shares/${lectora.id}`, { permission: "EDIT" });
    const data = randomBytes(UPLOAD_PART_BYTES + 10);
    const start = (await api.as(lectora).post("/files/uploads", { name: "v.mp4", mimeType: "video/mp4", size: data.length, pageId: page.id })).body;
    await putPart(lectora, start.uploadId, 0, data.subarray(0, UPLOAD_PART_BYTES));
    await putPart(lectora, start.uploadId, 1, data.subarray(UPLOAD_PART_BYTES));
    await api.as(duena).put(`/pages/${page.id}/shares/${lectora.id}`, { permission: "READ" });
    expect((await api.as(lectora).post(`/files/uploads/${start.uploadId}/complete`)).status).toBe(403);
  });

  it("borra las subidas que quedaron a medias pasado un día", async () => {
    await prisma.fileUpload.create({ data: { ownerId: duena.id, originalName: "vieja.mp4", mimeType: "video/mp4", sizeBytes: 10, partCount: 1, createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } });
    expect(await purgeStaleUploads()).toBeGreaterThanOrEqual(1);
    expect(await prisma.fileUpload.count({ where: { originalName: "vieja.mp4" } })).toBe(0);
  });
});
