/**
 * Conversión entre el formato que guarda el backend (`lib/blocks.ts`) y los
 * bloques de BlockNote. Funciones puras: no dependen del navegador.
 *
 * Correspondencia:
 *   paragraph ↔ paragraph            heading ↔ heading (1–3)
 *   list bullet/numbered/check ↔ bulletListItem / numberedListItem / checkListItem
 *   quote ↔ quote                    code ↔ codeBlock
 *   divider ↔ divider                table ↔ table
 *   image ↔ image                    file ↔ file
 *   video (YouTube/Vimeo/Loom) ↔ embed (propio)   video (archivo) ↔ video
 *   link ↔ bookmark (propio)         subpage ↔ subpage (propio)
 *   callout ↔ callout (propio)       span.pageId ↔ inline "pageMention" (propio)
 */
import { newBlockId, normalizeBlocks, safeHref, type CalloutTone, type Span, type WikiBlock } from "../blocks";

/** Forma JSON de un bloque de BlockNote (lo mínimo que usamos). */
export interface BNBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: BNBlock[];
}

type BNStyles = { bold?: true; italic?: true; underline?: true; strike?: true; code?: true };
type BNText = { type: "text"; text: string; styles: BNStyles };
type BNLink = { type: "link"; href: string; content: BNText[] };
type BNMention = { type: "pageMention"; props: { pageId: string; title: string } };
type BNInline = BNText | BNLink | BNMention;

export const EMBED_PATTERN = /(youtube\.com|youtu\.be|vimeo\.com|loom\.com)/i;

/* ---------- Del backend a BlockNote ---------- */

function stylesOf(s: Span): BNStyles {
  return {
    ...(s.bold && { bold: true }),
    ...(s.italic && { italic: true }),
    ...(s.underline && { underline: true }),
    ...(s.strike && { strike: true }),
    ...(s.code && { code: true }),
  };
}

export function spansToInline(data: { text: string; spans?: Span[] }): BNInline[] {
  const spans = data.spans ?? (data.text ? [{ text: data.text }] : []);
  return spans.map((s): BNInline => {
    if (s.pageId) return { type: "pageMention", props: { pageId: s.pageId, title: s.text } };
    const text: BNText = { type: "text", text: s.text, styles: stylesOf(s) };
    return s.href ? { type: "link", href: s.href, content: [text] } : text;
  });
}

const textCells = (cells: string[]) => cells.map((c) => [{ type: "text", text: c, styles: {} }]);

export function wikiToBlockNote(blocks: WikiBlock[]): BNBlock[] {
  return blocks.map((b): BNBlock => {
    const children = "children" in b.data && b.data.children ? wikiToBlockNote(b.data.children) : [];
    const base = { id: b.id, children };
    switch (b.type) {
      case "paragraph":
        return { ...base, type: "paragraph", content: spansToInline(b.data) };
      case "heading":
        return { ...base, type: "heading", props: { level: b.data.level }, content: spansToInline(b.data) };
      case "list":
        return {
          ...base,
          type: b.data.style === "numbered" ? "numberedListItem" : b.data.style === "check" ? "checkListItem" : "bulletListItem",
          ...(b.data.style === "check" && { props: { checked: b.data.checked ?? false } }),
          content: spansToInline(b.data),
        };
      case "quote":
        return { ...base, type: "quote", content: spansToInline(b.data) };
      case "callout":
        return { ...base, type: "callout", props: { emoji: b.data.emoji ?? "💡", tone: b.data.tone ?? "warning", title: b.data.title ?? "" }, content: spansToInline(b.data) };
      case "code":
        return { ...base, type: "codeBlock", props: { language: b.data.language ?? "text" }, content: b.data.text };
      case "divider":
        return { ...base, type: "divider" };
      case "table": {
        const rows = [...(b.data.columns.length ? [b.data.columns] : []), ...b.data.rows];
        const width = Math.max(1, ...rows.map((r) => r.length));
        const padded = rows.map((r) => [...r, ...Array(width - r.length).fill("")]);
        return {
          ...base,
          type: "table",
          content: { type: "tableContent", columnWidths: Array(width).fill(undefined), headerRows: b.data.columns.length ? 1 : undefined, rows: padded.map((r) => ({ cells: textCells(r) })) },
        };
      }
      case "image":
        return { ...base, type: "image", props: { url: b.data.url, caption: b.data.caption ?? "", name: b.data.alt ?? "" } };
      case "video":
        return EMBED_PATTERN.test(b.data.url)
          ? { ...base, type: "embed", props: { url: b.data.url, caption: b.data.caption ?? "" } }
          : { ...base, type: "video", props: { url: b.data.url, caption: b.data.caption ?? "", name: "" } };
      case "link":
        return { ...base, type: "bookmark", props: { url: b.data.url, title: b.data.title ?? "" } };
      case "file":
        return { ...base, type: "file", props: { url: b.data.url, name: b.data.name, caption: "" } };
      case "subpage":
        return { ...base, type: "subpage", props: { pageId: b.data.pageId, title: b.data.title ?? "" } };
    }
  });
}

