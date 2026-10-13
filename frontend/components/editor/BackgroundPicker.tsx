"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, LoaderCircle, Search, Upload } from "lucide-react";
import { COLORS, GRADIENTS, PATTERN_COLORS, PATTERN_EMOJIS, PHOTO_GALLERY } from "@/lib/backgrounds";
import { safeHref } from "@/lib/blocks";
import { isOptimizableImage } from "@/lib/images";
import type { Background } from "@/lib/types";
import { MAX_UPLOAD_MB, uploadToWiki } from "@/lib/uploads";
import { backgroundStyle } from "../page/PageBackground";
import { Modal } from "../ui/Modal";

type Tab = "imagenes" | "degradados" | "colores" | "patrones";
const tabs: { id: Tab; label: string }[] = [
  { id: "imagenes", label: "Imágenes" },
  { id: "degradados", label: "Degradados" },
  { id: "colores", label: "Colores" },
  { id: "patrones", label: "Patrones" },
];

type SearchResult = { id: string; url: string; thumb: string; alt: string; credit: string; creditUrl: string; downloadLocation: string };

function Swatch({ selected, onClick, label, style, children }: { selected: boolean; onClick: () => void; label: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={selected} title={label} style={style}
      className={`relative grid h-16 place-items-center overflow-hidden rounded-lg border text-2xl ${selected ? "border-basil ring-2 ring-basil" : "border-line hover:border-basil"}`}>
      {children}
      {selected && <Check size={16} className="absolute right-1 top-1 rounded-full bg-surface text-basil" aria-hidden />}
    </button>
  );
}

