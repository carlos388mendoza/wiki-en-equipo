import type { EditorState } from "prosemirror-state";
import { yUndoPluginKey } from "y-prosemirror";
import type { UndoManager } from "yjs";

type Editor = { prosemirrorState: EditorState };
type Repairable = UndoManager & { __wikiReparado?: boolean; _observers: Map<string, Set<unknown>> };

const undoManagerOf = (editor: Editor) => {
  try { return (yUndoPluginKey.getState(editor.prosemirrorState)?.undoManager ?? null) as Repairable | null; } catch { return null; }
};

/**
 * Mantiene funcionando Ctrl+Z / Ctrl+Y con la edición en vivo (#34). Cuando el editor vuelve a montar sus
 * plugins, la vista vieja del plugin de deshacer de y-prosemirror llama a `undoManager.destroy()`: eso lo
 * desconecta del documento, pero el mismo historial se sigue usando y deja de registrar cambios. Aquí se
 * vuelve a conectar y `destroy` solo limpia los avisos de la vista (la nueva los vuelve a poner). El documento
 * se destruye aparte al cerrar el editor, y con él todo lo demás.
 */
export function keepUndoWorking(editor: Editor) {
  const undoManager = undoManagerOf(editor);
  if (!undoManager) return;
  const observers = (undoManager.doc as unknown as { _observers?: Map<string, Set<unknown>> })._observers;
  if (!observers?.get("afterTransaction")?.has(undoManager.afterTransactionHandler)) undoManager.doc.on("afterTransaction", undoManager.afterTransactionHandler);
  // Deshacer y rehacer son transacciones con el propio historial como origen: debe seguir vigilándolo.
  undoManager.trackedOrigins.add(undoManager);
  if (undoManager.__wikiReparado) return;
  undoManager.__wikiReparado = true;
  undoManager.destroy = () => { undoManager._observers = new Map(); };
}

/**
 * Olvida el historial de deshacer del editor en vivo (Yjs). Se usa después de cargar el contenido guardado en
 * el documento compartido: esa carga no es un cambio de la persona y, si quedaba en el historial, Ctrl+Z la
 * deshacía y dejaba la página vacía. Se repite en el siguiente cuadro por si Yjs registra la carga después.
 */
export function forgetUndoHistory(editor: Editor) {
  const clear = () => undoManagerOf(editor)?.clear();
  clear();
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(clear);
}