/* ---------- De BlockNote al backend ---------- */

function inlineToSpans(content: unknown): Span[] {
  if (typeof content === "string") return content ? [{ text: content }] : [];
  if (!Array.isArray(content)) return [];
  const spans: Span[] = [];
  const pushText = (t: BNText, href?: string) => {
    const st = t.styles ?? {};
    const span: Span = {
      text: t.text,
      ...(st.bold && { bold: true }),
      ...(st.italic && { italic: true }),
      ...(st.underline && { underline: true }),
      ...(st.strike && { strike: true }),
      ...(st.code && { code: true }),
      ...(href && safeHref(href) && { href: safeHref(href) }),
    };
    // Une fragmentos contiguos con el mismo formato.
    const last = spans[spans.length - 1];
    if (last && !last.pageId && JSON.stringify({ ...last, text: "" }) === JSON.stringify({ ...span, text: "" })) last.text += span.text;
    else spans.push(span);
  };
  for (const item of content as BNInline[]) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "text") pushText(item);
    else if (item.type === "link") for (const t of item.content ?? []) pushText(t, item.href);
    else if (item.type === "pageMention" && item.props?.pageId) spans.push({ text: item.props.title || "Página", pageId: item.props.pageId });
  }
  return spans.filter((s) => s.text.length > 0);
}

/** Texto plano + spans solo si hay formato (así los bloques simples quedan como los del backend). */
function rich(content: unknown): { text: string; spans?: Span[] } {
  const spans = inlineToSpans(content);
  const text = spans.map((s) => s.text).join("");
  const formatted = spans.some((s) => Object.keys(s).length > 1);
  return { text, ...(formatted && { spans }) };
}

