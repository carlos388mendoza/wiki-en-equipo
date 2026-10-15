import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { clearLocalData, findUnsynced } from "../../frontend/lib/collab/local-data";

async function write(name: string, fill: (doc: Y.Doc) => void) {
  const doc = new Y.Doc();
  const p = new IndexeddbPersistence(name, doc);
  await p.whenSynced;
  fill(doc);
  await new Promise((r) => setTimeout(r, 50));
  await p.destroy();
}

describe("datos locales al cerrar sesión", () => {
  it("encuentra cambios sin subir y borradores, y los borra todos", async () => {
    await write("wiki-pagina-p1-u1", (d) => { d.getMap("meta").set("dirty", true); d.getMap("meta").set("fields", { title: "Inventario" }); });
    await write("wiki-pagina-p2-u1", (d) => { d.getMap("meta").set("dirty", false); });
    await write("wiki-borradores-u1", (d) => d.getMap("drafts").set("b1", { id: "b1", title: "Notas", updatedAt: "" }));
    await write("wiki-borrador-u1-b1", (d) => d.getText("t").insert(0, "hola"));
    await write("wiki-pagina-p1-u2", (d) => d.getMap("meta").set("dirty", true)); // otra persona

    const found = await findUnsynced("u1");
    expect(found).toEqual([{ kind: "pagina", title: "Inventario" }, { kind: "borrador", title: "Notas" }]);

    await clearLocalData("u1");
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names.filter((n) => n?.includes("u1"))).toEqual([]);
    expect(names).toContain("wiki-pagina-p1-u2");
    expect(await findUnsynced("u1")).toEqual([]);
  });
});
