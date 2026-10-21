import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPlainEmojiPattern } from "../../frontend/components/page/PageBackground";

// #54: los emojis deben verse igual en todos los dispositivos. Se usa la fuente de Apple (Apple Color Emoji)
// troceada en WOFF2 con unicode-range, servida desde /fonts/apple-emoji.
describe("fuente de emojis (#54)", () => {
  it("el layout carga la hoja de la fuente de Apple y ya no usa Noto Color Emoji de next/font", () => {
    const layout = readFileSync(new URL("../../frontend/app/layout.tsx", import.meta.url), "utf8");
    expect(layout).toContain('<link rel="stylesheet" href="/fonts/apple-emoji/AppleColorEmoji.css" />');
    expect(layout).not.toContain("Noto_Color_Emoji");
    expect(layout).not.toContain("notoEmoji");
  });

  it("la pila de fuentes pone Apple Color Emoji antes de los emojis del sistema", () => {
    const css = readFileSync(new URL("../../frontend/styles/globals.css", import.meta.url), "utf8");
    const regla = css.match(/--font-emoji:[^;]+;/)?.[0] ?? "";
    expect(regla).toContain('"Apple Color Emoji"');
    expect(regla.indexOf('"Apple Color Emoji"')).toBeLessThan(regla.indexOf('"Noto Color Emoji"'));
    expect(css).toContain("--font-sans: var(--font-figtree), var(--font-emoji)");
  });

  it("los trozos WOFF2 de la fuente están en public y la hoja los declara", () => {
    const css = readFileSync(new URL("../../frontend/public/fonts/apple-emoji/AppleColorEmoji.css", import.meta.url), "utf8");
    const trozos = [...css.matchAll(/url\('\.\/(AppleColorEmoji\[\d+\]\.woff2)'\)/g)].map((m) => m[1]);
    expect(trozos.length).toBeGreaterThan(0);
    // La hoja y los archivos van juntos: cada @font-face apunta a un trozo existente.
    for (const trozo of trozos) {
      expect(readFileSync(new URL(`../../frontend/public/fonts/apple-emoji/${trozo}`, import.meta.url)).byteLength).toBeGreaterThan(0);
    }
    // El nombre de la fuente y el rango por trozo: el navegador solo descarga los que usa.
    expect(css).toContain("font-family: 'Apple Color Emoji'");
    expect(css).toContain("unicode-range: U+");
  });

  it("las fuentes se sirven sin sesión y el service worker las guarda", () => {
    const middleware = readFileSync(new URL("../../frontend/middleware.ts", import.meta.url), "utf8");
    expect(middleware).toContain("fonts/");
    const sw = readFileSync(new URL("../../frontend/public/sw.js", import.meta.url), "utf8");
    expect(sw).toContain('url.pathname.startsWith("/fonts/")');
  });

  it("el patrón de emojis se dibuja dentro de la página para que herede la fuente", () => {
    expect(isPlainEmojiPattern("🍕")).toBe(true);
    expect(isPlainEmojiPattern("lucide:coffee:cielo")).toBe(false);
    expect(isPlainEmojiPattern("3d:trophy")).toBe(false);
    expect(isPlainEmojiPattern("marca:grupo-comidas")).toBe(false);
    expect(isPlainEmojiPattern("🇲🇽")).toBe(false);

    const componente = readFileSync(new URL("../../frontend/components/page/PageBackground.tsx", import.meta.url), "utf8");
    // El SVG va en línea (hereda la fuente del sitio), no como imagen de fondo (usaría el emoji del sistema).
    expect(componente).toContain("<EmojiPattern emoji={background.emoji} />");
    expect(componente).toContain("patternUnits=\"userSpaceOnUse\"");
  });
});
