"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useMemo, useRef } from "react";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core";
import { es } from "@blocknote/core/locales";
import { withCollaboration, type CollaborationOptions } from "@blocknote/core/yjs";
import { BlockNoteView } from "@blocknote/mantine";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { FilePlus2, FileText, LayoutTemplate, Link2, Megaphone, PlayCircle } from "lucide-react";
import type { WikiBlock } from "@/lib/blocks";
import { deleteWholeBlocksOnKey, removeLeftoverAfterCut } from "@/lib/editor/block-selection";
import { blockNoteToWiki, trimTrailingEmpty, wikiToBlockNote, type BNBlock } from "@/lib/editor/convert";
import { formatShortcut } from "@/lib/shortcuts";
import { useTheme } from "@/lib/use-theme";
import type { PageSummary } from "@/lib/types";
import { wikiSchema, type WikiEditor } from "./schema";

/** Opciones del menú "/" que no usamos (no hay equivalente en el formato del backend). */
const HIDDEN_ITEMS = new Set(["toggle_list", "audio", "page_break", "toggle_heading", "toggle_heading_2", "toggle_heading_3", "heading_4", "heading_5", "heading_6"]);

export type BlockEditorProps = {
  initialBlocks: WikiBlock[];
  onChange: (blocks: WikiBlock[]) => void;
  /** Páginas para mencionar con "@". */
  pages: PageSummary[];
  uploadFile: (file: File) => Promise<string>;
  onCreateSubpage?: () => Promise<{ id: string; title: string } | null>;
  onInsertTemplate?: () => void;
  editable?: boolean;
  /** Para que el padre pueda insertar bloques (p. ej. desde una plantilla). */
  editorRef?: React.MutableRefObject<WikiEditor | null>;
  /** Edición simultánea y copia local (Yjs). Si se pasa, el contenido vive en el documento Yjs. */
  collaboration?: CollaborationOptions | null;
  /** Se llama cuando el editor está listo (una vez por editor creado). */
  onEditorReady?: (editor: WikiEditor) => void;
};

export default function BlockEditor({ initialBlocks, onChange, pages, uploadFile, onCreateSubpage, onInsertTemplate, editable = true, editorRef, collaboration, onEditorReady }: BlockEditorProps) {
  // El editor (Mantine) sigue el tema de la wiki: claro u oscuro (#67).
  const { dark } = useTheme();
  const initialContent = useMemo(() => {
    const blocks = wikiToBlockNote(initialBlocks);
    return blocks.length ? blocks : undefined;
    // Solo al montar: después manda el editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base = {
    schema: wikiSchema,
    dictionary: {
      ...es,
      placeholders: { ...es.placeholders, emptyDocument: "Escribe algo o presiona “/” para ver los bloques", default: "Escribe o presiona “/”" },
    },
    uploadFile: async (file: File) => uploadFile(file),
  };
  const editor = useCreateBlockNote(
    (collaboration ? withCollaboration({ ...base, collaboration }) : { ...base, initialContent: initialContent as never }) as typeof base,
    [collaboration],
  );
  if (editorRef) editorRef.current = editor;
  const readyRef = useRef(onEditorReady);
  readyRef.current = onEditorReady;
  useEffect(() => { readyRef.current?.(editor); }, [editor]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const insert = (block: BNBlock) => insertOrUpdateBlockForSlashMenu(editor, block as never);

  const customItems = (): DefaultReactSuggestionItem[] => [
    {
      title: "Aviso",
      subtext: "Destaca información importante con un icono y color",
      aliases: ["callout", "nota", "alerta", "aviso"],
      group: "Wiki",
      icon: <Megaphone size={18} />,
      onItemClick: () => insert({ type: "callout", props: { emoji: "💡", tone: "warning" } }),
    },
    {
      title: "Video embebido",
      subtext: "YouTube, Vimeo o Loom",
      aliases: ["youtube", "vimeo", "loom", "video", "embed"],
      group: "Wiki",
      icon: <PlayCircle size={18} />,
      onItemClick: () => insert({ type: "embed" }),
    },
    {
      title: "Enlace externo",
      subtext: "Tarjeta con un enlace a otro sitio",
      aliases: ["link", "url", "enlace", "bookmark"],
      group: "Wiki",
      icon: <Link2 size={18} />,
      onItemClick: () => insert({ type: "bookmark" }),
    },
    {
      title: "Enlace a página",
      subtext: "Menciona otra página de la wiki (también con @)",
      aliases: ["pagina", "mencion", "@"],
      group: "Wiki",
      icon: <FileText size={18} />,
      onItemClick: () => editor.insertInlineContent(["@"]),
    },
    ...(onCreateSubpage ? [{
      title: "Subpágina",
      subtext: "Crea una página dentro de esta",
      aliases: ["subpagina", "hija", "pagina nueva"],
      group: "Wiki",
      icon: <FilePlus2 size={18} />,
      onItemClick: async () => {
        const created = await onCreateSubpage();
        if (created) insert({ type: "subpage", props: { pageId: created.id, title: created.title } });
      },
    }] : []),
    ...(onInsertTemplate ? [{
      title: "Plantilla",
      subtext: "Inserta una sección desde una plantilla",
      aliases: ["template", "plantilla", "seccion"],
      group: "Wiki",
      icon: <LayoutTemplate size={18} />,
      onItemClick: () => onInsertTemplate(),
    }] : []),
  ];

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={dark ? "dark" : "light"}
      slashMenu={false}
      className="wiki-editor"
      // Varios bloques completos seleccionados: borrar o cortar quita los bloques, sin dejar un párrafo vacío (#34).
      onKeyDownCapture={(event) => deleteWholeBlocksOnKey(editor as never, event)}
      onCutCapture={() => removeLeftoverAfterCut(editor as never)}
      onChange={() => onChange(trimTrailingEmpty(blockNoteToWiki(editor.document as BNBlock[])))}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [...getDefaultReactSlashMenuItems(editor).filter((i) => !HIDDEN_ITEMS.has((i as { key?: string }).key ?? "")), ...customItems()]
              // Atajos con las teclas del sistema: en Mac "⌘⌥1" en lugar de "⌘-Alt-1" (#43).
              .map((item) => (item.badge ? { ...item, badge: formatShortcut(item.badge) } : item)),
            query,
          )}
      />
      <SuggestionMenuController
        triggerCharacter="@"
        getItems={async (query) =>
          pagesRef.current
            .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8)
            .map((p) => ({
              title: p.title,
              subtext: "Enlazar esta página",
              icon: <FileText size={18} />,
              onItemClick: () => editor.insertInlineContent([{ type: "pageMention", props: { pageId: p.id, title: p.title } }, " "] as never),
            }))}
      />
    </BlockNoteView>
  );
}
