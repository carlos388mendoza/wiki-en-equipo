import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/session";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; clave?: string }> }) {
  const { next, clave } = await searchParams;
  const session = await getSession();
  if (session.ok) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  const backendDown = !session.ok && session.error === "error_servidor";

  return (
    <main className="grid min-h-dvh place-items-center bg-basil px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 sm:p-8">
        <span className="text-4xl" aria-hidden>🍽️</span>
        <h1 className="mt-3 font-display text-3xl font-bold">Wiki Grupo Comidas</h1>
        <p className="mt-1 text-muted">Procesos, guías y documentación de todo el grupo.</p>

        {clave === "actualizada" && (
          <p role="status" className="mt-6 rounded-lg bg-basil-soft px-3 py-2 text-sm text-basil">
            Tu contraseña se actualizó. Inicia sesión con la nueva.
          </p>
        )}
        {backendDown && (
          <p role="alert" className="mt-6 rounded-lg bg-saffron-soft px-3 py-2 text-sm text-ink">
            No pudimos conectar con el servidor. Si el problema sigue, avisa al equipo de Tecnología.
          </p>
        )}

        <LoginForm next={next} />

        <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
          ¿No tienes cuenta o olvidaste tu contraseña? Pide ayuda al administrador de la wiki.
        </p>
      </div>
    </main>
  );
}
