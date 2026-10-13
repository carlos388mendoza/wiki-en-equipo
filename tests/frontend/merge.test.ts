import { describe, expect, it } from "vitest";
import type { WikiBlock } from "../../frontend/lib/blocks";
import { mergePages, resolveConflicts, type PageState } from "../../frontend/lib/editor/merge";

const p = (id: string, text: string): WikiBlock => ({ id, type: "paragraph", data: { text } });
const page = (blocks: WikiBlock[], title = "Título"): PageState => ({ title, blocks, background: null, icon: "📄", tags: [] });
const texts = (s: PageState) => s.blocks.map((b) => (b.data as { text: string }).text);

const base = page([p("a", "uno"), p("b", "dos"), p("c", "tres")]);

describe("fusión de tres vías", () => {
  it("combina cambios en bloques distintos sin conflictos", () => {
    const mine = page([p("a", "uno (yo)"), p("b", "dos"), p("c", "tres")]);
    const theirs = page([p("a", "uno"), p("b", "dos"), p("c", "tres (otra persona)")]);
    const r = mergePages(base, mine, theirs);
    expect(r.conflicts).toHaveLength(0);
    expect(texts(r.merged)).toEqual(["uno (yo)", "dos", "tres (otra persona)"]);
  });

  it("conserva bloques nuevos de ambos lados en su lugar", () => {
    const mine = page([p("a", "uno"), p("m", "nuevo mío"), p("b", "dos"), p("c", "tres")]);
    const theirs = page([p("a", "uno"), p("b", "dos"), p("c", "tres"), p("t", "nuevo suyo")]);
    const r = mergePages(base, mine, theirs);
    expect(texts(r.merged)).toEqual(["uno", "nuevo mío", "dos", "tres", "nuevo suyo"]);
  });

  it("detecta conflicto cuando ambos editan el mismo bloque y deja elegir", () => {
    const mine = page([p("a", "uno"), p("b", "dos — yo"), p("c", "tres")]);
    const theirs = page([p("a", "uno"), p("b", "dos — otra persona"), p("c", "tres")]);
    const r = mergePages(base, mine, theirs);
    expect(r.conflicts).toEqual([expect.objectContaining({ id: "b", kind: "edit" })]);
    expect(texts(r.merged)[1]).toBe("dos — yo");
    expect(texts(resolveConflicts(r, { b: "theirs" }))[1]).toBe("dos — otra persona");
  });

  it("respeta borrados del otro lado si no tocaste el bloque", () => {
    const mine = page([p("a", "uno"), p("b", "dos"), p("c", "tres")]);
    const theirs = page([p("a", "uno"), p("c", "tres")]);
    expect(texts(mergePages(base, mine, theirs).merged)).toEqual(["uno", "tres"]);
  });

  it("avisa si borraste un bloque que la otra persona editó", () => {
    const mine = page([p("a", "uno"), p("c", "tres")]);
    const theirs = page([p("a", "uno"), p("b", "dos editado"), p("c", "tres")]);
    const r = mergePages(base, mine, theirs);
    expect(r.conflicts[0]).toMatchObject({ id: "b", kind: "deleted-by-me" });
    expect(texts(resolveConflicts(r, { b: "mine" }))).toEqual(["uno", "tres"]);
  });

  it("fusiona el título y reporta conflicto si ambos lo cambiaron", () => {
    const r = mergePages(base, page(base.blocks, "Mío"), page(base.blocks, "Suyo"));
    expect(r.fieldConflicts).toEqual([{ field: "title", mine: "Mío", theirs: "Suyo" }]);
    expect(resolveConflicts(r, { "field:title": "theirs" }).title).toBe("Suyo");
    expect(mergePages(base, page(base.blocks, "Mío"), base).merged.title).toBe("Mío");
  });
});
