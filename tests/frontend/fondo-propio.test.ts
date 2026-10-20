import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isUploadedBackground } from "../../frontend/components/editor/BackgroundPicker";
import { checkUpload, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "../../frontend/lib/uploads";

const frontend = fileURLToPath(new URL("../../frontend/", import.meta.url));
const picker = readFileSync(join(frontend, "components/editor/BackgroundPicker.tsx"), "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|mjs)$/.test(name) ? [path] : [];
  });
}

describe("fondo con imagen propia", () => {
  it("acepta solo imágenes JPG, PNG, WEBP o GIF, con un mensaje claro", () => {
    expect(checkUpload({ name: "portada.jpg", type: "image/jpeg", size: 1024 }, true)).toBeNull();
    expect(checkUpload({ name: "logo.svg", type: "image/svg+xml", size: 1024 }, true)).toBe("“logo.svg” no se puede usar como imagen. Elige una imagen JPG, PNG, WEBP o GIF.");
    expect(checkUpload({ name: "foto.heic", type: "image/heic", size: 1024 }, true)).toMatch(/Elige una imagen JPG, PNG, WEBP o GIF/);
    expect(checkUpload({ name: "manual.pdf", type: "application/pdf", size: 1024 }, true)).toMatch(/no se puede usar como imagen/);
  });

  it("respeta el límite de tamaño", () => {
    expect(checkUpload({ name: "grande.png", type: "image/png", size: MAX_UPLOAD_BYTES }, true)).toBeNull();
    expect(checkUpload({ name: "grande.png", type: "image/png", size: MAX_UPLOAD_BYTES + 1 }, true)).toMatch(new RegExp(`El máximo es ${MAX_UPLOAD_MB} MB`));
  });

  it("reconoce la imagen subida a la wiki (y no las de la galería ni las de otros sitios)", () => {
    expect(isUploadedBackground({ type: "image", url: "/archivos/abc123def456" })).toBe(true);
    expect(isUploadedBackground({ type: "image", url: "https://images.unsplash.com/photo-1" })).toBe(false);
    expect(isUploadedBackground({ type: "color", value: "#fff" })).toBe(false);
    expect(isUploadedBackground(null)).toBe(false);
  });

  it("la ventana permite subir, cambiar y quitar la imagen, ligada a la página", () => {
    expect(picker).toMatch(/uploadToWiki\(file, uploadTarget, true\)/);
    expect(picker).toMatch(/Elegir imagen/);
    expect(picker).toMatch(/Cambiar imagen/);
    expect(picker).toMatch(/onDrop=/);
    expect(picker).toMatch(/Solo la ven quienes tienen acceso a la página/);
  });
});

describe("sin la palabra Unsplash en la interfaz", () => {
  it("no aparece en pantallas ni componentes", () => {
    const found = [...sources(join(frontend, "app")), ...sources(join(frontend, "components"))].filter((f) => /unsplash/i.test(readFileSync(f, "utf8")));
    expect(found).toEqual([]);
  });

  it("la galería ya no guarda el crédito ni busca con la API", () => {
    expect(picker).not.toMatch(/credit/);
    expect(picker).not.toMatch(/fondos\/buscar/);
  });
});
