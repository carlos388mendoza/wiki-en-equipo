"use client";

import { useState } from "react";
import Link from "next/link";
import { BlockNoteSchema, createCodeBlockSpec, createHeadingBlockSpec, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { ExternalLink, FileText, Link2, PlayCircle } from "lucide-react";
import { videoEmbed } from "@/lib/embeds";

/** Bloques propios del editor de la wiki (además de los de BlockNote). */

const calloutEmojis = ["💡", "📣", "⚠️", "✅", "📌", "🎯", "🍽️", "❗"];
const tones = { info: "Azul", success: "Rojo", warning: "Amarillo", danger: "Alerta" } as const;
const toneBg: Record<string, string> = { info: "var(--color-sky-soft)", success: "var(--color-brand-soft)", warning: "var(--color-sun-soft)", danger: "var(--color-danger-soft)" };

const Callout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      emoji: { default: "💡" },
      tone: { default: "warning", values: ["info", "success", "warning", "danger"] as const },
      title: { default: "" },
    },
    content: "inline",
  },
  {
    render: ({ block, editor, contentRef }) => {
      const [menu, setMenu] = useState(false);
      return (
        <div className="wiki-callout" style={{ background: toneBg[block.props.tone] }}>
          <div className="relative" contentEditable={false}>
            <button type="button" className="wiki-callout-emoji" aria-label="Cambiar icono y color del aviso" onClick={() => setMenu(!menu)}>
              {block.props.emoji}
            </button>
            {menu && editor.isEditable && (
              <div className="wiki-popover">
                <div className="flex flex-wrap gap-1">
                  {calloutEmojis.map((e) => (
                    <button key={e} type="button" className="wiki-popover-item" onClick={() => { editor.updateBlock(block, { props: { emoji: e } }); setMenu(false); }}>{e}</button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Object.keys(tones) as (keyof typeof tones)[]).map((t) => (
                    <button key={t} type="button" className="wiki-popover-chip" style={{ background: toneBg[t] }} onClick={() => { editor.updateBlock(block, { props: { tone: t } }); setMenu(false); }}>{tones[t]}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              contentEditable={false}
              className="wiki-callout-title"
              placeholder="Título del aviso (opcional)"
              value={block.props.title}
              readOnly={!editor.isEditable}
              onChange={(e) => editor.updateBlock(block, { props: { title: e.target.value } })}
            />
            <div ref={contentRef} className="wiki-callout-body" />
          </div>
        </div>
      );
    },
  },
);

const Subpage = createReactBlockSpec(
  { type: "subpage", propSchema: { pageId: { default: "" }, title: { default: "" } }, content: "none" },
  {
    render: ({ block }) => (
      <Link href={`/paginas/${block.props.pageId}`} className="wiki-card" contentEditable={false}>
        <FileText size={16} aria-hidden />
        <span className="flex-1 truncate font-medium">{block.props.title || "Subpágina"}</span>
        <span className="text-xs text-muted">Subpágina</span>
      </Link>
    ),
  },
);

function UrlInput({ placeholder, onSubmit, hint }: { placeholder: string; onSubmit: (url: string) => void; hint: string }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      contentEditable={false}
      className="wiki-url-input"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const url = new URL(value.trim());
          if (!["http:", "https:"].includes(url.protocol)) throw new Error();
          onSubmit(url.toString());
        } catch {
          setError("Escribe un enlace completo que empiece con https://");
        }
      }}
    >
      <input value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} placeholder={placeholder} aria-label={placeholder} />
      <button type="submit">Insertar</button>
      <p className={error ? "text-danger" : ""}>{error || hint}</p>
    </form>
  );
}

const Embed = createReactBlockSpec(
  { type: "embed", propSchema: { url: { default: "" }, caption: { default: "" } }, content: "none" },
  {
    render: ({ block, editor }) => {
      if (!block.props.url) {
        return editor.isEditable ? (
          <UrlInput placeholder="Enlace de YouTube, Vimeo o Loom" hint="El video se mostrará dentro de la página." onSubmit={(url) => editor.updateBlock(block, { props: { url } })} />
        ) : null;
      }
      const src = videoEmbed(block.props.url);
      return (
        <figure className="wiki-embed" contentEditable={false}>
          {src ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-shade">
              <iframe src={src} title={block.props.caption || "Video"} className="h-full w-full" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          ) : (
            <a href={block.props.url} target="_blank" rel="noopener noreferrer" className="wiki-card"><PlayCircle size={16} aria-hidden /> Ver video <ExternalLink size={14} aria-label="(abre un sitio externo)" /></a>
          )}
          <input className="wiki-caption" placeholder="Agrega una descripción" value={block.props.caption} readOnly={!editor.isEditable} onChange={(e) => editor.updateBlock(block, { props: { caption: e.target.value } })} />
        </figure>
      );
    },
  },
);

const Bookmark = createReactBlockSpec(
  { type: "bookmark", propSchema: { url: { default: "" }, title: { default: "" } }, content: "none" },
  {
    render: ({ block, editor }) => {
      if (!block.props.url) {
        return editor.isEditable ? (
          <UrlInput placeholder="https://…" hint="Enlace a un sitio externo. Se mostrará con un icono de sitio externo." onSubmit={(url) => editor.updateBlock(block, { props: { url } })} />
        ) : null;
      }
      let host = block.props.url;
      try { host = new URL(block.props.url).hostname.replace(/^www\./, ""); } catch { /* sin cambios */ }
      return (
        <div className="wiki-card" contentEditable={false}>
          <Link2 size={16} aria-hidden />
          <div className="min-w-0 flex-1">
            <input className="wiki-bookmark-title" placeholder={host} value={block.props.title} readOnly={!editor.isEditable} onChange={(e) => editor.updateBlock(block, { props: { title: e.target.value } })} aria-label="Título del enlace" />
            <a href={block.props.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-muted hover:underline">{host}</a>
          </div>
          <ExternalLink size={14} aria-label="(abre un sitio externo)" />
        </div>
      );
    },
  },
);

const PageMention = createReactInlineContentSpec(
  { type: "pageMention", propSchema: { pageId: { default: "" }, title: { default: "" } }, content: "none" },
  {
    render: ({ inlineContent }) => (
      <a href={`/paginas/${inlineContent.props.pageId}`} className="wiki-mention" data-page-id={inlineContent.props.pageId}>
        <FileText size={13} aria-hidden />
        {inlineContent.props.title || "Página"}
      </a>
    ),
  },
);

const { audio: _audio, toggleListItem: _toggle, ...baseBlocks } = defaultBlockSpecs;

export const wikiSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...baseBlocks,
    heading: createHeadingBlockSpec({ levels: [1, 2, 3], allowToggleHeadings: false }),
    codeBlock: createCodeBlockSpec({ defaultLanguage: "text" }),
    callout: Callout(),
    subpage: Subpage(),
    embed: Embed(),
    bookmark: Bookmark(),
  },
  inlineContentSpecs: { ...defaultInlineContentSpecs, pageMention: PageMention },
});

export type WikiEditor = typeof wikiSchema.BlockNoteEditor;
