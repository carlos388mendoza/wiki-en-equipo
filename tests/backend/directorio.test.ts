import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createUser, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, luis: TestUser, carlos: TestUser, inactivo: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const contabilidad = await createDepartment("Contabilidad");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id);
  carlos = await createUser("Carlos Mejía", contabilidad.id, "DEPARTMENT_ADMIN", { email: "carlos.mejia@wiki.test" });
  inactivo = await createUser("Carlos Inactivo", contabilidad.id, "USER", { active: false });
  for (let i = 1; i <= 25; i++) await createUser(`Persona ${String(i).padStart(2, "0")}`, contabilidad.id);
  api = await startApi();
});
afterAll(() => api.close());

describe("directorio de usuarios para invitar", () => {
  it("cualquier usuario puede buscar y solo recibe id, nombre y departamento", async () => {
    const res = await api.as(luis).get("/users/directory?q=carlos");
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([{ id: carlos.id, name: "Carlos Mejía", departmentId: carlos.departmentId, department: { name: "Contabilidad" } }]);
    const json = JSON.stringify(res.body);
    expect(json).not.toContain("@wiki.test");
    expect(json).not.toContain("DEPARTMENT_ADMIN");
  });

  it("no distingue tildes ni mayúsculas", async () => {
    const res = await api.as(luis).get("/users/directory?q=MEJIA");
    expect(res.body.users.map((u: { id: string }) => u.id)).toEqual([carlos.id]);
  });

  it("encuentra por correo exacto sin devolver el correo", async () => {
    const res = await api.as(luis).get("/users/directory?q=carlos.mejia@wiki.test");
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0]).not.toHaveProperty("email");
    expect((await api.as(luis).get("/users/directory?q=carlos.mejia@")).body.users).toHaveLength(0);
  });

  it("no incluye cuentas inactivas ni a quien busca", async () => {
    expect((await api.as(luis).get("/users/directory?q=inactivo")).body.users).toHaveLength(0);
    expect((await api.as(luis).get("/users/directory?q=luis")).body.users).toHaveLength(0);
  });

  it("limita los resultados (10 por defecto, máximo 20)", async () => {
    expect((await api.as(luis).get("/users/directory?q=persona")).body.users).toHaveLength(10);
    expect((await api.as(luis).get("/users/directory?q=persona&limit=20")).body.users).toHaveLength(20);
    expect((await api.as(luis).get("/users/directory?q=persona&limit=21")).status).toBe(400);
  });

  it("pide al menos 2 letras y sesión", async () => {
    expect((await api.as(luis).get("/users/directory?q=a")).status).toBe(400);
    expect((await api.as(luis).get("/users/directory")).status).toBe(400);
    expect((await api.as(null).get("/users/directory?q=carlos")).status).toBe(401);
  });

  it("la lista completa de usuarios sigue siendo solo para administradores", async () => {
    expect((await api.as(luis).get("/users")).status).toBe(403);
    expect((await api.as(carlos).get("/users")).status).toBe(403);
  });
});

describe("usuarios inactivos (administración)", () => {
  it("un administrador puede listarlos y reactivarlos", async () => {
    const activos = await api.as(ana).get("/users");
    expect(activos.body.users.map((u: { id: string }) => u.id)).not.toContain(inactivo.id);
    const todos = await api.as(ana).get("/users?includeInactive=1");
    expect(todos.body.users.find((u: { id: string }) => u.id === inactivo.id)).toMatchObject({ active: false });
    const reactivado = await api.as(ana).patch(`/users/${inactivo.id}`, { active: true });
    expect(reactivado.status).toBe(200);
    expect((await api.as(luis).get("/users/directory?q=inactivo")).body.users).toHaveLength(1);
  });

  it("un usuario normal no puede listarlos", async () => {
    expect((await api.as(luis).get("/users?includeInactive=1")).status).toBe(403);
  });
});
