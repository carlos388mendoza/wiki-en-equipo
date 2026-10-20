import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(`../../frontend/${file}`, import.meta.url), "utf8");

// #31: el icono de las tarjetas iba con posición absoluta calculada a mano y se encimaba con el título.
describe("tarjetas de páginas y plantillas (#31)", () => {
  it("el icono va en el flujo, antes del título, y no con posición absoluta", () => {
    const page = read("components/page/PageCard.tsx");
    expect(page).not.toMatch(/absolute left-4 top-11/);
    expect(page).toMatch(/relative -mt-6 flex h-12 shrink-0 items-end"><PageIcon/);
    const template = read("components/templates/TemplateCard.tsx");
    expect(template).not.toMatch(/top-\[42px\]/);
    expect(template).toMatch(/relative -mt-5 mb-1 flex h-10 shrink-0 items-end"><PageIcon/);
  });
});

// #32: la portada es una imagen posicionada (next/image con fill) y tapaba lo que subía sobre ella.
describe("botones e iconos sobre la portada (#32)", () => {
  it("la fila del icono y los botones de la página, y el icono del muro, quedan por encima de la portada", () => {
    expect(read("app/(wiki)/paginas/[id]/page.tsx")).toMatch(/className="relative -mt-10 flex flex-wrap items-end justify-between gap-4"/);
    expect(read("app/(wiki)/departamentos/[slug]/page.tsx")).toMatch(/className="relative -mt-10 drop-shadow"/);
    expect(read("app/(wiki)/paginas/[id]/historial/page.tsx")).toMatch(/className="relative -mt-6"/);
  });
});
