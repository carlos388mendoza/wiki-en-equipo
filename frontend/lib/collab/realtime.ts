/**
 * Canal de avisos del backend (WebSocket `/realtime`).
 * El backend no retransmite contenido: solo avisa `page.refresh` cuando alguien
 * guarda. El editor vuelve a leer la página y combina los cambios.
 */
export type ChannelStatus = "connecting" | "online" | "offline";

export function realtimeUrl(): string {
  if (process.env.NEXT_PUBLIC_REALTIME_URL) return process.env.NEXT_PUBLIC_REALTIME_URL;
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  const host = typeof location !== "undefined" ? location.hostname : "localhost";
  return `${secure ? "wss" : "ws"}://${host}:4000/realtime`;
}

export function connectPageChannel(opts: {
  pageId: string;
  getToken: () => Promise<string | null>;
  onRefresh: (version: number) => void;
  onStatus: (status: ChannelStatus) => void;
}): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (closed) return;
    opts.onStatus(navigator.onLine ? "connecting" : "offline");
    const delay = Math.min(30_000, 1000 * 2 ** attempt++);
    retry = setTimeout(open, delay);
  };

  async function open() {
    if (closed) return;
    if (!navigator.onLine) { opts.onStatus("offline"); return; }
    opts.onStatus("connecting");
    const token = await opts.getToken().catch(() => null);
    if (!token || closed) { opts.onStatus("offline"); return; }
    try {
      socket = new WebSocket(realtimeUrl());
    } catch {
      schedule();
      return;
    }
    socket.onopen = () => socket?.send(JSON.stringify({ type: "auth", token, pageId: opts.pageId }));
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as { type?: string; version?: number };
        if (msg.type === "ready") { attempt = 0; opts.onStatus("online"); }
        if (msg.type === "page.refresh" && typeof msg.version === "number") opts.onRefresh(msg.version);
      } catch { /* mensaje ilegible */ }
    };
    socket.onclose = (event) => {
      socket = null;
      // 4403: sin acceso a la página; no tiene sentido reintentar.
      if (event.code === 4403) { opts.onStatus("offline"); return; }
      schedule();
    };
  }

  const online = () => {
    if (socket && socket.readyState === WebSocket.OPEN) { opts.onStatus("online"); return; }
    if (!socket) { attempt = 0; if (retry) clearTimeout(retry); void open(); }
  };
  const offline = () => opts.onStatus("offline");
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  void open();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    socket?.close();
  };
}
