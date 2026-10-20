"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ICONS } from "@/lib/backgrounds";
import { searchIcons, type IconMatch } from "@/lib/icon-search";
import { BRAND_ICON, ICON_TONES, LUCIDE_ICONS, THREE_D_ICONS, lucideIcon, parseIcon, type IconTone } from "@/lib/icons";
import { PageIcon } from "../ui/PageIcon";

const toneLabel: Record<IconTone, string> = { rojo: "Rojo", albahaca: "Albahaca", azafran: "Azafrán", tomate: "Tomate", cielo: "Cielo", uva: "Uva", carbon: "Carbón" };

/** Selector del icono de la página: iconos de Lucide (con tono), iconos 3D o emojis, con buscador en español. */
export function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"iconos" | "3d" | "emojis">(value?.startsWith("lucide:") ? "iconos" : value?.startsWith("3d:") ? "3d" : "emojis");
  const [query, setQuery] = useState("");
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

  const pick = (icon: string | null) => { onChange(icon); setOpen(false); setQuery(""); };
  const results = searchIcons(query);
  const valueOf = (m: IconMatch) => m.kind === "lucide" ? lucideIcon(m.name, tone) : m.kind === "3d" ? `3d:${m.name}` : m.kind === "emoji" ? m.value : BRAND_ICON;
  const labelOf = (m: IconMatch) => m.kind === "emoji" ? `Usar ${m.value}` : m.kind === "brand" ? "Usar el logo de Grupo Comidas" : `Usar icono ${m.name}`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Cambiar icono de la página"
        className="rounded-xl leading-none drop-shadow transition hover:scale-105">
        <PageIcon icon={value} size={76} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 shadow-xl">
          <label className="mb-3 flex items-center gap-2 rounded-lg border border-line px-2.5 focus-within:border-brand">
            <Search size={15} className="shrink-0 text-muted" aria-hidden />
            <span className="sr-only">Buscar icono</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar icono (café, equipo, calendario…)" autoFocus
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda" className="rounded p-0.5 text-muted hover:text-ink"><X size={14} /></button>}
          </label>

          {query.trim() ? (
            results.length ? (
              <div className="grid max-h-64 grid-cols-7 gap-1.5 overflow-y-auto p-0.5" aria-label="Resultados de la búsqueda">
                {results.map((m) => {
                  const icon = valueOf(m);
                  return (
                    <button key={icon} type="button" onClick={() => pick(icon)} aria-label={labelOf(m)} title={m.kind === "emoji" ? m.value : m.kind === "brand" ? "Logo de Grupo Comidas" : m.name}
                      className={`grid h-10 place-items-center rounded-lg p-1 text-xl hover:bg-paper ${value === icon ? "bg-brand-soft" : ""}`}>
                      <PageIcon icon={icon} size={30} />
                    </button>
                  );
                })}
              </div>
            ) : <p className="py-4 text-center text-sm text-muted">No encontramos iconos con “{query.trim()}”. Prueba otra palabra.</p>
          ) : (<>
          <div role="tablist" aria-label="Tipo de icono" className="mb-3 flex gap-1 rounded-lg bg-paper p-1">
            {(["iconos", "3d", "emojis"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-3 py-1 text-sm font-medium ${tab === t ? "bg-surface shadow-sm" : "text-muted hover:text-ink"}`}>
                {t === "iconos" ? "Iconos" : t === "3d" ? "3D" : "Emojis"}
              </button>
            ))}
          </div>

          {tab === "3d" ? (
            <div className="grid grid-cols-4 gap-1.5">
              {THREE_D_ICONS.map((name) => (
                <button key={name} type="button" onClick={() => pick(`3d:${name}`)} aria-label={`Usar icono ${name}`} title={name}
                  className={`grid place-items-center rounded-lg p-1.5 hover:bg-paper ${value === `3d:${name}` ? "bg-brand-soft" : ""}`}>
                  <PageIcon icon={`3d:${name}`} size={48} />
                </button>
              ))}
            </div>
          ) : tab === "iconos" ? (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color del icono">
                {(Object.keys(ICON_TONES) as IconTone[]).map((t) => (
                  <button key={t} type="button" role="radio" aria-checked={tone === t} aria-label={toneLabel[t]} title={toneLabel[t]}
                    onClick={() => { setTone(t); if (current?.kind === "lucide") onChange(lucideIcon(current.name, t)); }}
                    className={`h-6 w-6 rounded-full ${tone === t ? "ring-2 ring-brand ring-offset-2" : ""}`}
                    style={{ backgroundImage: `linear-gradient(145deg, ${ICON_TONES[t][0]}, ${ICON_TONES[t][1]})` }} />
                ))}
              </div>
              <div className="grid max-h-56 grid-cols-7 gap-1.5 overflow-y-auto p-0.5">
                {Object.keys(LUCIDE_ICONS).map((name) => {
                  const icon = lucideIcon(name, tone);
                  return (
                    <button key={name} type="button" onClick={() => pick(icon)} aria-label={`Usar icono ${name}`} title={name}
                      className={`grid place-items-center rounded-lg p-1 hover:bg-paper ${value === icon ? "bg-brand-soft" : ""}`}>
                      <PageIcon icon={icon} size={30} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted">Iconos de Lucide.</p>
              <button type="button" onClick={() => pick(BRAND_ICON)} aria-label="Usar el logo de Grupo Comidas"
                className={`mt-2 flex w-full items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-left text-sm hover:border-brand ${value === BRAND_ICON ? "bg-brand-soft" : ""}`}>
                <PageIcon icon={BRAND_ICON} size={28} /> Logo de Grupo Comidas
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-8 gap-1">
                {ICONS.map((icon) => (
                  <button key={icon} type="button" onClick={() => pick(icon)} aria-label={`Usar ${icon}`}
                    className={`grid h-9 w-9 place-items-center rounded-md text-xl hover:bg-paper ${value === icon ? "bg-brand-soft" : ""}`}>{icon}</button>
                ))}
              </div>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { pick([...v].slice(0, 2).join("")); setCustom(""); } }}>
                <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Otro emoji" aria-label="Otro emoji" className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-sm outline-none focus:border-brand" />
                <button type="submit" className="rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-brand">Usar</button>
              </form>
            </>
          )}
          </>)}
          <button type="button" onClick={() => pick(null)} className="mt-2 text-xs text-muted hover:text-ink hover:underline">Quitar icono</button>
        </div>
      )}
    </div>
  );
}
