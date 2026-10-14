"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { recordVisit } from "@/app/actions/sharing";

/**
 * Muestra las visitas de una página pública y registra la visita al verla en el navegador
 * (no al abrir el editor ni el historial, ni al precargar enlaces). El backend no cuenta
 * recargas seguidas de la misma persona.
 */
export function VisitCounter({ pageId, initial, isPublic }: { pageId: string; initial: number | null; isPublic: boolean }) {
  const [views, setViews] = useState(initial);
  useEffect(() => {
    if (!isPublic) return;
    let active = true;
    void recordVisit(pageId).then((visits) => { if (active && visits !== null) setViews(visits); }).catch(() => {});
    return () => { active = false; };
  }, [pageId, isPublic]);

  if (!isPublic || views === null) return null;
  return <span className="inline-flex items-center gap-1"><Eye size={14} aria-hidden /> {views} {views === 1 ? "visita" : "visitas"}</span>;
}
