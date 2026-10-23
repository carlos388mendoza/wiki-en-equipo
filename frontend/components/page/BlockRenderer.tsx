import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileText, Link2, Paperclip } from "lucide-react";
import type { CalloutTone, Span, WikiBlock } from "@/lib/blocks";
import { formatBytes } from "@/lib/format";
import { isDirectVideo, videoEmbed } from "@/lib/embeds";
import { isOptimizableImage } from "@/lib/images";
import type { PageSummary } from "@/lib/types";
import { PageIcon } from "../ui/PageIcon";

/**
 * Vista de solo lectura de los bloques de una página.
 * El editor por bloques (BlockNote) reemplaza esta vista cuando el usuario edita.
 */

const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

function SpanView({ span }: { span: Span }) {
  let node: React.ReactNode = span.text;
  if (span.code) node = <code className="rounded bg-paper px-1 py-0.5 text-[0.9em]">{node}</code>;
  if (span.bold) node = <strong className="font-semibold">{node}</strong>;
  if (span.italic) node = <em>{node}</em>;
  if (span.underline) node = <u>{node}</u>;
  if (span.strike) node = <s>{node}</s>;

  if (span.pageId) {
    return (
      <Link href={`/paginas/${span.pageId}`} className="inline-flex items-baseline gap-0.5 font-medium text-ink underline decoration-line decoration-2 underline-offset-2 hover:decoration-brand">
        <FileText size={13} className="self-center text-muted" aria-hidden />
        {node}
      </Link>
    );
  }
  if (span.href) {
    if (!isExternal(span.href)) return <Link href={span.href} className="text-sky underline underline-offset-2">{node}</Link>;
    return (
      <a href={span.href} target="_blank" rel="noopener noreferrer" className="text-sky underline decoration-sky/40 underline-offset-2 hover:decoration-sky">
        {node}
        <ExternalLink size={12} className="ml-0.5 inline align-[-1px]" aria-label="(abre un sitio externo)" />
      </a>
    );
  }
  return <>{node}</>;
}

function Rich({ data }: { data: { text: string; spans?: Span[] } }) {
  const spans = data.spans ?? [{ text: data.text }];
  return <>{spans.map((s, i) => <SpanView key={i} span={s} />)}</>;
}

const toneClass: Record<CalloutTone, string> = {
  info: "bg-sky-soft",
  success: "bg-brand-soft",
  warning: "bg-sun-soft",
  danger: "bg-danger-soft",
};

function Children({ blocks, subpages }: { blocks?: WikiBlock[]; subpages: Record<string, PageSummary> }) {
  if (!blocks?.length) return null;
  return <div className="mt-2 flex flex-col gap-3 pl-6"><Blocks blocks={blocks} subpages={subpages} /></div>;
}

/** Agrupa elementos de lista consecutivos del mismo estilo. */
function group(blocks: WikiBlock[]) {
  const out: (WikiBlock | { id: string; type: "list-group"; style: "bullet" | "numbered" | "check"; items: Extract<WikiBlock, { type: "list" }>[] })[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (b.type === "list") {
      if (last?.type === "list-group" && last.style === b.data.style) last.items.push(b);
      else out.push({ id: `g-${b.id}`, type: "list-group", style: b.data.style, items: [b] });
    } else out.push(b);
  }
  return out;
}

