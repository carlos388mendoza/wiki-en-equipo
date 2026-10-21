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
    expect(catalog.threeD.length).toBeGreaterThanOrEqual(160); // todos los de 3dicons (CDN, sin logos de marcas) y los del repo
    expect(catalog.emojis.length).toBeGreaterThan(1900); // todos, con banderas
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

  it("los índices se generan al compilar y el selector dibuja solo las filas a la vista", () => {
    const script = readFileSync(repo("frontend/scripts/copy-assets.mjs"), "utf8");
    expect(script).toContain('join(lucideTo, "indice.json")');
    expect(script).toContain('"emojis-es.json"');
    const browser = readFileSync(repo("frontend/components/editor/IconBrowser.tsx"), "utf8");
    expect(browser).toContain('from "@tanstack/react-virtual"');
    expect(browser).toContain("virtual.getVirtualItems()");
    // Sin el botón suelto del logo: está en la pestaña "Grupo Comidas".
    expect(browser).not.toContain("showBrand");
    expect(browser).toContain('marca: "Grupo Comidas"');
    expect(existsSync(repo("frontend/lib/icon-catalog.ts"))).toBe(true);
  });
});

describe("lista de nombres de Lucide", () => {
  it("coincide con las etiquetas guardadas (validar lucide:<nombre> sin cargar el índice)", async () => {
    const { LUCIDE_NAMES } = await import("../../frontend/lib/lucide-names");
    expect([...LUCIDE_NAMES].sort()).toEqual(Object.keys(lucide.etiquetas).sort());
  });
});

describe("todos los 3D, banderas y tonos de piel", async () => {
  const { flagCode } = await import("../../frontend/lib/flags");
  const { threeDValue, parseCdnThreeD } = await import("../../frontend/lib/icons-3d");

  it("las banderas de países se dibujan como imagen (en Windows el emoji se ve como letras)", () => {
    expect(flagCode("🇭🇳")).toBe("hn");
    expect(flagCode("🏴󠁧󠁢󠁥󠁮󠁧󠁿")).toBe("gb-eng");
    expect(flagCode("🏁")).toBeNull();
    expect(flagCode("🍕")).toBeNull();
    const flags = catalog.emojis.filter((e) => e.kind === "emoji" && flagCode(e.value));
    expect(flags.length).toBeGreaterThan(250);
  });

  it("los emojis con tono de piel traen sus 5 variantes", () => {
    const wave = catalog.emojis.find((e) => e.kind === "emoji" && e.value === "👋");
    expect(wave && wave.kind === "emoji" && wave.skins).toEqual(["👋🏻", "👋🏼", "👋🏽", "👋🏾", "👋🏿"]);
  });

  it("los 3D de 3dicons usan el archivo del repo si existe y si no el CDN, en cualquier estilo y ángulo", () => {
    expect(threeDValue("1acc3d-heart", "dynamic", "color")).toBe("3d:bienvenida");
    expect(threeDValue("1acc3d-heart", "iso", "clay")).toBe("3d:1acc3d-heart:iso:clay");
    expect(parseCdnThreeD("3d:1acc3d-heart:iso:clay")?.src).toBe("https://bvconuycpdvgzbvbkijl.supabase.co/storage/v1/object/public/sizes/1acc3d-heart/iso/200/clay.webp");
    expect(parseCdnThreeD("3d:000000-no-existe:iso:clay")).toBeNull();
    expect(sanitizeIcon("3d:1acc3d-heart:front:premium")).toBe("3d:1acc3d-heart:front:premium");
  });
});

describe("iconos que no se dibujaban y repetidos", () => {
  it("los nombres largos de Lucide (más de 30 letras) se aceptan en vez de salir con el de respaldo", async () => {
    const { parseIcon } = await import("../../frontend/lib/icons");
    expect(parseIcon("lucide:align-horizontal-distribute-center:rojo")).toMatchObject({ kind: "lucide", name: "align-horizontal-distribute-center" });
  });

  it("el índice del selector no repite dibujos (clock y clock-4) pero todos los SVG existen", () => {
    const index = JSON.parse(readFileSync(repo("frontend/public/iconos/lucide/indice.json"), "utf8"));
    expect(index).toHaveProperty("clock");
    expect(index).not.toHaveProperty("clock-4");
    expect(existsSync(repo("frontend/public/iconos/lucide/clock-4.svg"))).toBe(true);
  });

  it("los logos de Grupo Comidas y sus franquicias son iconos válidos", async () => {
    const { BRANDS, parseIcon, sanitizeIcon } = await import("../../frontend/lib/icons");
    expect(Object.keys(BRANDS)).toEqual(["grupo-comidas", "grupo-comidas-animado", "pizza-hut", "kfc", "dennys", "china-wok"]);
    for (const [id, b] of Object.entries(BRANDS)) {
      expect(sanitizeIcon(`marca:${id}`)).toBe(`marca:${id}`);
      expect(existsSync(repo(`frontend/public${b.src}`))).toBe(true);
    }
    expect(parseIcon("marca:grupo-comidas-animado")).toMatchObject({ kind: "brand", wide: true });
    expect(parseIcon("marca:otra")).toBeNull();
  });
});
