import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Cookies en memoria en lugar de las de Next (`next/headers` solo existe dentro de una petición).
const jar = new Map<string, string>();
vi.mock("../../frontend/node_modules/next/headers.js", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => { jar.set(name, value); },
    delete: (name: string) => { jar.delete(name); },
  }),
}));

const { ACCOUNTS_COOKIE, MAX_ACCOUNTS, accountToken, expired, forgetAccount, rememberAccount, savedAccounts, seal, unseal } = await import("../../frontend/lib/accounts");

/** JWT de prueba (sin firma: el frontend solo lee su vencimiento; quien lo valida es el backend). */
const jwt = (sub: string, exp: number | null) =>
  ["e30", Buffer.from(JSON.stringify(exp === null ? { sub } : { sub, exp })).toString("base64url"), "firma"].join(".");
const later = Math.floor(Date.now() / 1000) + 3600;
const user = (id: string, name = `Persona ${id}`) => ({ id, name, email: `${id}@wiki.test`, role: "USER" as const, departmentId: "d1", department: { name: "Compras", slug: "compras" } });
const account = (id: string, token = jwt(id, later)) => ({ id, name: `Persona ${id}`, email: `${id}@wiki.test`, role: "USER" as const, department: "Compras", token });
const key = (secret: string) => createHash("sha256").update(`wiki-cuentas:${secret}`).digest();

beforeEach(() => jar.clear());

describe("cookie cifrada de las cuentas del dispositivo", () => {
  it("lo que se guarda no deja ver ni los tokens ni los nombres", () => {
    const sealed = seal([account("ana")], key("uno"))!;
    expect(sealed).not.toContain("ana");
    expect(Buffer.from(sealed.replace(/\./g, ""), "base64url").toString("latin1")).not.toContain("Persona");
    expect(unseal(sealed, key("uno"))).toEqual([account("ana")]);
  });

  it("si alguien altera la cookie (un solo carácter), se descarta entera", () => {
    const sealed = seal([account("ana")], key("uno"))!;
    const [iv, tag, data] = sealed.split(".");
    const flipped = data.slice(0, -2) + (data.at(-2) === "A" ? "B" : "A") + data.at(-1);
    expect(unseal([iv, tag, flipped].join("."), key("uno"))).toEqual([]);
    expect(unseal([iv, tag.replace(/^./, (c) => (c === "A" ? "B" : "A")), data].join("."), key("uno"))).toEqual([]);
    expect(unseal("no-es-una-cookie", key("uno"))).toEqual([]);
  });

  it("con otra clave (otro despliegue o secreto cambiado) no se puede leer", () => {
    expect(unseal(seal([account("ana")], key("uno"))!, key("dos"))).toEqual([]);
  });

  it("sin clave no se guarda nada (producción sin ACCOUNTS_SECRET ni PROXY_SECRET)", () => {
    expect(seal([account("ana")], null)).toBeNull();
    expect(unseal("x.y.z", null)).toEqual([]);
  });

  it("una sesión vencida o sin vencimiento no se ofrece", () => {
    expect(expired(jwt("ana", later))).toBe(false);
    expect(expired(jwt("ana", Math.floor(Date.now() / 1000) - 1))).toBe(true);
    expect(expired(jwt("ana", null))).toBe(true);
    expect(expired("basura")).toBe(true);
  });

  it("recuerda cada cuenta una vez, la última primero, sin tokens para el navegador y con tope", async () => {
    await rememberAccount(user("ana"), jwt("ana", later));
    await rememberAccount(user("luis"), jwt("luis", later));
    await rememberAccount(user("ana", "Ana de nuevo"), jwt("ana", later + 1));
    const saved = await savedAccounts();
    expect(saved.map((a) => a.id)).toEqual(["ana", "luis"]);
    expect(saved[0].name).toBe("Ana de nuevo");
    expect(JSON.stringify(saved)).not.toContain("firma");
    expect(await accountToken("luis")).toBe(jwt("luis", later));
    for (let i = 0; i < MAX_ACCOUNTS + 2; i++) await rememberAccount(user(`p${i}`), jwt(`p${i}`, later));
    expect(await savedAccounts()).toHaveLength(MAX_ACCOUNTS);
  });

  it("las sesiones que vencieron desaparecen solas y cerrar sesión de una deja las demás", async () => {
    await rememberAccount(user("ana"), jwt("ana", Math.floor(Date.now() / 1000) - 5));
    await rememberAccount(user("luis"), jwt("luis", later));
    expect((await savedAccounts()).map((a) => a.id)).toEqual(["luis"]);
    expect(await accountToken("ana")).toBeNull();
    await rememberAccount(user("maria"), jwt("maria", later));
    await forgetAccount("luis");
    expect((await savedAccounts()).map((a) => a.id)).toEqual(["maria"]);
    await forgetAccount("maria");
    expect(jar.has(ACCOUNTS_COOKIE)).toBe(false);
  });
});
