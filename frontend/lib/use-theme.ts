"use client";

import { useEffect, useState } from "react";
import { applyTheme, isDark, readTheme, THEME_KEY, type ThemeChoice } from "./theme";

/** Tema elegido y si se ve oscuro; se actualiza al cambiarlo aquí, en otra pestaña o en el sistema (automático). */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>("auto");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => { const t = readTheme(); setTheme(t); setDark(isDark(t)); };
    sync();
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      document.documentElement.dataset.theme = readTheme();
      sync();
    };
    window.addEventListener("wiki-tema", sync);
    window.addEventListener("storage", onStorage);
    media.addEventListener("change", sync);
    return () => { window.removeEventListener("wiki-tema", sync); window.removeEventListener("storage", onStorage); media.removeEventListener("change", sync); };
  }, []);
  return { theme, dark, setTheme: applyTheme };
}
