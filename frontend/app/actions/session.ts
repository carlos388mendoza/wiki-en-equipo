"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backend, getToken, SESSION_COOKIE } from "@/lib/api/client";
import { SESSION_MAX_AGE } from "@/lib/session";

export type LoginState = { error?: string; email?: string };

/** Solo rutas internas: evita redirigir a otro sitio con `?next=`. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña.", email };

  const res = await backend<{ token: string }>("/auth/login", { method: "POST", body: { email, password }, token: null });
  if (!res.ok) {
    const message =
      res.error === "no_autenticado" ? "Correo o contraseña incorrectos."
      : res.error === "datos_invalidos" ? "Revisa que el correo esté bien escrito."
      : res.message;
    return { error: message, email };
  }

  (await cookies()).set(SESSION_COOKIE, res.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/**
 * Token para el canal en tiempo real (WebSocket). Es el único caso en que el
 * navegador recibe el token: el backend lo exige en el mensaje de autenticación.
 */
export async function getRealtimeToken(): Promise<string | null> {
  return (await getToken()) ?? null;
}

export async function changePassword(_prev: { error?: string; done?: boolean }, form: FormData) {
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  if (newPassword.length < 12) return { error: "La nueva contraseña debe tener al menos 12 caracteres." };
  const res = await backend("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
  if (!res.ok) return { error: res.error === "no_autenticado" ? "La contraseña actual no es correcta." : res.message };
  // El backend invalida todas las sesiones al cambiar la contraseña.
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login?clave=actualizada");
}
