"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import { getRealtimeToken } from "@/app/actions/session";
import { connectPageChannel, type ChannelStatus } from "./realtime";

export type Peer = { clientId: number; name: string; color: string };

const COLORS = ["#2e6a4f", "#c9861f", "#b4432f", "#3b6ea5", "#7a4fa3", "#2f8f8a"];
export const colorFor = (seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
};

/** URL del servidor Yjs (y-websocket). Sin ella, se usa el canal de avisos del backend. */
export const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL ?? "";

/**
 * Documento colaborativo de una página:
 * - `Y.Doc` con el contenido del editor (fragmento) y datos de la página (mapa `meta`).
 * - y-indexeddb: guarda todo en este dispositivo, así se puede editar sin conexión.
 * - Con `NEXT_PUBLIC_COLLAB_URL`: sincronización Yjs en vivo y presencia (quién está editando).
 * - Sin ella: el canal `/realtime` del backend avisa cuando otra persona guarda.
 */
export function useCollaboration({ pageId, user, onRemoteSave, enabled = true }: {
  pageId: string;
  enabled?: boolean;
  user: { id: string; name: string };
  onRemoteSave: (version: number) => void;
}) {
  const doc = useMemo(() => new Y.Doc(), [pageId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [localReady, setLocalReady] = useState(false);
  const [remoteSynced, setRemoteSynced] = useState(!COLLAB_URL);
  const [status, setStatus] = useState<ChannelStatus>("connecting");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const onRemoteSaveRef = useRef(onRemoteSave);
  onRemoteSaveRef.current = onRemoteSave;

  const color = colorFor(user.id);

  // Copia local (IndexedDB). El nombre incluye al usuario para no mezclar borradores en un equipo compartido.
  useEffect(() => {
    if (!enabled) return;
    const persistence = new IndexeddbPersistence(`wiki-pagina-${pageId}-${user.id}`, doc);
    persistence.once("synced", () => setLocalReady(true));
    return () => { void persistence.destroy(); };
  }, [doc, pageId, user.id, enabled]);

  // Conexión en vivo.
  useEffect(() => {
    if (!enabled) return;
    if (COLLAB_URL) {
      let ws: WebsocketProvider | null = null;
      let cancelled = false;
      void getRealtimeToken().then((token) => {
        if (cancelled) return;
        ws = new WebsocketProvider(COLLAB_URL, `pagina-${pageId}`, doc, { params: token ? { token } : {} });
        ws.awareness.setLocalStateField("user", { name: user.name, color });
        ws.on("status", ({ status: s }: { status: string }) => setStatus(s === "connected" ? "online" : navigator.onLine ? "connecting" : "offline"));
        ws.on("sync", (synced: boolean) => { if (synced) setRemoteSynced(true); });
        const updatePeers = () => {
          const list: Peer[] = [];
          ws!.awareness.getStates().forEach((state, clientId) => {
            const u = (state as { user?: { name: string; color: string } }).user;
            if (u && clientId !== doc.clientID) list.push({ clientId, name: u.name, color: u.color });
          });
          setPeers(list);
        };
        ws.awareness.on("change", updatePeers);
        setProvider(ws);
      });
      // Si no hay conexión al abrir, se trabaja con la copia local. Si sí hay conexión se espera la
      // sincronización: cargar el contenido antes haría que se duplicara al combinarse con el remoto.
      const fallback = setTimeout(() => { if (!ws?.wsconnected) setRemoteSynced(true); }, 4000);
      return () => { cancelled = true; clearTimeout(fallback); ws?.destroy(); setProvider(null); };
    }
    return connectPageChannel({
      pageId,
      getToken: getRealtimeToken,
      onStatus: setStatus,
      onRefresh: (version) => onRemoteSaveRef.current(version),
    });
  }, [doc, pageId, user.name, color, enabled]);


  const collaboration = useMemo(
    () => (enabled && localReady && remoteSynced ? { fragment: doc.getXmlFragment("document-store"), user: { name: user.name, color }, provider: provider ?? undefined } : null),
    [doc, localReady, remoteSynced, provider, user.name, color, enabled],
  );

  return { doc, meta: doc.getMap<unknown>("meta"), ready: !enabled || (localReady && remoteSynced), collaboration, status, peers, live: Boolean(COLLAB_URL) };
}
