/**
 * Banderas de países (#46): en Windows los emojis de bandera se ven como dos letras ("HN"), así que se dibujan como
 * imagen con las banderas de flag-icons (MIT), que `scripts/copy-assets.mjs` copia a `public/iconos/banderas/`.
 * Devuelve el código del archivo (`hn`, `gb-eng`…) o `null` si el emoji no es una bandera de país o región.
 */
const REGIONAL_A = 0x1f1e6;
const TAG_A = 0xe0061;
const TAG_END = 0xe007f;

export function flagCode(emoji: string): string | null {
  const points = [...emoji].map((c) => c.codePointAt(0)!);
  // Dos indicadores regionales: 🇭🇳 → "hn".
  if (points.length === 2 && points.every((p) => p >= REGIONAL_A && p <= REGIONAL_A + 25)) {
    return points.map((p) => String.fromCharCode(97 + p - REGIONAL_A)).join("");
  }
  // Bandera negra + etiquetas (Inglaterra, Escocia, Gales): 🏴 + "gbeng" + fin → "gb-eng".
  if (points[0] === 0x1f3f4 && points.at(-1) === TAG_END && points.length > 3) {
    const tag = points.slice(1, -1).map((p) => (p >= TAG_A && p <= TAG_A + 25 ? String.fromCharCode(97 + p - TAG_A) : "")).join("");
    if (/^[a-z]{5}$/.test(tag)) return `${tag.slice(0, 2)}-${tag.slice(2)}`;
  }
  return null;
}

export const flagSrc = (code: string) => `/iconos/banderas/${code}.svg`;
