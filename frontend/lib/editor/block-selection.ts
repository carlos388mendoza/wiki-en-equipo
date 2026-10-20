import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** Lo que estas funciones usan del editor de BlockNote. */
type SelectionEditor = {
  prosemirrorState: { selection: { empty: boolean; $from: { parentOffset: number; parent: { isTextblock: boolean } }; $to: { parentOffset: number; parent: { isTextblock: boolean; content: { size: number } } } } };
  getSelection: () => { blocks: { id: string }[] } | undefined;
  getTextCursorPosition: () => { block: { id: string; type: string; content?: unknown } };
  removeBlocks: (blocks: { id: string }[]) => unknown;
  document: unknown[];
};

/**
 * Bloques que la selección cubre completos (desde el inicio del primero hasta el final del último), si son
 * dos o más. Con todo el documento seleccionado devuelve `null`: ahí basta el comportamiento normal (queda un
 * bloque vacío para seguir escribiendo).
 */
export function wholeBlocksSelected(editor: SelectionEditor) {
  const { selection } = editor.prosemirrorState;
  if (selection.empty || !selection.$from.parent.isTextblock || !selection.$to.parent.isTextblock) return null;
  if (selection.$from.parentOffset !== 0 || selection.$to.parentOffset !== selection.$to.parent.content.size) return null;
  const blocks = editor.getSelection()?.blocks ?? [];
  if (blocks.length < 2 || blocks.length >= editor.document.length) return null;
  return blocks;
}

/**
 * Retroceso o Supr con varios bloques completos seleccionados: se quitan los bloques en lugar de dejar un
 * párrafo vacío donde estaban (#34). Se puede deshacer con Ctrl+Z.
 */
export function deleteWholeBlocksOnKey(editor: SelectionEditor, event: ReactKeyboardEvent) {
  if ((event.key !== "Backspace" && event.key !== "Delete") || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const blocks = wholeBlocksSelected(editor);
  if (!blocks) return;
  event.preventDefault();
  event.stopPropagation();
  editor.removeBlocks(blocks);
}

/**
 * Cortar varios bloques completos: el editor copia y borra como siempre, y después se quita el párrafo vacío
 * que quedaba en su lugar.
 */
export function removeLeftoverAfterCut(editor: SelectionEditor) {
  if (!wholeBlocksSelected(editor)) return;
  setTimeout(() => {
    const { block } = editor.getTextCursorPosition();
    const empty = block.type === "paragraph" && Array.isArray(block.content) && block.content.length === 0;
    if (empty && editor.document.length > 1) editor.removeBlocks([block]);
  }, 0);
}
