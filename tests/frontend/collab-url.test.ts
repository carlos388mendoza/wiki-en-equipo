import { describe, expect, it } from "vitest";
import { isHttpCollab } from "../../frontend/lib/collab/useCollaboration";

// Antes la expresión era `/^https?:///`: lo que seguía a `/^https?:/` quedaba como comentario y la función
// devolvía siempre un valor verdadero, así que en local se usaba el proveedor HTTP con una dirección ws://.
describe("tipo de conexión de la edición en vivo", () => {
  it("usa HTTP solo con direcciones http(s)", () => {
    expect(isHttpCollab("https://wiki-en-equipo-backend.vercel.app/api/collab")).toBe(true);
    expect(isHttpCollab("http://localhost:4000/api/collab")).toBe(true);
    expect(isHttpCollab("ws://localhost:4000/collab")).toBe(false);
    expect(isHttpCollab("wss://wiki.example.com/collab")).toBe(false);
  });
});
