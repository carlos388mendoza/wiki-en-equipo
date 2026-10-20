import { describe, expect, it } from "vitest";
import { checkUpload, MAX_UPLOAD_BYTES } from "../../frontend/lib/uploads";

describe("límites de subida", () => {
  it("acepta tipos permitidos dentro del límite", () => {
    expect(checkUpload({ name: "foto.png", type: "image/png", size: 1024 })).toBeNull();
    expect(checkUpload({ name: "manual.pdf", type: "application/pdf", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("rechaza archivos demasiado grandes con un mensaje claro", () => {
    expect(checkUpload({ name: "video.mp4", type: "video/mp4", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/máximo es 20 MB/);
  });

  it("rechaza tipos no permitidos y lista los permitidos", () => {
    expect(checkUpload({ name: "programa.exe", type: "application/x-msdownload", size: 10 })).toMatch(/Tipos permitidos: JPG/);
  });

  it("en el selector de fondos solo acepta imágenes", () => {
    expect(checkUpload({ name: "tabla.csv", type: "text/csv", size: 10 }, true)).toMatch(/Elige una imagen/);
  });
});
