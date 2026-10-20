/**
 * Límites de subida. Deben coincidir con el backend (`MAX_UPLOAD_BYTES` y los
 * tipos permitidos en `backend/storage/files.ts`); el backend vuelve a validar.
 */
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 20);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
/**
 * Los archivos de más de 3 MB se suben en partes de 3 MB (igual que `UPLOAD_PART_BYTES` del backend):
 * en Vercel una función no acepta cuerpos de más de 4,5 MB.
 */
export const UPLOAD_PART_BYTES = 3 * 1024 * 1024;

export const ALLOWED_UPLOADS: Record<string, string> = {
  "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WEBP", "image/gif": "GIF",
  "video/mp4": "MP4", "video/webm": "WEBM", "application/pdf": "PDF",
  "text/plain": "TXT", "text/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word (DOCX)",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (XLSX)",
};

/** Imágenes que se pueden subir (fondos y bloques de imagen). */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const allowedList = () => [...new Set(Object.values(ALLOWED_UPLOADS))].join(", ");

/** Revisa el archivo antes de subirlo. Devuelve el mensaje de error o `null`. */
export function checkUpload(file: { size: number; type: string; name: string }, onlyImages = false): string | null {
  if (onlyImages && !IMAGE_TYPES.includes(file.type)) return `“${file.name}” no se puede usar como imagen. Elige una imagen JPG, PNG, WEBP o GIF.`;
  if (!ALLOWED_UPLOADS[file.type]) return `“${file.name}” no se puede subir. Tipos permitidos: ${allowedList()}.`;
  if (file.size > MAX_UPLOAD_BYTES) return `“${file.name}” pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo es ${MAX_UPLOAD_MB} MB.`;
  return null;
}

export class UploadError extends Error {}

/** A qué pertenece el archivo: una página o una plantilla (y entonces lo ve quien puede leerla). */
export type UploadTarget = { pageId?: string; templateId?: string };

const offline = "Sin conexión: no se pudo subir el archivo. Intenta de nuevo cuando vuelvas a estar en línea.";

async function send<T>(url: string, init: RequestInit, retries = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    if (retries > 0) return send(url, init, retries - 1);
    throw new UploadError(offline);
  }
  const json = await res.json().catch(() => null) as (T & { message?: string }) | null;
  if (res.status >= 500 && retries > 0) return send(url, init, retries - 1);
  if (!res.ok || !json) throw new UploadError(json?.message ?? "No se pudo subir el archivo.");
  return json;
}

/** Sube un archivo grande en partes: empezar, cada parte (con dos reintentos) y completar. */
async function uploadInParts(file: File, target: UploadTarget, onProgress?: (fraction: number) => void) {
  const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const { uploadId, partSize, partCount } = await send<{ uploadId: string; partSize: number; partCount: number }>("/archivos/subidas", json({ name: file.name, mimeType: file.type, size: file.size, ...target }));
  for (let part = 0; part < partCount; part++) {
    const body = file.slice(part * partSize, (part + 1) * partSize);
    await send(`/archivos/subidas/${encodeURIComponent(uploadId)}/${part}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body }, 2);
    onProgress?.((part + 1) / partCount);
  }
  return send<{ id: string; url: string }>(`/archivos/subidas/${encodeURIComponent(uploadId)}/completar`, { method: "POST" }, 1);
}

/**
 * Sube un archivo a la wiki (pasa por `/archivos`, que agrega la sesión) y devuelve su URL. Los de más de 3 MB
 * van en partes; `onProgress` recibe cuánto se subió (de 0 a 1).
 */
export async function uploadToWiki(file: File, target: UploadTarget = {}, onlyImages = false, onProgress?: (fraction: number) => void): Promise<{ url: string; id: string; name: string; size: number; type: string }> {
  const problem = checkUpload(file, onlyImages);
  if (problem) throw new UploadError(problem);
  if (file.size > UPLOAD_PART_BYTES) {
    const done = await uploadInParts(file, target, onProgress);
    return { url: done.url, id: done.id, name: file.name, size: file.size, type: file.type };
  }
  const form = new FormData();
  form.set("file", file);
  if (target.pageId) form.set("pageId", target.pageId);
  if (target.templateId) form.set("templateId", target.templateId);
  let res: Response;
  try {
    res = await fetch("/archivos", { method: "POST", body: form });
  } catch {
    throw new UploadError(offline);
  }
  const json = await res.json().catch(() => null) as { url?: string; id?: string; message?: string } | null;
  if (!res.ok || !json?.url || !json.id) throw new UploadError(json?.message ?? "No se pudo subir el archivo.");
  onProgress?.(1);
  return { url: json.url, id: json.id, name: file.name, size: file.size, type: file.type };
}
