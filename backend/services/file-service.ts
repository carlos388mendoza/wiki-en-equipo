import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Actor, PageAccessRecord } from "../permissions/access.js";
import { assertCanEditPage, canReadPage, canEditTemplate, canReadTemplate } from "../permissions/access.js";
import { prisma } from "../models/client.js";
import { readStoredFile, removeStoredFiles, storeFile } from "../storage/files.js";
import { badRequest, forbidden, notFound } from "./errors.js";

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

/** Los permisos se revisan antes de guardar: un archivo rechazado no llega ni al disco ni a la base. */
export async function saveUploadedFile(actor: Actor, file: Express.Multer.File, target: { pageId?: string; templateId?: string } = {}) {
  const maxFiles = Number(process.env.MAX_UPLOADS_PER_USER ?? 1000);
  const total = await prisma.fileAsset.count({ where: { ownerId: actor.id } });
  if (total >= maxFiles) throw badRequest("Alcanzaste el límite de archivos subidos.");
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
  return createStoredFile(file.buffer, { originalName: path.basename(file.originalname).slice(0, 240), mimeType: file.mimetype, ownerId: actor.id, pageId: target.pageId ?? null, templateId: target.templateId ?? null });
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

/** Los bytes de un archivo, solo después de comprobar que la persona puede verlo. */
export async function readFileContent(actor: Actor, id: string) {
  const asset = await findReadableFile(actor, id);
  const data = await readStoredFile(asset.storageName);
  if (!data) throw notFound("El archivo ya no está disponible.");
  return { asset, data };
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
    const data = await readStoredFile(asset.storageName);
    if (!data) continue;
    const copy = await createStoredFile(data, { originalName: asset.originalName, mimeType: asset.mimeType, ownerId: actor.id, ...target });
    contentJson = contentJson.replaceAll(fileId, copy.id);
    backgroundJson = backgroundJson?.replaceAll(fileId, copy.id) ?? null;
  }
  return { contentJson, backgroundJson };
}
