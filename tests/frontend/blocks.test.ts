import { describe, expect, it } from "vitest";
import { blocksToText, isInternalPath, linkedPageIds, normalizeBlocks, parseAppearance, safeHref, toStoredAppearance } from "../../frontend/lib/blocks";

describe("formato de bloques del backend", () => {
  it("entiende las plantillas por defecto del backend", () => {
    const blocks = normalizeBlocks([
      { id: "a", type: "heading", data: { level: 1, text: "Propósito" } },
      { id: "b", type: "callout", data: { title: "Responsable", text: "Equipo" } },
      { id: "c", type: "table", data: { columns: ["Tema", "Contacto"], rows: [["Soporte", "Nombre"]] } },
      { id: "d", type: "paragraph", data: { text: "1. Uno\n2. Dos" } },
    ]);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "callout", "table", "paragraph"]);
    expect(blocksToText(blocks)).toContain("Soporte");
  });

  it("descarta enlaces peligrosos y bloques sin datos útiles", () => {
    const blocks = normalizeBlocks([
      { id: "x", type: "paragraph", data: { text: "hola", spans: [{ text: "hola", href: "javascript:alert(1)" }] } },
      { id: "y", type: "image", data: { url: "javascript:alert(1)" } },
      { id: "z", type: "desconocido", data: {} },
      "basura",
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type === "paragraph" && blocks[0].data.spans?.[0].href).toBeFalsy();
  });

  it("solo acepta http(s), mailto y rutas internas", () => {
    expect(safeHref("https://grupocomidas.com")).toBe("https://grupocomidas.com/");
    expect(safeHref("/paginas/1")).toBe("/paginas/1");
    expect(safeHref("//evil.test")).toBeUndefined();
    expect(safeHref("data:text/html,x")).toBeUndefined();
    expect(safeHref("/\\evil.test")).toBeUndefined();
  });

  it("solo acepta rutas internas para redirigir después de iniciar sesión", () => {
    expect(isInternalPath("/paginas/1?x=2")).toBe(true);
    expect(isInternalPath("//evil.test")).toBe(false);
    expect(isInternalPath("/\\evil.test")).toBe(false);
    expect(isInternalPath("/%0d%0a")).toBe(true);
    expect(isInternalPath("/a\nb")).toBe(false);
    expect(isInternalPath("https://evil.test")).toBe(false);
  });

  it("encuentra páginas enlazadas en subpáginas, menciones e hijos", () => {
    const blocks = normalizeBlocks([
      { id: "1", type: "subpage", data: { pageId: "p1" } },
      { id: "2", type: "list", data: { style: "bullet", text: "x", spans: [{ text: "x", pageId: "p2" }], children: [{ id: "3", type: "subpage", data: { pageId: "p3" } }] } },
    ]);
    expect(linkedPageIds(blocks)).toEqual(["p1", "p2", "p3"]);
  });
});

describe("fondo e icono", () => {
  it("lee el fondo de las plantillas del backend", () => {
    const { background, icon } = parseAppearance(JSON.stringify({ type: "gradient", value: "linear-gradient(135deg, #eef6ff 0%, #f7f3ff 100%)" }));
    expect(background).toEqual({ type: "gradient", value: "linear-gradient(135deg, #eef6ff 0%, #f7f3ff 100%)" });
    expect(icon).toBeNull();
  });

  it("guarda el icono junto al fondo y lo recupera", () => {
    const stored = toStoredAppearance({ type: "pattern", emoji: "🍕", color: "#fbf0da" }, "🍕");
    expect(parseAppearance(stored)).toEqual({ background: { type: "pattern", emoji: "🍕", color: "#fbf0da" }, icon: "🍕" });
    expect(parseAppearance(toStoredAppearance(null, "📄"))).toEqual({ background: null, icon: "📄" });
  });

  it("rechaza CSS inyectado en colores y degradados", () => {
    expect(parseAppearance({ type: "color", value: "red; background:url(x)" }).background).toBeNull();
    expect(parseAppearance({ type: "gradient", value: "url(https://evil.test)" }).background).toBeNull();
    expect(parseAppearance({ type: "gradient", value: "linear-gradient(red, red), url(archivos)" }).background).toBeNull();
    expect(parseAppearance({ type: "gradient", value: "linear-gradient(135deg, rgba(46,106,79,0.5) 0%, #fff 100%)" }).background).not.toBeNull();
  });
});
