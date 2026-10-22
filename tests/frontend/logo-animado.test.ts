import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El logo animado (GIF convertido a WebP) se veía "lagueado": cada vez que el ratón pasaba por encima se pedía
// otra vez el archivo (~1 MB) con una URL nueva (`?v=N`) y el logo se quedaba en blanco mientras descargaba.
const read = (file: string) => readFileSync(new URL(`../../frontend/${file}`, import.meta.url), "utf8");
const pageIcon = read("components/ui/PageIcon.tsx");
const banner = readFileSync(new URL("../../frontend/public/brand/franquicias/grupo-comidas-animado.webp", import.meta.url));

describe("logo animado de Grupo Comidas", () => {
  it("la caja tiene la misma proporción que el logo (600 × 200, 3:1) para que lo llene sin aire arriba y abajo", () => {
    expect(pageIcon).toContain("style={{ width: size * 3, height: size }}");
    expect(pageIcon).toMatch(/src=\{parsed\.src\}[^>]*className="object-contain"/);
  });

  it("no se le cambia la URL al pasar el ratón: se reproduce una vez y se queda en el último fotograma", () => {
    expect(pageIcon).not.toContain("animKey");
    expect(pageIcon).not.toContain("onMouseEnter");
    expect(pageIcon).not.toMatch(/\?v=\$\{/);
  });

  it("el archivo es un WebP animado de 74 fotogramas que se reproduce una vez (loop = 1)", () => {
    const anim = banner.indexOf("ANIM");
    expect(banner.toString("ascii", anim, anim + 4)).toBe("ANIM");
    expect(banner.readUInt16LE(anim + 12)).toBe(1);
    let off = 12;
    let frames = 0;
    while (off + 8 <= banner.length) {
      const id = banner.toString("ascii", off, off + 4);
      const size = banner.readUInt32LE(off + 4);
      if (id === "ANMF") frames += 1;
      off += 8 + size + (size % 2);
    }
    expect(frames).toBe(74);
    expect(banner.length).toBeGreaterThan(900_000); // el archivo completo, sin recomprimir
  });
});
