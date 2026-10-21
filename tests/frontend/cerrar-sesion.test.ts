import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// #35: cerrar sesión siempre pide confirmar (además del aviso de cambios sin subir que ya existía).
const button = readFileSync(new URL("../../frontend/components/auth/LogoutButton.tsx", import.meta.url), "utf8");

describe("cerrar sesión", () => {
  it("el botón solo busca cambios sin subir y abre una confirmación; no cierra la sesión directo", () => {
    expect(button).toMatch(/onClick=\{\(\) => start\(async \(\) => setUnsynced\(await findUnsynced\(userId\)\.catch\(\(\) => \[\]\)\)\)\}/);
    expect(button.match(/await signOut\(\)/g)).toHaveLength(1); // solo dentro de `finish`, que llaman los botones de las ventanas
  });

  it("sin cambios pendientes pregunta «¿Cerrar sesión?»; con cambios, lista lo que se perdería", () => {
    expect(button).toContain('open={open && unsynced.length === 0} onClose={close} title={mode === "cambiar" ? "¿Cambiar de cuenta?" : "¿Cerrar sesión?"}');
    expect(button).toMatch(/open=\{open && unsynced\.length > 0\}[^>]*title="Tienes cambios sin subir"/);
  });
});
