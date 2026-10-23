"use client";

import { useEffect, useState } from "react";
import { emojiFontFamily } from "@/lib/emoji-font";

/** Identificador único del patrón (mismo emoji = mismo dibujo). */
function patternKey(emoji: string) {
  return Array.from(emoji).map((c) => c.codePointAt(0)!.toString(36)).join("-");
}

/**
 * Patrón de emojis dibujado dentro de la página (#54): al ser un SVG en línea, el emoji usa la fuente de Apple y sale
 * con el mismo estilo en todos los dispositivos (como imagen de fondo el navegador usaría el emoji del sistema).
 * El texto dentro de un `<pattern>` no hace que el navegador descargue la fuente por sí solo: se pide aquí y, cuando
 * llega, se vuelve a dibujar el patrón (`key`).
 */
export function EmojiPattern({ emoji, className = "" }: { emoji: string; className?: string }) {
  const id = `pat-${patternKey(emoji)}`;
  const family = emojiFontFamily(emoji);
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    let alive = true;
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    // Las familias de la pila (`var(--font-emoji…)`) se leen del CSS para pedir la primera, la de Apple.
    const first = getComputedStyle(document.documentElement).getPropertyValue(family.slice(4, -1)).split(",")[0]?.trim();
    if (!fonts || !first) return;
    fonts.load(`20px ${first}`, emoji).then((faces) => { if (alive && faces.length) setLoaded((n) => n + 1); }).catch(() => {});
    return () => { alive = false; };
  }, [emoji, family]);
  return (
    <svg key={loaded} className={`h-full w-full ${className}`} aria-hidden focusable="false">
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <text x="8" y="28" fontSize="20" fill="black" style={{ fontFamily: family }}>{emoji}</text>
          <text x="40" y="60" fontSize="20" fill="black" style={{ fontFamily: family }}>{emoji}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