export function BackgroundPicker({ open, onClose, value, onChange, pageId }: {
  open: boolean; onClose: () => void; value: Background | null; onChange: (bg: Background | null) => void; pageId?: string;
}) {
  const [tab, setTab] = useState<Tab>(value?.type === "gradient" ? "degradados" : value?.type === "color" ? "colores" : value?.type === "pattern" ? "patrones" : "imagenes");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchEnabled, setSearchEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [patternEmoji, setPatternEmoji] = useState(value?.type === "pattern" ? value.emoji : "🍽️");
  const [patternColor, setPatternColor] = useState(value?.type === "pattern" ? value.color : PATTERN_COLORS[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || searchEnabled !== null) return;
    fetch("/fondos/buscar").then((r) => r.json()).then((j) => setSearchEnabled(Boolean(j.enabled))).catch(() => setSearchEnabled(false));
  }, [open, searchEnabled]);

  const pick = (bg: Background | null) => { onChange(bg); setError(""); };
  const isSelected = (bg: Background) => JSON.stringify(bg) === JSON.stringify(value);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/fondos/buscar?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.results ?? []);
      if (json.message) setError(json.message);
    } catch {
      setError("No pudimos buscar en Unsplash. Usa la galería.");
    } finally { setBusy(false); }
  }

  async function upload(file: File) {
    setBusy(true); setError("");
    try {
      const up = await uploadToWiki(file, pageId, true);
      pick({ type: "image", url: up.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Fondo de la página" description="Elige una imagen, un degradado, un color o un patrón." size="xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Tipo de fondo" className="flex flex-wrap gap-1 rounded-lg bg-paper p-1">
            {tabs.map((t) => (
              <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.id ? "bg-surface shadow-sm" : "text-muted hover:text-ink"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => pick(null)} className="ml-auto rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-paper hover:text-ink">Quitar fondo</button>
        </div>

        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        {tab === "imagenes" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              {searchEnabled && (
                <form onSubmit={search} className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-basil">
                  <Search size={16} className="text-muted" aria-hidden />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en Unsplash (ej. café, cocina, equipo)" aria-label="Buscar en Unsplash" className="h-10 flex-1 bg-transparent text-sm outline-none" />
                  {busy && <LoaderCircle size={16} className="animate-spin text-muted" aria-hidden />}
                </form>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-medium hover:border-basil disabled:opacity-60">
                <Upload size={16} aria-hidden /> Subir imagen
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            </div>

            <p className="-mt-3 text-xs text-muted">Puedes subir imágenes JPG, PNG, WEBP o GIF de hasta {MAX_UPLOAD_MB} MB.</p>

            {results && (
              <section aria-label="Resultados de Unsplash">
                <h3 className="mb-2 text-sm font-semibold">Resultados</h3>
                {results.length === 0 ? <p className="text-sm text-muted">Sin resultados. Prueba otra palabra.</p> : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {results.map((r) => {
                      const bg: Background = { type: "image", url: r.url, credit: r.credit, creditUrl: r.creditUrl };
                      return (
                        <figure key={r.id} className="flex flex-col gap-1">
                          <Swatch selected={value?.type === "image" && value.url === r.url} label={r.alt} onClick={() => { pick(bg); void fetch("/fondos/buscar", { method: "POST", body: JSON.stringify({ downloadLocation: r.downloadLocation }) }); }}>
                            <Image src={r.thumb} alt="" fill sizes="200px" className="object-cover" />
                          </Swatch>
                          <figcaption className="truncate text-[11px] text-muted">
                            Foto de <a href={r.creditUrl} target="_blank" rel="noopener noreferrer" className="underline">{r.credit}</a> en Unsplash
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {PHOTO_GALLERY.map((g) => (
              <section key={g.group} aria-label={g.group}>
                <h3 className="mb-2 text-sm font-semibold">{g.group}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {g.photos.map((p) => (
                    <Swatch key={p.url} selected={value?.type === "image" && value.url === p.url} label={p.alt} onClick={() => pick({ type: "image", url: p.url, credit: "Unsplash", creditUrl: "https://unsplash.com/?utm_source=wiki_grupo_comidas&utm_medium=referral" })}>
                      <Image src={`${p.url}?w=400&q=60`} alt="" fill sizes="200px" className="object-cover" />
                    </Swatch>
                  ))}
                </div>
              </section>
            ))}

            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                const url = safeHref(link.trim());
                if (!url || !url.startsWith("https://")) { setError("Pega un enlace de imagen que empiece con https://"); return; }
                pick({ type: "image", url });
                setLink("");
              }}
            >
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-basil">
                <ImagePlus size={16} className="text-muted" aria-hidden />
                <span className="sr-only">Enlace de una imagen</span>
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="O pega el enlace de una imagen (https://…)" className="h-10 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <button type="submit" className="h-10 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-basil">Usar enlace</button>
            </form>
            {value?.type === "image" && !isOptimizableImage(value.url) && !value.url.startsWith("/archivos/") && (
              <p className="text-xs text-muted">Las imágenes de otros sitios se muestran tal cual, sin optimizar. Si el sitio la quita, el fondo desaparecerá.</p>
            )}
          </div>
        )}

        {tab === "degradados" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {GRADIENTS.map((g) => {
              const bg: Background = { type: "gradient", value: g.value };
              return <Swatch key={g.name} label={g.name} selected={isSelected(bg)} onClick={() => pick(bg)} style={backgroundStyle(bg)} />;
            })}
          </div>
        )}

        {tab === "colores" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {COLORS.map((c) => {
                const bg: Background = { type: "color", value: c };
                return <Swatch key={c} label={`Color ${c}`} selected={isSelected(bg)} onClick={() => pick(bg)} style={{ backgroundColor: c }} />;
              })}
            </div>
            <label className="flex items-center gap-2 text-sm">
              Otro color
              <input type="color" value={value?.type === "color" ? value.value : "#e3efe8"} onChange={(e) => pick({ type: "color", value: e.target.value })} className="h-9 w-14 cursor-pointer rounded border border-line" />
            </label>
          </div>
        )}

        {tab === "patrones" && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Figura</h3>
              <div className="flex flex-wrap gap-1">
                {PATTERN_EMOJIS.map((e) => (
                  <button key={e} type="button" aria-pressed={patternEmoji === e} onClick={() => { setPatternEmoji(e); pick({ type: "pattern", emoji: e, color: patternColor }); }}
                    className={`grid h-10 w-10 place-items-center rounded-lg text-xl ${patternEmoji === e ? "bg-basil-soft ring-2 ring-basil" : "hover:bg-paper"}`}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Color de fondo</h3>
              <div className="flex flex-wrap gap-2">
                {PATTERN_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={patternColor === c} onClick={() => { setPatternColor(c); pick({ type: "pattern", emoji: patternEmoji, color: c }); }}
                    className={`h-9 w-9 rounded-full border ${patternColor === c ? "ring-2 ring-basil" : "border-line"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="h-24 rounded-lg border border-line" style={backgroundStyle({ type: "pattern", emoji: patternEmoji, color: patternColor })} aria-label="Vista previa del patrón" />
          </div>
        )}

        <div className="flex justify-end border-t border-line pt-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-basil">Listo</button>
        </div>
      </div>
    </Modal>
  );
}
