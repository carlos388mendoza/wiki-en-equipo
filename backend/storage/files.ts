import { mkdirSync } from "node:fs";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { prisma, tursoConfig } from "../models/client.js";

export const uploadDirectory = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
// El directorio solo se crea cuando de verdad se guarda en disco: en Vercel el sistema de archivos es de
// solo lectura (las funciones no conservan el disco) y con FILE_STORAGE=database no se usa.
let uploadDirectoryReady = false;
function ensureUploadDirectory() {
  if (uploadDirectoryReady) return;
  mkdirSync(uploadDirectory, { recursive: true });
  uploadDirectoryReady = true;
}

/**
 * Dónde se guardan los archivos subidos (FILE_STORAGE): `disk` (UPLOAD_DIR, desarrollo) o `database`
 * (tabla FileBlob; producción en Vercel, cuyas funciones no conservan el disco). Sin definir: `database` con Turso
 * y `disk` sin él. Al leer o borrar se busca en los dos sitios, así que cambiar de modo no rompe los viejos.
 */
export function fileStorage(): "disk" | "database" {
  const mode = process.env.FILE_STORAGE?.trim();
  if (mode === "disk" || mode === "database") return mode;
  if (mode) throw new Error(`FILE_STORAGE debe ser "disk" o "database" (llegó "${mode}").`);
  return tursoConfig() ? "database" : "disk";
}

/** Límite de un archivo (MAX_UPLOAD_BYTES; 20 MB por defecto). Los de más de UPLOAD_PART_BYTES se suben en partes. */
export const maxUploadBytes = () => Number(process.env.MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);
/** Tamaño de cada parte de una subida grande: menos de los 4,5 MB que acepta una función de Vercel por petición. */
export const UPLOAD_PART_BYTES = 3 * 1024 * 1024;
/** Una sola petición (POST /files) acepta hasta 4 MB: lo que pase de ahí va en partes (y nunca queda una fila más grande). */
export const singleUploadBytes = () => Math.min(maxUploadBytes(), 4 * 1024 * 1024);

const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "application/pdf",
  "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// En memoria: el archivo se guarda en disco o en la base solo después de revisar los permisos.
export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: singleUploadBytes(), files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) { callback(new Error("Este tipo de archivo no está permitido.")); return; }
    callback(null, true);
  },
});

export const isAllowedFileType = (mimeType: string) => allowedTypes.has(mimeType);

const diskPath = (storageName: string) => path.join(uploadDirectory, path.basename(storageName));

/**
 * Guarda los bytes de un archivo nuevo. En disco los escribe ya; en la base devuelve la fila de FileBlob para
 * crearla junto con su FileAsset (`prisma.fileAsset.create({ data: { ...datos, ...await storeFile() } })`).
 */
export async function storeFile(storageName: string, data: Buffer) {
  if (fileStorage() === "disk") { ensureUploadDirectory(); await writeFile(diskPath(storageName), data); return {}; }
  return { blob: { create: { data: new Uint8Array(data) } } };
}

/** Bytes de un archivo, esté en la base o en disco; `null` si ya no existe en ninguno. */
export async function readStoredFile(storageName: string): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of storedFileChunks(storageName)) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : null;
}

/**
 * Bytes de un archivo de a pedazos (de la base, en una fila o en partes, o del disco), para enviarlo por streaming:
 * una respuesta en streaming no tiene el límite de 4,5 MB de las funciones de Vercel. No devuelve nada si no existe.
 */
export async function* storedFileChunks(storageName: string): AsyncGenerator<Buffer> {
  const blob = await prisma.fileBlob.findUnique({ where: { storageName }, select: { data: true } });
  if (blob) { yield Buffer.from(blob.data); return; }
  const parts = await prisma.fileBlobPart.findMany({ where: { storageName }, orderBy: { part: "asc" }, select: { part: true } });
  if (parts.length) {
    // De a una parte por consulta: nunca se carga el archivo completo de una vez.
    for (const { part } of parts) {
      const row = await prisma.fileBlobPart.findUnique({ where: { storageName_part: { storageName, part } }, select: { data: true } });
      if (row) yield Buffer.from(row.data);
    }
    return;
  }
  let data: Buffer | null = null;
  try { data = await readFile(diskPath(storageName)); } catch { /* no está en disco */ }
  if (data) yield data;
}

/**
 * Copia los bytes de un archivo a otro nombre (su FileAsset ya debe existir). En la base se copian dentro de ella
 * (INSERT … SELECT): un archivo grande nunca viaja completo en una sola consulta. Devuelve `false` si no había bytes.
 */
export async function copyStoredFile(from: string, to: string) {
  const blobs = await prisma.$executeRaw`INSERT INTO "FileBlob" ("storageName", "data") SELECT ${to}, "data" FROM "FileBlob" WHERE "storageName" = ${from}`;
  const parts = await prisma.$executeRaw`INSERT INTO "FileBlobPart" ("storageName", "part", "data") SELECT ${to}, "part", "data" FROM "FileBlobPart" WHERE "storageName" = ${from}`;
  if (blobs + parts > 0) return true;
  try { ensureUploadDirectory(); await copyFile(diskPath(from), diskPath(to)); return true; } catch { return false; }
}

/** Borra los bytes (de la base y del disco). Sus FileAsset se borran aparte. */
export async function removeStoredFiles(storageNames: string[]) {
  if (!storageNames.length) return;
  await prisma.fileBlob.deleteMany({ where: { storageName: { in: storageNames } } });
  await prisma.fileBlobPart.deleteMany({ where: { storageName: { in: storageNames } } });
  await Promise.all(storageNames.map((name) => rm(diskPath(name), { force: true })));
}

export function isInlineSafeImage(mimeType: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType);
}
