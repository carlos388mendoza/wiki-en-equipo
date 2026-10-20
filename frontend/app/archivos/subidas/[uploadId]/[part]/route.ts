import { forwardUpload } from "@/lib/api/uploads-proxy";

export const maxDuration = 60;

/** Cada parte mide 3 MB como máximo (Vercel no acepta cuerpos de más de 4,5 MB). */
const MAX_PART_BYTES = 4 * 1024 * 1024;

export async function PUT(request: Request, { params }: { params: Promise<{ uploadId: string; part: string }> }) {
  const { uploadId, part } = await params;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PART_BYTES) return Response.json({ message: "Esa parte del archivo es demasiado grande." }, { status: 413 });
  const data = await request.arrayBuffer();
  const res = await forwardUpload<{ part: number; received: number; partCount: number }>(
    `/files/uploads/${encodeURIComponent(uploadId)}/parts/${encodeURIComponent(part)}`,
    { method: "PUT", contentType: "application/octet-stream", body: data },
  );
  return res.ok ? Response.json(res.data) : res.response;
}
