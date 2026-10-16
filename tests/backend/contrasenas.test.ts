import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createUser, resetDatabase, startApi, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let admin: TestUser, departmentId: string;

beforeAll(async () => {
  await resetDatabase();
  departmentId = (await createDepartment("Tecnología")).id;
  admin = await createUser("Administrador", departmentId, "ADMIN");
  api = await startApi();
});
afterAll(() => api.close());

describe("longitud mínima de la contraseña (8 caracteres)", () => {
  it("un administrador crea un usuario con la contraseña de las cuentas de prueba y ese usuario entra", async () => {
    const created = await api.as(admin).post("/users", { name: "Usuario Tecnología", email: "tecnologiawiki@grupocomidas.com", password: "12345abc", role: "USER", departmentId });
    expect(created.status).toBe(201);
    const login = await api.call("POST", "/auth/login", { body: { email: "tecnologiawiki@grupocomidas.com", password: "12345abc" } });
    expect(login.status).toBe(200);
  });

  it("rechaza contraseñas de menos de 8 caracteres al crear un usuario", async () => {
    const res = await api.as(admin).post("/users", { name: "Corta", email: "corta@grupocomidas.com", password: "1234abc", role: "USER", departmentId });
    expect(res.status).toBe(400);
  });

  it("al cambiar la contraseña también bastan 8 caracteres", async () => {
    const { token } = (await api.call("POST", "/auth/login", { body: { email: "tecnologiawiki@grupocomidas.com", password: "12345abc" } })).body;
    const call = (newPassword: string) => api.call("POST", "/auth/password", { token, body: { currentPassword: "12345abc", newPassword } });
    expect((await call("1234abc")).status).toBe(400);
    expect((await call("abc12345")).status).toBe(204);
  });
});
