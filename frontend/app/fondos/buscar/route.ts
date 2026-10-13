import { getToken } from "@/lib/api/client";

/**
 * Búsqueda de fotos en Unsplash para el selector de fondos.
 * Solo funciona si se configura `UNSPLASH_ACCESS_KEY` (clave de la API de Unsplash) en el servidor;
 * sin clave, el selector usa la galería incluida.
 */
export async function GET(request: Request) {
  if (!(await getToken())) return Response.json({ message: "Inicia sesión." }, { status: 401 });
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return Response.json({ enabled: false, results: [] });

  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80);
  if (!q) return Response.json({ enabled: true, results: [] });

  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?per_page=12&orientation=landscape&content_filter=high&query=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return Response.json({ enabled: true, results: [], message: "Unsplash no respondió. Usa la galería." }, { status: 502 });
    const json = (await res.json()) as { results: { id: string; alt_description: string | null; urls: { raw: string; small: string }; user: { name: string; links: { html: string } }; links: { download_location: string } }[] };
    return Response.json({
      enabled: true,
      results: json.results.map((r) => ({
        id: r.id,
        url: r.urls.raw.split("?")[0],
        thumb: r.urls.small,
        alt: r.alt_description ?? "Foto de Unsplash",
        credit: r.user.name,
        creditUrl: `${r.user.links.html}?utm_source=wiki_grupo_comidas&utm_medium=referral`,
        downloadLocation: r.links.download_location,
      })),
    });
  } catch {
    return Response.json({ enabled: true, results: [], message: "No pudimos conectar con Unsplash." }, { status: 502 });
  }
}

/** Avisa a Unsplash que se usó una foto (lo piden sus reglas de uso de la API). */
export async function POST(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !(await getToken())) return new Response(null, { status: 204 });
  const { downloadLocation } = (await request.json().catch(() => ({}))) as { downloadLocation?: string };
  try {
    const url = new URL(downloadLocation ?? "");
    if (url.hostname === "api.unsplash.com") await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  } catch { /* sin seguimiento */ }
  return new Response(null, { status: 204 });
}
