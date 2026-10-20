import { BACKEND_URL, getToken } from "@/lib/api/client";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, allowedList } from "@/lib/uploads";

// El backend puede tardar en responder mientras arranca (ver app/layout.tsx).
export const maxDuration = 60;

/** Sube un archivo al backend con la sesión del usuario y devuelve la URL para mostrarlo. */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return Response.json({ message: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 });

  // Se revisa el tamaño antes de leer el cuerpo: Next corta peticiones grandes y el error sería confuso.
  // Por aquí solo llegan archivos de hasta 3 MB; los más grandes van en partes (app/archivos/subidas).
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > Math.min(MAX_UPLOAD_BYTES, 4 * 1024 * 1024) + 64 * 1024) {
    return Response.json({ message: `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.` }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: "No se recibió ningún archivo." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ message: "No se recibió ningún archivo." }, { status: 400 });

  const upstream = new FormData();
  upstream.set("file", file, file.name);
  for (const key of ["pageId", "templateId"]) {
    const value = form.get(key);
    if (typeof value === "string" && value) upstream.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/files`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: upstream });
  } catch {
    return Response.json({ message: "No pudimos conectar con el servidor." }, { status: 502 });
  }
  const json = (await res.json().catch(() => null)) as { file?: { id: string }; error?: { message?: string } } | null;
  if (!res.ok || !json?.file) {
    const message =
      res.status === 413 ? `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.`
      : res.status === 415 ? `Ese tipo de archivo no está permitido. Tipos permitidos: ${allowedList()}.`
      : res.status === 403 ? `Necesitas permiso de edición en la ${form.get("templateId") ? "plantilla" : "página"} para subir archivos.`
      : json?.error?.message ?? "No se pudo subir el archivo.";
    return Response.json({ message }, { status: res.status });
  }
  return Response.json({ id: json.file.id, url: `/archivos/${json.file.id}` }, { status: 201 });
}
