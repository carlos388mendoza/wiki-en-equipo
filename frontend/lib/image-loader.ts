/**
 * Cargador propio de `next/image` (ver next.config.ts). En el proyecto único de Vercel (Services) la ruta
 * `/_next/image` no existe y respondía 404, así que las imágenes no pasan por el optimizador de Next:
 * - Las fotos de Unsplash y Pexels se piden ya redimensionadas a su propio CDN (ancho, calidad y formato).
 * - Las de la wiki (`/brand`, `/iconos`, `/archivos`…) y las de otros sitios se usan tal cual.
 * Así tampoco se gasta la cuota mensual de optimización de imágenes del plan Hobby.
 */
export default function wikiImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  let url: URL;
  try { url = new URL(src); } catch { return src; } // ruta de la wiki: se sirve tal cual
  if (url.protocol !== "https:") return src;
  if (url.hostname === "images.unsplash.com") {
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 70));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    return url.toString();
  }
  if (url.hostname === "images.pexels.com") {
    url.searchParams.set("auto", "compress");
    url.searchParams.set("cs", "tinysrgb");
    url.searchParams.set("w", String(width));
    return url.toString();
  }
  return src;
}
