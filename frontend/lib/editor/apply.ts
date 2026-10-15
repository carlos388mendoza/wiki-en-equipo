import type { WikiBlock } from "../blocks";
import { wikiToBlockNote, type BNBlock } from "./convert";

/** Lo mínimo del editor de BlockNote que se usa para aplicar cambios. */
type EditorLike = {
  document: { id: string }[];
  getBlock: (id: string) => unknown;
  updateBlock: (id: string, update: never) => unknown;
  removeBlocks: (ids: string[]) => unknown;
  insertBlocks: (blocks: never[], ref: string, placement: "before" | "after") => unknown;
};

/**
 * Lleva el editor de `current` a `next` tocando solo los bloques que cambiaron
 * (así el cursor de la persona no salta si escribe en otro bloque).
 */
export function applyBlocks(editor: EditorLike, current: WikiBlock[], next: WikiBlock[]) {
  const nextIds = new Set(next.map((b) => b.id));
  const currentMap = new Map(current.map((b) => [b.id, JSON.stringify(b)]));
  const removed = editor.document.map((b) => b.id).filter((bid) => !nextIds.has(bid));
  if (removed.length && removed.length < editor.document.length) editor.removeBlocks(removed);

  const converted = wikiToBlockNote(next);
  if (editor.document.length === 0 || removed.length === editor.document.length) {
    // Nada en común: se reemplaza todo de una vez.
    const first = editor.document[0]?.id;
    if (first) {
      editor.insertBlocks(converted as never[], first, "before");
      editor.removeBlocks(editor.document.map((b) => b.id).filter((bid) => !nextIds.has(bid)));
    }
    return;
  }

  let previous: string | null = null;
  next.forEach((block, i) => {
    const bn: BNBlock = converted[i];
    if (editor.getBlock(block.id)) {
      if (currentMap.get(block.id) !== JSON.stringify(block)) editor.updateBlock(block.id, bn as never);
    } else if (previous) {
      editor.insertBlocks([bn as never], previous, "after");
    } else {
      editor.insertBlocks([bn as never], editor.document[0].id, "before");
    }
    previous = block.id;
  });
}
