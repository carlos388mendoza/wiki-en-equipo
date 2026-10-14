/**
 * Límites de subida. Deben coincidir con el backend (`MAX_UPLOAD_BYTES` y los
 * tipos permitidos en `backend/storage/files.ts`); el backend vuelve a validar.
 */
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 10);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const ALLOWED_UPLOADS: Record<string, string> = {
  "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WEBP", "image/gif": "GIF",
  "video/mp4": "MP4", "video/webm": "WEBM", "application/pdf": "PDF",
  "text/plain": "TXT", "text/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word (DOCX)",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (XLSX)",
};

export const allowedList = () => [...new Set(Object.values(ALLOWED_UPLOADS))].join(", ");

/** Revisa el archivo antes de subirlo. Devuelve el mensaje de error o `null`. */
export function checkUpload(file: { size: number; type: string; name: string }, onlyImages = false): string | null {
  if (onlyImages && !file.type.startsWith("image/")) return "Elige una imagen (JPG, PNG, WEBP o GIF).";
  if (!ALLOWED_UPLOADS[file.type]) return `“${file.name}” no se puede subir. Tipos permitidos: ${allowedList()}.`;
  if (file.size > MAX_UPLOAD_BYTES) return `“${file.name}” pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo es ${MAX_UPLOAD_MB} MB.`;
  return null;
}

export class UploadError extends Error {}

/** A qué pertenece el archivo: una página o una plantilla (y entonces lo ve quien puede leerla). */
export type UploadTarget = { pageId?: string; templateId?: string };

/** Sube un archivo a la wiki (pasa por `/archivos`, que agrega la sesión) y devuelve su URL. */
export async function uploadToWiki(file: File, target: UploadTarget = {}, onlyImages = false): Promise<{ url: string; id: string; name: string; size: number; type: string }> {
  const problem = checkUpload(file, onlyImages);
  if (problem) throw new UploadError(problem);
  const form = new FormData();
  form.set("file", file);
  if (target.pageId) form.set("pageId", target.pageId);
  if (target.templateId) form.set("templateId", target.templateId);
  let res: Response;
  try {
    res = await fetch("/archivos", { method: "POST", body: form });
  } catch {
    throw new UploadError("Sin conexión: no se pudo subir el archivo. Intenta de nuevo cuando vuelvas a estar en línea.");
  }
  const json = await res.json().catch(() => null) as { url?: string; id?: string; message?: string } | null;
  if (!res.ok || !json?.url || !json.id) throw new UploadError(json?.message ?? "No se pudo subir el archivo.");
  return { url: json.url, id: json.id, name: file.name, size: file.size, type: file.type };
}
