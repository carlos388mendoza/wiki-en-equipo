import Image from "next/image";
import type { Background } from "@/lib/types";

function patternUrl(emoji: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='8' y='28' font-size='20'>${emoji}</text><text x='40' y='60' font-size='20'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Pinta el fondo de una página: color, degradado, imagen o patrón de emojis. */
export function PageBackground({ background, className = "", sizes = "100vw", priority = false }: {
  background: Background | null; className?: string; sizes?: string; priority?: boolean;
}) {
  if (!background) return <div className={`bg-gradient-to-br from-basil-soft to-paper ${className}`} />;

  switch (background.type) {
    case "color":
      return <div className={className} style={{ backgroundColor: background.value }} />;
    case "gradiente":
      return (
        <div
          className={className}
          style={{ backgroundImage: `linear-gradient(${background.angle ?? 135}deg, ${background.from}, ${background.to})` }}
        />
      );
    case "patron":
      return (
        <div
          className={className}
          style={{ backgroundColor: background.color, backgroundImage: patternUrl(background.emoji), backgroundSize: "64px 64px" }}
        />
      );
    case "imagen":
      return (
        <div className={`relative overflow-hidden ${className}`}>
          <Image src={background.url} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
        </div>
      );
  }
}
