import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPlainEmojiPattern } from "../../frontend/components/page/PageBackground";
import { emojiFontFamily } from "../../frontend/lib/emoji-font";

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

    const fondo = readFileSync(new URL("../../frontend/components/page/PageBackground.tsx", import.meta.url), "utf8");
    // El SVG va en línea (hereda la fuente del sitio), no como imagen de fondo (usaría el emoji del sistema).
    expect(fondo).toContain("<EmojiPattern emoji={background.emoji} />");
    const patron = readFileSync(new URL("../../frontend/components/page/EmojiPattern.tsx", import.meta.url), "utf8");
    expect(patron).toContain('patternUnits="userSpaceOnUse"');
    // El texto de un <pattern> no pide la fuente por sí solo: se pide con document.fonts.load y se redibuja.
    expect(patron).toContain("fonts.load(");
  });
});

// Trozos de la fuente: el ZWJ vive en una sola cara (si no, las secuencias se parten), los sueltos van en el orden
// del selector y los iconos de un solo emoji no obligan a bajar la cara de secuencias (~3,7 MB).
const hoja = readFileSync(new URL("../../frontend/public/fonts/apple-emoji/AppleColorEmoji.css", import.meta.url), "utf8");
const caras = [...hoja.matchAll(/font-family: '([^']+)';[\s\S]*?url\('\.\/([^']+)'\)[\s\S]*?unicode-range: ([^;]+);/g)].map((m) => ({
  familia: m[1], archivo: m[2],
  rangos: m[3].split(",").map((r) => { const [a, b] = r.trim().replace("U+", "").split("-"); return [parseInt(a, 16), parseInt(b ?? a, 16)] as const; }),
}));
const caraDe = (familia: string, cp: number) => caras.find((c) => c.familia === familia && c.rangos.some(([a, b]) => cp >= a && cp <= b))?.archivo;
const catalogo = JSON.parse(readFileSync(new URL("../../assets/emojis/es.json", import.meta.url), "utf8")) as { emojis: [string][] };

describe("trozos de la fuente de emojis", () => {
  it("el ZWJ y los emojis de las secuencias están en una sola cara, así 👩‍💻 o 👨‍👩‍👧‍👦 salen en una pieza", () => {
    const conZwj = caras.filter((c) => c.familia === "Apple Color Emoji" && c.rangos.some(([a, b]) => 0x200d >= a && 0x200d <= b));
    expect(conZwj.map((c) => c.archivo)).toEqual(["AppleColorEmoji[1].woff2"]);
    for (const secuencia of ["👨‍👩‍👧‍👦", "👩‍🚀", "👩‍💻", "👩‍❤️‍👨"]) {
      const archivos = new Set([...secuencia].map((ch) => ch.codePointAt(0)!).filter((cp) => cp !== 0xfe0f).map((cp) => caraDe("Apple Color Emoji", cp)));
      expect([...archivos], secuencia).toEqual(["AppleColorEmoji[1].woff2"]);
    }
  });

  it("ningún carácter está en dos caras de la misma familia", () => {
    for (const familia of ["Apple Color Emoji", "Apple Color Emoji Sueltos"]) {
      const vistos = new Map<number, string>();
      for (const cara of caras.filter((c) => c.familia === familia)) {
        for (const [a, b] of cara.rangos) for (let cp = a; cp <= b; cp++) {
          expect(vistos.get(cp), `${familia} U+${cp.toString(16)}`).toBeUndefined();
          vistos.set(cp, cara.archivo);
        }
      }
    }
  });

  it("la primera pantalla del selector (70 emojis) cae en pocos trozos, no en todos", () => {
    const primeros = catalogo.emojis.slice(0, 70).map(([e]) => e);
    const trozos = new Set(primeros.map((e) => caraDe(e.includes("‍") ? "Apple Color Emoji" : "Apple Color Emoji Sueltos", e.codePointAt(0)!)).filter(Boolean));
    expect(trozos.size).toBeLessThanOrEqual(5);
  });

  it("los iconos de un solo emoji usan la familia de sueltos, sin la cara de secuencias", () => {
    expect(emojiFontFamily("🔥")).toBe("var(--font-emoji-icono)");
    expect(emojiFontFamily("👩‍💻")).toBe("var(--font-emoji)");
    for (const suelto of ["🔥", "💻", "🚀", "🙂", "❤"]) {
      const cara = caraDe("Apple Color Emoji Sueltos", suelto.codePointAt(0)!);
      expect(cara, suelto).toBeDefined();
      expect(cara).not.toBe("AppleColorEmoji[1].woff2");
    }
    const css = readFileSync(new URL("../../frontend/styles/globals.css", import.meta.url), "utf8");
    expect(css).toMatch(/--font-emoji-icono: "Apple Color Emoji Sueltos", "Apple Color Emoji"/);
  });
});
