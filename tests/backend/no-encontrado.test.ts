import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDepartment, createUser, resetDatabase, startApi, uploadImage, readFileStatus, type TestApi, type TestUser } from "./helpers";

let api: TestApi;
let ana: TestUser, carlos: TestUser, luis: TestUser, maria: TestUser;

beforeAll(async () => {
  await resetDatabase();
  const tecnologia = await createDepartment("Tecnología");
  const contabilidad = await createDepartment("Contabilidad");
  const compras = await createDepartment("Compras");
  ana = await createUser("Ana Rivera", tecnologia.id, "ADMIN");
  carlos = await createUser("Carlos Mejía", contabilidad.id, "DEPARTMENT_ADMIN");
  luis = await createUser("Luis Paz", tecnologia.id);
  maria = await createUser("María Zelaya", compras.id);
  api = await startApi();
});
afterAll(() => api.close());

// Regla de la API: si no existe, 404 (antes de mirar permisos); si existe y no hay permiso, 403.
describe("404 para lo que no existe, 403 para lo que existe sin permiso (#11)", () => {
  it("usuarios: editar uno que no existe responde 404 (antes 400)", async () => {
    expect((await api.as(ana).patch("/users/no-existe", { name: "X" })).status).toBe(404);
  });

  it("departamentos: destacadas, muro y presentación de uno que no existe responden 404 para todos", async () => {
    for (const user of [ana, carlos]) {
      expect((await api.as(user).get("/departments/no-existe/featured")).status).toBe(404);
      expect((await api.as(user).put("/departments/no-existe/featured", { pageIds: [] })).status).toBe(404);
      expect((await api.as(user).put("/departments/no-existe/wall", { pageId: "p1" })).status).toBe(404);
      expect((await api.as(user).delete("/departments/no-existe/wall")).status).toBe(404);
      expect((await api.as(user).patch("/departments/no-existe", { description: "x" })).status).toBe(404);
    }
  });

  it("departamentos: uno que existe pero no es el tuyo responde 403", async () => {
    expect((await api.as(carlos).get(`/departments/${luis.departmentId}/featured`)).status).toBe(403);
    expect((await api.as(carlos).put(`/departments/${luis.departmentId}/featured`, { pageIds: [] })).status).toBe(403);
    expect((await api.as(carlos).patch(`/departments/${luis.departmentId}`, { description: "x" })).status).toBe(403);
  });

  it("páginas: no existe → 404; existe y es privada → 403", async () => {
    const page = (await api.as(luis).post("/pages", { title: "Privada" })).body.page;
    expect((await api.as(maria).get("/pages/no-existe")).status).toBe(404);
    expect((await api.as(maria).get(`/pages/${page.id}`)).status).toBe(403);
  });

  it("plantillas y sus archivos: sin acceso responden 404, igual que si no existieran", async () => {
    const template = (await api.as(luis).post("/templates", { title: "Privada" })).body.template;
    const file = (await uploadImage(api, luis, { templateId: template.id })).body.file;
    expect((await api.as(maria).get(`/templates/${template.id}`)).status).toBe(404);
    expect(await readFileStatus(api, maria, file.id)).toBe(404);
    expect(await readFileStatus(api, maria, "no-existe")).toBe(404);
  });
});
