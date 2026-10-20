import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Actor, PageAccessRecord } from "../permissions/access.js";
import { assertCanEditPage, canReadPage, canEditTemplate, canReadTemplate } from "../permissions/access.js";
import { prisma } from "../models/client.js";
import { copyStoredFile, fileStorage, isAllowedFileType, maxUploadBytes, removeStoredFiles, storedFileChunks, storeFile, UPLOAD_PART_BYTES } from "../storage/files.js";
import { badRequest, forbidden, HttpError, notFound } from "./errors.js";

/** Un archivo se sube suelto, para una página o para una plantilla (con los permisos de esa plantilla). */
// Lo que se devuelve de un archivo (nunca sus bytes).
const assetFields = { id: true, storageName: true, originalName: true, mimeType: true, sizeBytes: true, ownerId: true, pageId: true, templateId: true, createdAt: true } as const;

/** Guarda un archivo nuevo (en disco o en la base, según FILE_STORAGE) y su registro. */
async function createStoredFile(data: Buffer, record: { originalName: string; mimeType: string; ownerId: string; pageId?: string | null; templateId?: string | null }) {
  const storageName = randomUUID();
  try {
    return await prisma.fileAsset.create({ data: { storageName, sizeBytes: data.length, ...record, ...(await storeFile(storageName, data)) }, select: assetFields });
  } catch (error) { await removeStoredFiles([storageName]).catch(() => {}); throw error; }
}

type UploadTarget = { pageId?: string; templateId?: string };

async function assertUploadQuota(actor: Actor) {
  const maxFiles = Number(process.env.MAX_UPLOADS_PER_USER ?? 1000);
  const total = await prisma.fileAsset.count({ where: { ownerId: actor.id } });
  if (total >= maxFiles) throw badRequest("Alcanzaste el límite de archivos subidos.");
}

/** Subir a una página o plantilla pide permiso de edición en ella. */
async function assertCanAttach(actor: Actor, target: UploadTarget) {
  if (target.pageId && target.templateId) throw badRequest("Un archivo pertenece a una página o a una plantilla, no a ambas.");
  if (target.pageId) {
    const page = await prisma.page.findFirst({ where: { id: target.pageId, deletedAt: null }, include: { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } } } });
    if (!page) throw notFound("No se encontró la página.");
    assertCanEditPage(page as PageAccessRecord, actor);
  }
  if (target.templateId) {
    const template = await prisma.template.findUnique({ where: { id: target.templateId }, include: { shares: { select: { userId: true, permission: true } } } });
    if (!template || !canReadTemplate(template, actor)) throw notFound("No se encontró la plantilla.");
    if (!canEditTemplate(template, actor)) throw forbidden("Necesitas permiso de edición para cambiar esta plantilla.");
  }
}

/** Los permisos se revisan antes de guardar: un archivo rechazado no llega ni al disco ni a la base. */
export async function saveUploadedFile(actor: Actor, file: Express.Multer.File, target: UploadTarget = {}) {
  await assertUploadQuota(actor);
  await assertCanAttach(actor, target);
  return createStoredFile(file.buffer, { originalName: path.basename(file.originalname).slice(0, 240), mimeType: file.mimetype, ownerId: actor.id, pageId: target.pageId ?? null, templateId: target.templateId ?? null });
}

/* ---------- Subidas en partes (archivos de más de 3 MB) ---------- */

/** Subidas a medias que se dejan de esperar (se borran en el Cron diario o al empezar otra). */
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;
/** Subidas a medias por persona a la vez. */
const MAX_PENDING_UPLOADS = 5;
const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

export async function purgeStaleUploads(now = new Date()) {
  return (await prisma.fileUpload.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - STALE_UPLOAD_MS) } } })).count;
}

/** Empieza una subida en partes: revisa tipo, tamaño, cupo y permisos antes de recibir ningún byte. */
export async function startUpload(actor: Actor, input: { name: string; mimeType: string; size: number } & UploadTarget) {
  if (!isAllowedFileType(input.mimeType)) throw new HttpError(415, "UNSUPPORTED_FILE_TYPE", "Este tipo de archivo no está permitido.");
  if (input.size > maxUploadBytes()) throw new HttpError(413, "FILE_TOO_LARGE", `El archivo supera el límite de ${mb(maxUploadBytes())}.`);
  await assertUploadQuota(actor);
  await assertCanAttach(actor, input);
  await purgeStaleUploads();
  if (await prisma.fileUpload.count({ where: { ownerId: actor.id } }) >= MAX_PENDING_UPLOADS) throw badRequest("Tienes varias subidas sin terminar. Espera a que acaben e intenta de nuevo.");
  const partCount = Math.max(1, Math.ceil(input.size / UPLOAD_PART_BYTES));
  const upload = await prisma.fileUpload.create({ data: { ownerId: actor.id, originalName: path.basename(input.name).slice(0, 240), mimeType: input.mimeType, sizeBytes: input.size, partCount, pageId: input.pageId ?? null, templateId: input.templateId ?? null } });
  return { uploadId: upload.id, partSize: UPLOAD_PART_BYTES, partCount };
}

