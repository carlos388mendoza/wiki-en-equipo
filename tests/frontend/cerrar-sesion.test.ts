import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #35: cerrar sesión siempre pide confirmar (además del aviso de cambios sin subir que ya existía).
const button = readFileSync(new URL("../../frontend/components/auth/LogoutButton.tsx", import.meta.url), "utf8");

describe("cerrar sesión", () => {
  it("el botón solo busca cambios sin subir y abre una confirmación; no cierra la sesión directo", () => {
    expect(button).toContain("setUnsynced((await Promise.all(ids.map((id) => findUnsynced(id).catch(() => [])))).flat())");
    expect(button).toContain("signOut()");
  });

  it("sin cambios pendientes pregunta «¿Cerrar sesión?»; con cambios, lista lo que se perdería", () => {
    expect(button).toContain('open={open && unsynced.length === 0} onClose={close} title={mode === "todas" ? "¿Cerrar sesión en todas las cuentas?" : "¿Cerrar sesión?"}');
    expect(button).toMatch(/open=\{open && unsynced\.length > 0\}[^>]*title="Tienes cambios sin subir"/);
  });
});