function Blocks({ blocks, subpages }: { blocks: WikiBlock[]; subpages: Record<string, PageSummary> }) {
  return (
    <>
      {group(blocks).map((b) => {
        switch (b.type) {
          case "list-group": {
            if (b.style === "check") {
              return (
                <ul key={b.id} className="flex flex-col gap-1">
                  {b.items.map((item) => (
                    <li key={item.id} className="flex flex-col">
                      <span className="flex items-start gap-2">
                        <input type="checkbox" checked={item.data.checked ?? false} readOnly disabled className="mt-1.5 accent-brand" aria-label={item.data.checked ? "Completado" : "Pendiente"} />
                        <span className={item.data.checked ? "text-muted line-through" : ""}><Rich data={item.data} /></span>
                      </span>
                      <Children blocks={item.data.children} subpages={subpages} />
                    </li>
                  ))}
                </ul>
              );
            }
            const Tag = b.style === "numbered" ? "ol" : "ul";
            return (
              <Tag key={b.id} className={`flex flex-col gap-1 pl-6 ${b.style === "numbered" ? "list-decimal" : "list-disc"} marker:text-muted`}>
                {b.items.map((item) => (
                  <li key={item.id}>
                    <span className="whitespace-pre-line"><Rich data={item.data} /></span>
                    <Children blocks={item.data.children} subpages={subpages} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <div key={b.id}>
                <p className="whitespace-pre-line"><Rich data={b.data} /></p>
                <Children blocks={b.data.children} subpages={subpages} />
              </div>
            );
          case "heading": {
            const cls = { 1: "text-3xl mt-6", 2: "text-2xl mt-5", 3: "text-xl mt-3" }[b.data.level];
            const Tag = (`h${b.data.level + 1}`) as "h2" | "h3" | "h4";
            return <Tag key={b.id} className={`font-display font-semibold leading-tight ${cls}`}><Rich data={b.data} /></Tag>;
          }
          case "quote":
            return <blockquote key={b.id} className="whitespace-pre-line border-l-4 border-brand pl-4 italic text-muted"><Rich data={b.data} /></blockquote>;
          case "callout":
            return (
              <div key={b.id} className={`flex gap-3 rounded-lg px-4 py-3 ${toneClass[b.data.tone ?? "warning"]}`}>
                <span aria-hidden>{b.data.emoji ?? "💡"}</span>
                <div className="min-w-0">
                  {b.data.title && <p className="font-semibold">{b.data.title}</p>}
                  <p className="whitespace-pre-line"><Rich data={b.data} /></p>
                  <Children blocks={b.data.children} subpages={subpages} />
                </div>
              </div>
            );
          case "code":
            return (
              <pre key={b.id} className="overflow-x-auto rounded-lg bg-ink px-4 py-3 text-sm text-on-ink">
                <code>{b.data.text}</code>
              </pre>
            );
          case "divider":
            return <hr key={b.id} className="border-line" />;
          case "image": {
            const { url, alt, caption, width, height } = b.data;
            return (
              <figure key={b.id} className="flex flex-col gap-2">
                <Image
                  src={url}
                  alt={alt ?? caption ?? ""}
                  width={width ?? 1200}
                  height={height ?? 800}
                  sizes="(min-width: 768px) 680px, 100vw"
                  unoptimized={!isOptimizableImage(url)}
                  className="h-auto w-full rounded-lg bg-line"
                />
                {caption && <figcaption className="text-sm text-muted">{caption}</figcaption>}
              </figure>
            );
          }
          case "video": {
            const embed = videoEmbed(b.data.url);
            return (
              <figure key={b.id} className="flex flex-col gap-2">
                {embed ? (
                  <div className="aspect-video overflow-hidden rounded-lg bg-shade">
                    <iframe src={embed} title={b.data.caption ?? "Video"} className="h-full w-full" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
                  </div>
                ) : isDirectVideo(b.data.url) ? (
                  <video src={b.data.url} controls preload="metadata" className="w-full rounded-lg bg-shade" />
                ) : (
                  <a href={b.data.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sky underline">
                    Ver video <ExternalLink size={14} aria-label="(abre un sitio externo)" />
                  </a>
                )}
                {b.data.caption && <figcaption className="text-sm text-muted">{b.data.caption}</figcaption>}
              </figure>
            );
          }
          case "link": {
            const external = isExternal(b.data.url);
            let host = b.data.url;
            try { host = new URL(b.data.url).hostname.replace(/^www\./, ""); } catch { /* ruta interna */ }
            return (
              <a key={b.id} href={b.data.url} {...(external && { target: "_blank", rel: "noopener noreferrer" })} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-brand hover:bg-brand-soft">
                <Link2 size={16} className="shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.data.title ?? host}</span>
                  <span className="block truncate text-xs text-muted">{host}</span>
                </span>
                {external && <ExternalLink size={14} className="shrink-0 text-muted" aria-label="(abre un sitio externo)" />}
              </a>
            );
          }
          case "file":
            return (
              <a key={b.id} href={b.data.url} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-brand hover:bg-brand-soft">
                <Paperclip size={16} className="shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{b.data.name}</span>
                {b.data.sizeBytes !== undefined && <span className="text-xs text-muted">{formatBytes(b.data.sizeBytes)}</span>}
              </a>
            );
          case "table":
            return (
              <div key={b.id} className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-max text-left text-sm">
                  {b.data.columns.length > 0 && (
                    <thead className="bg-paper">
                      <tr>{b.data.columns.map((h, i) => <th key={i} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                    </thead>
                  )}
                  <tbody>
                    {b.data.rows.map((row, r) => (
                      <tr key={r} className="border-t border-line">
                        {row.map((cell, c) => <td key={c} className="px-3 py-2 whitespace-pre-line">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "subpage": {
            const sub = subpages[b.data.pageId];
            if (!sub) return null; // sin acceso o en la papelera
            return (
              <Link key={b.id} href={`/paginas/${sub.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-brand hover:bg-brand-soft">
                <PageIcon icon={sub.icon} size={18} />
                <span className="font-medium">{sub.title}</span>
                <span className="ml-auto text-xs text-muted">Subpágina</span>
              </Link>
            );
          }
        }
      })}
    </>
  );
}

export function BlockRenderer({ blocks, subpages }: { blocks: WikiBlock[]; subpages: Record<string, PageSummary> }) {
  if (blocks.length === 0) {
    return <p className="text-muted">Esta página todavía no tiene contenido.</p>;
  }
  return (
    <div className="prose-wiki flex flex-col gap-4">
      <Blocks blocks={blocks} subpages={subpages} />
    </div>
  );
}