/** Solo quien empezó la subida la ve (para los demás no existe). */
async function ownUpload(actor: Actor, uploadId: string) {
  const upload = await prisma.fileUpload.findUnique({ where: { id: uploadId } });
  if (!upload || upload.ownerId !== actor.id) throw notFound("No se encontró la subida. Vuelve a intentarlo.");
  return upload;
}

/** Guarda una parte. Todas miden UPLOAD_PART_BYTES salvo la última; volver a enviar una la reemplaza. */
export async function saveUploadPart(actor: Actor, uploadId: string, part: number, data: Buffer) {
  const upload = await ownUpload(actor, uploadId);
  if (!Number.isInteger(part) || part < 0 || part >= upload.partCount) throw badRequest("Esa parte no pertenece al archivo.");
  const expected = part === upload.partCount - 1 ? upload.sizeBytes - UPLOAD_PART_BYTES * (upload.partCount - 1) : UPLOAD_PART_BYTES;
  if (data.length !== expected) throw badRequest(`La parte ${part + 1} llegó incompleta. Vuelve a intentarlo.`);
  const bytes = new Uint8Array(data);
  await prisma.fileUploadPart.upsert({ where: { uploadId_part: { uploadId, part } }, create: { uploadId, part, data: bytes }, update: { data: bytes } });
  return { part, received: await prisma.fileUploadPart.count({ where: { uploadId } }), partCount: upload.partCount };
}

/** Junta las partes en un archivo de la wiki. Vuelve a revisar los permisos (pudieron cambiar mientras se subía). */
export async function completeUpload(actor: Actor, uploadId: string) {
  const upload = await ownUpload(actor, uploadId);
  if (await prisma.fileUploadPart.count({ where: { uploadId } }) !== upload.partCount) throw badRequest("Faltan partes del archivo. Vuelve a intentarlo.");
  await assertUploadQuota(actor);
  await assertCanAttach(actor, { pageId: upload.pageId ?? undefined, templateId: upload.templateId ?? undefined });
  const storageName = randomUUID();
  const record = { storageName, originalName: upload.originalName, mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, ownerId: actor.id, pageId: upload.pageId, templateId: upload.templateId };
  if (fileStorage() === "disk") {
    const parts = await prisma.fileUploadPart.findMany({ where: { uploadId }, orderBy: { part: "asc" }, select: { data: true } });
    await storeFile(storageName, Buffer.concat(parts.map((p) => Buffer.from(p.data))));
    try {
      const asset = await prisma.fileAsset.create({ data: record, select: assetFields });
      await prisma.fileUpload.delete({ where: { id: uploadId } });
      return asset;
    } catch (error) { await removeStoredFiles([storageName]).catch(() => {}); throw error; }
  }
  // En la base, las partes pasan a FileBlobPart dentro de ella: no vuelven a viajar por la red.
  const [asset] = await prisma.$transaction([
    prisma.fileAsset.create({ data: record, select: assetFields }),
    prisma.$executeRaw`INSERT INTO "FileBlobPart" ("storageName", "part", "data") SELECT ${storageName}, "part", "data" FROM "FileUploadPart" WHERE "uploadId" = ${uploadId}`,
    prisma.fileUpload.delete({ where: { id: uploadId } }),
  ]);
  return asset;
}

export async function listPageFiles(actor: Actor, pageId: string) {
  // Primero verificar si la página existe
  const pageExists = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null }, select: { id: true } });
  if (!pageExists) throw notFound("No se encontró la página.");
  // Luego verificar permisos
  const page = await prisma.page.findFirst({ where: { id: pageId, deletedAt: null }, include: { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } } } });
  if (!page || !canReadPage(page as PageAccessRecord, actor)) throw forbidden("No tienes acceso a esta página.");
  return prisma.fileAsset.findMany({ where: { pageId }, orderBy: { createdAt: "asc" }, select: { id: true, originalName: true, mimeType: true, sizeBytes: true, ownerId: true, createdAt: true } });
}

