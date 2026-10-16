/**
 * Pruebas contra el backend local con los usuarios de `npm run seed` (`frontend/scripts/seed-users.mjs`).
 * Se omiten si el backend no está en marcha o si la base no tiene los datos del seed.
 * Usan la misma capa `backend()` que la interfaz, para comprobar también la traducción de errores.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { backend, BACKEND_URL } from "../../frontend/lib/api/client";
import { SEED_PASSWORD, SEED_USERS } from "../../frontend/scripts/seed-users.mjs";

type Key = keyof typeof SEED_USERS;
const backendUp = await fetch(`${BACKEND_URL}/health`).then((r) => r.ok).catch(() => false);

// Inicia sesión una vez por persona (el backend solo limita los intentos fallidos).
const tokens: Partial<Record<Key, string>> = {};
async function tokenOf(key: Key) {
  if (tokens[key]) return tokens[key]!;
  const res = await backend<{ token: string }>("/auth/login", { method: "POST", body: { email: SEED_USERS[key].email, password: SEED_PASSWORD }, token: null });
  if (!res.ok) throw new Error(`No se pudo iniciar sesión como ${SEED_USERS[key].email}: ${res.message}`);
  return (tokens[key] = res.data.token);
}
const ready = backendUp && (await tokenOf("tecnologia").then(() => true, () => false));

const idOf = async (key: Key) => {
  const me = await backend<{ user: { id: string } }>("/auth/me", { token: await tokenOf(key) });
  if (!me.ok) throw new Error(me.message);
  return me.data.user.id;
};
const pageIdOf = async (key: Key, title: string) => {
  const list = await backend<{ pages: { id: string; title: string }[] }>(`/pages?q=${encodeURIComponent(title)}`, { token: await tokenOf(key) });
  const id = list.ok ? list.data.pages.find((p) => p.title === title)?.id : undefined;
  if (!id) throw new Error(`No encontré la página "${title}" del seed`);
  return id;
};

describe.skipIf(!ready)("permisos contra el backend real", () => {
  let notasId = "";
  const seed = { pages: { vpn: "", soporte: "" } };

  beforeAll(async () => {
    notasId = await pageIdOf("tecnologia", "Mis notas");
    seed.pages.vpn = await pageIdOf("tecnologia", "Borrador: guía de VPN");
    seed.pages.soporte = await pageIdOf("tecnologia", "Checklist de soporte en sucursales");
  });

  it("otro usuario NO puede abrir una página privada", async () => {
    const res = await backend(`/pages/${notasId}`, { token: await tokenOf("compras") });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("la página privada no aparece en el listado ni en la búsqueda de otro usuario", async () => {
    const res = await backend<{ pages: { id: string }[] }>("/pages?q=Mis%20notas", { token: await tokenOf("compras") });
    expect(res.ok && res.data.pages.some((p) => p.id === notasId)).toBe(false);
  });

  it("quien solo tiene lectura puede abrir la página compartida", async () => {
    const res = await backend(`/pages/${seed.pages.vpn}`, { token: await tokenOf("compras") });
    expect(res.ok).toBe(true);
  });

  it("quien solo tiene lectura NO puede editarla", async () => {
    const page = await backend<{ page: { version: number } }>(`/pages/${seed.pages.vpn}`, { token: await tokenOf("compras") });
    const version = page.ok ? page.data.page.version : 1;
    const res = await backend(`/pages/${seed.pages.vpn}`, { method: "PATCH", token: await tokenOf("compras"), body: { expectedVersion: version, title: "Intento de edición" } });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("quien solo tiene lectura NO puede volver a compartirla", async () => {
    const res = await backend(`/pages/${seed.pages.vpn}/share-links`, { method: "POST", token: await tokenOf("compras"), body: { permission: "EDIT" } });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("con permiso de edición sí puede editar", async () => {
    const page = await backend<{ page: { version: number; title: string } }>(`/pages/${seed.pages.soporte}`, { token: await tokenOf("compras") });
    expect(page.ok).toBe(true);
    if (!page.ok) return;
    const res = await backend(`/pages/${seed.pages.soporte}`, { method: "PATCH", token: await tokenOf("compras"), body: { expectedVersion: page.data.page.version, title: page.data.page.title } });
    expect(res.ok).toBe(true);
  });

  it("una versión vieja se rechaza como conflicto", async () => {
    const res = await backend(`/pages/${seed.pages.soporte}`, { method: "PATCH", token: await tokenOf("compras"), body: { expectedVersion: 1, title: "Versión vieja" } });
    expect(!res.ok && res.error).toBe("conflicto");
  });

  it("sin sesión el backend responde no_autenticado", async () => {
    const res = await backend("/pages", { token: null });
    expect(!res.ok && res.error).toBe("no_autenticado");
  });
});

describe.skipIf(!ready)("compartir por enlace y publicar", () => {
  it("un enlace de lectura da acceso de solo lectura y se puede revocar", async () => {
    const [tecnologia, contabilidad] = [await tokenOf("tecnologia"), await tokenOf("contabilidad")];
    const created = await backend<{ page: { id: string } }>("/pages", { method: "POST", token: tecnologia, body: { title: "Prueba de enlace", content: [] } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pageId = created.data.page.id;

    expect((await backend(`/pages/${pageId}`, { token: contabilidad })).ok).toBe(false);

    const link = await backend<{ token: string }>(`/pages/${pageId}/share-links`, { method: "POST", token: tecnologia, body: { permission: "READ", expiresInHours: 1 } });
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    const accepted = await backend<{ pageId: string; permission: string }>(`/share/${link.data.token}/accept`, { method: "POST", token: contabilidad });
    expect(accepted.ok && accepted.data).toEqual({ type: "page", pageId, permission: "READ" });

    const page = await backend<{ page: { version: number } }>(`/pages/${pageId}`, { token: contabilidad });
    expect(page.ok).toBe(true);
    const edit = await backend(`/pages/${pageId}`, { method: "PATCH", token: contabilidad, body: { expectedVersion: page.ok ? page.data.page.version : 1, title: "No debería" } });
    expect(!edit.ok && edit.error).toBe("sin_acceso");

    const contabilidadId = await idOf("contabilidad");
    expect((await backend(`/pages/${pageId}/shares/${contabilidadId}`, { method: "DELETE", token: tecnologia })).ok).toBe(true);
    expect((await backend(`/pages/${pageId}`, { token: contabilidad })).ok).toBe(false);

    await backend(`/pages/${pageId}`, { method: "DELETE", token: tecnologia });
    await backend(`/pages/${pageId}/permanent`, { method: "DELETE", token: tecnologia });
  });

  it("un usuario publica en su departamento, pero no en toda la empresa", async () => {
    const tecnologia = await tokenOf("tecnologia");
    const created = await backend<{ page: { id: string; version: number } }>("/pages", { method: "POST", token: tecnologia, body: { title: "Prueba de publicación", content: [] } });
    if (!created.ok) throw new Error(created.message);
    const { id, version } = created.data.page;
    const company = await backend(`/pages/${id}`, { method: "PATCH", token: tecnologia, body: { expectedVersion: version, visibility: "COMPANY" } });
    expect(!company.ok && company.error).toBe("sin_acceso");
    const dept = await backend(`/pages/${id}`, { method: "PATCH", token: tecnologia, body: { expectedVersion: version, visibility: "DEPARTMENT" } });
    expect(dept.ok).toBe(true);
    await backend(`/pages/${id}`, { method: "DELETE", token: tecnologia });
    await backend(`/pages/${id}/permanent`, { method: "DELETE", token: tecnologia });
  });
});

describe.skipIf(!ready)("administración", () => {
  it("un usuario normal no puede gestionar usuarios", async () => {
    const res = await backend("/users", { token: await tokenOf("tecnologia") });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("un admin de departamento no puede cambiar el muro de otro departamento", async () => {
    const contabilidad = await tokenOf("contabilidad");
    const deps = await backend<{ departments: { id: string; slug: string }[] }>("/departments", { token: await tokenOf("admin") });
    const tecnologia = deps.ok ? deps.data.departments.find((d) => d.slug === "tecnologia") : undefined;
    expect(tecnologia).toBeTruthy();
    const res = await backend(`/departments/${tecnologia!.id}/featured`, { method: "PUT", token: contabilidad, body: { pageIds: [] } });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("solo quien creó la página puede enviarla a la papelera y restaurarla", async () => {
    const [tecnologia, contabilidad] = [await tokenOf("tecnologia"), await tokenOf("contabilidad")];
    const created = await backend<{ page: { id: string } }>("/pages", { method: "POST", token: tecnologia, body: { title: "Prueba de papelera", visibility: "DEPARTMENT" } });
    if (!created.ok) throw new Error(created.message);
    const id = created.data.page.id;
    expect(!((await backend(`/pages/${id}`, { method: "DELETE", token: contabilidad })).ok)).toBe(true);
    expect((await backend(`/pages/${id}`, { method: "DELETE", token: tecnologia })).ok).toBe(true);
    expect((await backend(`/pages/${id}`, { token: tecnologia })).ok).toBe(false);
    expect((await backend(`/pages/${id}/restore`, { method: "POST", token: tecnologia })).ok).toBe(true);
    expect((await backend(`/pages/${id}`, { token: tecnologia })).ok).toBe(true);
    await backend(`/pages/${id}`, { method: "DELETE", token: tecnologia });
    await backend(`/pages/${id}/permanent`, { method: "DELETE", token: tecnologia });
  });
});

describe.skipIf(!ready)("pendientes resueltos del backend", () => {
  it("un usuario normal busca personas para invitar y solo recibe nombre y departamento", async () => {
    const res = await backend<{ users: Record<string, unknown>[] }>("/users/directory?q=contabilidad", { token: await tokenOf("compras") });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.users.map((u) => u.name)).toContain("Admin Contabilidad");
    expect(Object.keys(res.data.users[0]).sort()).toEqual(["department", "departmentId", "id", "name"]);
  });

  it("abrir una página no cuenta visitas; verla sí, una vez por persona", async () => {
    const tecnologia = await tokenOf("tecnologia");
    const created = await backend<{ page: { id: string } }>("/pages", { method: "POST", token: tecnologia, body: { title: "Prueba de visitas", visibility: "DEPARTMENT" } });
    if (!created.ok) throw new Error(created.message);
    const id = created.data.page.id;
    await backend(`/pages/${id}`, { token: tecnologia });
    await backend(`/pages/${id}`, { token: tecnologia });
    const first = await backend<{ counted: boolean; visits: number }>(`/pages/${id}/visit`, { method: "POST", token: tecnologia });
    const again = await backend<{ counted: boolean; visits: number }>(`/pages/${id}/visit`, { method: "POST", token: tecnologia });
    expect(first.ok && first.data).toEqual({ counted: true, visits: 1 });
    expect(again.ok && again.data).toEqual({ counted: false, visits: 1 });
    await backend(`/pages/${id}`, { method: "DELETE", token: tecnologia });
    await backend(`/pages/${id}/permanent`, { method: "DELETE", token: tecnologia });
  });

  it("una plantilla compartida en lectura se usa pero no se edita", async () => {
    const templates = await backend<{ templates: { id: string; title: string }[] }>("/templates", { token: await tokenOf("compras") });
    const templateId = templates.ok ? templates.data.templates.find((t) => t.title === "Visita técnica a sucursal")?.id : undefined;
    expect(templateId).toBeTruthy();
    const compras = await tokenOf("compras");
    expect((await backend(`/templates/${templateId}`, { token: compras })).ok).toBe(true);
    const edit = await backend(`/templates/${templateId}`, { method: "PATCH", token: compras, body: { title: "No debería" } });
    expect(!edit.ok && edit.error).toBe("sin_acceso");
  });
});
