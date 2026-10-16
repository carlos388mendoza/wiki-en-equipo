import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { RealtimeHub } from "../../backend/realtime/hub.js";

let server: Server;
let hub: RealtimeHub;
let url: string;

beforeAll(async () => {
  hub = new RealtimeHub(50);
  server = createServer();
  server.on("upgrade", (request, socket, head) => hub.handleUpgrade(request, socket, head));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/realtime`;
});
afterAll(async () => {
  hub.close();
  await new Promise((resolve) => server.close(resolve));
});

const open = (options?: { autoPong?: boolean }) => new Promise<WebSocket>((resolve, reject) => {
  const socket = new WebSocket(url, options);
  socket.once("open", () => resolve(socket));
  socket.once("error", reject);
});

describe("latido de /realtime (para que el proxy no corte la conexión)", () => {
  it("envía pings y mantiene abierta la conexión que responde", async () => {
    const socket = await open();
    let pings = 0;
    socket.on("ping", () => pings++);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(pings).toBeGreaterThanOrEqual(2);
    expect(socket.readyState).toBe(WebSocket.OPEN);
    socket.close();
  });

  it("cierra la conexión que deja de responder", async () => {
    const socket = await open({ autoPong: false });
    const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
    await expect(Promise.race([closed.then(() => "cerrada"), new Promise((resolve) => setTimeout(() => resolve("abierta"), 1_000))])).resolves.toBe("cerrada");
  });
});
