import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #42: el borrador sin conexión usa el mismo editor que con internet, con el aviso de que se guarda en el dispositivo.
const read = (file: string) => readFileSync(new URL(`../../frontend/${file}`, import.meta.url), "utf8");
const drafts = read("components/offline/OfflineDrafts.tsx");

describe("editor de borradores sin conexión", () => {
  it("tiene los mismos controles que el editor normal: portada, fondo, icono, título, etiquetas y editor por bloques", () => {
    for (const piece of ["<PageBackground", "<BackgroundPicker", "<IconPicker", 'className="mt-4 w-full resize-none bg-transparent font-display text-4xl', "<TagInput", "<BlockEditor"]) expect(drafts, piece).toContain(piece);
    // La misma barra de arriba (fija) y el mismo botón de fondo que el editor de páginas.
    const editor = read("components/editor/PageEditor.tsx");
    const coverButton = /\[@media\(any-hover:hover\)\]:opacity-0 \[@media\(any-hover:hover\)\]:group-hover:opacity-100/;
    expect(editor).toMatch(coverButton);
    expect(drafts).toMatch(coverButton);
  });

  it("avisa que se guarda en el dispositivo y sube icono, fondo y etiquetas al publicar", () => {
    expect(drafts).toContain("Guardado en este dispositivo");
    expect(drafts).toContain("Este borrador se guarda en este dispositivo.");
    expect(drafts).toMatch(/createPage\(\{ title: title \|\| "Borrador sin título", blocks: content, icon: icon \?\? undefined, background, tags \}\)/);
    expect(read("lib/collab/drafts.ts")).toMatch(/icon\?: string \| null; background\?: Background \| null; tags\?: string\[\];/);
  });
});
