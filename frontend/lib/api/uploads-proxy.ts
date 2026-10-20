import { BACKEND_URL, getToken } from "@/lib/api/client";
import { MAX_UPLOAD_MB, allowedList } from "@/lib/uploads";

/** Mensaje claro para un error del backend al subir un archivo. */
export function uploadErrorMessage(status: number, backendMessage: string | undefined, kind: "página" | "plantilla" = "página") {
  if (status === 413) return `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.`;
  if (status === 415) return `Ese tipo de archivo no está permitido. Tipos permitidos: ${allowedList()}.`;
  if (status === 403) return `Necesitas permiso de edición en la ${kind} para subir archivos.`;
  return backendMessage ?? "No se pudo subir el archivo.";
}

/**
 * Reenvía un paso de una subida en partes (`/api/files/uploads…`) al backend con la sesión de la persona.
 * Devuelve la respuesta JSON del backend o un error con un mensaje en español.
 */
export async function forwardUpload<T>(path: string, init: { method: "POST" | "PUT"; body?: BodyInit; contentType?: string }, kind?: "página" | "plantilla"): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const token = await getToken();
  if (!token) return { ok: false, response: Response.json({ message: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 }) };
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${token}`, ...(init.contentType ? { "Content-Type": init.contentType } : {}) },
      body: init.body,
    });
  } catch {
    return { ok: false, response: Response.json({ message: "No pudimos conectar con el servidor." }, { status: 502 }) };
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json) return { ok: false, response: Response.json({ message: uploadErrorMessage(res.status, json?.error?.message, kind) }, { status: res.status || 502 }) };
  return { ok: true, data: json };
}
