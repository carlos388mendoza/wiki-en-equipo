"use client";

import { CloudOff, LoaderCircle, Wifi } from "lucide-react";
import type { ChannelStatus } from "@/lib/collab/realtime";
import type { Peer } from "@/lib/collab/useCollaboration";
import { initials } from "@/lib/format";

/** Indicador de conexión y de quién más está editando. */
export function CollabStatus({ status, peers, live }: { status: ChannelStatus; peers: Peer[]; live: boolean }) {
  const view = {
    online: { Icon: Wifi, text: live ? "En vivo" : "En línea", cls: "text-basil", help: live ? "Ves los cambios de los demás al instante." : "Si otra persona guarda, sus cambios se combinan con los tuyos." },
    connecting: { Icon: LoaderCircle, text: "Conectando…", cls: "text-muted", help: "Intentando conectar. Puedes seguir escribiendo." },
    offline: { Icon: CloudOff, text: "Sin conexión", cls: "text-saffron", help: "Tus cambios se guardan en este dispositivo y se suben al reconectar." },
  }[status];

  return (
    <div className="flex items-center gap-2">
      {peers.length > 0 && (
        <div className="flex -space-x-2" aria-label={`También editando: ${peers.map((p) => p.name).join(", ")}`}>
          {peers.slice(0, 4).map((p) => (
            <span key={p.clientId} title={`${p.name} está editando`} className="grid h-7 w-7 place-items-center rounded-full border-2 border-paper text-[10px] font-semibold text-white" style={{ backgroundColor: p.color }}>
              {initials(p.name)}
            </span>
          ))}
          {peers.length > 4 && <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-paper bg-ink text-[10px] font-semibold text-white">+{peers.length - 4}</span>}
        </div>
      )}
      <span title={view.help} className={`inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-1 text-xs font-medium ${view.cls}`}>
        <view.Icon size={12} className={status === "connecting" ? "animate-spin" : ""} aria-hidden />
        <span>{view.text}</span>
        <span className="sr-only">. {view.help}</span>
      </span>
    </div>
  );
}
