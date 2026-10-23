"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LoaderCircle, Search, X } from "lucide-react";
import { buildCatalog, loadIconCatalog, searchCatalog, type CatalogItem, type IconCatalog } from "@/lib/icon-catalog";
import { fold } from "@/lib/icon-search";
import { BRANDS, ICON_TONES, lucideIcon, type IconTone } from "@/lib/icons";
import { THREE_D_ANGLES, THREE_D_STYLES, threeDValue, type ThreeDAngle, type ThreeDStyle } from "@/lib/icons-3d";
import { PageIcon } from "../ui/PageIcon";

export type IconTab = "iconos" | "3d" | "emojis" | "marca";
const toneLabel: Record<IconTone, string> = { rojo: "Rojo", albahaca: "Albahaca", azafran: "Azafrán", tomate: "Tomate", cielo: "Cielo", uva: "Uva", carbon: "Carbón" };
const TAB_LABEL: Record<IconTab, string> = { iconos: "Iconos", "3d": "3D", emojis: "Emojis", marca: "Grupo Comidas" };
/** Columnas y alto de cada fila (h-10 más el espacio entre filas): solo se dibujan las filas a la vista. */
const COLUMNS = 7;
const ROW = 46;

/** Lo que hay mientras llegan los índices completos: los iconos básicos que trae la app. */
const basic = buildCatalog({}, null);

const words = (text: string) => fold(text).split(/[^a-z0-9ñ]+/).filter(Boolean);
type BrowserItem = CatalogItem | { kind: "brand"; id: string; label: string; words: string[] };
/** Pestaña "Grupo Comidas": el logo (también el animado) y los de las franquicias. */
const brandItems: BrowserItem[] = Object.entries(BRANDS).map(([id, b]) => ({ kind: "brand", id, label: b.label, words: words(`${b.label} logo marca grupo comidas franquicia restaurante`) }));

/**
 * Explorador de iconos: Lucide (con tono), 3D, emojis y los logos de Grupo Comidas, con buscador en español. Solo se
 * dibujan las filas a la vista (TanStack Virtual), así miles de iconos no traban la ventana. Lo usan el selector de
 * icono de la página y los patrones del fondo (#45, #46).
 */
