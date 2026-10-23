import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageIcon, WIDE_ICON_MAX, wideIconBox } from "../../frontend/components/ui/PageIcon";
import { BRANDS } from "../../frontend/lib/icons";

// El logo animado (GIF convertido a WebP) se veía "lagueado": al pasar el ratón se pedía otra vez el archivo con una
// URL nueva (`?v=N`), y además el WebP estaba mal hecho por dentro (lienzo de 88 × 200). Ahora se muestra quieto (su
// último cuadro, liviano) y se anima al pasar el ratón o al tocarlo desde una sola descarga (AnimatedLogo).
const banner = readFileSync(new URL("../../frontend/public/brand/franquicias/grupo-comidas-animado.webp", import.meta.url));
const still = readFileSync(new URL("../../frontend/public/brand/franquicias/grupo-comidas-fijo.webp", import.meta.url));
const animatedLogo = readFileSync(new URL("../../frontend/components/ui/AnimatedLogo.tsx", import.meta.url), "utf8");
const html = (size: number) => renderToStaticMarkup(createElement(PageIcon, { icon: "marca:grupo-comidas-animado", size }));

describe("logo animado de Grupo Comidas", () => {
  it("como icono tiene un tamaño máximo (no descuadra la cabecera ni la barra lateral) y guarda la proporción 3:1", () => {
    expect(wideIconBox(16)).toEqual({ width: 32, height: 11 });
    expect(wideIconBox(76)).toEqual({ width: 152, height: 51 });
    expect(wideIconBox(136)).toEqual({ width: WIDE_ICON_MAX, height: 80 });
    expect(html(136)).toContain("width:240px;height:80px");
  });

  it("se dibuja quieto con el último cuadro: el archivo animado no se descarga hasta pasar el ratón", () => {
    const markup = html(76);
    expect(markup).toContain(BRANDS["grupo-comidas-animado"].still);
    expect(markup).not.toContain("grupo-comidas-animado.webp");
    expect(markup).toContain("<canvas");
  });

  it("al animarse no cambia la URL ni lo vuelve a pedir: una sola descarga por pestaña", () => {
    // Ni `?v=${…}` ni `+ "?v="` en el código (el comentario sí lo menciona para explicarlo).
    expect(animatedLogo).not.toMatch(/\?v=\$\{|searchParams|\+ *["']\?v=/);
    expect(animatedLogo).toContain("const cache = new Map<string, Promise<ArrayBuffer>>()");
    expect(animatedLogo).toContain("onPointerOver={play} onTouchStart={play}");
    expect(animatedLogo).toContain("prefers-reduced-motion");
  });

  it("el lienzo del WebP mide 600 × 200 (antes decía 88 × 200 y el logo se veía como una tira invisible)", () => {
    expect(banner.toString("ascii", 0, 4)).toBe("RIFF");
    expect(banner.toString("ascii", 8, 12)).toBe("WEBP");
    expect(banner.toString("ascii", 12, 16)).toBe("VP8X");
    expect(banner.readUInt32LE(4)).toBe(banner.length - 8);
    expect(banner.readUIntLE(24, 3) + 1).toBe(600);
    expect(banner.readUIntLE(27, 3) + 1).toBe(200);
    // Con transparencia (bit alfa del VP8X) y animación.
    expect(banner[20] & 0x10).toBe(0x10);
    expect(banner[20] & 0x02).toBe(0x02);
  });

  it("es un WebP animado de 74 fotogramas que se reproduce una vez (loop = 1), más liviano que antes", () => {
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
    expect(banner.length).toBeLessThan(800_000); // antes 915 KB
    expect(still.length).toBeLessThan(40_000);
  });
});
