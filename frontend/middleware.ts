import { NextResponse, type NextRequest } from "next/server";

/**
 * Sin cookie de sesión, manda a /login recordando la ruta pedida.
 * Con cookie, pasa la ruta al layout (cabecera `x-pathname`) por si el backend
 * rechaza el token y hay que volver a pedir inicio de sesión.
 * La validación real de la sesión la hace el backend (`GET /api/auth/me`).
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = `${pathname}${search}`;
  if (!request.cookies.has("wiki_token")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(target)}`;
    return NextResponse.redirect(url);
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", target);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Todo menos el login, los archivos de Next y los recursos estáticos. /archivos queda fuera porque
  // valida la sesión por su cuenta y porque Next corta en 10 MB los cuerpos que pasan por el middleware.
  matcher: ["/((?!login|archivos|_next/|favicon.ico|manifest.webmanifest|sw.js|.*\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)"],
};
