import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import wikiImageLoader from "../../frontend/lib/image-loader";

// En el proyecto único de Vercel (Services) /_next/image respondía 404 y se rompían casi todas las imágenes.
describe("cargador de imágenes", () => {
  it("next/image usa el cargador propio y no el optimizador de Next", () => {
    const config = readFileSync(new URL("../../frontend/next.config.ts", import.meta.url), "utf8");
    expect(config).toMatch(/loader: "custom"/);
    expect(config).toMatch(/loaderFile: "\.\/lib\/image-loader\.ts"/);
  });

  it("pide las fotos de Unsplash ya redimensionadas a su CDN", () => {
    const url = new URL(wikiImageLoader({ src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&q=60", width: 828, quality: 75 }));
    expect(url.origin + url.pathname).toBe("https://images.unsplash.com/photo-1556761175-5973dc0f32e7");
    expect(url.searchParams.get("w")).toBe("828");
    expect(url.searchParams.get("q")).toBe("75");
    expect(url.searchParams.get("auto")).toBe("format");
  });

  it("usa tal cual el logo, los iconos 3D, los archivos de la wiki y las imágenes de otros sitios", () => {
    for (const src of ["/brand/logo-grupo-comidas.png", "/iconos/3d/acta.webp", "/archivos/abc123", "https://ejemplo.com/foto.jpg"]) {
      expect(wikiImageLoader({ src, width: 256 })).toBe(src);
    }
  });
});
