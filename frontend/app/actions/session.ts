"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { backend, getToken, SESSION_COOKIE } from "@/lib/api/client";
import { isInternalPath } from "@/lib/blocks";
import { accountToken, forgetAccount, forgetAllAccounts, rememberAccount, savedAccounts, setSessionCookie } from "@/lib/accounts";
import { getSession, SESSION_MAX_AGE } from "@/lib/session";
import type { User } from "@/lib/types";

export type LoginState = { error?: string; email?: string };

/** Solo rutas internas: evita redirigir a otro sitio con `?next=`. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && isInternalPath(value) ? value : "/";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña.", email };

  // El backend limita los intentos fallidos por persona e IP y confía en este encabezado cuando viene del
  // servidor de Next (TRUST_PROXY). Sin él, todas las personas compartirían la IP del servidor.
  // Se usa la última IP de la lista: la agrega el proxy más cercano; las primeras las puede inventar el navegador.
  const h = await headers();
  const clientIp = h.get("x-forwarded-for")?.split(",").map((ip) => ip.trim()).filter(Boolean).at(-1) || h.get("x-real-ip") || undefined;
  // En Vercel, el X-Forwarded-For de una función a otra se reescribe: la IP va en X-Wiki-Client-Ip, firmada
  // con PROXY_SECRET (solo en el servidor; el backend la ignora si el secreto no coincide).
  const proxySecret = process.env.PROXY_SECRET;
  const res = await backend<{ token: string }>("/auth/login", {
    method: "POST", body: { email, password }, token: null,
    ...(clientIp && { headers: { "X-Forwarded-For": clientIp, ...(proxySecret && { "X-Wiki-Client-Ip": clientIp, "X-Wiki-Proxy-Secret": proxySecret }) } }),
  });
  if (!res.ok) {
    const message =
      res.error === "no_autenticado" ? "Correo o contraseña incorrectos."
      : res.error === "datos_invalidos" ? "Revisa que el correo esté bien escrito."
      : res.error === "demasiados_intentos" ? "Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo."
      : res.message;
    return { error: message, email };
  }

  // "Agregar otra cuenta": la sesión que ya estaba abierta también queda guardada (por si se abrió antes de existir
  // las cuentas del dispositivo), así se puede volver a ella.
  const previous = await getToken();
  const previousUser = previous && previous !== res.data.token ? await userFor(previous) : null;
  if (previous && previousUser) await rememberAccount(previousUser, previous);

  (await cookies()).set(SESSION_COOKIE, res.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Se guarda en las cuentas de este dispositivo (cifrada), para volver a ella sin contraseña.
  const me = await userFor(res.data.token);
  if (me) await rememberAccount(me, res.data.token);
  redirect(safeNext(form.get("next")));
}

/** Persona de un token, validada por el backend; `null` si el token ya no sirve. */
async function userFor(token: string): Promise<User | null> {
  const res = await backend<{ user: User & { department?: { name: string; slug: string } | null } }>("/auth/me", { token });
  if (!res.ok) return null;
  const { id, name, email, role, departmentId, department } = res.data.user;
  return { id, name, email, role, departmentId, department: department ?? null };
}

/**
 * Cierra la sesión actual. Si hay otras cuentas guardadas en el dispositivo, sigue con la primera que siga vigente
 * (como en Google); si no, va al inicio de sesión.
 */
export async function signOut() {
  const current = await getSession();
  if (current.ok) await forgetAccount(current.data.id);
  (await cookies()).delete(SESSION_COOKIE);
  for (const account of await savedAccounts()) {
    const token = await accountToken(account.id);
    if (token && (await userFor(token))) { await setSessionCookie(token); redirect("/"); }
    await forgetAccount(account.id);
  }
  redirect("/login");
}

/** Cierra todas las sesiones de este dispositivo. */
export async function signOutAll() {
  await forgetAllAccounts();
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/** Cierra la sesión de otra cuenta guardada (no la actual). */
export async function signOutAccount(id: string) {
  await forgetAccount(id);
  revalidatePath("/", "layout");
}

/** Cambia a otra cuenta guardada sin pedir la contraseña. Si su sesión venció, pide entrar de nuevo con ella. */
export async function switchAccount(id: string) {
  const token = await accountToken(id);
  const user = token ? await userFor(token) : null;
  if (!token || !user) {
    await forgetAccount(id);
    redirect("/login?agregar=1&vencida=1");
  }
  await setSessionCookie(token);
  await rememberAccount(user, token);
  redirect("/");
}

/**
 * Token para el canal en tiempo real (WebSocket). Es el único caso en que el
 * navegador recibe el token: el backend lo exige en el mensaje de autenticación.
 */
export async function getRealtimeToken(): Promise<string | null> {
  return (await getToken()) ?? null;
}

export type PasswordState = { error?: string };

export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  if (newPassword.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  const res = await backend("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
  if (!res.ok) return { error: res.error === "no_autenticado" ? "La contraseña actual no es correcta." : res.message };
  // El backend invalida todas las sesiones al cambiar la contraseña (también la guardada en este dispositivo).
  const current = await getSession();
  if (current.ok) await forgetAccount(current.data.id);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login?clave=actualizada");
}
