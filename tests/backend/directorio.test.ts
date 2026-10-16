import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DIRECTORY_MAX_MATCHES } from "../../backend/services/auth-service.js";
import { syncUserSearchNames } from "../../backend/services/search-text.js";
import { createDepartment, createUser, resetDatabase, startApi, type TestApi, type TestUser, prisma } from "./helpers";

let api: TestApi;
let ana: TestUser, luis: TestUser, carlos: TestUser, inactivo: TestUser, zelaya: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const contabilidad = await createDepartment("Contabilidad");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id);
  carlos = await createUser("Carlos Mejía", contabilidad.id, "DEPARTMENT_ADMIN", { email: "carlos.mejia@wiki.test" });
  inactivo = await createUser("Carlos Inactivo", contabilidad.id, "USER", { active: false });
  zelaya = await createUser("María Zelaya", contabilidad.id);
  for (let i = 1; i <= 125; i++) await createUser(`A Persona ${String(i).padStart(3, "0")}`, contabilidad.id);
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

  it("encuentra coincidencias después de los primeros 100 usuarios y pagina los resultados coincidentes", async () => {
    const encontrada = await api.as(luis).get("/users/directory?q=zelaya");
    expect(encontrada.body.users.map((u: { id: string }) => u.id)).toContain(zelaya.id);

    const pagina = await api.as(luis).get("/users/directory?q=persona&limit=5&offset=15");
    expect(pagina.body.users).toHaveLength(5);
    expect(pagina.body.hasMore).toBe(true);
  });

  it("actualiza el nombre normalizado cuando se cambia el nombre de una persona", async () => {
    expect((await api.as(ana).patch(`/users/${zelaya.id}`, { name: "María Elena" })).status).toBe(200);
    expect((await api.as(luis).get("/users/directory?q=zelaya")).body.users).toHaveLength(0);
    expect((await api.as(luis).get("/users/directory?q=elena")).body.users.map((u: { id: string }) => u.id)).toContain(zelaya.id);
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

describe("nombres que la migración en SQL no normalizó bien", () => {
  it("al arrancar se recalculan con la misma regla del backend, sin cambiar la fecha", async () => {
    const francoise = await createUser("Françoise Àlvarez", carlos.departmentId);
    // Lo que deja la migración 20261016160000_busqueda_directorio (lower() y algunas tildes).
    const dir = new URL("../../backend/models/migrations/", import.meta.url);
    const folder = readdirSync(dir).find((name) => name.endsWith("_busqueda_directorio"))!;
    const statements = readFileSync(new URL(`${folder}/migration.sql`, dir), "utf8").split(";").map((part) => part.trim()).filter((part) => part.startsWith("UPDATE"));
    for (const statement of statements) await prisma.$executeRawUnsafe(`${statement} WHERE "id" = '${francoise.id}'`);
    expect((await prisma.user.findUnique({ where: { id: francoise.id } }))!.searchName).not.toBe("francoise alvarez");
    expect((await api.as(luis).get("/users/directory?q=francoise")).body.users).toHaveLength(0);

    const before = (await prisma.user.findUnique({ where: { id: francoise.id } }))!.updatedAt;
    expect(await syncUserSearchNames()).toBeGreaterThanOrEqual(1);
    expect((await api.as(luis).get("/users/directory?q=francoise")).body.users.map((u: { id: string }) => u.id)).toEqual([francoise.id]);
    expect((await api.as(luis).get("/users/directory?q=alvarez")).body.users.map((u: { id: string }) => u.id)).toEqual([francoise.id]);
    expect((await prisma.user.findUnique({ where: { id: francoise.id } }))!.updatedAt).toEqual(before);
    expect(await syncUserSearchNames()).toBe(0);
  });
});

describe("tope de coincidencias del directorio", () => {
  it("con muchas coincidencias trae como máximo 500, y primero las que empiezan con lo buscado", async () => {
    await prisma.user.createMany({ data: Array.from({ length: 600 }, (_, i) => ({ name: `Ana Ramírez ${i}`, searchName: `ana ramirez ${i}`, email: `ana.ramirez.${i}@tope.test`, passwordHash: "x", departmentId: carlos.departmentId })) });
    const mireya = await createUser("Mireya Zúñiga", carlos.departmentId);

    // "mir" está dentro de "ramirez" (600 cuentas) y al principio de "mireya": ella va primero.
    const first = await api.as(luis).get("/users/directory?q=mir&limit=5");
    expect(first.body.users[0].id).toBe(mireya.id);
    expect(first.body.hasMore).toBe(true);

    const last = await api.as(luis).get(`/users/directory?q=mir&limit=10&offset=${DIRECTORY_MAX_MATCHES - 5}`);
    expect(last.body.users).toHaveLength(5);
    expect(last.body.hasMore).toBe(false);
    expect((await api.as(luis).get(`/users/directory?q=mir&offset=${DIRECTORY_MAX_MATCHES}`)).status).toBe(400);
  });
});
