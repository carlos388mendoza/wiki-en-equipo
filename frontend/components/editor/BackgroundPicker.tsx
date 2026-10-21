"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Check, ImagePlus, LoaderCircle, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { COLORS, GRADIENTS, PATTERN_COLORS, PHOTO_GALLERY, searchPhotos, type GalleryPhoto } from "@/lib/backgrounds";
import { parseIcon, type IconTone } from "@/lib/icons";
import { safeHref } from "@/lib/blocks";
import { isOptimizableImage } from "@/lib/images";
import type { Background, ShapePattern } from "@/lib/types";
import { IMAGE_TYPES, MAX_UPLOAD_MB, uploadToWiki, type UploadTarget } from "@/lib/uploads";
import { registerUnsplashDownload, useUnsplashSearch, type RemotePhoto } from "@/lib/unsplash-search";
import { backgroundStyle } from "../page/PageBackground";
import { Modal } from "../ui/Modal";
import { IconBrowser } from "./IconBrowser";

type Tab = "imagenes" | "degradados" | "colores" | "patrones";
const SHAPES: { id: ShapePattern; label: string }[] = [
  { id: "puntos", label: "Puntos" }, { id: "rayas", label: "Rayas" }, { id: "cuadricula", label: "Cuadrícula" },
  { id: "zigzag", label: "Zigzag" }, { id: "circulos", label: "Círculos" },
];
/** Color de las figuras: rojo del logo semitransparente, combina con cualquier fondo claro. */
const SHAPE_INK = "#e2001a2e";

const tabs: { id: Tab; label: string }[] = [
  { id: "imagenes", label: "Imágenes" },
  { id: "degradados", label: "Degradados" },
  { id: "colores", label: "Colores" },
  { id: "patrones", label: "Patrones" },
];

/** `true` si el fondo es una imagen subida a la wiki (la ven solo quienes pueden leer la página o plantilla). */
export const isUploadedBackground = (bg: Background | null) => bg?.type === "image" && bg.url.startsWith("/archivos/");

function Swatch({ selected, onClick, label, style, children }: { selected: boolean; onClick: () => void; label: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={selected} title={label} style={style}
      className={`relative grid h-16 place-items-center overflow-hidden rounded-lg border text-2xl ${selected ? "border-brand ring-2 ring-brand" : "border-line hover:border-brand"}`}>
      {children}
      {selected && <Check size={16} className="absolute right-1 top-1 rounded-full bg-surface text-brand-strong" aria-hidden />}
    </button>
  );
}

