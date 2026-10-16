import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, rm } from "node:fs/promises";
import path from "node:path";
import type { Actor, PageAccessRecord } from "../permissions/access.js";
import { assertCanEditPage, canReadPage, canEditTemplate, canReadTemplate } from "../permissions/access.js";
import { prisma } from "../models/client.js";
import { uploadDirectory } from "../storage/files.js";
import { badRequest, forbidden, notFound } from "./errors.js";

/** Un archivo se sube suelto, para una página o para una plantilla (con los permisos de esa plantilla). */
export async function saveUploadedFile(actor: Actor, file: Express.Multer.File, target: { pageId?: string; templateId?: string } = {}) {
  const discard = () => rm(file.path, { force: true });
  const maxFiles = Number(process.env.MAX_UPLOADS_PER_USER ?? 1000);
  const total = await prisma.fileAsset.count({ where: { ownerId: actor.id } });
  if (total >= maxFiles) { await discard(); throw badRequest("Alcanzaste el límite de archivos subidos."); }
  if (target.pageId && target.templateId) { await discard(); throw badRequest("Un archivo pertenece a una página o a una plantilla, no a ambas."); }
  if (target.pageId) {
    const page = await prisma.page.findFirst({ where: { id: target.pageId, deletedAt: null }, include: { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } } } });
    if (!page) { await discard(); throw notFound("No se encontró la página."); }
    try { assertCanEditPage(page as PageAccessRecord, actor); } catch (error) { await discard(); throw error; }
  }
  if (target.templateId) {
    const template = await prisma.template.findUnique({ where: { id: target.templateId }, include: { shares: { select: { userId: true, permission: true } } } });
    if (!template || !canReadTemplate(template, actor)) { await discard(); throw notFound("No se encontró la plantilla."); }
    if (!canEditTemplate(template, actor)) { await discard(); throw forbidden("Necesitas permiso de edición para cambiar esta plantilla."); }
  }
  try {
    return await prisma.fileAsset.create({ data: { storageName: path.basename(file.filename), originalName: path.basename(file.originalname).slice(0, 240), mimeType: file.mimetype, sizeBytes: file.size, ownerId: actor.id, pageId: target.pageId ?? null, templateId: target.templateId ?? null } });
  } catch (error) { await discard(); throw error; }
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
  const asset = await prisma.fileAsset.findUnique({ where: { id } });
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
    if (!template || !canReadTemplate(template, actor)) throw forbidden("No tienes permiso para ver este archivo.");
  } else if (asset.ownerId !== actor.id && actor.role !== "ADMIN") throw forbidden("No tienes permiso para ver este archivo.");
  return { ...asset, path: path.join(uploadDirectory, path.basename(asset.storageName)) };
}

export async function deleteFile(actor: Actor, id: string) {
  const asset = await prisma.fileAsset.findUnique({ where: { id } });
  if (!asset) throw notFound("No se encontró el archivo.");
  if (asset.ownerId !== actor.id && actor.role !== "ADMIN") throw forbidden("Solo quien subió el archivo puede eliminarlo.");
  await prisma.fileAsset.delete({ where: { id } });
  await rm(path.join(uploadDirectory, path.basename(asset.storageName)), { force: true });
}

export function openFile(filePath: string) { return createReadStream(filePath); }

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
    const storageName = randomUUID();
    try { await copyFile(asset.path, path.join(uploadDirectory, storageName)); } catch { continue; }
    const copy = await prisma.fileAsset.create({ data: { storageName, originalName: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, ownerId: actor.id, ...target } });
    contentJson = contentJson.replaceAll(fileId, copy.id);
    backgroundJson = backgroundJson?.replaceAll(fileId, copy.id) ?? null;
  }
  return { contentJson, backgroundJson };
}
