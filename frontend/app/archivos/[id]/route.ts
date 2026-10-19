import { BACKEND_URL, getToken } from "@/lib/api/client";

// El backend puede tardar en responder mientras arranca (ver app/layout.tsx).
export const maxDuration = 60;

/**
 * Sirve un archivo subido a la wiki. El backend exige el token en la cabecera,
 * así que el navegador lo pide aquí y esta ruta lo reenvía con la sesión.
 * El backend vuelve a comprobar que el usuario puede leer la página del archivo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return new Response("Inicia sesión para ver este archivo.", { status: 401 });

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/files/${encodeURIComponent(id)}/content`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return new Response("No pudimos conectar con el servidor.", { status: 502 });
  }
  if (!res.ok || !res.body) {
    const messages: Record<number, string> = { 401: "Tu sesión terminó.", 403: "No tienes acceso a este archivo.", 404: "El archivo no existe." };
    return new Response(messages[res.status] ?? "No se pudo cargar el archivo.", { status: res.status });
  }

  const headers = new Headers({ "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" });
  for (const name of ["Content-Type", "Content-Length", "Content-Disposition"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(res.body, { status: 200, headers });
}
