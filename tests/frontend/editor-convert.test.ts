import { describe, expect, it } from "vitest";
import { headingLevel, normalizeBlocks, type WikiBlock } from "../../frontend/lib/blocks";
import { blockNoteToWiki, trimTrailingEmpty, wikiToBlockNote } from "../../frontend/lib/editor/convert";

const sample: WikiBlock[] = normalizeBlocks([
  { id: "h", type: "heading", data: { level: 2, text: "Primeros pasos" } },
  { id: "p", type: "paragraph", data: { text: "Lee la política y la guía.", spans: [{ text: "Lee la " }, { text: "política", pageId: "pg-1" }, { text: " y la " }, { text: "guía", href: "https://support.google.com/mail", bold: true }, { text: "." }] } },
  { id: "l1", type: "list", data: { style: "check", text: "Hecho", checked: true } },
  { id: "l2", type: "list", data: { style: "bullet", text: "Padre", children: [{ id: "l3", type: "list", data: { style: "numbered", text: "Hijo" } }] } },
  { id: "c", type: "callout", data: { emoji: "📣", tone: "info", title: "Ojo", text: "Aviso importante" } },
  { id: "q", type: "quote", data: { text: "Cita" } },
  { id: "k", type: "code", data: { text: "npm run dev", language: "bash" } },
  { id: "d", type: "divider", data: {} },
  { id: "t", type: "table", data: { columns: ["A", "B"], rows: [["1", "2"], ["3", "4"]] } },
  { id: "i", type: "image", data: { url: "/archivos/abc123", caption: "Foto", alt: "Mesa" } },
  { id: "v", type: "video", data: { url: "https://www.youtube.com/watch?v=abcdefghijk" } },
  { id: "v2", type: "video", data: { url: "/archivos/vid1" } },
  { id: "b", type: "link", data: { url: "https://grupocomidas.com/", title: "Sitio" } },
  { id: "f", type: "file", data: { url: "/archivos/f1", name: "manual.pdf" } },
  { id: "s", type: "subpage", data: { pageId: "pg-2", title: "FAQ" } },
]);

describe("conversión con BlockNote", () => {
  it("ida y vuelta conserva el contenido", () => {
    const back = blockNoteToWiki(wikiToBlockNote(sample));
    expect(back).toEqual(sample.map((b) => {
      // Al volver, los archivos subidos guardan su id.
      if ((b.type === "image" || b.type === "video" || b.type === "file") && b.data.url.startsWith("/archivos/")) return { ...b, data: { ...b.data, fileId: b.data.url.split("/").pop() } };
      return b;
    }));
  });

  it("usa bloques propios para videos embebidos, enlaces, avisos y subpáginas", () => {
    const types = wikiToBlockNote(sample).map((b) => b.type);
    expect(types).toContain("embed");
    expect(types).toContain("video");
    expect(types).toContain("bookmark");
    expect(types).toContain("callout");
    expect(types).toContain("subpage");
  });

  it("las menciones de página se guardan como spans con pageId", () => {
    const bn = wikiToBlockNote(sample);
    const p = blockNoteToWiki([bn[1]])[0];
    expect(p.type === "paragraph" && p.data.spans?.find((s) => s.pageId)).toEqual({ text: "política", pageId: "pg-1" });
  });

  it("los párrafos sin formato no guardan spans (igual que las plantillas del backend)", () => {
    const [p] = blockNoteToWiki([{ type: "paragraph", content: [{ type: "text", text: "Hola", styles: {} }] }]);
    expect(p.data).toEqual({ text: "Hola" });
  });

  it("descarta enlaces peligrosos que vengan del editor", () => {
    const [p] = blockNoteToWiki([{ type: "paragraph", content: [{ type: "link", href: "javascript:alert(1)", content: [{ type: "text", text: "x", styles: {} }] }] }]);
    expect(p.type === "paragraph" && p.data.spans).toBeUndefined();
  });

  it("quita los párrafos vacíos del final", () => {
    const blocks = blockNoteToWiki([{ type: "paragraph", content: [{ type: "text", text: "a", styles: {} }] }, { type: "paragraph", content: [] }]);
    expect(trimTrailingEmpty(blocks)).toHaveLength(1);
  });
});

describe("niveles de título (#5)", () => {
  const casos: [unknown, 1 | 2 | 3][] = [[1, 1], [2, 2], [3, 3], [4, 3], [6, 3], ["2", 2], [0, 1], [undefined, 1], ["h1", 1], [2.5, 1]];

  it("una sola regla: 1 a 3, los más profundos quedan en 3 y lo inválido en 1", () => {
    for (const [value, expected] of casos) expect(headingLevel(value)).toBe(expected);
  });

  it("lo que llega del backend y lo que sale del editor dan el mismo nivel", () => {
    for (const [value, expected] of casos) {
      const desdeBackend = normalizeBlocks([{ id: "h", type: "heading", data: { text: "Título", level: value } }])[0];
      const desdeEditor = blockNoteToWiki([{ id: "h", type: "heading", props: { level: value }, content: [{ type: "text", text: "Título", styles: {} }], children: [] }] as never)[0];
      expect(desdeBackend.type === "heading" && desdeBackend.data.level).toBe(expected);
      expect(desdeEditor.type === "heading" && desdeEditor.data.level).toBe(expected);
    }
  });
});
