#!/usr/bin/env node
/**
 * Servidor Yjs (protocolo y-websocket, Yjs v13) SOLO PARA DESARROLLO.
 *
 * El backend todavía no ofrece un canal que retransmita actualizaciones de Yjs ni
 * presencia (ver PENDIENTES_BACKEND.md, punto 4). Este script permite probar la
 * edición simultánea en vivo en tu máquina:
 *
 *   npm run collab:dev                                   (ws://localhost:1234)
 *   echo NEXT_PUBLIC_COLLAB_URL=ws://localhost:1234 > .env.local && npm run dev
 *
 * Al conectar valida el token y el acceso a la página con el backend. Quien solo
 * tiene lectura recibe los cambios pero los suyos se ignoran. Los documentos viven
 * en memoria (lo que se guarda de verdad es lo que el editor envía por REST).
 * No lo uses en producción: el servidor definitivo debe implementarlo el backend.
 */
import http from "node:http";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { WebSocketServer } from "ws";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as Y from "yjs";

const PORT = Number(process.env.COLLAB_PORT ?? 1234);
const API = `${(process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "")}/api`;
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** Devuelve "edit", "read" o null según los permisos que da el backend. */
async function accessFor(token, pageId) {
  if (!token || !/^[\w-]{1,100}$/.test(pageId)) return null;
  const headers = { Authorization: `Bearer ${token}` };
  const me = await fetch(`${API}/auth/me`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!me?.user) return null;
  const res = await fetch(`${API}/pages/${pageId}`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!res?.page) return null;
  const { user } = me;
  const page = res.page;
  const canEdit = user.role === "ADMIN" || page.ownerId === user.id
    || page.shares?.some((s) => s.userId === user.id && s.permission === "EDIT")
    || (page.isWall && user.role === "DEPARTMENT_ADMIN" && user.departmentId === page.departmentId);
  return canEdit ? "edit" : "read";
}

const rooms = new Map();

function getRoom(name) {
  let room = rooms.get(name);
  if (room) return room;
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  room = { doc, awareness, conns: new Map() };
  doc.on("update", (update) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    broadcast(room, encoding.toUint8Array(encoder));
  });
  awareness.on("update", ({ added, updated, removed }, conn) => {
    const ids = room.conns.get(conn)?.ids;
    if (ids) { added.forEach((id) => ids.add(id)); removed.forEach((id) => ids.delete(id)); }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]));
    broadcast(room, encoding.toUint8Array(encoder));
  });
  rooms.set(name, room);
  return room;
}

function broadcast(room, message) {
  for (const conn of room.conns.keys()) if (conn.readyState === conn.OPEN) conn.send(message);
}

function onConnection(conn, roomName, access) {
  const room = getRoom(roomName);
  room.conns.set(conn, { ids: new Set(), access });
  conn.binaryType = "arraybuffer";

  conn.on("message", (data) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const encoder = encoding.createEncoder();
      const type = decoding.readVarUint(decoder);
      if (type === MESSAGE_SYNC) {
        // Solo lectura: se responde al paso 1 (para que reciba el documento) pero se ignoran sus cambios.
        const peek = decoding.createDecoder(new Uint8Array(data));
        decoding.readVarUint(peek);
        const syncType = decoding.readVarUint(peek);
        if (access !== "edit" && syncType !== syncProtocol.messageYjsSyncStep1) return;
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
        if (encoding.length(encoder) > 1) conn.send(encoding.toUint8Array(encoder));
      } else if (type === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), conn);
      }
    } catch (error) {
      console.error("Mensaje inválido:", error.message);
    }
  });

  conn.on("close", () => {
    const info = room.conns.get(conn);
    room.conns.delete(conn);
    if (info) awarenessProtocol.removeAwarenessStates(room.awareness, [...info.ids], null);
    if (room.conns.size === 0) { room.doc.destroy(); rooms.delete(roomName); }
  });

  // Paso 1 de sincronización y estados de presencia actuales.
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  conn.send(encoding.toUint8Array(encoder));
  const states = room.awareness.getStates();
  if (states.size > 0) {
    const aw = encoding.createEncoder();
    encoding.writeVarUint(aw, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(aw, awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]));
    conn.send(encoding.toUint8Array(aw));
  }
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 10 * 1024 * 1024 });
const server = http.createServer((_req, res) => { res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Servidor Yjs de desarrollo"); });

server.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const room = url.pathname.slice(1);
  const pageId = room.startsWith("pagina-") ? room.slice("pagina-".length) : "";
  const access = await accessFor(url.searchParams.get("token"), pageId);
  if (!access) { socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws) => onConnection(ws, room, access));
});

server.listen(PORT, "localhost", () => console.log(`Servidor Yjs de desarrollo en ws://localhost:${PORT} (validando con ${API})`));
