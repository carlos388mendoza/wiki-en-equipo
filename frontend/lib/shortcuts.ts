/**
 * Atajos de teclado según el sistema (#43). En macOS se usa Cmd en lugar de Ctrl y se muestran los símbolos de Apple
 * (⌘ Comando, ⌥ Opción, ⇧ Mayúsculas, ⌃ Control); en Windows y Linux, "Ctrl+Alt+Mayús". Los atajos del editor ya
 * usan Cmd en Mac por sí solos (ProseMirror traduce "Mod"); esto solo cambia cómo se muestran.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const APPLE: Record<string, string> = { mod: "⌘", cmd: "⌘", "⌘": "⌘", ctrl: "⌘", control: "⌃", alt: "⌥", option: "⌥", "⌥": "⌥", shift: "⇧", "⇧": "⇧", enter: "↩", backspace: "⌫", tab: "⇥" };
const OTHERS: Record<string, string> = { mod: "Ctrl", cmd: "Ctrl", "⌘": "Ctrl", ctrl: "Ctrl", control: "Ctrl", alt: "Alt", option: "Alt", "⌥": "Alt", shift: "Mayús", "⇧": "Mayús", enter: "Enter", backspace: "Retroceso", tab: "Tab" };
const ARROWS: Record<string, string> = { arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→" };

/**
 * Convierte un atajo ("Mod-Alt-1", "Ctrl+Shift+ArrowUp" o el que ya formateó BlockNote, como "⌘-Alt-1")
 * al formato del sistema: en Mac "⌘⌥1", en Windows "Ctrl+Alt+1".
 */
export function formatShortcut(shortcut: string, apple = isApplePlatform()): string {
  const keys = shortcut.split(/(?<!^)[-+](?!$)/).map((key) => key.trim()).filter(Boolean);
  const names = apple ? APPLE : OTHERS;
  const parts = keys.map((key) => {
    const lower = key.toLowerCase();
    return names[lower] ?? ARROWS[lower] ?? (key.length === 1 ? key.toUpperCase() : key);
  });
  return apple ? parts.join("") : parts.join("+");
}

/** Atajos del editor que se muestran en la ayuda ("Mod" es Cmd en Mac y Ctrl en Windows). */
export const EDITOR_SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  {
    group: "Escribir",
    items: [
      { keys: ["/"], label: "Abrir el menú de bloques" },
      { keys: ["@"], label: "Enlazar otra página" },
      { keys: ["Mod-B"], label: "Negrita" },
      { keys: ["Mod-I"], label: "Cursiva" },
      { keys: ["Mod-U"], label: "Subrayado" },
      { keys: ["Mod-Alt-1", "Mod-Alt-2", "Mod-Alt-3"], label: "Título 1, 2 y 3" },
      { keys: ["Shift-Enter"], label: "Salto de línea dentro del bloque" },
    ],
  },
  {
    group: "Bloques",
    items: [
      { keys: ["Shift-ArrowUp", "Shift-ArrowDown"], label: "Seleccionar varios bloques" },
      { keys: ["Mod-A"], label: "Seleccionar todo" },
      { keys: ["Mod-Shift-ArrowUp", "Mod-Shift-ArrowDown"], label: "Mover los bloques arriba o abajo" },
      { keys: ["Tab", "Shift-Tab"], label: "Meter o sacar un nivel (listas)" },
      { keys: ["Backspace"], label: "Borrar la selección" },
    ],
  },
  {
    group: "Editar",
    items: [
      { keys: ["Mod-C", "Mod-X", "Mod-V"], label: "Copiar, cortar y pegar" },
      { keys: ["Mod-Z"], label: "Deshacer" },
      { keys: ["Mod-Shift-Z", "Mod-Y"], label: "Rehacer" },
    ],
  },
];
