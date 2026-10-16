import { describe, expect, it } from "vitest";
import { metadata as home } from "../../frontend/app/(wiki)/page";

describe("título del inicio (#9)", () => {
  it("exporta su propio metadata: solo \"Wiki Grupo Comidas\", con descripción e imagen", () => {
    expect(home.title).toEqual({ absolute: "Wiki Grupo Comidas" });
    expect(home.description).toBeTruthy();
    expect(home.openGraph?.images).toBeTruthy();
  });
});
