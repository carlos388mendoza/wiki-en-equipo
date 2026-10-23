"use client";

import { useEffect, useRef, useState } from "react";
import { parseIcon, lucideIcon, type IconTone } from "@/lib/icons";
import { PageIcon } from "../ui/PageIcon";
import { IconBrowser } from "./IconBrowser";

/**
 * Selector del icono de la página: todos los iconos de Lucide (con tono), los iconos 3D y los emojis, con buscador
 * en español y carga por partes (#36, #46).
 */
export function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const current = parseIcon(value);
  const [tone, setTone] = useState<IconTone>(current?.kind === "lucide" ? current.tone : "rojo");
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const pick = (icon: string | null) => { onChange(icon); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Cambiar icono de la página"
        className="rounded-xl leading-none drop-shadow transition hover:scale-105">
        <PageIcon icon={value} size={76} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 shadow-xl">
          <IconBrowser value={value} onPick={pick} autoFocus
            initialTab={value?.startsWith("lucide:") ? "iconos" : value?.startsWith("3d:") ? "3d" : value && !value.startsWith("marca:") ? "emojis" : "iconos"}
            tone={tone} onToneChange={(t) => { setTone(t); if (current?.kind === "lucide") onChange(lucideIcon(current.name, t)); }} />
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { pick([...v].slice(0, 2).join("")); setCustom(""); } }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Otro emoji" aria-label="Otro emoji" className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-sm outline-none focus:border-brand" />
            <button type="submit" className="rounded-lg bg-ink px-3 text-sm font-medium text-on-ink hover:bg-brand hover:text-white">Usar</button>
          </form>
          <button type="button" onClick={() => pick(null)} className="mt-2 text-xs text-muted hover:text-ink hover:underline">Quitar icono</button>
        </div>
      )}
    </div>
  );
}
