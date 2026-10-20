import { readFileSync } from "node:fs";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { describe, expect, it, vi } from "vitest";
import { ySyncPlugin, ySyncPluginKey, yUndoPlugin, yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import { deleteWholeBlocksOnKey, wholeBlocksSelected } from "../../frontend/lib/editor/block-selection";
import { forgetUndoHistory, keepUndoWorking } from "../../frontend/lib/editor/undo";

// #34: selección de bloques con el teclado, deshacer y rehacer en el editor con edición en vivo.
const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*", toDOM: () => ["p", 0] }, text: {} } });

function liveEditor() {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("prosemirror");
  const state = EditorState.create({ schema, plugins: [ySyncPlugin(fragment), yUndoPlugin()] });
  const undoManager = yUndoPluginKey.getState(state)!.undoManager as Y.UndoManager;
  // Un cambio de la persona: llega al documento con el origen del plugin de sincronización.
  const edit = (text: string) => doc.transact(() => { const p = new Y.XmlElement("paragraph"); p.insert(0, [new Y.XmlText(text)]); fragment.push([p]); undoManager.stopCapturing(); }, ySyncPluginKey);
  return { editor: { prosemirrorState: state }, undoManager, edit, fragment };
}

describe("deshacer con la edición en vivo", () => {
  it("si el plugin destruye el historial al volver a montarse, se reconecta y sigue registrando cambios", () => {
    const { editor, undoManager, edit, fragment } = liveEditor();
    undoManager.destroy(); // lo que hace la vista vieja del plugin de y-prosemirror al volver a montarse
    edit("perdido");
    expect(undoManager.undoStack).toHaveLength(0); // así quedaba: Ctrl+Z no hacía nada

    keepUndoWorking(editor);
    edit("uno");
    expect(undoManager.undoStack).toHaveLength(1);
    undoManager.undo();
    expect(fragment.length).toBe(1);
    expect(undoManager.redoStack).toHaveLength(1); // rehacer también funciona
    undoManager.redo();
    expect(fragment.length).toBe(2);

    undoManager.destroy(); // otra vez: ahora ya no lo desconecta
    edit("dos");
    expect(undoManager.undoStack.length).toBeGreaterThan(0);
  });

  it("la carga inicial no queda en el historial (Ctrl+Z ya no vacía la página)", () => {
    const { editor, undoManager, edit } = liveEditor();
    edit("contenido guardado");
    forgetUndoHistory(editor);
    expect(undoManager.undoStack).toHaveLength(0);
  });

  it("el editor de páginas usa las dos reparaciones", () => {
    const page = readFileSync(new URL("../../frontend/components/editor/PageEditor.tsx", import.meta.url), "utf8");
    expect(page).toMatch(/keepUndoWorking\(editor\)/);
    expect(page).toMatch(/replaceBlocks\(editor\.document, wikiToBlockNote\(initial\.blocks\) as never\);\s*\/\/[^\n]*\n\s*forgetUndoHistory\(editor\);/);
  });
});

describe("varios bloques completos seleccionados", () => {
  const blocks = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const fake = (from: number, to: number, size = 10, selected = blocks.slice(0, 2)) => ({
    prosemirrorState: { selection: { empty: false, $from: { parentOffset: from, parent: { isTextblock: true } }, $to: { parentOffset: to, parent: { isTextblock: true, content: { size } } } } },
    getSelection: () => ({ blocks: selected }),
    getTextCursorPosition: () => ({ block: { id: "a", type: "paragraph", content: [] } }),
    removeBlocks: vi.fn(),
    document: blocks,
  });

  it("solo cuenta si la selección va del inicio del primero al final del último", () => {
    expect(wholeBlocksSelected(fake(0, 10))).toEqual(blocks.slice(0, 2));
    expect(wholeBlocksSelected(fake(3, 10))).toBeNull();
    expect(wholeBlocksSelected(fake(0, 7))).toBeNull();
    expect(wholeBlocksSelected(fake(0, 10, 10, blocks.slice(0, 1)))).toBeNull(); // un solo bloque: texto normal
    expect(wholeBlocksSelected(fake(0, 10, 10, blocks))).toBeNull(); // todo el documento: queda un bloque vacío
  });

  it("Retroceso o Supr quitan esos bloques; con modificadores o selección parcial, el editor sigue como siempre", () => {
    const key = (k: string, extra: object = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra }) as never;
    const editor = fake(0, 10);
    deleteWholeBlocksOnKey(editor as never, key("Backspace"));
    expect(editor.removeBlocks).toHaveBeenCalledWith(blocks.slice(0, 2));
    const other = fake(0, 10);
    deleteWholeBlocksOnKey(other as never, key("Delete", { ctrlKey: true }));
    deleteWholeBlocksOnKey(other as never, key("a"));
    deleteWholeBlocksOnKey(fake(2, 10) as never, key("Backspace"));
    expect(other.removeBlocks).not.toHaveBeenCalled();
  });
});