function cellText(cell: unknown): string {
  if (Array.isArray(cell)) return inlineToSpans(cell).map((s) => s.text).join("");
  if (cell && typeof cell === "object" && "content" in cell) return cellText((cell as { content: unknown }).content);
  return "";
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function blockNoteToWiki(blocks: BNBlock[]): WikiBlock[] {
  const out: WikiBlock[] = [];
  for (const b of blocks) {
    const id = b.id || newBlockId();
    const p = b.props ?? {};
    const kids = b.children?.length ? blockNoteToWiki(b.children) : undefined;
    const withKids = <T extends object>(data: T) => (kids?.length ? { ...data, children: kids } : data);
    switch (b.type) {
      case "paragraph":
        out.push({ id, type: "paragraph", data: withKids(rich(b.content)) });
        break;
      case "heading": {
        const level = p.level === 2 || p.level === 3 ? p.level : p.level === 1 ? 1 : 3;
        out.push({ id, type: "heading", data: { ...rich(b.content), level } });
        if (kids) out.push(...kids);
        break;
      }
      case "bulletListItem":
      case "toggleListItem":
        out.push({ id, type: "list", data: withKids({ ...rich(b.content), style: "bullet" as const }) });
        break;
      case "numberedListItem":
        out.push({ id, type: "list", data: withKids({ ...rich(b.content), style: "numbered" as const }) });
        break;
      case "checkListItem":
        out.push({ id, type: "list", data: withKids({ ...rich(b.content), style: "check" as const, checked: p.checked === true }) });
        break;
      case "quote":
        out.push({ id, type: "quote", data: withKids(rich(b.content)) });
        break;
      case "callout": {
        const tone = (["info", "success", "warning", "danger"] as CalloutTone[]).find((t) => t === p.tone) ?? "warning";
        out.push({ id, type: "callout", data: withKids({ ...rich(b.content), emoji: str(p.emoji) || "💡", tone, ...(str(p.title) && { title: str(p.title) }) }) });
        break;
      }
      case "codeBlock":
        out.push({ id, type: "code", data: { text: inlineToSpans(b.content).map((s) => s.text).join(""), ...(str(p.language) && str(p.language) !== "text" && { language: str(p.language) }) } });
        break;
      case "divider":
        out.push({ id, type: "divider", data: {} });
        break;
      case "table": {
        const content = b.content as { rows?: { cells?: unknown[] }[]; headerRows?: number } | undefined;
        const rows = (content?.rows ?? []).map((r) => (r.cells ?? []).map(cellText));
        const header = (content?.headerRows ?? 0) > 0 && rows.length > 0;
        out.push({ id, type: "table", data: { columns: header ? rows[0] : [], rows: header ? rows.slice(1) : rows } });
        break;
      }
      case "image": {
        const url = safeHref(p.url);
        if (url) out.push({ id, type: "image", data: { url, ...(str(p.caption) && { caption: str(p.caption) }), ...(str(p.name) && { alt: str(p.name) }), ...(fileIdOf(url) && { fileId: fileIdOf(url) }) } });
        break;
      }
      case "video":
      case "embed": {
        const url = safeHref(p.url);
        if (url) out.push({ id, type: "video", data: { url, ...(str(p.caption) && { caption: str(p.caption) }), ...(fileIdOf(url) && { fileId: fileIdOf(url) }) } });
        break;
      }
      case "bookmark": {
        const url = safeHref(p.url);
        if (url) out.push({ id, type: "link", data: { url, ...(str(p.title) && { title: str(p.title) }) } });
        break;
      }
      case "file":
      case "audio": {
        const url = safeHref(p.url);
        if (url) out.push({ id, type: "file", data: { url, name: str(p.name) || "Archivo", ...(fileIdOf(url) && { fileId: fileIdOf(url) }) } });
        break;
      }
      case "subpage":
        if (str(p.pageId)) out.push({ id, type: "subpage", data: { pageId: str(p.pageId), ...(str(p.title) && { title: str(p.title) }) } });
        break;
      default: {
        const text = rich(b.content);
        if (text.text) out.push({ id, type: "paragraph", data: text });
        if (kids) out.push(...kids);
      }
    }
  }
  // Pasa por la normalización para garantizar que lo guardado sea seguro de mostrar.
  return normalizeBlocks(out);
}

/** Id del archivo si la URL es de un archivo subido a la wiki (`/archivos/:id`). */
export function fileIdOf(url: string): string | undefined {
  return url.match(/^\/archivos\/([\w-]+)$/)?.[1];
}

/** Quita bloques vacíos al final (BlockNote siempre deja un párrafo vacío). */
export function trimTrailingEmpty(blocks: WikiBlock[]): WikiBlock[] {
  const out = [...blocks];
  while (out.length && out[out.length - 1].type === "paragraph" && !(out[out.length - 1].data as { text: string }).text && !(out[out.length - 1].data as { children?: unknown[] }).children?.length) out.pop();
  return out;
}
