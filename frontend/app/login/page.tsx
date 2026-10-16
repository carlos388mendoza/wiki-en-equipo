import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { isInternalPath } from "@/lib/blocks";
import { getSession } from "@/lib/session";

export const metadata = { title: "Acceso" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; clave?: string }> }) {
  const { next, clave } = await searchParams;
  const session = await getSession();
  if (session.ok) redirect(next && isInternalPath(next) ? next : "/");
  const backendDown = !session.ok && session.error === "error_servidor";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-brand px-4 py-10">
      {/* La curva amarilla del logo, como detalle de fondo. */}
      <svg aria-hidden viewBox="0 0 1200 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full sm:h-44">
        <path d="M0 170 C 380 210, 820 150, 1200 30 L 1200 200 L 0 200 Z" fill="var(--color-sun)" />
        <path d="M0 150 C 380 190, 820 130, 1200 10" fill="none" stroke="var(--color-ink)" strokeOpacity="0.15" strokeWidth="6" />
      </svg>
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl sm:p-8">
        <BrandLogo size={88} priority />
        <h1 className="mt-4 font-display text-3xl font-bold">Wiki Grupo Comidas</h1>
        <p className="mt-1 text-muted">Procesos, guías y documentación de todo el grupo.</p>

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

        <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
          ¿No tienes cuenta o olvidaste tu contraseña? Pide ayuda al administrador de la wiki.
        </p>
      </div>
    </main>
  );
}
