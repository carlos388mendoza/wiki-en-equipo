import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { backend, getToken } from "./api/client";
import type { ApiResult, User } from "./types";

export { SESSION_COOKIE } from "./api/client";

/** Duración de la sesión: igual que el token del backend (8 horas). */
export const SESSION_MAX_AGE = 8 * 60 * 60;

/**
 * Sesión actual, validada contra el backend (`GET /api/auth/me`).
 * Distingue "no hay sesión" (`no_autenticado`) de "el servidor no responde".
 */
export const getSession = cache(async (): Promise<ApiResult<User>> => {
  if (!(await getToken())) return { ok: false, error: "no_autenticado", message: "Inicia sesión para continuar." };
  const res = await backend<{ user: User & { department?: { name: string; slug: string } | null } }>("/auth/me");
  if (!res.ok) return res;
  const { id, name, email, role, departmentId, department } = res.data.user;
  return { ok: true, data: { id, name, email, role, departmentId, department: department ?? null } };
});

/** Usuario actual o `null` si no hay sesión válida. */
export async function getCurrentUser(): Promise<User | null> {
  const res = await getSession();
  return res.ok ? res.data : null;
}

/** Usuario actual en pantallas protegidas por el layout (que ya redirige si no hay sesión). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
