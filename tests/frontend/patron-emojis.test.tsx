import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmojiPattern, PageBackground } from "../../frontend/components/page/PageBackground";

describe("patrón de emojis dibujado en la página (#54)", () => {
  it("el patrón con emoji sale como SVG en línea (hereda la fuente del sitio)", () => {
    const html = renderToStaticMarkup(<PageBackground background={{ type: "pattern", emoji: "🍕", color: "#fde9eb" }} className="h-24" />);
    expect(html).toContain("<svg");
    expect(html).toContain("<pattern");
    expect(html).toContain("🍕");
    expect(html).toContain("#fde9eb");
    // Ya no se usa la imagen de fondo (el navegador la dibujaría con el emoji del sistema).
    expect(html).not.toContain("data:image/svg+xml");
  });

  it("el patrón con un icono de Lucide o 3D sigue usando la ruta /patrones", () => {
    const lucide = renderToStaticMarkup(<PageBackground background={{ type: "pattern", emoji: "lucide:coffee:cielo", color: "#fff6c7" }} className="h-24" />);
    expect(lucide).toContain("/patrones/lucide/coffee.svg");
    const threeD = renderToStaticMarkup(<PageBackground background={{ type: "pattern", emoji: "3d:trophy", color: "#fff6c7" }} className="h-24" />);
    expect(threeD).toContain("/patrones/3d/trophy.svg");
  });

  it("el patrón tiene teselas de 64 px con dos emojis, como antes", () => {
    const html = renderToStaticMarkup(<EmojiPattern emoji="🚀" />);
    expect(html).toContain('width="64"');
    expect(html).toContain('height="64"');
    expect((html.match(/🚀/g) || []).length).toBe(2);
  });
});
