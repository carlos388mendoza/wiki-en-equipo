import Link from "next/link";
import { ArrowLeft, CloudOff } from "lucide-react";
import { OfflineDrafts } from "@/components/offline/OfflineDrafts";

export const metadata = { title: "Sin conexión" };

/**
 * Pantalla que funciona sin internet (el service worker la guarda al instalarse).
 * No pide datos al servidor: todo vive en este dispositivo.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Volver a la wiki
      </Link>
      <h1 className="mt-3 flex items-center gap-2 font-display text-3xl font-bold"><CloudOff size={26} aria-hidden /> Trabajar sin conexión</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Escribe borradores aunque no tengas internet. Se guardan en este dispositivo y, cuando vuelvas a estar en línea, los subes a la wiki como páginas privadas.
        Las páginas que ya abriste también se pueden consultar y editar sin conexión; tus cambios se suben al reconectar.
      </p>
      <div className="mt-8">
        <OfflineDrafts />
      </div>
    </main>
  );
}
