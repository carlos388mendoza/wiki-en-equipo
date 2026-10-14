/**
 * Cliente mínimo del protocolo y-websocket (el mismo que usa `WebsocketProvider` en el navegador),
 * para probar el servidor de edición en vivo.
 */
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import WebSocket from "ws";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

export type CollabClient = Awaited<ReturnType<typeof connectCollab>>;

const message = (type: number, write: (encoder: encoding.Encoder) => void) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, type);
  write(encoder);
  return encoding.toUint8Array(encoder);
};

export async function connectCollab(wsBase: string, pageId: string, token: string, headers: Record<string, string> = {}) {
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  const socket = new WebSocket(`${wsBase}/collab/pagina-${pageId}?token=${encodeURIComponent(token)}`, { headers });
  socket.binaryType = "arraybuffer";
  let markSynced!: () => void;
  const synced = new Promise<void>((resolve) => { markSynced = resolve; });
  const closed = new Promise<{ code: number; reason: string }>((resolve) => socket.on("close", (code, reason) => resolve({ code, reason: reason.toString() })));

  socket.on("message", (data: ArrayBuffer) => {
    const decoder = decoding.createDecoder(new Uint8Array(data));
    const type = decoding.readVarUint(decoder);
    if (type === 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      if (syncProtocol.readSyncMessage(decoder, encoder, doc, "remoto") === syncProtocol.messageYjsSyncStep2) markSynced();
      if (encoding.length(encoder) > 1) socket.send(encoding.toUint8Array(encoder));
    } else if (type === 1) {
      awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), "remoto");
    }
  });
  doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== "remoto" && socket.readyState === WebSocket.OPEN) socket.send(message(0, (e) => syncProtocol.writeUpdate(e, update)));
  });
  awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === "local" && socket.readyState === WebSocket.OPEN) socket.send(message(1, (e) => encoding.writeVarUint8Array(e, awarenessProtocol.encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]))));
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("unexpected-response", (_request, response) => reject(new Error(`HTTP ${response.statusCode}`)));
    socket.once("error", reject);
  });
  // Igual que y-websocket: al abrir pide el documento (paso 1).
  socket.send(message(0, (e) => syncProtocol.writeSyncStep1(e, doc)));
  await synced;

  return {
    doc,
    awareness,
    socket,
    closed,
    text: () => doc.getText("contenido").toString(),
    write: (text: string) => doc.getText("contenido").insert(doc.getText("contenido").length, text),
    /** Envía tal cual un mensaje de presencia (para probar que no se puede suplantar a otra conexión). */
    sendRawAwareness: (update: Uint8Array) => socket.send(message(1, (e) => encoding.writeVarUint8Array(e, update))),
    close: async () => { socket.close(); await closed; },
  };
}

/** Estado HTTP con el que el servidor rechaza (o 101 si acepta) una conexión. */
export function connectionStatus(url: string, headers: Record<string, string> = {}) {
  return new Promise<number>((resolve) => {
    const socket = new WebSocket(url, { headers });
    socket.once("open", () => { socket.close(); resolve(101); });
    socket.once("unexpected-response", (_request, response) => { resolve(response.statusCode ?? 0); socket.terminate(); });
    socket.once("error", () => resolve(0));
  });
}

export async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 5_000) {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error("Tiempo de espera agotado");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { awarenessProtocol, Y };
