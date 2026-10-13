import { redirect } from "next/navigation";
import { AcceptShareForm } from "@/components/pages/AcceptShareForm";
import { getSession } from "@/lib/session";

export const metadata = { title: "Página compartida" };

/** Destino de los enlaces que genera el backend (`FRONTEND_ORIGIN/share/<token>`). */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getSession();
  if (!session.ok && session.error === "no_autenticado") redirect(`/login?next=${encodeURIComponent(`/share/${token}`)}`);

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <span className="text-4xl" aria-hidden>📨</span>
        <h1 className="mt-3 font-display text-2xl font-bold">Te compartieron una página</h1>
        {session.ok ? (
          <>
            <p className="mt-2 text-muted">
              Al aceptar, la página quedará en <strong>Compartidas conmigo</strong> de tu cuenta ({session.data.email}).
            </p>
            <AcceptShareForm token={token} />
          </>
        ) : (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{session.message}</p>
        )}
      </div>
    </main>
  );
}
