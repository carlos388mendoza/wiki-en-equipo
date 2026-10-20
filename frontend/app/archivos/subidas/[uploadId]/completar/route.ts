import { forwardUpload } from "@/lib/api/uploads-proxy";

export const maxDuration = 60;

/** Junta las partes en un archivo de la wiki y devuelve su URL. */
export async function POST(_request: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  const { uploadId } = await params;
  const res = await forwardUpload<{ file: { id: string } }>(`/files/uploads/${encodeURIComponent(uploadId)}/complete`, { method: "POST" });
  if (!res.ok) return res.response;
  return Response.json({ id: res.data.file.id, url: `/archivos/${res.data.file.id}` }, { status: 201 });
}
