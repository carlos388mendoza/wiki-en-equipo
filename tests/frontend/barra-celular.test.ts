import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #47: en pantallas chicas, barra abajo con Inicio, Plantillas y Cuenta (lo demás en el menú lateral).
const read = (file: string) => readFileSync(new URL(`../../frontend/${file}`, import.meta.url), "utf8");
const sidebar = read("components/layout/Sidebar.tsx");
const accountPanel = read("components/auth/AccountPanel.tsx");

describe("barra de navegación del celular", () => {
  it("está fija abajo solo en pantallas chicas y tiene tres botones: Inicio, Plantillas y Cuenta", () => {
    expect(sidebar).toMatch(/aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3[^"]*lg:hidden"/);
    expect(sidebar).toContain(`bottomItem("/", "Inicio", Home)`);
    expect(sidebar).toContain(`bottomItem("/plantillas", "Plantillas", LayoutTemplate)`);
    expect(sidebar).not.toContain(`<NewPageButton variant="nav"`);
  });

  it("el menú Cuenta trae nombre y rol, Mi cuenta, Agregar otra cuenta y Cerrar sesión (con su confirmación)", () => {
    expect(accountPanel).toContain("roleLabel[role]");
    expect(accountPanel).toContain(`<Link href="/cuenta"`);
    expect(accountPanel).toContain("Agregar otra cuenta");
    expect(accountPanel).toContain("Cerrar sesión");
    // Ventana que sube desde abajo en el celular (Drawer) y modal en computadora.
    expect(sidebar).toContain('import { Drawer, DrawerContent');
    expect(sidebar).toContain("<Drawer open={accountOpen}");
    expect(sidebar).toContain("<Modal open={desktopAccountOpen}");
  });

  it("el contenido deja espacio para la barra", () => {
    expect(read("app/(wiki)/layout.tsx")).toMatch(/<main className="min-w-0 flex-1 pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\] lg:pb-0">/);
  });
});