import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #63: las páginas de cada departamento en la sidebar se pueden plegar, como los grupos de la sidebar de shadcn.
const sidebar = readFileSync(new URL("../../frontend/components/layout/Sidebar.tsx", import.meta.url), "utf8");

describe("páginas de los departamentos plegables", () => {
  it("el título del departamento es un botón con chevron que abre y cierra la lista", () => {
    expect(sidebar).toContain("function DepartmentSection(");
    expect(sidebar).toMatch(/<button type="button" onClick=\{\(\) => setAbierto\(!abierto\)\} aria-expanded=\{abierto\} aria-controls=\{panelId\}/);
    expect(sidebar).toContain('<ChevronRight size={14} aria-hidden');
    expect(sidebar).toContain('className={`shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`}');
  });

  it("la lista se oculta y se muestra sin desmontarse (aria-controls)", () => {
    expect(sidebar).toContain("const panelId = `${useId()}-departamento-${id}`");
    expect(sidebar).toContain("<div id={panelId} hidden={!abierto}>");
  });

  it("empieza abierto el departamento propio y se abre solo si la página abierta es de ahí", () => {
    expect(sidebar).toContain("const contieneActiva = pages.some((p) => pathname === `/paginas/${p.id}`)");
    expect(sidebar).toContain("useEffect(() => { if (contieneActiva) setAbierto(true); }, [contieneActiva]);");
    expect(sidebar).toContain("<DepartmentSection key={d.id} id={d.id} title={d.name} pages={d.pages} abierta={d.id === user.departmentId}");
  });

  it("los apartados que no son de departamentos (Ancladas, Empresa, Privadas, Compartidas) siguen igual", () => {
    expect(sidebar).toContain('<Section title="Ancladas" pages={sections.ancladas} />');
    expect(sidebar).toContain('<Section title="Empresa" pages={sections.empresa} />');
    expect(sidebar).toContain('<Section title="Compartidas conmigo" pages={sections.compartidas} />');
    expect(sidebar).toContain('<Section title="Privadas" pages={sections.privadas} empty="Las páginas que crees aparecerán aquí." />');
  });
});
