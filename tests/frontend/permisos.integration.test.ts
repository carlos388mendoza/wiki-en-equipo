/**
 * Pruebas contra el backend local con los usuarios de `npm run seed`.
 * Se omiten si el backend no está en marcha o no existe `frontend/.dev-users.local.json`.
 * Usan la misma capa `backend()` que la interfaz, para comprobar también la traducción de errores.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { backend, BACKEND_URL } from "../../frontend/lib/api/client";

const credsPath = fileURLToPath(new URL("../../frontend/.dev-users.local.json", import.meta.url));
type Seed = { users: Record<"ana" | "carlos" | "luis" | "maria", { email: string; password: string; id: string; token?: string }>; pages: { vpn: string; soporte: string } };
const seed: Seed | null = existsSync(credsPath) ? JSON.parse(readFileSync(credsPath, "utf8")) : null;
const backendUp = await fetch(`${BACKEND_URL}/health`).then((r) => r.ok).catch(() => false);
const ready = Boolean(seed) && backendUp;

const tokens: Record<string, string> = {};

describe.skipIf(!ready)("permisos contra el backend real", () => {
  let notasId = "";

  beforeAll(async () => {
    for (const key of ["luis", "maria"] as const) {
      // Reutiliza el token del seed si sigue vigente: el backend limita los inicios de sesión por IP.
      const saved = seed!.users[key].token;
      if (saved && (await backend("/auth/me", { token: saved })).ok) { tokens[key] = saved; continue; }
      const res = await backend<{ token: string }>("/auth/login", { method: "POST", body: { email: seed!.users[key].email, password: seed!.users[key].password }, token: null });
      if (!res.ok) throw new Error(`No se pudo iniciar sesión como ${key}: ${res.message}`);
      tokens[key] = res.data.token;
    }
    const list = await backend<{ pages: { id: string; title: string }[] }>("/pages?q=Mis%20notas", { token: tokens.luis });
    notasId = list.ok ? list.data.pages.find((p) => p.title === "Mis notas")?.id ?? "" : "";
    expect(notasId).not.toBe("");
  });

  it("otro usuario NO puede abrir una página privada", async () => {
    const res = await backend(`/pages/${notasId}`, { token: tokens.maria });
    expect(res.ok).toBe(false);
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("la página privada no aparece en el listado ni en la búsqueda de otro usuario", async () => {
    const res = await backend<{ pages: { id: string }[] }>("/pages?q=Mis%20notas", { token: tokens.maria });
    expect(res.ok && res.data.pages.some((p) => p.id === notasId)).toBe(false);
  });

  it("quien solo tiene lectura puede abrir la página compartida", async () => {
    const res = await backend(`/pages/${seed!.pages.vpn}`, { token: tokens.maria });
    expect(res.ok).toBe(true);
  });

  it("quien solo tiene lectura NO puede editarla", async () => {
    const page = await backend<{ page: { version: number } }>(`/pages/${seed!.pages.vpn}`, { token: tokens.maria });
    const version = page.ok ? page.data.page.version : 1;
    const res = await backend(`/pages/${seed!.pages.vpn}`, { method: "PATCH", token: tokens.maria, body: { expectedVersion: version, title: "Intento de edición" } });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("quien solo tiene lectura NO puede volver a compartirla", async () => {
    const res = await backend(`/pages/${seed!.pages.vpn}/share-links`, { method: "POST", token: tokens.maria, body: { permission: "EDIT" } });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("con permiso de edición sí puede editar", async () => {
    const page = await backend<{ page: { version: number; title: string } }>(`/pages/${seed!.pages.soporte}`, { token: tokens.maria });
    expect(page.ok).toBe(true);
    if (!page.ok) return;
    const res = await backend(`/pages/${seed!.pages.soporte}`, { method: "PATCH", token: tokens.maria, body: { expectedVersion: page.data.page.version, title: page.data.page.title } });
    expect(res.ok).toBe(true);
  });

  it("una versión vieja se rechaza como conflicto", async () => {
    const res = await backend(`/pages/${seed!.pages.soporte}`, { method: "PATCH", token: tokens.maria, body: { expectedVersion: 1, title: "Versión vieja" } });
    expect(!res.ok && res.error).toBe("conflicto");
  });

  it("sin sesión el backend responde no_autenticado", async () => {
    const res = await backend("/pages", { token: null });
    expect(!res.ok && res.error).toBe("no_autenticado");
  });
});

describe.skipIf(!ready)("compartir por enlace y publicar", () => {
  const login = async (key: "ana" | "carlos" | "luis") => {
    const saved = seed!.users[key].token;
    if (saved && (await backend("/auth/me", { token: saved })).ok) return saved;
    const res = await backend<{ token: string }>("/auth/login", { method: "POST", body: { email: seed!.users[key].email, password: seed!.users[key].password }, token: null });
    if (!res.ok) throw new Error(res.message);
    return res.data.token;
  };

  it("un enlace de lectura da acceso de solo lectura y se puede revocar", async () => {
    const [luis, carlos] = [await login("luis"), await login("carlos")];
    const created = await backend<{ page: { id: string } }>("/pages", { method: "POST", token: luis, body: { title: "Prueba de enlace", content: [] } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pageId = created.data.page.id;

    expect((await backend(`/pages/${pageId}`, { token: carlos })).ok).toBe(false);

    const link = await backend<{ token: string }>(`/pages/${pageId}/share-links`, { method: "POST", token: luis, body: { permission: "READ", expiresInHours: 1 } });
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    const accepted = await backend<{ pageId: string; permission: string }>(`/share/${link.data.token}/accept`, { method: "POST", token: carlos });
    expect(accepted.ok && accepted.data).toEqual({ type: "page", pageId, permission: "READ" });

    const page = await backend<{ page: { version: number } }>(`/pages/${pageId}`, { token: carlos });
    expect(page.ok).toBe(true);
    const edit = await backend(`/pages/${pageId}`, { method: "PATCH", token: carlos, body: { expectedVersion: page.ok ? page.data.page.version : 1, title: "No debería" } });
    expect(!edit.ok && edit.error).toBe("sin_acceso");

    const carlosId = seed!.users.carlos.id;
    expect((await backend(`/pages/${pageId}/shares/${carlosId}`, { method: "DELETE", token: luis })).ok).toBe(true);
    expect((await backend(`/pages/${pageId}`, { token: carlos })).ok).toBe(false);

    await backend(`/pages/${pageId}`, { method: "DELETE", token: luis });
    await backend(`/pages/${pageId}/permanent`, { method: "DELETE", token: luis });
  });

  it("un usuario publica en su departamento, pero no en toda la empresa", async () => {
    const luis = await login("luis");
    const created = await backend<{ page: { id: string; version: number } }>("/pages", { method: "POST", token: luis, body: { title: "Prueba de publicación", content: [] } });
    if (!created.ok) throw new Error(created.message);
    const { id, version } = created.data.page;
    const company = await backend(`/pages/${id}`, { method: "PATCH", token: luis, body: { expectedVersion: version, visibility: "COMPANY" } });
    expect(!company.ok && company.error).toBe("sin_acceso");
    const dept = await backend(`/pages/${id}`, { method: "PATCH", token: luis, body: { expectedVersion: version, visibility: "DEPARTMENT" } });
    expect(dept.ok).toBe(true);
    await backend(`/pages/${id}`, { method: "DELETE", token: luis });
    await backend(`/pages/${id}/permanent`, { method: "DELETE", token: luis });
  });
});

describe.skipIf(!ready)("administración", () => {
  const tokenOf = async (key: "ana" | "carlos" | "luis") => {
    const saved = seed!.users[key].token;
    if (saved && (await backend("/auth/me", { token: saved })).ok) return saved;
    const res = await backend<{ token: string }>("/auth/login", { method: "POST", body: { email: seed!.users[key].email, password: seed!.users[key].password }, token: null });
    if (!res.ok) throw new Error(res.message);
    return res.data.token;
  };

  it("un usuario normal no puede gestionar usuarios", async () => {
    const res = await backend("/users", { token: await tokenOf("luis") });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("un admin de departamento no puede cambiar el muro de otro departamento", async () => {
    const carlos = await tokenOf("carlos");
    const deps = await backend<{ departments: { id: string; slug: string }[] }>("/departments", { token: await tokenOf("ana") });
    const tecnologia = deps.ok ? deps.data.departments.find((d) => d.slug === "tecnologia") : undefined;
    expect(tecnologia).toBeTruthy();
    const res = await backend(`/departments/${tecnologia!.id}/featured`, { method: "PUT", token: carlos, body: { pageIds: [] } });
    expect(!res.ok && res.error).toBe("sin_acceso");
  });

  it("solo quien creó la página puede enviarla a la papelera y restaurarla", async () => {
    const [luis, carlos] = [await tokenOf("luis"), await tokenOf("carlos")];
    const created = await backend<{ page: { id: string } }>("/pages", { method: "POST", token: luis, body: { title: "Prueba de papelera", visibility: "DEPARTMENT" } });
    if (!created.ok) throw new Error(created.message);
    const id = created.data.page.id;
    expect(!((await backend(`/pages/${id}`, { method: "DELETE", token: carlos })).ok)).toBe(true);
    expect((await backend(`/pages/${id}`, { method: "DELETE", token: luis })).ok).toBe(true);
    expect((await backend(`/pages/${id}`, { token: luis })).ok).toBe(false);
    expect((await backend(`/pages/${id}/restore`, { method: "POST", token: luis })).ok).toBe(true);
    expect((await backend(`/pages/${id}`, { token: luis })).ok).toBe(true);
    await backend(`/pages/${id}`, { method: "DELETE", token: luis });
    await backend(`/pages/${id}/permanent`, { method: "DELETE", token: luis });
  });
});

describe.skipIf(!ready)("pendientes resueltos del backend", () => {
  const tokenOf = async (key: "ana" | "carlos" | "luis" | "maria") => {
    const saved = seed!.users[key].token;
    if (saved && (await backend("/auth/me", { token: saved })).ok) return saved;
    const res = await backend<{ token: string }>("/auth/login", { method: "POST", body: { email: seed!.users[key].email, password: seed!.users[key].password }, token: null });
    if (!res.ok) throw new Error(res.message);
    return res.data.token;
  };

  it("un usuario normal busca personas para invitar y solo recibe nombre y departamento", async () => {
    const res = await backend<{ users: Record<string, unknown>[] }>("/users/directory?q=carlos", { token: await tokenOf("maria") });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.users.map((u) => u.name)).toContain("Carlos Mejía");
    expect(Object.keys(res.data.users[0]).sort()).toEqual(["department", "departmentId", "id", "name"]);
  });

  it("abrir una página no cuenta visitas; verla sí, una vez por persona", async () => {
    const luis = await tokenOf("luis");
    const created = await backend<{ page: { id: string } }>("/pages", { method: "POST", token: luis, body: { title: "Prueba de visitas", visibility: "DEPARTMENT" } });
    if (!created.ok) throw new Error(created.message);
    const id = created.data.page.id;
    await backend(`/pages/${id}`, { token: luis });
    await backend(`/pages/${id}`, { token: luis });
    const first = await backend<{ counted: boolean; visits: number }>(`/pages/${id}/visit`, { method: "POST", token: luis });
    const again = await backend<{ counted: boolean; visits: number }>(`/pages/${id}/visit`, { method: "POST", token: luis });
    expect(first.ok && first.data).toEqual({ counted: true, visits: 1 });
    expect(again.ok && again.data).toEqual({ counted: false, visits: 1 });
    await backend(`/pages/${id}`, { method: "DELETE", token: luis });
    await backend(`/pages/${id}/permanent`, { method: "DELETE", token: luis });
  });

  it("una plantilla compartida en lectura se usa pero no se edita", async () => {
    const templateId = (seed as unknown as { templates?: { visita?: string } }).templates?.visita;
    if (!templateId) return;
    const maria = await tokenOf("maria");
    expect((await backend(`/templates/${templateId}`, { token: maria })).ok).toBe(true);
    const edit = await backend(`/templates/${templateId}`, { method: "PATCH", token: maria, body: { title: "No debería" } });
    expect(!edit.ok && edit.error).toBe("sin_acceso");
  });
});
