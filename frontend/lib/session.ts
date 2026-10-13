import { cookies } from "next/headers";
import { getUser } from "./api";

export const SESSION_COOKIE = "wiki_user";

/**
 * Usuario actual. Mientras no haya inicio de sesión real, se lee de una cookie
 * que permite cambiar de usuario para probar permisos.
 * Al conectar con el backend, aquí se lee la sesión verdadera.
 */
export async function getCurrentUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return id ? getUser(id) : null;
}
