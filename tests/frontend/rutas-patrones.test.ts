import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../frontend/app/patrones/[tipo]/[archivo]/route";

// La ruta arma la tesela con los archivos públicos de la wiki (los pide a su propio dominio) o con el CDN de 3dicons.
// Aquí se sirven desde frontend/public, y el CDN se simula.
const publicDir = fileURLToPath(new URL("../../frontend/public", import.meta.url));
const requested: string[] = [];
beforeEach(() => {
  requested.length = 0;
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = new URL(String(input));
    requested.push(url.href);
    if (url.hostname.endsWith("supabase.co")) return new Response(new Uint8Array([82, 73, 70, 70]), { status: 200 });
    try { return new Response(await readFile(`${publicDir}${decodeURIComponent(url.pathname)}`)); } catch { return new Response("no", { status: 404 }); }
  });
});
afterEach(() => vi.unstubAllGlobals());

const call = (tipo: string, archivo: string, query = "") =>
  GET(new Request(`http://wiki.test/patrones/${tipo}/${archivo}${query}`), { params: Promise.resolve({ tipo, archivo }) });

describe("teselas de los patrones de fondo (/patrones)", () => {
  it("Lucide: dibuja el icono dos veces con el tono pedido (y el rojo si el tono no existe)", async () => {
    const res = await call("lucide", "pizza.svg", "?tono=cielo");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const svg = await res.text();
    expect(svg.match(/<g transform=/g)).toHaveLength(2);
    expect(svg).toContain('stroke="#1f5fae"');
    expect(await (await call("lucide", "pizza.svg", "?tono=inventado")).text()).toContain('stroke="#e2001a"');
  });

  it("logos de la marca y banderas van incrustados en la tesela (una imagen de fondo no carga archivos aparte)", async () => {
    const kfc = await (await call("marca", "kfc.svg")).text();
    expect(kfc).toContain("data:image/webp;base64,");
    const logo = await (await call("marca", "grupo-comidas.svg")).text();
    expect(logo).toContain("data:image/png;base64,");
    const flag = await (await call("bandera", "hn.svg")).text();
    expect(flag).toContain("data:image/svg+xml;base64,");
  });

  it("los iconos 3D salen del repo o del CDN de 3dicons, nunca de otra dirección", async () => {
    expect((await call("3d", "rocket.svg")).status).toBe(200);
    const cdn = await call("3d", "744cc0-rocket.svg", "?angulo=dynamic&estilo=clay");
    expect(cdn.status).toBe(200);
    expect(requested.at(-1)).toMatch(/^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\/sizes\/744cc0-rocket\/dynamic\/200\/clay\.webp$/);
  });

  it("responde 404 a lo que no existe o no es válido, sin pedir nada", async () => {
    for (const [tipo, archivo, query] of [
      ["otro", "pizza.svg", ""], ["lucide", "no-existe-este-icono.svg", ""], ["marca", "otra-marca.svg", ""],
      ["lucide", "..%2F..%2Fetc.svg", ""], ["lucide", "Pizza.svg", ""], ["3d", "no-existe.svg", ""],
      ["3d", "744cc0-rocket.svg", "?angulo=raro&estilo=clay"], ["bandera", "zz.svg", ""],
    ]) {
      expect((await call(tipo, archivo, query)).status, `${tipo}/${archivo}${query}`).toBe(404);
    }
    expect(requested.some((u) => u.includes(".."))).toBe(false);
  });

  it("se guardan en caché un día (no un año): si cambia un logo, se ve el nuevo", async () => {
    const cache = (await call("marca", "kfc.svg")).headers.get("Cache-Control")!;
    expect(cache).toContain("public");
    expect(cache).toContain("max-age=86400");
    expect(cache).not.toContain("immutable");
  });
});