export function BackgroundPicker({ open, onClose, value, onChange, uploadTarget }: {
  open: boolean; onClose: () => void; value: Background | null; onChange: (bg: Background | null) => void; uploadTarget?: UploadTarget;
}) {
  const [tab, setTab] = useState<Tab>(value?.type === "gradient" ? "degradados" : value?.type === "color" ? "colores" : value?.type === "pattern" || value?.type === "shapes" ? "patrones" : "imagenes");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");
  const [photoQuery, setPhotoQuery] = useState("");
  const photoResults = searchPhotos(photoQuery);
  // Con clave de Unsplash (en el servidor) se busca en toda su colección; sin ella, solo en la galería fija (#44).
  const remote = useUnsplashSearch(photoQuery);
  const [patternEmoji, setPatternEmoji] = useState(value?.type === "pattern" ? value.emoji : "🍽️");
  const patternParsed = parseIcon(patternEmoji);
  const [patternTone, setPatternTone] = useState<IconTone>(patternParsed?.kind === "lucide" ? patternParsed.tone : "rojo");
  const [patternColor, setPatternColor] = useState(value?.type === "pattern" || value?.type === "shapes" ? value.color : PATTERN_COLORS[0]);
  const fileRef = useRef<HTMLInputElement>(null);
  const own = isUploadedBackground(value) && value?.type === "image" ? value.url : null;
  // Los archivos grandes se suben en partes: se muestra cuánto va (solo si ya avanzó y aún no termina).
  const uploadingLabel = progress > 0 && progress < 1 ? `Subiendo… ${Math.round(progress * 100)} %` : "Subiendo…";

  const pick = (bg: Background | null) => { onChange(bg); setError(""); setUploadError(""); };
  const isSelected = (bg: Background) => JSON.stringify(bg) === JSON.stringify(value);

  // Crédito al fotógrafo y a Unsplash (lo piden sus reglas), pequeño y solo al pasar el ratón.
  const remoteSwatch = (p: RemotePhoto) => (
    <div key={p.id} className="group/foto relative" title={`Foto de ${p.credit} en Unsplash`}>
      <Swatch selected={value?.type === "image" && value.url === p.url} label={`${p.alt}. Foto de ${p.credit}`}
        onClick={() => { pick({ type: "image", url: p.url, credit: p.credit, creditUrl: p.creditUrl }); registerUnsplashDownload(p); }}>
        <Image src={p.thumb} alt="" fill sizes="200px" unoptimized className="object-cover" />
      </Swatch>
      <span aria-hidden className="pointer-events-none absolute inset-x-px bottom-px truncate rounded-b-lg bg-ink/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/foto:opacity-100 [@media(any-hover:none)]:opacity-90">
        {p.credit} · Unsplash
      </span>
    </div>
  );

  const photoSwatch = (p: GalleryPhoto) => (
    <Swatch key={p.url} selected={value?.type === "image" && value.url === p.url} label={p.alt} onClick={() => pick({ type: "image", url: p.url })}>
      <Image src={p.url} alt="" fill sizes="200px" quality={60} className="object-cover" />
    </Swatch>
  );

  async function upload(file: File) {
    setBusy(true); setProgress(0); setError(""); setUploadError("");
    try {
      const up = await uploadToWiki(file, uploadTarget, true, setProgress);
      pick({ type: "image", url: up.url });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "No se pudo subir la imagen. Intenta de nuevo.");
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Fondo de la página" description="Sube una imagen o elige una de la galería, un degradado, un color o un patrón." size="xl">
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
            <section aria-labelledby="fondo-propio" aria-busy={busy}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f && !busy) void upload(f); }}
              className={`rounded-xl border-2 border-dashed p-4 transition-colors ${dragging ? "border-brand bg-brand-soft" : "border-line bg-paper"}`}>
              <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} className="hidden" aria-label="Elegir una imagen de tu equipo"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
              {own ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-line bg-line sm:h-24 sm:w-44">
                    <Image src={own} alt="Tu imagen de fondo" fill sizes="(min-width: 640px) 176px, 100vw" unoptimized className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 id="fondo-propio" className="text-sm font-semibold">Tu imagen</h3>
                    <p className="mt-0.5 text-xs text-muted">Es el fondo de esta página. Solo la ven quienes tienen acceso a la página.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium hover:border-brand disabled:opacity-60">
                        {busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />} {busy ? uploadingLabel : "Cambiar imagen"}
                      </button>
                      <button type="button" onClick={() => pick(null)} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface hover:text-danger disabled:opacity-60">
                        <Trash2 size={15} aria-hidden /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-surface text-brand-strong shadow-sm" aria-hidden><Upload size={18} /></span>
                  <h3 id="fondo-propio" className="text-sm font-semibold">Sube una imagen desde tu equipo</h3>
                  <p className="text-xs text-muted">
                    JPG, PNG, WEBP o GIF, de hasta {MAX_UPLOAD_MB} MB.<span className="hidden [@media(any-hover:hover)]:inline"> También puedes arrastrarla aquí.</span>
                  </p>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="mt-1 inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-brand disabled:opacity-60">
                    {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <ImagePlus size={16} aria-hidden />} {busy ? uploadingLabel : "Elegir imagen"}
                  </button>
                </div>
              )}
              {uploadError && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{uploadError}</p>}
            </section>

            <label className="flex items-center gap-2 rounded-lg border border-line px-3 focus-within:border-brand">
              <Search size={16} className="shrink-0 text-muted" aria-hidden />
              <span className="sr-only">Buscar en la galería</span>
              <input value={photoQuery} onChange={(e) => setPhotoQuery(e.target.value)} placeholder="Buscar fotos (comida, cocina, oficina, equipo, naturaleza…)"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
              {photoQuery && <button type="button" onClick={() => setPhotoQuery("")} aria-label="Borrar búsqueda" className="rounded p-0.5 text-muted hover:text-ink"><X size={15} /></button>}
            </label>

            {photoQuery.trim() ? (
              <section aria-label="Resultados de la búsqueda" className="flex flex-col gap-4">
                {remote.status === "loading" && remote.results.length === 0 && (
                  <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle size={14} className="animate-spin" aria-hidden /> Buscando fotos…</p>
                )}
                {remote.results.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Fotos</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{remote.results.map(remoteSwatch)}</div>
                    {remote.hasMore && (
                      <button type="button" onClick={remote.loadMore} className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand">Más fotos</button>
                    )}
                  </div>
                )}
                {(photoResults.length > 0 || remote.results.length === 0) && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">{remote.results.length ? "En la galería" : photoResults.length ? `${photoResults.length} ${photoResults.length === 1 ? "foto" : "fotos"}` : remote.status === "loading" ? "En la galería" : "Sin resultados"}</h3>
                    {photoResults.length ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{photoResults.map(photoSwatch)}</div>
                    ) : remote.status !== "loading" && <p className="text-sm text-muted">No encontramos fotos con “{photoQuery.trim()}”. Prueba con comida, cocina, oficina, equipo o naturaleza, o sube tu propia imagen.</p>}
                  </div>
                )}
              </section>
            ) : PHOTO_GALLERY.map((g) => (
              <section key={g.group} aria-label={g.group}>
                <h3 className="mb-2 text-sm font-semibold">{g.group}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{g.photos.map(photoSwatch)}</div>
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
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-brand">
                <ImagePlus size={16} className="text-muted" aria-hidden />
                <span className="sr-only">Enlace de una imagen</span>
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="O pega el enlace de una imagen (https://…)" className="h-10 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <button type="submit" className="h-10 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-brand">Usar enlace</button>
            </form>
            {value?.type === "image" && !isOptimizableImage(value.url) && !own && (
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
              <input type="color" value={value?.type === "color" ? value.value : "#fde9eb"} onChange={(e) => pick({ type: "color", value: e.target.value })} className="h-9 w-14 cursor-pointer rounded border border-line" />
            </label>
          </div>
        )}

        {tab === "patrones" && (
          <div className="flex flex-col gap-4">
            <div>
              {/* Todos los iconos, 3D y emojis, con el mismo buscador del icono de página (#45). */}
              <h3 className="mb-2 text-sm font-semibold">Icono o emoji del patrón</h3>
              <IconBrowser value={value?.type === "pattern" ? patternEmoji : null} height="max-h-48"
                initialTab={patternEmoji.startsWith("lucide:") ? "iconos" : patternEmoji.startsWith("3d:") ? "3d" : "emojis"}
                onPick={(icon) => { setPatternEmoji(icon); pick({ type: "pattern", emoji: icon, color: patternColor }); }}
                tone={patternTone} onToneChange={(t) => {
                  setPatternTone(t);
                  const current = parseIcon(patternEmoji);
                  if (current?.kind === "lucide") { const icon = `lucide:${current.name}:${t}`; setPatternEmoji(icon); if (value?.type === "pattern") pick({ type: "pattern", emoji: icon, color: patternColor }); }
                }} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Figuras</h3>
              <div className="flex flex-wrap gap-2">
                {SHAPES.map(({ id: shape, label }) => {
                  const bg: Background = { type: "shapes", shape, color: patternColor, ink: SHAPE_INK };
                  const active = value?.type === "shapes" && value.shape === shape;
                  return <Swatch key={shape} label={label} selected={active} onClick={() => pick(bg)} style={{ ...backgroundStyle(bg), width: 72 }} />;
                })}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Color de fondo</h3>
              <div className="flex flex-wrap gap-2">
                {PATTERN_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={patternColor === c}
                    onClick={() => {
                      setPatternColor(c);
                      pick(value?.type === "shapes" ? { ...value, color: c } : { type: "pattern", emoji: patternEmoji, color: c });
                    }}
                    className={`h-9 w-9 rounded-full border ${patternColor === c ? "ring-2 ring-brand" : "border-line"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="h-24 rounded-lg border border-line" aria-label="Vista previa del patrón"
              style={backgroundStyle(value?.type === "shapes" ? value : { type: "pattern", emoji: patternEmoji, color: patternColor })} />
          </div>
        )}

        <div className="flex justify-end border-t border-line pt-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-brand">Listo</button>
        </div>
      </div>
    </Modal>
  );
}
