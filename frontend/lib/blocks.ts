/**
 * Formato de contenido que el frontend guarda en el backend.
 *
 * El backend acepta `content` como JSON libre. Usamos bloques `{ id, type, data }`
 * compatibles con `PageBlock` de `shared/types`. Las plantillas del backend usan
 * `heading`, `paragraph`, `callout` y `table` con `data.text`; aquí se agregan
 * `data.spans` (texto con formato) y tipos extra que el editor necesita.
 * Los bloques anidados van en `data.children`.
 */
import { sanitizeIcon } from "./icons";
import type { Background, ShapePattern } from "./types";

const SHAPES: ShapePattern[] = ["puntos", "rayas", "cuadricula", "zigzag", "circulos"];

/** Fragmento de texto con formato. */
export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  /** Enlace externo (se muestra con icono). */
  href?: string;
  /** Enlace a otra página de la wiki. */
  pageId?: string;
}

type Rich = { text: string; spans?: Span[]; children?: WikiBlock[] };

export type CalloutTone = "info" | "success" | "warning" | "danger";

export type WikiBlock =
  | { id: string; type: "paragraph"; data: Rich }
  | { id: string; type: "heading"; data: Rich & { level: 1 | 2 | 3 } }
  | { id: string; type: "callout"; data: Rich & { title?: string; emoji?: string; tone?: CalloutTone } }
  | { id: string; type: "list"; data: Rich & { style: "bullet" | "numbered" | "check"; checked?: boolean } }
  | { id: string; type: "quote"; data: Rich }
  | { id: string; type: "code"; data: { text: string; language?: string } }
  | { id: string; type: "divider"; data: Record<string, never> }
  | { id: string; type: "table"; data: { columns: string[]; rows: string[][] } }
  | { id: string; type: "image"; data: { url: string; alt?: string; caption?: string; width?: number; height?: number; fileId?: string } }
  | { id: string; type: "video"; data: { url: string; caption?: string; fileId?: string } }
  | { id: string; type: "link"; data: { url: string; title?: string } }
  | { id: string; type: "file"; data: { url: string; name: string; fileId?: string; mimeType?: string; sizeBytes?: number } }
  | { id: string; type: "subpage"; data: { pageId: string; title?: string } };

