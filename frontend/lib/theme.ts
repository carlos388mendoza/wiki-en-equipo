/**
 * Tema de la wiki (#67): Claro, Oscuro o Automático (el del sistema). Se guarda en este dispositivo
 * (`localStorage`, `wiki-tema`) y se aplica como `<html data-theme="…">`; los colores están en styles/globals.css.
 */
export type ThemeChoice = "claro" | "oscuro" | "auto";
export const THEME_KEY = "wiki-tema";
export const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: "claro", label: "Claro" },
  { id: "oscuro", label: "Oscuro" },
  { id: "auto", label: "Automático" },
];
export const isThemeChoice = (value: unknown): value is ThemeChoice => value === "claro" || value === "oscuro" || value === "auto";

/**
 * Script que corre antes de dibujar (en el <head>): pone el tema guardado sin parpadeo. Sin nada guardado, o si el
 * navegador no deja leer el almacenamiento, el automático.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="claro"||t==="oscuro"?t:"auto"}catch(e){document.documentElement.dataset.theme="auto"}})();`;

export function readTheme(): ThemeChoice {
  try { const saved = localStorage.getItem(THEME_KEY); return isThemeChoice(saved) ? saved : "auto"; } catch { return "auto"; }
}

/** Cambia el tema en esta pestaña, lo guarda y avisa (las demás pestañas lo reciben por el evento `storage`). */
export function applyTheme(theme: ThemeChoice) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* sin almacenamiento: dura hasta recargar */ }
  window.dispatchEvent(new CustomEvent("wiki-tema", { detail: theme }));
}

/** ¿Se ve oscuro ahora? (el automático depende del sistema). */
export function isDark(theme: ThemeChoice = readTheme()) {
  return theme === "oscuro" || (theme === "auto" && typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);
}
