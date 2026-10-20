import { describe, expect, it } from "vitest";
import { PHOTO_GALLERY, searchPhotos } from "../../frontend/lib/backgrounds";

// #37: galería fija más amplia, etiquetada en español y con buscador (sin la API de Unsplash).
const all = PHOTO_GALLERY.flatMap((g) => g.photos);

describe("galería de fondos", () => {
  it("tiene más de 100 fotos sin repetir, todas con descripción y etiquetas en español", () => {
    expect(all.length).toBeGreaterThan(100);
    expect(new Set(all.map((p) => p.url)).size).toBe(all.length);
    for (const p of all) {
      expect(p.url, p.alt).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+$/);
      expect(p.alt.length, p.url).toBeGreaterThan(3);
      expect(p.tags.split(" ").length, p.alt).toBeGreaterThanOrEqual(2);
    }
  });

  it("nunca muestra la palabra Unsplash en grupos, descripciones ni etiquetas", () => {
    for (const g of PHOTO_GALLERY) expect(g.group).not.toMatch(/unsplash/i);
    for (const p of all) expect(`${p.alt} ${p.tags}`).not.toMatch(/unsplash/i);
  });

  it("busca por etiqueta, descripción o grupo, sin importar tildes ni mayúsculas", () => {
    for (const q of ["comida", "cocina", "oficina", "equipo", "naturaleza", "café", "Montañas", "reunión"]) expect(searchPhotos(q).length, q).toBeGreaterThan(0);
    expect(searchPhotos("pizza").every((p) => /pizza/i.test(p.alt + p.tags))).toBe(true);
    expect(searchPhotos("coci").length).toBeGreaterThan(3); // principio de palabra
    expect(searchPhotos("cafe taza").map((p) => p.alt)).toContain("Taza de café");
    expect(searchPhotos("")).toEqual([]);
    expect(searchPhotos("xyzxyz")).toEqual([]);
  });
});
