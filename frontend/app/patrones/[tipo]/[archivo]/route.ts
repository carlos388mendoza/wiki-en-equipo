import { BRANDS, ICON_TONES, type IconTone } from "@/lib/icons";
import { parseCdnThreeD, THREE_D_ICONS } from "@/lib/icons-3d";

/**
 * Tesela de 64 × 64 de un fondo de patrón con un icono de Lucide o 3D (#45), igual que la de emojis: dos iconos en
 * diagonal. Se arma con los archivos que ya genera la compilación (`/iconos/lucide/<nombre>.svg` y
 * `/iconos/3d/<nombre>.webp`), así no se carga código de Lucide. Las URL:
 *   /patrones/lucide/<nombre>.svg?tono=<tono>     /patrones/3d/<nombre>.svg
 * Es pública (no tiene datos de nadie) y se guarda en caché: el contenido de una URL nunca cambia.
 */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const headers = { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string; archivo: string }> }) {
  const { tipo, archivo } = await params;
  const name = archivo.replace(/\.svg$/, "");
  if (!NAME.test(name) || !["lucide", "3d", "bandera", "marca"].includes(tipo)) return new Response("No existe.", { status: 404 });

  if (tipo === "bandera") {
    const res = await fetch(new URL(`/iconos/banderas/${name}.svg`, request.url)).catch(() => null);
    if (!res?.ok) return new Response("No existe.", { status: 404 });
    const data = `data:image/svg+xml;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    const image = (x: number, y: number) => `<image href="${data}" x="${x}" y="${y}" width="24" height="18" preserveAspectRatio="none"/>`;
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${image(4, 7)}${image(36, 39)}</svg>`, { headers });
  }

  if (tipo === "marca") {
    // Logos de Grupo Comidas y sus franquicias (el animado, como imagen fija: un fondo no se anima).
    const brand = Object.hasOwn(BRANDS, name) ? BRANDS[name] : null;
    const res = brand ? await fetch(new URL(brand.src, request.url)).catch(() => null) : null;
    if (!brand || !res?.ok) return new Response("No existe.", { status: 404 });
    const data = `data:${brand.src.endsWith(".png") ? "image/png" : "image/webp"};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    const image = (x: number, y: number) => `<image href="${data}" x="${x}" y="${y}" width="24" height="24" preserveAspectRatio="xMidYMid meet"/>`;
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${image(4, 4)}${image(36, 36)}</svg>`, { headers });
  }

  if (tipo === "lucide") {
    const res = await fetch(new URL(`/iconos/lucide/${name}.svg`, request.url)).catch(() => null);
    if (!res?.ok) return new Response("No existe.", { status: 404 });
    const inner = (await res.text()).replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const toneName = new URL(request.url).searchParams.get("tono") ?? "rojo";
    const tone = (Object.hasOwn(ICON_TONES, toneName) ? toneName : "rojo") as IconTone;
    const color = ICON_TONES[tone][1];
    const icon = (x: number, y: number) => `<g transform="translate(${x} ${y}) scale(0.8)">${inner}</g>`;
    return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon(6, 6)}${icon(38, 38)}</svg>`, { headers });
  }

  // Uno de los guardados en el repo, o de todos los de 3dicons con su ángulo y estilo (?angulo=&estilo=).
  const query = new URL(request.url).searchParams;
  const cdn = parseCdnThreeD(`3d:${name}:${query.get("angulo") ?? ""}:${query.get("estilo") ?? ""}`);
  if (!cdn && !(THREE_D_ICONS as readonly string[]).includes(name)) return new Response("No existe.", { status: 404 });
  const res = await fetch(cdn ? cdn.src : new URL(`/iconos/3d/${name}.webp`, request.url)).catch(() => null);
  if (!res?.ok) return new Response("No existe.", { status: 404 });
  // Una imagen usada como fondo no carga archivos externos: el icono va dentro del SVG.
  const data = `data:image/webp;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  const image = (x: number, y: number) => `<image href="${data}" x="${x}" y="${y}" width="24" height="24"/>`;
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${image(4, 4)}${image(36, 36)}</svg>`, { headers });
}
