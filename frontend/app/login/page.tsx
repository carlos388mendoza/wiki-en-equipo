import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { isInternalPath } from "@/lib/blocks";
import { getSession } from "@/lib/session";

export const metadata = { title: "Acceso" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; clave?: string; agregar?: string; vencida?: string }> }) {
  const { next, clave, agregar, vencida } = await searchParams;
  const session = await getSession();
  // "Agregar otra cuenta": se entra con otra sin cerrar la actual (queda guardada en este dispositivo).
  const adding = agregar === "1";
  if (session.ok && !adding) redirect(next && isInternalPath(next) ? next : "/");
  const backendDown = !session.ok && session.error === "error_servidor";

  // Fondo blanco cálido de la wiki; la tarjeta, blanca pura con borde y sombra para distinguirse.
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl shadow-ink/10 sm:p-8">
        <BrandLogo size={88} priority />
        <h1 className="mt-4 font-display text-3xl font-bold">Wiki Grupo Comidas</h1>
        <p className="mt-1 text-muted">Procesos, guías y documentación de todo el grupo.</p>

        {adding && (
          <p role="status" className="mt-6 rounded-lg bg-sky-soft px-3 py-2 text-sm text-sky">
            {vencida === "1" ? "La sesión de esa cuenta terminó. Vuelve a entrar con ella." : "Entra con otra cuenta. Las que ya iniciaron sesión en este dispositivo siguen abiertas."}
          </p>
        )}
        {clave === "actualizada" && (
          <p role="status" className="mt-6 rounded-lg bg-sky-soft px-3 py-2 text-sm text-sky">
            Tu contraseña se actualizó. Inicia sesión con la nueva.
          </p>
        )}
        {backendDown && (
          <p role="alert" className="mt-6 rounded-lg bg-sun-soft px-3 py-2 text-sm text-ink">
            No pudimos conectar con el servidor. Si el problema sigue, avisa al equipo de Tecnología.
          </p>
        )}

        <LoginForm next={next} />
        {adding && session.ok && (
          <Link href="/" className="mt-3 block text-center text-sm font-medium text-sky hover:underline">Volver a la wiki como {session.data.name}</Link>
        )}

        <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
          ¿No tienes cuenta o olvidaste tu contraseña? Pide ayuda al administrador de la wiki.
        </p>
      </div>
    </main>
  );
}
