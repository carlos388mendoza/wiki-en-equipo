import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El botón "Agregar fondo" quedaba tapado: el selector de icono sube sobre la portada (-mt-10) y ocupaba todo
// el ancho del contenido, así que en ventanas medianas (~950 px) se llevaba el clic de la mitad del botón.
const editor = readFileSync(new URL("../../frontend/components/editor/PageEditor.tsx", import.meta.url), "utf8");

describe("portada del editor", () => {
  it("el selector de icono solo ocupa el ancho del icono", () => {
    expect(editor).toMatch(/className="relative -mt-10 w-fit"><IconPicker/);
  });

  it("el botón de fondo queda por encima y solo se oculta en equipos con ratón", () => {
    // La línea completa del botón (su onClick tiene "=>", así que no sirve buscar hasta el primer ">").
    const button = editor.split(/\r?\n/).find((line) => line.includes("<button") && line.includes("setBgOpen(true)")) ?? "";
    expect(button).toMatch(/\bz-10\b/);
    expect(button).toMatch(/\[@media\(hover:hover\)\]:opacity-0/);
    expect(button).toMatch(/focus-visible:opacity-100/);
    // Antes se ocultaba desde "sm" aunque la pantalla fuera táctil (en una tableta no se veía nunca).
    expect(button).not.toMatch(/\bsm:opacity-0\b/);
  });
});
