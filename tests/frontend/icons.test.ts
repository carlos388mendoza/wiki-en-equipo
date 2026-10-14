import { describe, expect, it } from "vitest";
import { BRAND_ICON, parseIcon, sanitizeIcon } from "../../frontend/lib/icons";

describe("icono con el logo de Grupo Comidas", () => {
  it("se reconoce y apunta al logo de la app", () => {
    expect(parseIcon(BRAND_ICON)).toEqual({ kind: "brand", src: "/brand/logo-grupo-comidas.png" });
    expect(sanitizeIcon(BRAND_ICON)).toBe(BRAND_ICON);
  });

  it("rechaza otras marcas inventadas", () => {
    expect(parseIcon("marca:otra")).toBeNull();
    expect(sanitizeIcon("marca:otra")).toBeNull();
  });

  it("cabe en el campo de icono del backend (48 caracteres)", () => {
    expect(BRAND_ICON.length).toBeLessThanOrEqual(48);
  });
});