export type WikiBlockType = WikiBlock["type"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const optStr = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
const optNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * Ruta interna de la wiki (`/algo`). Rechaza `//dominio` y `/\dominio`, que el
 * navegador trata como otro sitio, y caracteres de control.
 */
export function isInternalPath(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/[\\\u0000-\u001f]/.test(value);
}

/** Solo enlaces http(s), mailto y rutas internas: evita `javascript:` y similares. */
export function safeHref(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  const value = url.trim();
  if (isInternalPath(value)) return value;
  if (value.startsWith("/")) return undefined;
  try {
    const parsed = new URL(value);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeSpans(value: unknown): Span[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const spans = value.filter(isObj).map((s): Span => ({
    text: str(s.text),
    ...(s.bold === true && { bold: true }),
    ...(s.italic === true && { italic: true }),
    ...(s.underline === true && { underline: true }),
    ...(s.strike === true && { strike: true }),
    ...(s.code === true && { code: true }),
    ...(safeHref(s.href) && { href: safeHref(s.href) }),
    ...(optStr(s.pageId) && { pageId: optStr(s.pageId) }),
  }));
  return spans.length ? spans : undefined;
}

function rich(data: Record<string, unknown>): Rich {
  const spans = normalizeSpans(data.spans);
  const children = Array.isArray(data.children) ? normalizeBlocks(data.children) : undefined;
  return {
    text: spans ? spans.map((s) => s.text).join("") : str(data.text),
    ...(spans && { spans }),
    ...(children?.length && { children }),
  };
}

let counter = 0;
export const newBlockId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}-${counter++}`;

/** Convierte lo que venga del backend en bloques seguros de mostrar. Descarta lo que no entiende. */
export function normalizeBlocks(value: unknown): WikiBlock[] {
  if (!Array.isArray(value)) return [];
  const out: WikiBlock[] = [];
  for (const raw of value) {
    if (!isObj(raw)) continue;
    const id = str(raw.id) || newBlockId();
    const data = isObj(raw.data) ? raw.data : {};
    switch (raw.type) {
      case "paragraph":
      case "quote":
        out.push({ id, type: raw.type, data: rich(data) });
        break;
      case "heading": {
        const level = data.level === 2 || data.level === 3 ? data.level : 1;
        out.push({ id, type: "heading", data: { ...rich(data), level } });
        break;
      }
      case "callout": {
        const tone = (["info", "success", "warning", "danger"] as const).find((t) => t === data.tone);
        out.push({ id, type: "callout", data: { ...rich(data), ...(optStr(data.title) && { title: optStr(data.title) }), ...(optStr(data.emoji) && { emoji: optStr(data.emoji) }), ...(tone && { tone }) } });
        break;
      }
      case "list": {
        const style = data.style === "numbered" || data.style === "check" ? data.style : "bullet";
        out.push({ id, type: "list", data: { ...rich(data), style, ...(style === "check" && { checked: data.checked === true }) } });
        break;
      }
      case "code":
        out.push({ id, type: "code", data: { text: str(data.text), ...(optStr(data.language) && { language: optStr(data.language) }) } });
        break;
      case "divider":
        out.push({ id, type: "divider", data: {} });
        break;
      case "table": {
        const columns = Array.isArray(data.columns) ? data.columns.map((c) => str(c)) : [];
        const rows = Array.isArray(data.rows) ? data.rows.filter(Array.isArray).map((r) => (r as unknown[]).map((c) => str(c))) : [];
        if (columns.length || rows.length) out.push({ id, type: "table", data: { columns, rows } });
        break;
      }
      case "image": {
        const url = safeHref(data.url);
        if (url) out.push({ id, type: "image", data: { url, alt: optStr(data.alt), caption: optStr(data.caption), width: optNum(data.width), height: optNum(data.height), fileId: optStr(data.fileId) } });
        break;
      }
      case "video": {
        const url = safeHref(data.url);
        if (url) out.push({ id, type: "video", data: { url, caption: optStr(data.caption), fileId: optStr(data.fileId) } });
        break;
      }
      case "link": {
        const url = safeHref(data.url);
        if (url) out.push({ id, type: "link", data: { url, title: optStr(data.title) } });
        break;
      }
      case "file": {
        const url = safeHref(data.url);
        if (url) out.push({ id, type: "file", data: { url, name: str(data.name, "Archivo"), fileId: optStr(data.fileId), mimeType: optStr(data.mimeType), sizeBytes: optNum(data.sizeBytes) } });
        break;
      }
      case "subpage":
        if (optStr(data.pageId)) out.push({ id, type: "subpage", data: { pageId: str(data.pageId), title: optStr(data.title) } });
        break;
      default:
        // Tipo desconocido: si trae texto, se muestra como párrafo para no perder información.
        if (typeof data.text === "string" && data.text) out.push({ id, type: "paragraph", data: rich(data) });
    }
  }
  return out;
}

/** Texto plano de una lista de bloques (para resúmenes y búsqueda local). */
export function blocksToText(blocks: WikiBlock[]): string {
  return blocks
    .map((b) => {
      const d = b.data as Record<string, unknown>;
      const own = typeof d.text === "string" ? d.text : b.type === "table" ? [b.data.columns, ...b.data.rows].flat().join(" ") : "";
      const kids = Array.isArray(d.children) ? blocksToText(d.children as WikiBlock[]) : "";
      return [own, kids].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

/** Páginas enlazadas desde el contenido (subpáginas y menciones), en orden y sin repetir. */
export function linkedPageIds(blocks: WikiBlock[]): string[] {
  const ids: string[] = [];
  const visit = (list: WikiBlock[]) => {
    for (const b of list) {
      if (b.type === "subpage") ids.push(b.data.pageId);
      const d = b.data as Record<string, unknown>;
      if (Array.isArray(d.spans)) for (const s of d.spans as Span[]) if (s.pageId) ids.push(s.pageId);
      if (Array.isArray(d.children)) visit(d.children as WikiBlock[]);
    }
  };
  visit(blocks);
  return [...new Set(ids)];
}

/* ---------- Fondo e icono ---------- */

/**
 * Lo que se guarda en `background`: el fondo (o ninguno). El icono tiene su propio campo (`icon`);
 * las páginas y plantillas anteriores lo guardaban aquí dentro, por eso `icon` sigue siendo opcional.
 */
export type StoredAppearance = (Background | { type: "none" }) & { icon?: string };

const CSS_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Un degradado sin url() ni otras funciones que carguen recursos.
const CSS_GRADIENT = /^(?!.*(?:url|image|expression)\s*\()(linear|radial)-gradient\([#%(),.\s\w-]+\)$/i;

export function parseAppearance(value: unknown): { background: Background | null; icon: string | null } {
  let v = value;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { v = null; }
  }
  if (!isObj(v)) return { background: null, icon: null };
  const icon = sanitizeIcon(v.icon);
  let background: Background | null = null;
  if (v.type === "color" && typeof v.value === "string" && CSS_COLOR.test(v.value)) background = { type: "color", value: v.value };
  else if (v.type === "gradient" && typeof v.value === "string" && CSS_GRADIENT.test(v.value)) background = { type: "gradient", value: v.value };
  else if (v.type === "image" && safeHref(v.url)) background = { type: "image", url: safeHref(v.url)!, credit: optStr(v.credit), creditUrl: safeHref(v.creditUrl) };
  else if (v.type === "shapes" && SHAPES.includes(v.shape as ShapePattern) && typeof v.color === "string" && CSS_COLOR.test(v.color) && typeof v.ink === "string" && CSS_COLOR.test(v.ink)) background = { type: "shapes", shape: v.shape as ShapePattern, color: v.color, ink: v.ink };
  else if (v.type === "pattern" && typeof v.emoji === "string" && typeof v.color === "string" && CSS_COLOR.test(v.color)) background = { type: "pattern", emoji: v.emoji.slice(0, 16), color: v.color };
  return { background, icon };
}

export function toStoredAppearance(background: Background | null): StoredAppearance {
  return background ?? { type: "none" };
}

/** Separa el icono que traen las plantillas por defecto dentro del fondo. */
export function splitAppearance(stored: StoredAppearance): { background: StoredAppearance; icon: string | null } {
  const { icon, ...background } = stored;
  return { background: background as StoredAppearance, icon: sanitizeIcon(icon) };
}

/** Parsea `contentJson` (texto) o un arreglo ya parseado. */
export function parseContent(value: unknown): WikiBlock[] {
  if (typeof value === "string") {
    try { return normalizeBlocks(JSON.parse(value)); } catch { return []; }
  }
  return normalizeBlocks(value);
}
