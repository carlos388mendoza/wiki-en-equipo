import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { patternUrl } from "../../frontend/components/page/PageBackground";
import { parseAppearance } from "../../frontend/lib/blocks";

// #45: los patrones del fondo aceptan todos los iconos, iconos 3D y emojis, con el mismo buscador.
describe("patrones de fondo", () => {
  it("con un emoji el patrón va en la URL; con Lucide o 3D lo arma la ruta /patrones", () => {
    expect(patternUrl("🍕")).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(patternUrl("lucide:coffee:cielo")).toBe('url("/patrones/lucide/coffee.svg?tono=cielo")');
    expect(patternUrl("3d:trophy")).toBe('url("/patrones/3d/trophy.svg")');
  });

  it("se guardan los iconos válidos y se descarta lo demás", () => {
    expect(parseAppearance({ type: "pattern", emoji: "3d:trophy", color: "#fff6c7" }).background).toEqual({ type: "pattern", emoji: "3d:trophy", color: "#fff6c7" });
    expect(parseAppearance({ type: "pattern", emoji: "lucide:truck:rojo", color: "#fff6c7" }).background).toMatchObject({ emoji: "lucide:truck:rojo" });
    expect(parseAppearance({ type: "pattern", emoji: "3d:no-existe", color: "#fff6c7" }).background).toMatchObject({ emoji: "🍽️" });
  });

  it("la pestaña Patrones usa el explorador de iconos con buscador y la ruta valida el nombre", () => {
    const picker = readFileSync(new URL("../../frontend/components/editor/BackgroundPicker.tsx", import.meta.url), "utf8");
    expect(picker).toMatch(/<IconBrowser value=\{value\?\.type === "pattern" \? patternEmoji : null\}/);
    expect(picker).not.toContain("PATTERN_EMOJIS");
    const route = readFileSync(new URL("../../frontend/app/patrones/[tipo]/[archivo]/route.ts", import.meta.url), "utf8");
    expect(route).toContain("const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;");
    expect(route).toContain("THREE_D_ICONS as readonly string[]");
  });
});
