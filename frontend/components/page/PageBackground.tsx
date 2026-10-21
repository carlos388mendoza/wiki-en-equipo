import Image from "next/image";
import { isOptimizableImage } from "@/lib/images";
import type { Background, ShapePattern } from "@/lib/types";

/**
 * Fondo de patrón: con un emoji, el SVG va en la misma URL; con un icono de Lucide o 3D (`lucide:<nombre>:<tono>`
 * o `3d:<nombre>`, #45), lo arma la ruta /patrones.
 */
export function patternUrl(emoji: string) {
  const lucide = emoji.match(/^lucide:([a-z0-9-]+):([a-z]+)$/);
  if (lucide) return `url("/patrones/lucide/${lucide[1]}.svg?tono=${lucide[2]}")`;
  const threeD = emoji.match(/^3d:([a-z0-9-]+)$/);
  if (threeD) return `url("/patrones/3d/${threeD[1]}.svg")`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='8' y='28' font-size='20'>${emoji}</text><text x='40' y='60' font-size='20'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Patrones de figuras hechos solo con CSS (sin imágenes externas). */
export function shapeStyle(shape: ShapePattern, ink: string): React.CSSProperties {
  switch (shape) {
    case "puntos":
      return { backgroundImage: `radial-gradient(${ink} 2px, transparent 2.5px)`, backgroundSize: "18px 18px" };
    case "rayas":
      return { backgroundImage: `repeating-linear-gradient(45deg, ${ink} 0 6px, transparent 6px 18px)` };
    case "cuadricula":
      return { backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`, backgroundSize: "22px 22px" };
    case "zigzag":
      return { backgroundImage: `linear-gradient(135deg, ${ink} 25%, transparent 25%), linear-gradient(225deg, ${ink} 25%, transparent 25%)`, backgroundSize: "24px 24px", backgroundPosition: "0 0, 12px 0" };
    case "circulos":
      return { backgroundImage: `radial-gradient(circle at center, transparent 9px, ${ink} 10px, ${ink} 11px, transparent 12px)`, backgroundSize: "32px 32px" };
  }
}

/** Degradados de respaldo cuando una página no tiene fondo (o el listado no lo incluye). */
const fallbacks = [
  "linear-gradient(135deg, #fde9eb 0%, #f8f6f4 100%)",
  "linear-gradient(135deg, #fff6c7 0%, #f8f6f4 100%)",
  "linear-gradient(135deg, #fde9eb 0%, #fff6c7 100%)",
  "linear-gradient(135deg, #fde9eb 0%, #e8f0fa 100%)",
];

function fallbackFor(seed = "") {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return fallbacks[Math.abs(h) % fallbacks.length];
}

/** Estilo CSS de un fondo que no es imagen (sirve también para vistas previas). */
export function backgroundStyle(background: Background | null, seed?: string): React.CSSProperties {
  if (!background) return { backgroundImage: fallbackFor(seed) };
  switch (background.type) {
    case "color":
      return { backgroundColor: background.value };
    case "gradient":
      return { backgroundImage: background.value };
    case "pattern":
      return { backgroundColor: background.color, backgroundImage: patternUrl(background.emoji), backgroundSize: "64px 64px" };
    case "shapes":
      return { backgroundColor: background.color, ...shapeStyle(background.shape, background.ink) };
    case "image":
      return {};
  }
}

/** Pinta el fondo de una página: color, degradado, imagen o patrón de emojis. */
export function PageBackground({ background, seed, className = "", sizes = "100vw", priority = false }: {
  background: Background | null; seed?: string; className?: string; sizes?: string; priority?: boolean;
}) {
  if (background?.type === "image") {
    return (
      <div className={`group/portada relative overflow-hidden bg-line ${className}`}>
        <Image
          src={background.url}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!isOptimizableImage(background.url)}
          className="object-cover"
        />
        {/* Crédito de las fotos elegidas con la búsqueda de Unsplash (#44; lo piden sus reglas): pequeño y solo al pasar
            el ratón (en pantallas táctiles, tenue). Las de la galería fija no lo llevan (su licencia no lo exige). */}
        {background.credit && background.creditUrl && background.credit !== "Unsplash" && (
          <span className="absolute bottom-1.5 left-2 z-10 max-w-[70%] truncate rounded bg-ink/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/portada:opacity-100 focus-within:opacity-100 [@media(any-hover:none)]:opacity-70">
            Foto: <a href={background.creditUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{background.credit}</a>
            {" · "}<a href="https://unsplash.com/?utm_source=wiki_grupo_comidas&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="hover:underline">Unsplash</a>
          </span>
        )}
      </div>
    );
  }
  return <div className={className} style={backgroundStyle(background, seed)} />;
}
