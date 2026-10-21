import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// #44: la búsqueda de fondos usa la API de Unsplash desde el servidor; sin clave o sin cupo, la galería fija.
vi.mock("@/lib/api/client", () => ({ getToken: async () => "token-de-prueba" }));
const { GET, POST } = await import("../../frontend/app/fondos/buscar/route");

const before = process.env.UNSPLASH_ACCESS_KEY;
beforeEach(() => { process.env.UNSPLASH_ACCESS_KEY = "clave-de-prueba"; });
afterEach(() => { process.env.UNSPLASH_ACCESS_KEY = before; vi.unstubAllGlobals(); });

const photo = { id: "abc", alt_description: "taza de café", description: null, urls: { raw: "https://images.unsplash.com/photo-1?ixid=x", small: "https://images.unsplash.com/photo-1?w=400" }, user: { name: "Ana Pérez", links: { html: "https://unsplash.com/@ana" } }, links: { download_location: "https://api.unsplash.com/photos/abc/download?ixid=x" } };

describe("búsqueda de fondos con la API de Unsplash", () => {
  it("sin clave responde enabled: false (la ventana usa la galería fija) sin llamar a Unsplash", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(new Request("http://wiki.test/fondos/buscar?q=cafe"));
    expect(await res.json()).toEqual({ enabled: false, results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con clave busca en español desde el servidor y devuelve el crédito del fotógrafo", async () => {
    const fetchMock = vi.fn(async () => Response.json({ total_pages: 3, results: [photo] }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(new Request("http://wiki.test/fondos/buscar?q=caf%C3%A9&page=2"));
    const json = await res.json();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("https://api.unsplash.com/search/photos?");
    expect(url).toContain("page=2");
    expect(url).toContain("lang=es");
    expect((init.headers as Record<string, string>).Authorization).toBe("Client-ID clave-de-prueba");
    expect(json).toMatchObject({ enabled: true, hasMore: true });
    expect(json.results[0]).toEqual({ id: "abc", url: photo.urls.raw, thumb: photo.urls.small, alt: "taza de café", credit: "Ana Pérez", creditUrl: "https://unsplash.com/@ana?utm_source=wiki_grupo_comidas&utm_medium=referral", downloadLocation: photo.links.download_location });
    expect(JSON.stringify(json)).not.toContain("clave-de-prueba"); // la clave nunca sale al navegador
  });

  it("si se acaba el límite o Unsplash falla, responde enabled: false sin error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Rate Limit Exceeded", { status: 403 })));
    const limited = await GET(new Request("http://wiki.test/fondos/buscar?q=cafe"));
    expect(limited.status).toBe(200);
    expect((await limited.json()).enabled).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("sin red"); }));
    expect((await (await GET(new Request("http://wiki.test/fondos/buscar?q=cafe"))).json()).enabled).toBe(false);
  });

  it("registra la descarga solo en api.unsplash.com", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await POST(new Request("http://wiki.test/fondos/buscar", { method: "POST", body: JSON.stringify({ downloadLocation: photo.links.download_location }) }));
    await POST(new Request("http://wiki.test/fondos/buscar", { method: "POST", body: JSON.stringify({ downloadLocation: "https://sitio-malo.example/photos/x" }) }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(photo.links.download_location);
  });
});
