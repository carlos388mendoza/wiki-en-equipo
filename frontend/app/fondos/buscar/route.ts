import { getToken } from "@/lib/api/client";

/**
 * Búsqueda de fotos de fondo con la API de Unsplash (#44), desde el servidor: la clave (`UNSPLASH_ACCESS_KEY`, en
 * Vercel) nunca llega al navegador ni al repositorio. Sin clave, o si Unsplash no responde o se acaba el límite por
 * hora, responde `{ enabled: false }` y la ventana de fondos busca en la galería fija, sin mostrar errores.
 *
 * Reglas de Unsplash que se cumplen: las fotos se muestran desde su CDN (hotlink, con su `ixid`), se da crédito al
 * fotógrafo y a Unsplash (pequeño, al pasar el ratón) y se registra la descarga al elegir una foto (POST de abajo).
 */
const UTM = "utm_source=wiki_grupo_comidas&utm_medium=referral";

type UnsplashPhoto = {
  id: string; alt_description: string | null; description: string | null;
  urls: { raw: string; small: string }; user: { name: string; links: { html: string } }; links: { download_location: string };
};

export async function GET(request: Request) {
  if (!(await getToken())) return Response.json({ message: "Inicia sesión." }, { status: 401 });
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return Response.json({ enabled: false, results: [] });

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 80);
  const page = Math.min(Math.max(Number(params.get("page") ?? 1) || 1, 1), 10);
  if (!q) return Response.json({ enabled: true, results: [] });

  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?per_page=24&page=${page}&orientation=landscape&content_filter=high&lang=es&query=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      // La misma búsqueda se reutiliza una hora: la clave gratuita permite 50 búsquedas por hora.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    // 401/403 (clave mala o límite), 429, 5xx: se usa la galería fija.
    if (!res.ok) return Response.json({ enabled: false, results: [], reason: res.status });
    const json = (await res.json()) as { total_pages: number; results: UnsplashPhoto[] };
    return Response.json({
      enabled: true,
      hasMore: page < json.total_pages,
      results: json.results.map((r) => ({
        id: r.id,
        url: r.urls.raw,
        thumb: r.urls.small,
        alt: r.alt_description ?? r.description ?? "Foto",
        credit: r.user.name,
        creditUrl: `${r.user.links.html}?${UTM}`,
        downloadLocation: r.links.download_location,
      })),
    });
  } catch {
    return Response.json({ enabled: false, results: [] });
  }
}

/** Registra en Unsplash que se eligió una foto (lo piden sus reglas de uso de la API). */
export async function POST(request: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key || !(await getToken())) return new Response(null, { status: 204 });
  const { downloadLocation } = (await request.json().catch(() => ({}))) as { downloadLocation?: string };
  try {
    const url = new URL(downloadLocation ?? "");
    if (url.protocol === "https:" && url.hostname === "api.unsplash.com" && url.pathname.startsWith("/photos/")) {
      await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(8000) });
    }
  } catch { /* sin registro: no impide usar la foto */ }
  return new Response(null, { status: 204 });
}

