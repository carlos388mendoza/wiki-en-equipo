"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { buildCatalog, loadIconCatalog, searchCatalog, type CatalogItem, type IconCatalog } from "@/lib/icon-catalog";
import { BRAND_ICON, ICON_TONES, lucideIcon, type IconTone } from "@/lib/icons";
import { PageIcon } from "../ui/PageIcon";

export type IconTab = "iconos" | "3d" | "emojis";
const toneLabel: Record<IconTone, string> = { rojo: "Rojo", albahaca: "Albahaca", azafran: "Azafrán", tomate: "Tomate", cielo: "Cielo", uva: "Uva", carbon: "Carbón" };
/** Cuántos iconos se dibujan de una vez; al bajar se muestran más (#46: miles de iconos sin trabar la ventana). */
const PAGE = 84;

/** Lo que hay mientras llegan los índices completos: los iconos básicos que trae la app. */
const basic = buildCatalog({}, null);

/**
 * Explorador de iconos: Lucide (con tono), 3D y emojis, con buscador en español y carga por partes. Lo usan el
 * selector de icono de la página y los patrones del fondo (#45, #46).
 */
export function IconBrowser({ value, onPick, initialTab, tone, onToneChange, showBrand = false, autoFocus = false, height = "max-h-64" }: {
  value: string | null; onPick: (icon: string) => void; initialTab?: IconTab; tone: IconTone; onToneChange: (tone: IconTone) => void;
  showBrand?: boolean; autoFocus?: boolean; height?: string;
}) {
  const [tab, setTab] = useState<IconTab>(initialTab ?? "iconos");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<IconCatalog>(basic);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void loadIconCatalog().then((c) => { if (alive) { setCatalog(c); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const items = useMemo<CatalogItem[]>(() => {
    if (query.trim()) return searchCatalog(catalog, query);
    return tab === "iconos" ? catalog.lucide : tab === "3d" ? catalog.threeD : catalog.emojis;
  }, [catalog, query, tab]);

  // Al cambiar de pestaña o de búsqueda se vuelve a la primera parte.
  useEffect(() => { setShown(PAGE); listRef.current?.scrollTo({ top: 0 }); }, [query, tab]);

  // Más iconos al llegar al final de la lista.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || shown >= items.length) return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setShown((n) => n + PAGE); }, { root: listRef.current, rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, items.length]);

  const valueOf = (item: CatalogItem) => item.kind === "lucide" ? lucideIcon(item.name, tone) : item.kind === "3d" ? `3d:${item.name}` : item.value;
  const titleOf = (item: CatalogItem) => item.kind === "emoji" ? item.label : item.name;
  const searching = Boolean(query.trim());

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 rounded-lg border border-line px-2.5 focus-within:border-brand">
        <Search size={15} className="shrink-0 text-muted" aria-hidden />
        <span className="sr-only">Buscar icono</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar icono (café, equipo, calendario…)" autoFocus={autoFocus}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
        {loading && <LoaderCircle size={14} className="shrink-0 animate-spin text-muted" aria-label="Cargando iconos" />}
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda" className="rounded p-0.5 text-muted hover:text-ink"><X size={14} /></button>}
      </label>

      {!searching && (
        <div role="tablist" aria-label="Tipo de icono" className="flex gap-1 rounded-lg bg-paper p-1">
          {(["iconos", "3d", "emojis"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-1 text-sm font-medium ${tab === t ? "bg-surface shadow-sm" : "text-muted hover:text-ink"}`}>
              {t === "iconos" ? `Iconos${loading ? "" : ` (${catalog.lucide.length})`}` : t === "3d" ? `3D (${catalog.threeD.length})` : `Emojis${loading ? "" : ` (${catalog.emojis.length})`}`}
            </button>
          ))}
        </div>
      )}

      {(searching || tab === "iconos") && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color de los iconos">
          {(Object.keys(ICON_TONES) as IconTone[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tone === t} aria-label={toneLabel[t]} title={toneLabel[t]} onClick={() => onToneChange(t)}
              className={`h-6 w-6 rounded-full ${tone === t ? "ring-2 ring-brand ring-offset-2" : ""}`}
              style={{ backgroundImage: `linear-gradient(145deg, ${ICON_TONES[t][0]}, ${ICON_TONES[t][1]})` }} />
          ))}
        </div>
      )}

      <div ref={listRef} className={`${height} overflow-y-auto p-0.5`} aria-label={searching ? "Resultados de la búsqueda" : undefined}>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{searching ? `No encontramos iconos con “${query.trim()}”. Prueba otra palabra.` : "Cargando…"}</p>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {items.slice(0, shown).map((item) => {
              const icon = valueOf(item);
              return (
                <button key={`${item.kind}:${icon}`} type="button" onClick={() => onPick(icon)} aria-label={`Usar ${item.kind === "emoji" ? item.value : `icono ${item.name}`}`} title={titleOf(item)}
                  className={`grid h-10 place-items-center rounded-lg p-1 text-xl hover:bg-paper ${value === icon ? "bg-brand-soft" : ""}`}>
                  <PageIcon icon={icon} size={item.kind === "3d" ? 34 : 28} />
                </button>
              );
            })}
          </div>
        )}
        {shown < items.length && <div ref={sentinelRef} className="h-6" aria-hidden />}
      </div>
      {showBrand && (!searching || /^(log|marc|grup|comid|empres)/.test(query.trim().toLowerCase())) && (
        <button type="button" onClick={() => onPick(BRAND_ICON)} aria-label="Usar el logo de Grupo Comidas"
          className={`flex w-full items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-left text-sm hover:border-brand ${value === BRAND_ICON ? "bg-brand-soft" : ""}`}>
          <PageIcon icon={BRAND_ICON} size={28} /> Logo de Grupo Comidas
        </button>
      )}
    </div>
  );
}