/** Lo ve quien puede leer su página o su plantilla; un archivo suelto, solo quien lo subió (o un ADMIN). */
export async function findReadableFile(actor: Actor, id: string) {
  const asset = await prisma.fileAsset.findUnique({ where: { id }, select: assetFields });
  if (!asset) throw notFound("No se encontró el archivo.");
  if (asset.pageId) {
    // Primero verificar si la página existe
    const pageExists = await prisma.page.findFirst({ where: { id: asset.pageId, deletedAt: null }, select: { id: true } });
    if (!pageExists) throw notFound("No se encontró el archivo.");
    // Luego verificar permisos
    const page = await prisma.page.findFirst({ where: { id: asset.pageId, deletedAt: null }, include: { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } } } });
    if (!page || !canReadPage(page as PageAccessRecord, actor)) throw forbidden("No tienes permiso para ver este archivo.");
  } else if (asset.templateId) {
    const template = await prisma.template.findUnique({ where: { id: asset.templateId }, include: { shares: { select: { userId: true, permission: true } } } });
    // Como las plantillas: si no se puede leer, no se revela que existe.
    if (!template || !canReadTemplate(template, actor)) throw notFound("No se encontró el archivo.");
  } else if (asset.ownerId !== actor.id && actor.role !== "ADMIN") throw forbidden("No tienes permiso para ver este archivo.");
  return asset;
}

/**
 * Los bytes de un archivo, de a pedazos, solo después de comprobar que la persona puede verlo. El primer pedazo
 * se lee antes de responder para avisar con 404 si los bytes ya no existen.
 */
export async function readFileContent(actor: Actor, id: string) {
  const asset = await findReadableFile(actor, id);
  const chunks = storedFileChunks(asset.storageName);
  const first = await chunks.next();
  if (first.done) throw notFound("El archivo ya no está disponible.");
  return { asset, first: first.value, rest: chunks };
}

export async function deleteFile(actor: Actor, id: string) {
  const asset = await prisma.fileAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("No se encontró el archivo.");
  if (asset.ownerId !== actor.id && actor.role !== "ADMIN") throw forbidden("Solo quien subió el archivo puede eliminarlo.");
  await prisma.fileAsset.delete({ where: { id } });
  await removeStoredFiles([asset.storageName]);
}

// El contenido cita archivos con la URL del frontend (/archivos/:id), la del backend (/api/files/:id/content) o en `fileId`.
const FILE_URL = /\/(?:archivos|api\/files)\/([A-Za-z0-9_-]{8,64})/g;
const FILE_FIELD = /"fileId"\s*:\s*"([A-Za-z0-9_-]{8,64})"/g;
const MAX_COPIES = 50;

/** Ids de archivos de la wiki citados en el contenido o el fondo. */
export function referencedFileIds(...jsons: (string | null | undefined)[]) {
  const ids = new Set<string>();
  for (const json of jsons) if (json) for (const pattern of [FILE_URL, FILE_FIELD]) for (const match of json.matchAll(pattern)) ids.add(match[1]);
  return [...ids];
}

/**
 * Copia a la página o plantilla de destino los archivos citados que aún no le pertenecen y que la persona
 * puede ver, y devuelve el contenido y el fondo con los ids nuevos. Así una página creada desde una plantilla
 * (o una plantilla hecha desde una página) no depende de los permisos del original.
 */
export async function copyReferencedFiles(actor: Actor, target: { pageId: string } | { templateId: string }, source: { contentJson: string; backgroundJson: string | null }) {
  let { contentJson, backgroundJson } = source;
  for (const fileId of referencedFileIds(contentJson, backgroundJson).slice(0, MAX_COPIES)) {
    const asset = await findReadableFile(actor, fileId).catch(() => null);
    if (!asset || ("pageId" in target ? asset.pageId === target.pageId : asset.templateId === target.templateId)) continue;
    // Los bytes se copian dentro de la base (o del disco): un archivo grande no pasa completo por la memoria.
    const copy = await prisma.fileAsset.create({ data: { storageName: randomUUID(), sizeBytes: asset.sizeBytes, originalName: asset.originalName, mimeType: asset.mimeType, ownerId: actor.id, ...target }, select: assetFields });
    if (!(await copyStoredFile(asset.storageName, copy.storageName))) { await prisma.fileAsset.delete({ where: { id: copy.id } }); continue; }
    contentJson = contentJson.replaceAll(fileId, copy.id);
    backgroundJson = backgroundJson?.replaceAll(fileId, copy.id) ?? null;
  }
  return { contentJson, backgroundJson };
}
