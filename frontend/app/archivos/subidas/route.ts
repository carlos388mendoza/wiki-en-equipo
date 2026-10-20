import { forwardUpload } from "@/lib/api/uploads-proxy";

// El backend puede tardar en responder mientras arranca (ver app/layout.tsx).
export const maxDuration = 60;

/** Empieza una subida en partes (archivos de más de 3 MB): el backend revisa tipo, tamaño y permisos. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown; mimeType?: unknown; size?: unknown; pageId?: unknown; templateId?: unknown } | null;
  if (!body || typeof body.name !== "string" || typeof body.mimeType !== "string" || typeof body.size !== "number") {
    return Response.json({ message: "No se recibió ningún archivo." }, { status: 400 });
  }
  const target = typeof body.pageId === "string" ? { pageId: body.pageId } : typeof body.templateId === "string" ? { templateId: body.templateId } : {};
  const res = await forwardUpload<{ uploadId: string; partSize: number; partCount: number }>("/files/uploads", {
    method: "POST", contentType: "application/json",
    body: JSON.stringify({ name: body.name, mimeType: body.mimeType, size: body.size, ...target }),
  }, "templateId" in target ? "plantilla" : "página");
  return res.ok ? Response.json(res.data, { status: 201 }) : res.response;
}
