import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EDITOR_SHORTCUTS, formatShortcut } from "../../frontend/lib/shortcuts";

// #43: en Mac los atajos se muestran con ⌘ ⌥ ⇧; en Windows siguen igual (Ctrl, Alt, Mayús).
describe("atajos de teclado según el sistema", () => {
  it("en Mac usa ⌘ en lugar de Ctrl y ⌥ en lugar de Alt", () => {
    expect(formatShortcut("Mod-Alt-1", true)).toBe("⌘⌥1");
    expect(formatShortcut("⌘-Alt-2", true)).toBe("⌘⌥2"); // como lo deja BlockNote en las insignias del menú
    expect(formatShortcut("Mod-Shift-ArrowUp", true)).toBe("⌘⇧↑");
    expect(formatShortcut("Mod-Z", true)).toBe("⌘Z");
  });

  it("en Windows sigue igual", () => {
    expect(formatShortcut("Mod-Alt-1", false)).toBe("Ctrl+Alt+1");
    expect(formatShortcut("Ctrl-Alt-1", false)).toBe("Ctrl+Alt+1");
    expect(formatShortcut("Mod-Shift-ArrowDown", false)).toBe("Ctrl+Mayús+↓");
    expect(formatShortcut("/", false)).toBe("/");
  });

  it("la ayuda lista los atajos principales y el menú «/» usa el formateador", () => {
    const labels = EDITOR_SHORTCUTS.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(expect.arrayContaining(["Deshacer", "Rehacer", "Negrita", "Mover los bloques arriba o abajo"]));
    const editor = readFileSync(new URL("../../frontend/components/editor/BlockEditor.tsx", import.meta.url), "utf8");
    expect(editor).toMatch(/badge: formatShortcut\(item\.badge\)/);
  });
});
