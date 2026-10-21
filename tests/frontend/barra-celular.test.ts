import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #47: en pantallas chicas, barra abajo con Inicio, Plantillas y Cuenta (lo demás en el menú lateral).
const read = (file: string) => readFileSync(new URL(`../../frontend/${file}`, import.meta.url), "utf8");
const sidebar = read("components/layout/Sidebar.tsx");

describe("barra de navegación del celular", () => {
  it("está fija abajo solo en pantallas chicas y tiene tres botones: Inicio, Plantillas y Cuenta", () => {
    expect(sidebar).toMatch(/aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3[^"]*lg:hidden"/);
    expect(sidebar).toContain(`bottomItem("/", "Inicio", Home)`);
    expect(sidebar).toContain(`bottomItem("/plantillas", "Plantillas", LayoutTemplate)`);
    expect(sidebar).not.toContain(`<NewPageButton variant="nav"`);
  });

  it("el menú Cuenta trae nombre y rol, Mi cuenta, Cambiar de cuenta y Cerrar sesión (con su confirmación)", () => {
    expect(sidebar).toContain("{roleLabel[user.role]}");
    expect(sidebar).toContain(`<Link href="/cuenta" role="menuitem"`);
    expect(sidebar).toContain(`<LogoutButton userId={user.id} variant="menu" mode="cambiar" />`);
    expect(sidebar).toContain(`<LogoutButton userId={user.id} variant="menu" />`);
    const logout = read("components/auth/LogoutButton.tsx");
    expect(logout).toContain(`const label = mode === "cambiar" ? "Cambiar de cuenta" : "Cerrar sesión";`);
  });

  it("el contenido deja espacio para la barra", () => {
    expect(read("app/(wiki)/layout.tsx")).toMatch(/<main className="min-w-0 flex-1 pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\] lg:pb-0">/);
  });
});
