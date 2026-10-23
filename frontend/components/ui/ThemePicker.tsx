"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { THEMES, type ThemeChoice } from "@/lib/theme";
import { useTheme } from "@/lib/use-theme";

const icons: Record<ThemeChoice, typeof Sun> = { claro: Sun, oscuro: Moon, auto: Monitor };

/** Claro, Oscuro o Automático (#67): se guarda en este dispositivo. También está en la búsqueda Ctrl/⌘ + K. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-lg bg-paper p-1 text-xs">
      {THEMES.map((t) => {
        const Icon = icons[t.id];
        return (
          <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-medium ${theme === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            <Icon size={14} aria-hidden /> {t.label}
          </button>
        );
      })}
    </div>
  );
}
