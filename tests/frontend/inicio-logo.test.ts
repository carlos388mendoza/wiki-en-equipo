import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El logo del recuadro "Hola, …" del inicio era una marca de agua pegada (y cortada) en la orilla.
const home = readFileSync(new URL("../../frontend/app/(wiki)/page.tsx", import.meta.url), "utf8");

describe("logo del inicio de la empresa", () => {
  it("ya no sale de la orilla del recuadro", () => {
    expect(home).not.toMatch(/-right-4 -top-6/);
    expect(home).not.toMatch(/opacity-20/);
  });

  it("va dentro del recuadro: arriba en el celular (72 px) y a la derecha desde tableta (136 px)", () => {
    expect(home).toMatch(/sm:flex-row sm:items-center/);
    expect(home).toMatch(/sm:order-last sm:ml-auto/);
    expect(home).toMatch(/<span className="block sm:hidden"><PageIcon[^>]*size=\{72\}/);
    expect(home).toMatch(/<span className="hidden sm:block"><PageIcon[^>]*size=\{136\}/);
  });
});
