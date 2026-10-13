import "server-only";
import { cookies } from "next/headers";
import type { ApiError, ApiResult } from "../types";

/** URL del backend, solo del lado del servidor. */
export const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");
export const SESSION_COOKIE = "wiki_token";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

const defaultMessages: Record<ApiError, string> = {
  no_autenticado: "Tu sesión terminó. Vuelve a iniciar sesión.",
  sin_acceso: "No tienes permiso para hacer esto.",
  no_encontrada: "No encontramos lo que buscas.",
  conflicto: "Alguien más hizo cambios al mismo tiempo.",
  datos_invalidos: "Revisa los datos e intenta de nuevo.",
  archivo_rechazado: "El archivo no se pudo subir.",
  demasiados_intentos: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
  error_servidor: "No pudimos conectar con el servidor. Intenta de nuevo en un momento.",
};

/** Traduce un estado HTTP del backend al error que entiende la interfaz. */
export function errorFromStatus(status: number): ApiError {
  if (status === 401) return "no_autenticado";
  if (status === 403) return "sin_acceso";
  if (status === 404) return "no_encontrada";
  if (status === 409) return "conflicto";
  if (status === 413 || status === 415) return "archivo_rechazado";
  if (status === 429) return "demasiados_intentos";
  if (status >= 400 && status < 500) return "datos_invalidos";
  return "error_servidor";
}

export function failure<T>(error: ApiError, message?: string, details?: unknown): ApiResult<T> {
  return { ok: false, error, message: message || defaultMessages[error], ...(details === undefined ? {} : { details }) };
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  /** Por defecto se usa el token de la cookie de sesión. */
  token?: string | null;
};

/**
 * Llama a una ruta del backend (`/api/...`) y devuelve `{ ok, data }` o `{ ok: false, error }`.
 * Nunca lanza: los errores de red se devuelven como `error_servidor`.
 */
export async function backend<T>(path: string, { method = "GET", body, form, token }: Options = {}): Promise<ApiResult<T>> {
  const auth = token === undefined ? await getToken() : token;
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api${path}`, {
      method,
      headers,
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
      cache: "no-store",
    });
  } catch {
    return failure("error_servidor");
  }

  if (res.status === 204) return { ok: true, data: undefined as T };
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
  if (!res.ok) {
    const error = errorFromStatus(res.status);
    return failure(error, error === "error_servidor" ? undefined : json?.error?.message, json?.error?.details);
  }
  return { ok: true, data: json as T };
}
