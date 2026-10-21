import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./api/client";
import type { User, UserRole } from "./types";

/**
 * Varias cuentas en el mismo dispositivo, como en Google: cada inicio de sesión se guarda en la cookie `wiki_cuentas`,
 * httpOnly (el navegador no la puede leer) y cifrada con AES-256-GCM con una clave que solo tiene el servidor
 * (`ACCOUNTS_SECRET` o, si no hay, `PROXY_SECRET`). Así se cambia de cuenta sin volver a escribir la contraseña.
 * Cada sesión dura lo mismo que su token (8 horas); el backend sigue validando cada token en cada petición.
 * En producción, sin secreto, no se guardan cuentas (solo queda la sesión actual).
 */
export const ACCOUNTS_COOKIE = "wiki_cuentas";
export const MAX_ACCOUNTS = 5;
const MAX_AGE = 8 * 60 * 60;

/** Lo que el navegador ve de cada cuenta (nunca el token). */
export type SavedAccount = { id: string; name: string; email: string; role: UserRole; department: string | null };
type StoredAccount = SavedAccount & { token: string };

function key(): Buffer | null {
  const secret = process.env.ACCOUNTS_SECRET || process.env.PROXY_SECRET || (process.env.NODE_ENV === "production" ? "" : "solo-para-desarrollo-local");
  return secret ? createHash("sha256").update(`wiki-cuentas:${secret}`).digest() : null;
}

export function seal(accounts: StoredAccount[], k = key()): string | null {
  if (!k) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(accounts), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function unseal(value: string | undefined, k = key()): StoredAccount[] {
  if (!value || !k) return [];
  try {
    const [iv, tag, data] = value.split(".").map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    const list = JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
    return Array.isArray(list) ? list.filter((a) => a && typeof a.id === "string" && typeof a.token === "string").slice(0, MAX_ACCOUNTS) : [];
  } catch {
    return []; // alterada o de otra clave: se ignora
  }
}

/** Fecha de vencimiento del token (JWT), para no ofrecer sesiones ya vencidas. */
function expired(token: string) {
  try {
    const { exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

async function readStored(): Promise<StoredAccount[]> {
  return unseal((await cookies()).get(ACCOUNTS_COOKIE)?.value).filter((a) => !expired(a.token));
}

async function writeStored(accounts: StoredAccount[]) {
  const jar = await cookies();
  const value = accounts.length ? seal(accounts.slice(0, MAX_ACCOUNTS)) : null;
  if (!value) { jar.delete(ACCOUNTS_COOKIE); return; }
  jar.set(ACCOUNTS_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

/** Cuentas guardadas en este dispositivo, sin tokens. */
export async function savedAccounts(): Promise<SavedAccount[]> {
  return (await readStored()).map(({ token: _token, ...account }) => account);
}

/** Guarda (o actualiza) la cuenta con la que se acaba de entrar; queda primera. */
export async function rememberAccount(user: User, token: string) {
  const account: StoredAccount = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department?.name ?? null, token };
  await writeStored([account, ...(await readStored()).filter((a) => a.id !== user.id)]);
}

export async function accountToken(id: string): Promise<string | null> {
  return (await readStored()).find((a) => a.id === id)?.token ?? null;
}

export async function forgetAccount(id: string) {
  await writeStored((await readStored()).filter((a) => a.id !== id));
}

export async function forgetAllAccounts() {
  (await cookies()).delete(ACCOUNTS_COOKIE);
}
