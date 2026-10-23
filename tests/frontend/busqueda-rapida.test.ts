import { afterEach, describe, expect, it, vi } from "vitest";
import { isPaletteShortcut, EDITOR_SHORTCUTS, formatShortcut } from "../../frontend/lib/shortcuts";
import { THEME_KEY, THEME_SCRIPT, isThemeChoice } from "../../frontend/lib/theme";

// #67: búsqueda con Ctrl/⌘ + K en cualquier pantalla, con acciones y tema claro/oscuro/automático.
const key = (k: string, mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>> = {}) =>
  ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

describe("atajo de la búsqueda", () => {
  it("en Mac es ⌘K y en Windows Ctrl+K (no al revés, ni con otras teclas)", () => {
    expect(isPaletteShortcut(key("k", { metaKey: true }), true)).toBe(true);
    expect(isPaletteShortcut(key("K", { metaKey: true }), true)).toBe(true);
    expect(isPaletteShortcut(key("k", { ctrlKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key("k", { ctrlKey: true }), false)).toBe(true);
    expect(isPaletteShortcut(key("k", { metaKey: true }), false)).toBe(false);
    expect(isPaletteShortcut(key("k", { ctrlKey: true, shiftKey: true }), false)).toBe(false);
    expect(isPaletteShortcut(key("k"), false)).toBe(false);
    expect(isPaletteShortcut(key("j", { ctrlKey: true }), false)).toBe(false);
  });

  it("aparece en la ayuda de atajos, con el símbolo de cada sistema", () => {
    const wiki = EDITOR_SHORTCUTS.find((g) => g.group === "En toda la wiki")!;
    expect(wiki.items[0]).toEqual({ keys: ["Mod-K"], label: "Buscar páginas y acciones" });
    expect(formatShortcut("Mod-K", true)).toBe("⌘K");
    expect(formatShortcut("Mod-K", false)).toBe("Ctrl+K");
  });
});

describe("tema claro, oscuro o automático", () => {
  const run = (saved: string | null, throws = false) => {
    const html = { dataset: {} as Record<string, string> };
    const storage = { getItem: (k: string) => { if (throws) throw new Error("bloqueado"); return k === THEME_KEY ? saved : null; } };
    new Function("localStorage", "document", THEME_SCRIPT)(storage, { documentElement: html });
    return html.dataset.theme;
  };

  it("el script del <head> pone el tema guardado antes de dibujar, y el automático si no hay o no se puede leer", () => {
    expect(run("oscuro")).toBe("oscuro");
    expect(run("claro")).toBe("claro");
    expect(run("auto")).toBe("auto");
    expect(run(null)).toBe("auto");
    expect(run("<script>")).toBe("auto");
    expect(run("oscuro", true)).toBe("auto");
    expect(isThemeChoice("oscuro")).toBe(true);
    expect(isThemeChoice("verde")).toBe(false);
  });
});

describe("búsqueda en la wiki desde la ventana", () => {
  afterEach(() => { vi.doUnmock("../../frontend/lib/api"); vi.doUnmock("../../frontend/lib/session"); vi.resetModules(); });

  async function load(user: object | null) {
    const calls: [string, string | undefined][] = [];
    vi.doMock("../../frontend/lib/session", () => ({ getCurrentUser: async () => user }));
    vi.doMock("../../frontend/lib/api", () => ({
      searchPages: async (_viewer: unknown, q: string, tag?: string) => {
        calls.push([q, tag]);
        return { ok: true, data: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, title: `Página ${i}`, icon: null, tags: ["viaticos"], excerpt: "…viáticos…" })) };
      },
    }));
    const { searchForPalette } = await import("../../frontend/app/actions/search");
    return { searchForPalette, calls };
  }

  it("busca por título y contenido con la sesión de quien busca, como mucho 8 resultados", async () => {
    const { searchForPalette, calls } = await load({ id: "u1" });
    const results = await searchForPalette("  viáticos ");
    expect(calls).toEqual([["viáticos", undefined]]);
    expect(results).toHaveLength(8);
    expect(results[0]).toMatchObject({ id: "p0", title: "Página 0", excerpt: "…viáticos…" });
  });

  it("con #etiqueta busca por etiqueta", async () => {
    const { searchForPalette, calls } = await load({ id: "u1" });
    await searchForPalette("#Viaticos");
    expect(calls).toEqual([["", "viaticos"]]);
  });

  it("sin sesión o con menos de 2 letras no busca nada", async () => {
    const sinSesion = await load(null);
    expect(await sinSesion.searchForPalette("viáticos")).toEqual([]);
    expect(sinSesion.calls).toEqual([]);
    const corta = await load({ id: "u1" });
    expect(await corta.searchForPalette("v")).toEqual([]);
    expect(corta.calls).toEqual([]);
  });
});
