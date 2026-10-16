import { redirect } from "next/navigation";
import type { ShareLinkInfo } from "@shared/types";
import { AcceptShareForm } from "@/components/pages/AcceptShareForm";
import { backend } from "@/lib/api/client";
import { getSession } from "@/lib/session";

export const metadata = { title: "Invitación" };

const permissionText = { READ: "podrás verla", EDIT: "podrás verla y editarla" } as const;

/** Destino de los enlaces que genera el backend (`FRONTEND_ORIGIN/share/<token>`), de páginas y de plantillas. */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getSession();
  if (!session.ok && session.error === "no_autenticado") redirect(`/login?next=${encodeURIComponent(`/share/${token}`)}`);

  // Qué abre el enlace (sin aceptarlo), para que el texto diga "página" o "plantilla".
  const info = session.ok ? await backend<ShareLinkInfo>(`/share/${encodeURIComponent(token)}`) : null;
  const kind = info?.ok && info.data.type === "template" ? "template" : "page";
  const noun = kind === "template" ? "plantilla" : "página";

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <span className="text-4xl" aria-hidden>📨</span>
        <h1 className="mt-3 font-display text-2xl font-bold">Te compartieron una {noun}</h1>
        {!session.ok ? (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{session.message}</p>
        ) : info && !info.ok && info.error === "no_encontrada" ? (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            El enlace no existe, venció o fue desactivado. Pide uno nuevo a quien te lo envió.
          </p>
        ) : (
          <>
            <p className="mt-2 text-muted">
              Al aceptar, {info?.ok ? `${permissionText[info.data.permission]} y ` : ""}la {noun} quedará{" "}
              {kind === "template" ? <>en <strong>Plantillas</strong>, en “Compartidas conmigo”,</> : <>en <strong>Compartidas conmigo</strong></>}{" "}
              de tu cuenta ({session.data.email}).
            </p>
            <AcceptShareForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
