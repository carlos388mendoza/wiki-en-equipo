import Image from "next/image";
import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import type { Block, PageSummary, TextSpan } from "@/lib/types";

/**
 * Vista de solo lectura de los bloques de una página.
 * El editor por bloques (fase 3) reemplazará esta vista cuando el usuario pueda editar.
 */

function Span({ span }: { span: TextSpan }) {
  let node: React.ReactNode = span.text;
  if (span.code) node = <code className="rounded bg-paper px-1 py-0.5 text-[0.9em]">{node}</code>;
  if (span.bold) node = <strong className="font-semibold">{node}</strong>;
  if (span.italic) node = <em>{node}</em>;
  if (span.underline) node = <u>{node}</u>;

  if (span.href) {
    return (
      <a href={span.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-baseline gap-0.5 text-basil underline decoration-basil/40 underline-offset-2 hover:decoration-basil">
        {node}
        <ExternalLink size={12} className="self-center" aria-label="(abre un sitio externo)" />
      </a>
    );
  }
  if (span.pageId) {
    return (
      <Link href={`/paginas/${span.pageId}`} className="inline-flex items-baseline gap-0.5 font-medium text-ink underline decoration-line decoration-2 underline-offset-2 hover:decoration-basil">
        <FileText size={13} className="self-center text-muted" aria-hidden />
        {node}
      </Link>
    );
  }
  return <>{node}</>;
}

function Rich({ content }: { content: TextSpan[] }) {
  return <>{content.map((s, i) => <Span key={i} span={s} />)}</>;
}

function videoSrc(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export function BlockRenderer({ blocks, subpages }: { blocks: Block[]; subpages: Record<string, PageSummary> }) {
  if (blocks.length === 0) {
    return <p className="text-muted">Esta página todavía no tiene contenido.</p>;
  }
  return (
    <div className="prose-wiki flex flex-col gap-4">
      {blocks.map((b) => {
        switch (b.type) {
          case "parrafo":
            return <p key={b.id}><Rich content={b.content} /></p>;
          case "titulo": {
            const cls = { 1: "text-3xl mt-6", 2: "text-2xl mt-5", 3: "text-xl mt-3" }[b.level];
            const Tag = (`h${b.level + 1}`) as "h2" | "h3" | "h4";
            return <Tag key={b.id} className={`font-display font-semibold leading-tight ${cls}`}><Rich content={b.content} /></Tag>;
          }
          case "lista": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={b.id} className={`flex flex-col gap-1 pl-6 ${b.ordered ? "list-decimal" : "list-disc"} marker:text-muted`}>
                {b.items.map((item, i) => <li key={i}><Rich content={item} /></li>)}
              </Tag>
            );
          }
          case "cita":
            return <blockquote key={b.id} className="border-l-4 border-basil pl-4 italic text-muted"><Rich content={b.content} /></blockquote>;
          case "aviso":
            return (
              <div key={b.id} className="flex gap-3 rounded-lg bg-saffron-soft px-4 py-3">
                <span aria-hidden>{b.emoji}</span>
                <p><Rich content={b.content} /></p>
              </div>
            );
          case "imagen":
            return (
              <figure key={b.id} className="flex flex-col gap-2">
                <Image src={b.url} alt={b.alt} width={b.width} height={b.height} sizes="(min-width: 768px) 680px, 100vw" className="h-auto w-full rounded-lg" />
                {b.caption && <figcaption className="text-sm text-muted">{b.caption}</figcaption>}
              </figure>
            );
          case "video":
            return (
              <figure key={b.id} className="flex flex-col gap-2">
                <div className="aspect-video overflow-hidden rounded-lg bg-ink">
                  <iframe src={videoSrc(b.url)} title={b.caption ?? "Video"} className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
                {b.caption && <figcaption className="text-sm text-muted">{b.caption}</figcaption>}
              </figure>
            );
          case "tabla":
            return (
              <div key={b.id} className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-max text-left text-sm">
                  <thead className="bg-paper">
                    <tr>{b.header.map((h, i) => <th key={i} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className="border-t border-line">
                        {row.map((cell, c) => <td key={c} className="px-3 py-2">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "subpagina": {
            const sub = subpages[b.pageId];
            if (!sub) return null; // sin acceso o eliminada
            return (
              <Link key={b.id} href={`/paginas/${sub.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-basil hover:bg-basil-soft">
                <span aria-hidden>{sub.emoji}</span>
                <span className="font-medium">{sub.title}</span>
                <span className="ml-auto text-xs text-muted">Subpágina</span>
              </Link>
            );
          }
          case "separador":
            return <hr key={b.id} className="border-line" />;
        }
      })}
    </div>
  );
}
