import { describe, expect, it } from "vitest";
import { canDelete, canEdit, canEditWall, canPublishTo, canRestoreVersion, canShare, canView } from "../../frontend/lib/permissions";

const luis = { id: "u-luis", role: "USER" as const, departmentId: "d-tec" };
const maria = { id: "u-maria", role: "USER" as const, departmentId: "d-com" };
const pedro = { id: "u-pedro", role: "USER" as const, departmentId: "d-tec" };
const carlos = { id: "u-carlos", role: "DEPARTMENT_ADMIN" as const, departmentId: "d-con" };
const ana = { id: "u-ana", role: "ADMIN" as const, departmentId: "d-tec" };

const privada = { ownerId: "u-luis", departmentId: "d-tec", visibility: "PRIVATE" as const, shares: [] };

describe("páginas privadas", () => {
  it("otro usuario NO puede abrir una página privada", () => {
    expect(canView(maria, privada)).toBe(false);
    expect(canView(pedro, privada)).toBe(false); // ni siquiera alguien del mismo departamento
    expect(canView(carlos, privada)).toBe(false);
  });

  it("el creador sí puede verla y editarla", () => {
    expect(canView(luis, privada)).toBe(true);
    expect(canEdit(luis, privada)).toBe(true);
  });
});

describe("compartir con permiso de lectura", () => {
  const compartida = { ...privada, shares: [{ userId: "u-maria", permission: "READ" as const }] };

  it("quien solo tiene lectura puede verla", () => {
    expect(canView(maria, compartida)).toBe(true);
  });

  it("quien solo tiene lectura NO puede editarla ni compartirla", () => {
    expect(canEdit(maria, compartida)).toBe(false);
    expect(canShare(maria, compartida)).toBe(false);
    expect(canPublishTo(maria, compartida, "DEPARTMENT")).toBe(false);
  });

  it("con permiso de edición sí puede editar, pero no enviarla a la papelera", () => {
    const edicion = { ...privada, shares: [{ userId: "u-maria", permission: "EDIT" as const }] };
    expect(canEdit(maria, edicion)).toBe(true);
    expect(canDelete(maria, edicion)).toBe(false);
  });
});

describe("publicación y muros", () => {
  it("cualquier editor publica en el departamento; solo un administrador en la empresa", () => {
    expect(canPublishTo(luis, privada, "DEPARTMENT")).toBe(true);
    expect(canPublishTo(luis, privada, "COMPANY")).toBe(false);
    expect(canPublishTo(ana, privada, "COMPANY")).toBe(true);
  });

  it("las páginas de departamento solo las ven sus miembros", () => {
    const depto = { ...privada, visibility: "DEPARTMENT" as const };
    expect(canView(pedro, depto)).toBe(true);
    expect(canView(maria, depto)).toBe(false);
    expect(canView(ana, depto)).toBe(true);
  });

  it("solo el admin del departamento (o un administrador) edita su muro", () => {
    expect(canEditWall(carlos, { id: "d-con" })).toBe(true);
    expect(canEditWall(carlos, { id: "d-tec" })).toBe(false);
    expect(canEditWall(luis, { id: "d-tec" })).toBe(false);
    expect(canEditWall(ana, { id: "d-com" })).toBe(true);
  });

  it("una página en la papelera no se puede ver ni editar desde la interfaz", () => {
    const borrada = { ...privada, deletedAt: "2026-10-01T00:00:00Z" };
    expect(canView(luis, borrada)).toBe(false);
    expect(canEdit(luis, borrada)).toBe(false);
  });
});

describe("restaurar versiones del historial (#3)", () => {
  const publicada = { ownerId: "u-luis", departmentId: "d-tec", visibility: "COMPANY" as const, shares: [] };

  it("quien edita no ve Restaurar en una versión publicada a la empresa, salvo un administrador", () => {
    expect(canRestoreVersion(luis, publicada, "COMPANY")).toBe(false);
    expect(canRestoreVersion(ana, publicada, "COMPANY")).toBe(true);
  });

  it("quien edita sí puede restaurar versiones privadas o del departamento", () => {
    expect(canRestoreVersion(luis, publicada, "DEPARTMENT")).toBe(true);
    expect(canRestoreVersion(luis, privada, "PRIVATE")).toBe(true);
  });

  it("quien no puede editar nunca ve Restaurar", () => {
    expect(canRestoreVersion(pedro, privada, "PRIVATE")).toBe(false);
    expect(canRestoreVersion(maria, publicada, "DEPARTMENT")).toBe(false);
  });
});
