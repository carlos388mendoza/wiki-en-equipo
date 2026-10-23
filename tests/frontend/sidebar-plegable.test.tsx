import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DepartmentGroup, DepartmentIcon } from "../../frontend/components/layout/Sidebar";
import { departmentIconFor } from "../../frontend/lib/departments";
import type { PageSummary, SidebarDepartment } from "../../frontend/lib/types";

// #55 y #63: los departamentos van en una sola sección, cada uno con su icono, plegable y sin repetirse.
const page = (id: string, title: string, parentId: string | null = null): PageSummary => ({
  id, title, icon: "📄", background: null, parentId, ownerId: "u1", visibility: "DEPARTMENT", departmentId: "d1", tags: [], updatedAt: "2026-10-01T00:00:00.000Z",
} as unknown as PageSummary);
const department = (data: Partial<SidebarDepartment> = {}): SidebarDepartment =>
  ({ id: "d1", slug: "tecnologia", name: "Tecnología", icon: null, pages: [page("p1", "Inventario de equipos"), page("p2", "Subpágina", "p1")], ...data });

describe("departamentos de la barra lateral", () => {
  it("cada departamento es una fila: la flecha pliega sus páginas y el nombre lleva a su muro", () => {
    const html = renderToStaticMarkup(<ul><DepartmentGroup department={department()} own /></ul>);
    expect(html).toMatch(/<button[^>]*aria-expanded="true"[^>]*aria-controls="[^"]*departamento-d1"[^>]*aria-label="Plegar las páginas de Tecnología"/);
    expect(html).toContain('href="/departamentos/tecnologia"');
    expect(html).toContain("Inventario de equipos");
    // Las subpáginas no salen sueltas en la raíz: cuelgan de su página.
    expect(html.match(/Subpágina/g) ?? []).toHaveLength(0);
  });

  it("el departamento propio empieza abierto; los demás, plegados (sus páginas se ocultan sin desmontarse)", () => {
    const html = renderToStaticMarkup(<ul><DepartmentGroup department={department({ id: "d2", slug: "compras", name: "Compras" })} own={false} /></ul>);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<div id="[^"]*departamento-d2" hidden=""/);
    expect(html).toContain("Inventario de equipos");
  });

  it("sin páginas dice que el departamento no ha publicado nada", () => {
    expect(renderToStaticMarkup(<ul><DepartmentGroup department={department({ pages: [] })} own /></ul>)).toContain("Tu departamento no ha publicado páginas.");
    expect(renderToStaticMarkup(<ul><DepartmentGroup department={department({ pages: [] })} own={false} /></ul>)).toContain("Este departamento no ha publicado páginas.");
  });

  it("usa el icono propio del departamento si lo tiene en la base; si no, el que sale del nombre", () => {
    expect(renderToStaticMarkup(<DepartmentIcon department={{ name: "Tecnología", icon: "🖥️" }} />)).toContain("🖥️");
    const fromName = renderToStaticMarkup(<DepartmentIcon department={{ name: "Tecnología", icon: null }} />);
    expect(fromName).toContain("lucide-cpu");
    expect(departmentIconFor("Compras").displayName).toBe(departmentIconFor("compras").displayName);
    expect(departmentIconFor("Contabilidad")).not.toBe(departmentIconFor("Compras"));
    expect(departmentIconFor("Logística")).toBe(departmentIconFor("Almacén"));
    expect(departmentIconFor("Ventas")).toBe(departmentIconFor("Otro"));
  });
});
