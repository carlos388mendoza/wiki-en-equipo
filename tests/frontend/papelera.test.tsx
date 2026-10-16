import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrashVisibility } from "../../frontend/components/page/TrashVisibility";

describe("papelera: visibilidad al restaurar (#4)", () => {
  it("muestra la visibilidad real de cada página, no siempre \"Privada\"", () => {
    expect(renderToStaticMarkup(<TrashVisibility visibility="DEPARTMENT" />)).toContain("Departamento");
    expect(renderToStaticMarkup(<TrashVisibility visibility="COMPANY" />)).toContain("Toda la empresa");
    expect(renderToStaticMarkup(<TrashVisibility visibility="PRIVATE" />)).toContain("Privada");
  });

  it("explica que así quedará al restaurarla (también para lectores de pantalla)", () => {
    const html = renderToStaticMarkup(<TrashVisibility visibility="DEPARTMENT" />);
    expect(html).toContain("Así quedará al restaurarla");
    expect(html).toContain("Al restaurarla quedará:");
  });
});
