import { afterEach, describe, expect, it, vi } from "vitest";
import { UPLOAD_PART_BYTES, uploadToWiki } from "../../frontend/lib/uploads";

// Vercel no acepta cuerpos de más de 4,5 MB: el navegador sube los archivos grandes en partes de 3 MB.
afterEach(() => vi.unstubAllGlobals());

function fakeServer() {
  const calls: { url: string; method: string; size?: number }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    const body = init.body;
    calls.push({ url, method: init.method ?? "GET", size: body instanceof Blob ? body.size : undefined });
    if (url === "/archivos/subidas") {
      const { size } = JSON.parse(String(body));
      return Response.json({ uploadId: "subida1", partSize: UPLOAD_PART_BYTES, partCount: Math.ceil(size / UPLOAD_PART_BYTES) }, { status: 201 });
    }
    if (url.endsWith("/completar")) return Response.json({ id: "archivo1", url: "/archivos/archivo1" }, { status: 201 });
    if (url.startsWith("/archivos/subidas/")) return Response.json({ ok: true });
    return Response.json({ id: "chico", url: "/archivos/chico" }, { status: 201 });
  }));
  return calls;
}

describe("subida de archivos grandes", () => {
  it("parte un video de 7 MB en tres partes de hasta 3 MB y avisa el avance", async () => {
    const calls = fakeServer();
    const progress: number[] = [];
    const file = new File([new Uint8Array(7 * 1024 * 1024)], "video.mp4", { type: "video/mp4" });
    const result = await uploadToWiki(file, { pageId: "pagina1" }, false, (p) => progress.push(p));

    expect(result.url).toBe("/archivos/archivo1");
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /archivos/subidas",
      "PUT /archivos/subidas/subida1/0", "PUT /archivos/subidas/subida1/1", "PUT /archivos/subidas/subida1/2",
      "POST /archivos/subidas/subida1/completar",
    ]);
    expect(calls.filter((c) => c.method === "PUT").map((c) => c.size)).toEqual([UPLOAD_PART_BYTES, UPLOAD_PART_BYTES, 1024 * 1024]);
    expect(progress.at(-1)).toBe(1);
  });

  it("los archivos de hasta 3 MB siguen yendo en una sola petición", async () => {
    const calls = fakeServer();
    await uploadToWiki(new File([new Uint8Array(UPLOAD_PART_BYTES)], "foto.png", { type: "image/png" }));
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["POST /archivos"]);
  });

  it("si una parte falla por la red, la reintenta antes de rendirse", async () => {
    const calls = fakeServer();
    const real = fetch as unknown as ReturnType<typeof vi.fn>;
    let failed = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/1") && !failed) { failed = true; throw new TypeError("sin red"); }
      return real(url, init);
    }));
    await uploadToWiki(new File([new Uint8Array(4 * 1024 * 1024)], "manual.pdf", { type: "application/pdf" }));
    expect(calls.filter((c) => c.url.endsWith("/1"))).toHaveLength(1);
    expect(failed).toBe(true);
  });
});
