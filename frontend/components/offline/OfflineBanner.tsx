"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { rememberUser } from "@/lib/collab/drafts";

/**
 * Aviso global de conexión y registro del service worker (que guarda las páginas
 * visitadas para abrirlas sin internet). También recuerda quién usa este
 * dispositivo, para los borradores sin conexión.
 */
export function OfflineBanner({ user }: { user: { id: string; name: string } }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    rememberUser(user);
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if ("serviceWorker" in navigator && (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "1")) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* sin modo sin conexión */ });
    }
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [user]);

  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex flex-wrap items-center gap-2 bg-saffron px-4 py-2 text-sm text-white max-lg:top-[53px]">
      <CloudOff size={16} aria-hidden />
      <span className="flex-1">Sin conexión. Puedes seguir editando las páginas que ya abriste: los cambios se guardan en este dispositivo y se suben al reconectar.</span>
      <Link href="/sin-conexion" className="font-semibold underline underline-offset-2">Borradores sin conexión</Link>
    </div>
  );
}
