import { prisma } from "../models/client.js";

/** Minúsculas y sin tildes, para buscar "credito" y encontrar "Crédito". */
export const foldText = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Campos de los bloques que no son texto para leer (ids, enlaces, colores, medidas...).
const SKIP_KEYS = new Set(["id", "type", "url", "href", "src", "fileId", "pageId", "mimeType", "sizeBytes", "color", "ink", "tone", "style", "language", "level", "width", "height", "checked", "emoji", "icon", "shape", "credit", "creditUrl"]);
const MAX_TEXT = 100_000;

/**
 * Texto legible del contenido de una página: texto de los bloques, títulos, leyendas, nombres de
 * archivo y celdas de tablas, incluidos los bloques anidados. Ignora las llaves del JSON.
 */
export function contentText(content: unknown): string {
  const parts: string[] = [];
  let size = 0;
  const visit = (value: unknown) => {
    if (size >= MAX_TEXT) return;
    if (typeof value === "string") { const text = value.trim(); if (text) { parts.push(text); size += text.length + 1; } return; }
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    if (typeof value !== "object" || value === null) return;
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      // `text` ya es la unión de los `spans` (texto con formato): no se repite.
      if (SKIP_KEYS.has(key) || (key === "spans" && typeof record.text === "string")) continue;
      visit(child);
    }
  };
  visit(content);
  return parts.join("\n").slice(0, MAX_TEXT);
}

const parseContent = (contentJson: string) => { try { return JSON.parse(contentJson) as unknown; } catch { return []; } };

/** Valor de la columna `searchText`. Nunca queda vacío porque toda página tiene título. */
export const pageSearchText = (title: string, contentJson: string) => foldText(`${title}\n${contentText(parseContent(contentJson))}`).replace(/\s+/g, " ").trim();

/** Palabras de la búsqueda, ya normalizadas (máximo 8). */
export const searchTerms = (query: string) => [...new Set(foldText(query).split(/\s+/).filter(Boolean))].slice(0, 8);

/**
 * Fragmento del contenido alrededor de la primera palabra encontrada, con el texto original
 * (tildes y mayúsculas). `null` si las palabras solo están en el título.
 */
export function searchExcerpt(contentJson: string, terms: string[], radius = 70): string | null {
  const text = contentText(parseContent(contentJson)).replace(/\s+/g, " ");
  // Se normaliza letra por letra para conservar la posición en el texto original.
  const chars = [...text];
  const folded = chars.map((char) => foldText(char));
  const offsets: number[] = [];
  let joined = "";
  folded.forEach((part, index) => { for (let i = 0; i < part.length; i++) offsets.push(index); joined += part; });
  for (const term of terms) {
    const at = joined.indexOf(term);
    if (at < 0) continue;
    const start = Math.max(0, offsets[at] - radius);
    const end = Math.min(chars.length, offsets[at + term.length - 1] + 1 + radius);
    return `${start > 0 ? "…" : ""}${chars.slice(start, end).join("").trim()}${end < chars.length ? "…" : ""}`;
  }
  return null;
}

/** Calcula `searchText` de las páginas que aún no lo tienen (las anteriores a la migración). */
export async function backfillSearchText(batchSize = 200) {
  let updated = 0;
  for (;;) {
    const pages = await prisma.page.findMany({ where: { searchText: "" }, select: { id: true, title: true, contentJson: true }, take: batchSize });
    if (!pages.length) return updated;
    // SQL directo: no debe cambiar updatedAt (ordena "Recientes").
    for (const page of pages) await prisma.$executeRaw`UPDATE "Page" SET "searchText" = ${pageSearchText(page.title, page.contentJson) || " "} WHERE "id" = ${page.id}`;
    updated += pages.length;
  }
}
