"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/lib/backgrounds";

/** Selector del emoji de la página. */
export function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Cambiar icono de la página"
        className="rounded-xl text-7xl leading-none drop-shadow transition hover:scale-105 hover:bg-surface/60">
        {value ?? "📄"}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 shadow-xl">
          <div className="grid grid-cols-8 gap-1">
            {ICONS.map((icon) => (
              <button key={icon} type="button" onClick={() => { onChange(icon); setOpen(false); }} aria-label={`Usar ${icon}`}
                className={`grid h-9 w-9 place-items-center rounded-md text-xl hover:bg-paper ${value === icon ? "bg-basil-soft" : ""}`}>{icon}</button>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { onChange([...v].slice(0, 2).join("")); setOpen(false); setCustom(""); } }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Otro emoji" aria-label="Otro emoji" className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-sm outline-none focus:border-basil" />
            <button type="submit" className="rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-basil">Usar</button>
          </form>
          <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="mt-2 text-xs text-muted hover:text-ink hover:underline">Quitar icono</button>
        </div>
      )}
    </div>
  );
}
