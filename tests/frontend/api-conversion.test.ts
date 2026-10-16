import { describe, expect, it } from "vitest";
import { toPage, toSummary } from "../../frontend/lib/api";

const base = { id: "p1", title: "Guía", visibility: "DEPARTMENT" as const, version: 3, ownerId: "u1", departmentId: "d1", parentId: null, updatedAt: "2026-10-14T10:00:00.000Z" };

describe("conversión de las respuestas del backend", () => {
  it("el listado trae icono, fondo, autor y permiso propio", () => {
    const summary = toSummary({ ...base, icon: "lucide:book-open:cielo", backgroundJson: JSON.stringify({ type: "color", value: "#eef6ff" }), owner: { id: "u1", name: "Usuario Tecnología" }, tags: [{ name: "procesos" }], myPermission: "EDIT" });
    expect(summary).toMatchObject({ icon: "lucide:book-open:cielo", background: { type: "color", value: "#eef6ff" }, owner: { name: "Usuario Tecnología" }, tags: ["procesos"], myPermission: "EDIT" });
  });

  it("usa el icono de su campo y, si no hay, el que estaba dentro del fondo (páginas anteriores)", () => {
    expect(toSummary({ ...base, icon: null, backgroundJson: JSON.stringify({ type: "none", icon: "🧾" }) }).icon).toBe("🧾");
    expect(toSummary({ ...base, icon: "📌", backgroundJson: JSON.stringify({ type: "none", icon: "🧾" }) }).icon).toBe("📌");
  });

  it("descarta iconos no válidos", () => {
    expect(toSummary({ ...base, icon: "lucide:no-existe:rojo", backgroundJson: null }).icon).toBeNull();
  });

  it("los resultados de búsqueda conservan el fragmento", () => {
    expect(toSummary({ ...base, excerpt: "…revisa el arqueo de caja…" }).excerpt).toBe("…revisa el arqueo de caja…");
  });

  it("la página trae personas con nombre, ruta superior y visitas", () => {
    const page = toPage({
      ...base, icon: "🧰", contentJson: "[]", backgroundJson: null, isWall: false, isCompanyWall: false, createdAt: base.updatedAt,
      owner: { id: "u1", name: "Usuario Tecnología" }, tags: [], children: [],
      shares: [{ userId: "u2", permission: "READ", user: { id: "u2", name: "Usuario Compras", department: { name: "Compras" } } }],
      ancestors: [{ id: "p0", title: "Soporte", icon: "🛠️" }], visitCount: 7,
    });
    expect(page.shares[0].user?.name).toBe("Usuario Compras");
    expect(page.ancestors).toEqual([{ id: "p0", title: "Soporte", icon: "🛠️" }]);
    expect(page.views).toBe(7);
    expect(page.icon).toBe("🧰");
  });
});
