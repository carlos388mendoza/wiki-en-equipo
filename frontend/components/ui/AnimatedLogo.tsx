"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Frames = { bitmaps: ImageBitmap[]; durations: number[] };
type Decoder = { decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>; tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null } };
type DecoderClass = new (init: { data: ArrayBuffer; type: string }) => Decoder;

/**
 * Lo que se descargó y decodificó del logo animado: una sola vez por pestaña (la misma URL siempre, nunca `?v=N`),
 * así volver a animarlo al pasar el ratón no vuelve a pedir el archivo.
 */
const cache = new Map<string, Promise<ArrayBuffer>>();
const decoded = new Map<string, Promise<Frames | null>>();
const fetchOnce = (src: string) => {
  if (!cache.has(src)) cache.set(src, fetch(src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))));
  return cache.get(src)!;
};

/** Cuadros decodificados con ImageDecoder (Chrome, Edge, Firefox); `null` si el navegador no lo tiene (Safari). */
function decodeOnce(src: string): Promise<Frames | null> {
  if (!decoded.has(src)) {
    decoded.set(src, (async () => {
      const ImageDecoderClass = (globalThis as { ImageDecoder?: DecoderClass }).ImageDecoder;
      if (!ImageDecoderClass) return null;
      const decoder = new ImageDecoderClass({ data: await fetchOnce(src), type: "image/webp" });
      await decoder.tracks.ready;
      const count = decoder.tracks.selectedTrack?.frameCount ?? 0;
      const frames: Frames = { bitmaps: [], durations: [] };
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        frames.bitmaps.push(await createImageBitmap(image));
        frames.durations.push((image.duration ?? 100_000) / 1000);
        image.close();
      }
      return frames;
    })().catch(() => null));
  }
  return decoded.get(src)!;
}

/**
 * Logo animado de Grupo Comidas: quieto (el último cuadro, una imagen liviana) y se anima al pasar el ratón o al
 * tocarlo, sin volver a descargarlo. Con ImageDecoder los cuadros se dibujan en un canvas desde la memoria; sin él
 * (Safari), se reproduce desde la copia en memoria (blob), tampoco desde la red. Respeta "reducir movimiento".
 */
export function AnimatedLogo({ src, still, width, height, animate = true, className = "" }: {
  src: string; still: string; width: number; height: number; animate?: boolean; className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState<"canvas" | string | null>(null);
  const timer = useRef<number | null>(null);
  // Candado: pointerover llega muchas veces seguidas; solo una reproducción a la vez.
  const busy = useRef(false);
  const done = () => { busy.current = false; setPlaying(null); };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function play() {
    if (!animate || busy.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    busy.current = true;
    const frames = await decodeOnce(src);
    if (frames?.bitmaps.length) {
      setPlaying("canvas");
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) { done(); return; }
      let i = 0;
      const step = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames.bitmaps[i], 0, 0, canvas.width, canvas.height);
        const wait = frames.durations[i] || 100;
        i += 1;
        timer.current = window.setTimeout(i < frames.bitmaps.length ? step : done, wait);
      };
      step();
      return;
    }
    // Sin ImageDecoder: la copia en memoria como blob (una URL local nueva en cada reproducción, sin red).
    const data = await fetchOnce(src).catch(() => null);
    if (!data) { busy.current = false; return; }
    const url = URL.createObjectURL(new Blob([data], { type: "image/webp" }));
    setPlaying(url);
    timer.current = window.setTimeout(() => { done(); URL.revokeObjectURL(url); }, 7600);
  }

  return (
    <span aria-hidden className={`relative inline-block shrink-0 overflow-hidden ${className}`} style={{ width, height }}
      onPointerOver={play} onTouchStart={play}>
      <Image src={still} alt="" fill sizes={`${Math.ceil(width)}px`} unoptimized className="object-contain" />
      {/* El canvas tapa la imagen fija mientras se reproduce; al terminar queda la fija (igual al último cuadro). */}
      <canvas ref={canvasRef} width={600} height={200} className={`absolute inset-0 h-full w-full ${playing === "canvas" ? "" : "invisible"}`} />
      {playing && playing !== "canvas" && (
        <Image src={playing} alt="" fill sizes={`${Math.ceil(width)}px`} unoptimized className="object-contain" />
      )}
    </span>
  );
}
