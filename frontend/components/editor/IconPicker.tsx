"use client";

import { useEffect, useRef, useState } from "react";
import { ICONS } from "@/lib/backgrounds";
import { ICON_TONES, LUCIDE_ICONS, lucideIcon, parseIcon, type IconTone } from "@/lib/icons";
import { PageIcon } from "../ui/PageIcon";

const toneLabel: Record<IconTone, string> = { albahaca: "Albahaca", azafran: "Azafrán", tomate: "Tomate", cielo: "Cielo", uva: "Uva", carbon: "Carbón" };

/** Selector del icono de la página: iconos de Lucide (con tono) o emojis. */
export function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"iconos" | "emojis">(value?.startsWith("lucide:") ? "iconos" : "emojis");
  const current = parseIcon(value);
  const [tone, setTone] = useState<IconTone>(current?.kind === "lucide" ? current.tone : "albahaca");
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
          <div role="tablist" aria-label="Tipo de icono" className="mb-3 flex gap-1 rounded-lg bg-paper p-1">
            {(["iconos", "emojis"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-1 text-sm font-medium ${tab === t ? "bg-surface shadow-sm" : "text-muted hover:text-ink"}`}>
                {t === "iconos" ? "Iconos" : "Emojis"}
              </button>
            ))}
          </div>

          {tab === "iconos" ? (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color del icono">
                {(Object.keys(ICON_TONES) as IconTone[]).map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={tone === t} aria-label={toneLabel[t]} title={toneLabel[t]}
                    onClick={() => { setTone(t); if (current?.kind === "lucide") onChange(lucideIcon(current.name, t)); }}
                    className={`h-6 w-6 rounded-full ${tone === t ? "ring-2 ring-basil ring-offset-2" : ""}`}
                    style={{ backgroundImage: `linear-gradient(145deg, ${ICON_TONES[t][0]}, ${ICON_TONES[t][1]})` }} />
                ))}
              </div>
              <div className="grid max-h-56 grid-cols-7 gap-1.5 overflow-y-auto p-0.5">
                {Object.keys(LUCIDE_ICONS).map((name) => {
                  const icon = lucideIcon(name, tone);
                  return (
                    <button key={name} type="button" onClick={() => pick(icon)} aria-label={`Usar icono ${name}`} title={name}
                      className={`grid place-items-center rounded-lg p-1 hover:bg-paper ${value === icon ? "bg-basil-soft" : ""}`}>
                      <PageIcon icon={icon} size={30} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted">Iconos de Lucide.</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-8 gap-1">
                {ICONS.map((icon) => (
                  <button key={icon} type="button" onClick={() => pick(icon)} aria-label={`Usar ${icon}`}
                    className={`grid h-9 w-9 place-items-center rounded-md text-xl hover:bg-paper ${value === icon ? "bg-basil-soft" : ""}`}>{icon}</button>
                ))}
              </div>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { pick([...v].slice(0, 2).join("")); setCustom(""); } }}>
                <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Otro emoji" aria-label="Otro emoji" className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-sm outline-none focus:border-basil" />
                <button type="submit" className="rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-basil">Usar</button>
              </form>
            </>
          )}
          <button type="button" onClick={() => pick(null)} className="mt-2 text-xs text-muted hover:text-ink hover:underline">Quitar icono</button>
        </div>
      )}
    </div>
  );
}
