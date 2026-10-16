import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ICON_TONES, parseIcon } from "../../frontend/lib/icons";

const frontend = fileURLToPath(new URL("../../frontend/", import.meta.url));
const css = readFileSync(join(frontend, "styles/globals.css"), "utf8");
const token = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1].toLowerCase();

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}
const code = ["app", "components", "lib", "styles"].flatMap((dir) => sources(join(frontend, dir))).map((path) => ({ path, text: readFileSync(path, "utf8") }));

// Contraste WCAG entre dos colores #rrggbb.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe("colores de la marca", () => {
  it("usan los tonos exactos del logo", () => {
    expect(token("brand")).toBe("#e2001a");
    expect(token("sun")).toBe("#fddb00");
  });

  it("no queda el verde anterior (basil) en el frontend", () => {
    // lib/icons.ts conserva el tono "albahaca" como opción para los iconos que ya se guardaron con él.
    const leftovers = code.filter(({ path, text }) => !path.endsWith("icons.ts") && /basil|#2e6a4f|#e3efe8/i.test(text)).map(({ path }) => path);
    expect(leftovers).toEqual([]);
  });

  it("nunca hay texto amarillo ni texto blanco sobre amarillo", () => {
    const yellowText = code.filter(({ text }) => /\btext-sun\b(?!-)/.test(text) || /bg-sun\b(?!-)[^"`]*\btext-white\b/.test(text)).map(({ path }) => path);
    expect(yellowText).toEqual([]);
  });

  it("los pares de texto y fondo cumplen el contraste AA (4,5:1)", () => {
    const pairs: [string, string][] = [
      ["surface", "brand"], ["brand-strong", "brand-soft"], ["brand-strong", "surface"], ["sky", "sky-soft"], ["sky", "surface"],
      ["ink", "sun"], ["ink", "sun-soft"], ["sun-ink", "sun-soft"], ["sun-ink", "surface"], ["muted", "paper"], ["danger", "danger-soft"],
    ];
    for (const [text, bg] of pairs) expect(contrast(token(text)!, token(bg)!), `${text} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("los iconos nuevos usan el rojo del logo y los guardados con otros tonos se conservan", () => {
    expect(ICON_TONES.rojo[1]).toBe("#e2001a");
    expect(parseIcon("lucide:book-open:morado")).toMatchObject({ kind: "lucide", tone: "rojo" });
    expect(parseIcon("lucide:book-open:albahaca")).toMatchObject({ kind: "lucide", tone: "albahaca" });
  });
});
