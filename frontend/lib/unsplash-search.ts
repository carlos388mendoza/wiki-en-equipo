"use client";

import { useEffect, useRef, useState } from "react";

/** Foto que devuelve la búsqueda con la API de Unsplash (`/fondos/buscar`). */
export type RemotePhoto = { id: string; url: string; thumb: string; alt: string; credit: string; creditUrl: string; downloadLocation: string };

/**
 * Búsqueda de fotos con la API de Unsplash (#44). Espera a que se deje de escribir (la clave gratuita permite 50
 * búsquedas por hora). `off`: no hay clave, se acabó el límite o no respondió; entonces se usa la galería fija.
 */
export function useUnsplashSearch(query: string) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "off"; results: RemotePhoto[]; hasMore: boolean; page: number }>({ status: "idle", results: [], hasMore: false, page: 1 });
  const last = useRef("");

  async function load(q: string, page: number) {
    try {
      const res = await fetch(`/fondos/buscar?q=${encodeURIComponent(q)}&page=${page}`);
      const json = (await res.json()) as { enabled?: boolean; results?: RemotePhoto[]; hasMore?: boolean };
      if (last.current !== q) return; // ya se buscó otra cosa
      if (!res.ok || !json.enabled) { setState({ status: "off", results: [], hasMore: false, page }); return; }
      setState((s) => ({ status: "ok", results: page === 1 ? json.results ?? [] : [...s.results, ...(json.results ?? [])], hasMore: Boolean(json.hasMore), page }));
    } catch {
      if (last.current === q) setState({ status: "off", results: [], hasMore: false, page });
    }
  }

  useEffect(() => {
    const q = query.trim();
    last.current = q;
    if (q.length < 2) { setState({ status: "idle", results: [], hasMore: false, page: 1 }); return; }
    setState((s) => ({ ...s, status: "loading" }));
    const timer = setTimeout(() => void load(q, 1), 450);
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, loadMore: () => { if (state.hasMore) void load(last.current, state.page + 1); } };
}

/** Avisa a Unsplash que se eligió una foto (lo piden sus reglas). Si falla, la foto se usa igual. */
export function registerUnsplashDownload(photo: RemotePhoto) {
  void fetch("/fondos/buscar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ downloadLocation: photo.downloadLocation }) }).catch(() => {});
}
