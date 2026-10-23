import { afterEach, describe, expect, it, vi } from "vitest";

// #13: el backend entrega /pages de a 100 con un cursor; el frontend lo sigue para no dejar páginas fuera.
vi.mock("../../frontend/node_modules/next/headers.js", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
const { getChildren, listDepartmentPages } = await import("../../frontend/lib/api/index");

const raw = (n: number) => ({
  id: `p${n}`, title: `Página ${n}`, icon: null, backgroundJson: null, visibility: "DEPARTMENT", version: 1, ownerId: "u1",
  owner: { id: "u1", name: "Ana" }, departmentId: "d1", parentId: "padre", updatedAt: new Date(2026, 0, 1, 0, n).toISOString(), tags: [],
});

/** Backend simulado: `total` páginas, de a 100. */
function serve(total: number) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    calls.push(url.search);
    const start = url.searchParams.get("cursor") ? Number(url.searchParams.get("cursor")!.slice(1)) + 1 : 0;
    const pages = Array.from({ length: Math.max(0, Math.min(100, total - start)) }, (_, i) => raw(start + i));
    const hasMore = start + 100 < total;
    return new Response(JSON.stringify({ pages, hasMore, nextCursor: hasMore ? pages.at(-1)!.id : undefined }), { headers: { "Content-Type": "application/json" } });
  });
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

describe("listados de páginas completos (#13)", () => {
  it("sigue el cursor: con 250 subpáginas llegan las 250, en 3 peticiones", async () => {
    const calls = serve(250);
    const children = await getChildren({} as never, "padre");
    expect(children).toHaveLength(250);
    expect(calls).toEqual(["?parentId=padre", "?parentId=padre&cursor=p99", "?parentId=padre&cursor=p199"]);
  });

  it("con menos de 100 hace una sola petición", async () => {
    const calls = serve(12);
    expect(await listDepartmentPages({} as never, "d1")).toHaveLength(12);
    expect(calls).toHaveLength(1);
  });

  it("tiene un tope (10 vueltas, 1000 páginas) para no pedir sin fin", async () => {
    const calls = serve(5000);
    expect(await getChildren({} as never, "padre")).toHaveLength(1000);
    expect(calls).toHaveLength(10);
  });
});
