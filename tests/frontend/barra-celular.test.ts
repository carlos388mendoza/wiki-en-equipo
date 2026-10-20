import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #47: en pantallas chicas, barra de navegación abajo (Inicio, Buscar, Nueva, Plantillas y Menú con el perfil).
const read = (file: string) => readFileSync(new URL(`../../frontend/${file}`, import.meta.url), "utf8");

describe("barra de navegación del celular", () => {
  it("está fija abajo solo en pantallas chicas y tiene las cinco opciones", () => {
    const sidebar = read("components/layout/Sidebar.tsx");
    expect(sidebar).toMatch(/aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0[^"]*lg:hidden"/);
    for (const item of [`bottomItem("/", "Inicio"`, `bottomItem("/buscar", "Buscar"`, `<NewPageButton variant="nav" label="Nueva" />`, `bottomItem("/plantillas", "Plantillas"`, `aria-label="Abrir menú y perfil"`]) expect(sidebar).toContain(item);
  });

  it("el contenido deja espacio para la barra", () => {
    expect(read("app/(wiki)/layout.tsx")).toMatch(/<main className="min-w-0 flex-1 pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\] lg:pb-0">/);
  });
});
