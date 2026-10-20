import { describe, expect, it } from "vitest";
import { ICONS } from "../../frontend/lib/backgrounds";
import { EMOJI_KEYWORDS, LUCIDE_KEYWORDS, searchIcons, THREE_D_KEYWORDS } from "../../frontend/lib/icon-search";
import { LUCIDE_ICONS, THREE_D_ICONS } from "../../frontend/lib/icons";

// #36: buscador de iconos en español (Lucide, 3D y emojis).
describe("búsqueda de iconos", () => {
  it("todos los iconos tienen palabras en español", () => {
    for (const name of Object.keys(LUCIDE_ICONS)) expect(LUCIDE_KEYWORDS[name], name).toBeTruthy();
    for (const name of THREE_D_ICONS) expect(THREE_D_KEYWORDS[name], name).toBeTruthy();
    for (const emoji of ICONS) expect(EMOJI_KEYWORDS[emoji], emoji).toBeTruthy();
  });

  it("encuentra los tres tipos, sin importar tildes ni mayúsculas", () => {
    const cafe = searchIcons("Café");
    expect(cafe).toContainEqual({ kind: "lucide", name: "coffee" });
    expect(cafe).toContainEqual({ kind: "emoji", value: "☕" });
    expect(cafe).toContainEqual({ kind: "3d", name: "receta" });
    expect(searchIcons("reunión")).toContainEqual({ kind: "3d", name: "acta" });
    expect(searchIcons("capacitacion")).toContainEqual({ kind: "lucide", name: "graduation-cap" });
  });

  it("acepta el principio de una palabra, varias palabras y el logo", () => {
    expect(searchIcons("calend")).toContainEqual({ kind: "lucide", name: "calendar" });
    expect(searchIcons("comida saludable").map((m) => ("name" in m ? m.name : "value" in m ? m.value : m.kind))).toEqual(expect.arrayContaining(["salad", "🥗"]));
    expect(searchIcons("logo")).toContainEqual({ kind: "brand" });
    expect(searchIcons("")).toEqual([]);
    expect(searchIcons("xyzxyz")).toEqual([]);
  });
});
