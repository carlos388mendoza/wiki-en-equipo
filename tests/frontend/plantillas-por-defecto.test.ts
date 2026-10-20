import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES } from "../../frontend/lib/default-templates";
import { defaultTemplatesPlan, RETIRED_DEFAULTS } from "../../frontend/lib/default-templates-plan";
import { parseIcon } from "../../frontend/lib/icons";

describe("plantillas por defecto de Grupo Comidas", () => {
  it("todas tienen foto de portada de Unsplash, icono válido, encabezados y contenido", () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(t.background.type, t.title).toBe("image");
      expect((t.background as { url?: string }).url, t.title).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+$/);
      expect(parseIcon((t.background as { icon?: string }).icon), t.title).not.toBeNull();
      expect(t.content.some((b) => b.type === "heading"), t.title).toBe(true);
      expect(t.content.length, t.title).toBeGreaterThan(5);
      expect(t.description.length, t.title).toBeGreaterThan(20);
    }
  });

  it("los títulos no se repiten (el instalador compara por título)", () => {
    expect(new Set(DEFAULT_TEMPLATES.map((t) => t.title)).size).toBe(DEFAULT_TEMPLATES.length);
  });

  it("incluye las plantillas pensadas para Grupo Comidas", () => {
    const titles = DEFAULT_TEMPLATES.map((t) => t.title);
    for (const title of ["Acta de reunión", "Manual de puesto", "Onboarding de empleado nuevo", "Reporte de incidente", "Checklist de limpieza y seguridad alimentaria", "Evaluación de proveedor", "Solicitud de soporte de Tecnología", "Inventario semanal", "Plan de capacitación"]) {
      expect(titles).toContain(title);
    }
  });
});

describe("instalador de plantillas de Grupo Comidas", () => {
  const acta = DEFAULT_TEMPLATES.find((t) => t.title === "Acta de reunión")!;
  const base = { scope: "COMPANY" as const, isDefault: true, icon: "3d:acta" };

  it("crea solo las que faltan", () => {
    const plan = defaultTemplatesPlan([{ ...base, id: "a", title: "Acta de reunión", background: { type: "image", url: "https://images.unsplash.com/photo-x" } }], DEFAULT_TEMPLATES);
    expect(plan.toCreate).toHaveLength(DEFAULT_TEMPLATES.length - 1);
    expect(plan.toCreate.map((t) => t.title)).not.toContain("Acta de reunión");
    expect(plan.toUpdateCover).toEqual([]);
  });

  it("pone la foto a las por defecto instaladas sin foto, y el icono solo si no tenían", () => {
    const plan = defaultTemplatesPlan([
      { ...base, id: "a", title: "Acta de reunión", background: { type: "color", value: "#e8f0fa" } },
      { ...base, id: "b", title: "Preguntas frecuentes", background: null, icon: null },
    ], DEFAULT_TEMPLATES);
    expect(plan.toUpdateCover).toEqual([
      { id: "a", template: acta, setIcon: false },
      { id: "b", template: DEFAULT_TEMPLATES.find((t) => t.title === "Preguntas frecuentes"), setIcon: true },
    ]);
  });

  it("no toca plantillas de personas (aunque se llamen igual) ni las que ya tienen una foto elegida", () => {
    const plan = defaultTemplatesPlan([
      { ...base, id: "a", title: "Acta de reunión", isDefault: false, background: { type: "color", value: "#fff" } },
      { ...base, id: "b", title: "Inventario semanal", background: { type: "image", url: "https://images.unsplash.com/photo-otra" } },
      { ...base, id: "c", title: "Manual de puesto", scope: "PRIVATE", background: null },
    ], DEFAULT_TEMPLATES);
    expect(plan.toUpdateCover).toEqual([]);
    // Una privada con el mismo título no cuenta como instalada: la de la empresa se crea.
    expect(plan.toCreate.map((t) => t.title)).toContain("Manual de puesto");
    expect(plan.toCreate.map((t) => t.title)).not.toContain("Acta de reunión");
  });

  it("retira de las por defecto las repetidas (sin borrarlas) y nunca las vuelve a crear", () => {
    const plan = defaultTemplatesPlan([
      { ...base, id: "r1", title: "Bienvenida al departamento", background: null },
      { ...base, id: "r2", title: "Documentación de proceso", background: null },
      { ...base, id: "r3", title: "Inicio del departamento", background: null },
      { ...base, id: "r4", title: "Inicio del departamento", isDefault: false, background: null },
    ], DEFAULT_TEMPLATES);
    expect(plan.toRetire).toEqual([{ id: "r1", title: "Bienvenida al departamento" }, { id: "r2", title: "Documentación de proceso" }, { id: "r3", title: "Inicio del departamento" }]);
    expect(plan.toUpdateCover).toEqual([]);
    for (const title of Object.keys(RETIRED_DEFAULTS)) expect(plan.toCreate.map((t) => t.title)).not.toContain(title);
  });

  it("de cada par repetido se queda la plantilla de Grupo Comidas, que sí está entre las por defecto", () => {
    const titles = DEFAULT_TEMPLATES.map((t) => t.title);
    for (const [retired, kept] of Object.entries(RETIRED_DEFAULTS)) {
      expect(titles).not.toContain(retired);
      expect(titles).toContain(kept);
    }
  });
});
