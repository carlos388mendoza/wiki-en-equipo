import Image from "next/image";
import { isOptimizableImage } from "@/lib/images";
import type { Background } from "@/lib/types";

export function patternUrl(emoji: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='8' y='28' font-size='20'>${emoji}</text><text x='40' y='60' font-size='20'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Degradados de respaldo cuando una página no tiene fondo (o el listado no lo incluye). */
const fallbacks = [
  "linear-gradient(135deg, #e3efe8 0%, #f4f6f4 100%)",
  "linear-gradient(135deg, #fbf0da 0%, #f4f6f4 100%)",
  "linear-gradient(135deg, #e3efe8 0%, #fbf0da 100%)",
  "linear-gradient(135deg, #dce2de 0%, #e3efe8 100%)",
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
      <div className={`relative overflow-hidden bg-line ${className}`}>
        <Image
          src={background.url}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!isOptimizableImage(background.url)}
          className="object-cover"
        />
        {background.credit && (
          <span className="absolute bottom-1 right-2 rounded bg-ink/50 px-1.5 py-0.5 text-[10px] text-white">
            {background.creditUrl ? (
              <a href={background.creditUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Foto: {background.credit}</a>
            ) : (
              <>Foto: {background.credit}</>
            )}
          </span>
        )}
      </div>
    );
  }
  return <div className={className} style={backgroundStyle(background, seed)} />;
}
