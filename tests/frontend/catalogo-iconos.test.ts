import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalog, ES_TO_EN, searchCatalog } from "../../frontend/lib/icon-catalog";
import { THREE_D_ICONS } from "../../frontend/lib/icons-3d";
import { parseIcon, sanitizeIcon } from "../../frontend/lib/icons";

// #46: todos los iconos de Lucide y de 3dicons, y más emojis, con buscador en español y carga por partes.
const repo = (file: string) => new URL(`../../${file}`, import.meta.url);
const lucide = JSON.parse(readFileSync(repo("assets/lucide/etiquetas.json"), "utf8")) as { version: string; etiquetas: Record<string, string> };
const emojis = JSON.parse(readFileSync(repo("assets/emojis/es.json"), "utf8")) as { grupos: Record<number, string>; emojis: [string, string, number][] };
const catalog = buildCatalog(lucide.etiquetas, emojis);

describe("catálogo de iconos", () => {
  it("tiene todos los de Lucide (misma versión que lucide-react), los 120 iconos 3D y más de mil emojis en español", () => {
    const pkg = JSON.parse(readFileSync(repo("frontend/package.json"), "utf8"));
    expect(pkg.dependencies["lucide-react"]).toBe(lucide.version);
    expect(catalog.lucide.length).toBeGreaterThan(1500);
    expect(catalog.threeD).toHaveLength(120);
    expect(catalog.emojis.length).toBeGreaterThan(1000);
    // Cada icono 3D tiene su archivo, y no hay archivos sin palabras para buscarlos.
    const files = readdirSync(repo("assets/templates/3dicons")).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)).sort();
    expect([...THREE_D_ICONS].sort()).toEqual(files);
  });

  it("busca en español en los tres tipos, también en los de Lucide (con su traducción)", () => {
    const names = (q: string) => searchCatalog(catalog, q).map((i) => (i.kind === "emoji" ? i.value : `${i.kind}:${i.name}`));
    expect(names("taza")).toEqual(expect.arrayContaining(["lucide:coffee", "lucide:cup-soda", "3d:tea-cup"]));
    expect(names("camión")).toContain("lucide:truck");
    expect(names("pizza")).toEqual(expect.arrayContaining(["lucide:pizza", "🍕"]));
    expect(names("trofeo")).toEqual(expect.arrayContaining(["3d:trophy", "lucide:trophy", "🏆"]));
    expect(names("xyzxyz")).toEqual([]);
    for (const key of Object.keys(ES_TO_EN)) expect(key, key).toBe(key.normalize("NFD").replace(/[̀-ͯ]/g, ""));
  });

  it("cualquier icono de Lucide o 3D se puede guardar; los que no trae la app se dibujan con su SVG", () => {
    expect(parseIcon("lucide:beaker:cielo")).toMatchObject({ kind: "lucide", name: "beaker", Icon: null });
    expect(parseIcon("lucide:coffee:rojo")?.kind).toBe("lucide");
    expect(sanitizeIcon("3d:trophy")).toBe("3d:trophy");
    expect(sanitizeIcon("3d:no-existe")).toBeNull();
    expect(sanitizeIcon("lucide:../x:rojo")).toBeNull();
    const pageIcon = readFileSync(repo("frontend/components/ui/PageIcon.tsx"), "utf8");
    expect(pageIcon).toContain("url(/iconos/lucide/${parsed.name}.svg)");
  });

  it("los índices se generan al compilar y el selector los pide al abrirse, de a partes", () => {
    const script = readFileSync(repo("frontend/scripts/copy-assets.mjs"), "utf8");
    expect(script).toContain('join(lucideTo, "indice.json")');
    expect(script).toContain('"emojis-es.json"');
    const browser = readFileSync(repo("frontend/components/editor/IconBrowser.tsx"), "utf8");
    expect(browser).toMatch(/const PAGE = \d+;/);
    expect(browser).toContain("new IntersectionObserver");
    expect(existsSync(repo("frontend/lib/icon-catalog.ts"))).toBe(true);
  });
});
