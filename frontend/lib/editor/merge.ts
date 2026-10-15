/**
 * Fusión de tres vías para resolver conflictos al reconectar o cuando otra
 * persona guarda la misma página.
 *
 *   base   = versión desde la que empezaste a editar (la última que viste del servidor)
 *   mine   = tu versión local
 *   theirs = versión actual del servidor
 *
 * Se compara bloque por bloque (por id). Si solo un lado cambió un bloque, gana
 * ese lado. Si ambos lo cambiaron de forma distinta, es un conflicto: por defecto
 * se conserva tu versión y se reporta para que la persona elija.
 */
import type { WikiBlock } from "../blocks";
import type { Background } from "../types";

export type PageState = { title: string; blocks: WikiBlock[]; background: Background | null; icon: string | null; tags: string[] };

export type BlockConflict = {
  id: string;
  /** "edit": ambos editaron; "deleted-by-me": tú lo borraste y la otra persona lo editó; "deleted-by-them": al revés. */
  kind: "edit" | "deleted-by-me" | "deleted-by-them";
  mine: WikiBlock | null;
  theirs: WikiBlock | null;
};

export type FieldConflict = { field: "title" | "background" | "icon" | "tags"; mine: unknown; theirs: unknown };

export type MergeResult = { merged: PageState; conflicts: BlockConflict[]; fieldConflicts: FieldConflict[]; theirsChanged: boolean };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeField<T>(field: FieldConflict["field"], base: T, mine: T, theirs: T, out: FieldConflict[]): T {
  if (same(mine, theirs) || same(theirs, base)) return mine;
  if (same(mine, base)) return theirs;
  out.push({ field, mine, theirs });
  return mine;
}

export function mergePages(base: PageState, mine: PageState, theirs: PageState): MergeResult {
  const fieldConflicts: FieldConflict[] = [];
  const conflicts: BlockConflict[] = [];
  const baseMap = new Map(base.blocks.map((b) => [b.id, b]));
  const mineMap = new Map(mine.blocks.map((b) => [b.id, b]));
  const theirsMap = new Map(theirs.blocks.map((b) => [b.id, b]));

  // 1. Recorre el orden del servidor y decide cada bloque.
  const result: WikiBlock[] = [];
  for (const t of theirs.blocks) {
    const b = baseMap.get(t.id);
    const m = mineMap.get(t.id);
    if (m) {
      if (same(m, t) || same(t, b)) result.push(m);
      else if (same(m, b)) result.push(t);
      else { conflicts.push({ id: t.id, kind: "edit", mine: m, theirs: t }); result.push(m); }
    } else if (b) {
      // Lo borraste tú.
      if (!same(t, b)) { conflicts.push({ id: t.id, kind: "deleted-by-me", mine: null, theirs: t }); result.push(t); }
    } else {
      result.push(t); // Lo agregó la otra persona.
    }
  }

  // 2. Bloques tuyos que no están en el servidor: nuevos tuyos o borrados por la otra persona.
  const mineOrder = mine.blocks.map((b) => b.id);
  for (let i = 0; i < mine.blocks.length; i++) {
    const m = mine.blocks[i];
    if (theirsMap.has(m.id)) continue;
    const b = baseMap.get(m.id);
    if (b && same(m, b)) continue; // La otra persona lo borró y tú no lo tocaste.
    if (b) conflicts.push({ id: m.id, kind: "deleted-by-them", mine: m, theirs: null });
    // Insertar después del bloque anterior (en tu orden) que ya esté en el resultado.
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const idx = result.findIndex((r) => r.id === mineOrder[j]);
      if (idx >= 0) { at = idx + 1; break; }
    }
    result.splice(at, 0, m);
  }

  return {
    merged: {
      title: mergeField("title", base.title, mine.title, theirs.title, fieldConflicts),
      background: mergeField("background", base.background, mine.background, theirs.background, fieldConflicts),
      icon: mergeField("icon", base.icon, mine.icon, theirs.icon, fieldConflicts),
      tags: mergeField("tags", base.tags, mine.tags, theirs.tags, fieldConflicts),
      blocks: result,
    },
    conflicts,
    fieldConflicts,
    theirsChanged: !same(base, theirs),
  };
}

/** Aplica las elecciones de la persona ("mine" o "theirs") a cada conflicto. */
export function resolveConflicts(result: MergeResult, choices: Record<string, "mine" | "theirs">): PageState {
  const blocks: WikiBlock[] = [];
  const byId = new Map(result.conflicts.map((c) => [c.id, c]));
  for (const block of result.merged.blocks) {
    const c = byId.get(block.id);
    if (!c) { blocks.push(block); continue; }
    const pick = (choices[c.id] ?? "mine") === "mine" ? c.mine : c.theirs;
    if (pick) blocks.push(pick);
  }
  const merged = { ...result.merged, blocks };
  for (const f of result.fieldConflicts) {
    if (choices[`field:${f.field}`] === "theirs") (merged as Record<string, unknown>)[f.field] = f.theirs;
  }
  return merged;
}