export function IconBrowser({ value, onPick, initialTab, tone, onToneChange, autoFocus = false, height = "max-h-64" }: {
  value: string | null; onPick: (icon: string) => void; initialTab?: IconTab; tone: IconTone; onToneChange: (tone: IconTone) => void;
  autoFocus?: boolean; height?: string;
}) {
  const [tab, setTab] = useState<IconTab>(initialTab ?? "iconos");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<IconCatalog>(basic);
  const [loading, setLoading] = useState(true);
  // Estilo y ángulo de los iconos 3D (#46): 4 estilos × 3 ángulos de cada icono de 3dicons.
  const [style3d, setStyle3d] = useState<ThreeDStyle>("color");
  const [angle3d, setAngle3d] = useState<ThreeDAngle>("dynamic");
  // Tono de piel de los emojis que lo tienen (0: el amarillo de siempre; 1-5: de claro a oscuro).
  const [skin, setSkin] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void loadIconCatalog().then((c) => { if (alive) { setCatalog(c); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const items = useMemo<BrowserItem[]>(() => {
    if (query.trim()) {
      const q = words(query);
      return [...brandItems.filter((b) => q.every((t) => b.words.some((w) => w.startsWith(t)))), ...searchCatalog(catalog, query)];
    }
    // Los emojis esperan al catálogo completo (en el orden de los trozos de la fuente): la lista básica de respaldo
    // está desordenada y, por un instante, hacía que el navegador bajara casi todos los trozos (~13 MB).
    return tab === "marca" ? brandItems : tab === "iconos" ? catalog.lucide : tab === "3d" ? catalog.threeD : loading ? [] : catalog.emojis;
  }, [catalog, query, tab, loading]);

  const virtual = useVirtualizer({ count: Math.ceil(items.length / COLUMNS), getScrollElement: () => listRef.current, estimateSize: () => ROW, overscan: 4 });

  // Al cambiar de pestaña o de búsqueda se vuelve arriba.
  useEffect(() => { listRef.current?.scrollTo({ top: 0 }); }, [query, tab]);

  const valueOf = (item: BrowserItem) => item.kind === "brand" ? `marca:${item.id}` : item.kind === "lucide" ? lucideIcon(item.name, tone) : item.kind === "3d" ? (item.cdnId ? threeDValue(item.cdnId, angle3d, style3d) : `3d:${item.name}`) : (skin && item.skins ? item.skins[skin - 1] : item.value);
  const titleOf = (item: BrowserItem) => item.kind === "emoji" || item.kind === "brand" ? item.label : item.name;
  const labelOf = (item: BrowserItem) => item.kind === "emoji" ? item.value : item.kind === "brand" ? `logo de ${item.label}` : `icono ${item.name}`;
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
        <div role="tablist" aria-label="Tipo de icono" className="flex gap-1 overflow-x-auto rounded-lg bg-paper p-1">
          {(["iconos", "3d", "emojis", "marca"] as const).map((t) => {
            const count = t === "iconos" ? (loading ? null : catalog.lucide.length) : t === "3d" ? catalog.threeD.length : t === "emojis" ? (loading ? null : catalog.emojis.length) : null;
            return (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium ${tab === t ? "bg-surface shadow-sm" : "text-muted hover:text-ink"}`}>
                {TAB_LABEL[t]}{count !== null && <span className="max-sm:hidden"> ({count})</span>}
              </button>
            );
          })}
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

      {(searching || tab === "3d") && (
        <div className="flex flex-wrap gap-1.5 text-xs" aria-label="Estilo y ángulo de los iconos 3D">
          <select value={style3d} onChange={(e) => setStyle3d(e.target.value as ThreeDStyle)} aria-label="Estilo de los iconos 3D" className="h-7 rounded-md border border-line bg-surface px-1.5 outline-none focus:border-brand">
            {(Object.keys(THREE_D_STYLES) as ThreeDStyle[]).map((s) => <option key={s} value={s}>{THREE_D_STYLES[s]}</option>)}
          </select>
          <select value={angle3d} onChange={(e) => setAngle3d(e.target.value as ThreeDAngle)} aria-label="Ángulo de los iconos 3D" className="h-7 rounded-md border border-line bg-surface px-1.5 outline-none focus:border-brand">
            {(Object.keys(THREE_D_ANGLES) as ThreeDAngle[]).map((a) => <option key={a} value={a}>{THREE_D_ANGLES[a]}</option>)}
          </select>
        </div>
      )}

      {(searching || tab === "emojis") && (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Tono de piel">
          {["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"].map((hand, i) => (
            <button key={hand} type="button" role="radio" aria-checked={skin === i} onClick={() => setSkin(i)}
              aria-label={i === 0 ? "Tono de piel predeterminado" : `Tono de piel ${i}`} title={i === 0 ? "Predeterminado" : `Tono ${i}`}
              className={`grid h-7 w-7 place-items-center rounded-md text-base ${skin === i ? "bg-brand-soft ring-2 ring-brand" : "hover:bg-paper"}`}>{hand}</button>
          ))}
        </div>
      )}

      <div ref={listRef} className={`${height} overflow-y-auto p-0.5`} aria-label={searching ? "Resultados de la búsqueda" : undefined}>
        {!searching && tab === "marca" ? (
          // Pestaña "Grupo Comidas": pocos logos, sin virtualizar; el animado ocupa una fila entera para verse grande.
          <div className="grid grid-cols-7 gap-1.5">
            {brandItems.map((item) => {
              const icon = valueOf(item);
              const wide = item.kind === "brand" && BRANDS[item.id].wide;
              return (
                <button key={icon} type="button" onClick={() => onPick(icon)} aria-label={`Usar ${labelOf(item)}`} title={titleOf(item)}
                  className={`grid place-items-center rounded-lg p-1 hover:bg-paper ${wide ? "col-span-7 h-16" : "h-10"} ${value === icon ? "bg-brand-soft" : ""}`}>
                  <PageIcon icon={icon} size={wide ? 84 : 40} />
                </button>
              );
            })}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{searching ? `No encontramos iconos con “${query.trim()}”. Prueba otra palabra.` : "Cargando…"}</p>
        ) : (
          <div className="relative" style={{ height: virtual.getTotalSize() }}>
            {virtual.getVirtualItems().map((row) => (
              <div key={row.key} className="absolute inset-x-0 grid grid-cols-7 gap-1.5" style={{ top: row.start, height: ROW - 6 }}>
                {items.slice(row.index * COLUMNS, row.index * COLUMNS + COLUMNS).map((item) => {
                  const icon = valueOf(item);
                  return (
                    <button key={`${item.kind}:${icon}`} type="button" onClick={() => onPick(icon)} aria-label={`Usar ${labelOf(item)}`} title={titleOf(item)}
                      className={`grid h-10 place-items-center rounded-lg p-1 text-xl hover:bg-paper ${value === icon ? "bg-brand-soft" : ""}`}>
                      <PageIcon icon={icon} size={item.kind === "3d" ? 40 : item.kind === "brand" ? (BRANDS[item.id].wide ? 20 : 40) : 28} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
