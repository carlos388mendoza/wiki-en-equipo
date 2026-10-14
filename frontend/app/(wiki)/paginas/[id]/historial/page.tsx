import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, RotateCcw } from "lucide-react";
import { restoreVersion } from "@/app/actions/admin";
import { BlockRenderer } from "@/components/page/BlockRenderer";
import { PageBackground } from "@/components/page/PageBackground";
import { ActionButton } from "@/components/ui/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { VisibilityBadge } from "@/components/ui/VisibilityBadge";
import { getHistory, getPage, pageTitle } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { canEdit } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { PageIcon } from "@/components/ui/PageIcon";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Historial · ${await pageTitle((await params).id)}` };
}

const fullDate = (iso: string) => new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });

export default async function HistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ version?: string }> }) {
  const [{ id }, { version }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const [pageRes, historyRes] = await Promise.all([getPage(user, id), getHistory(user, id)]);
  if (!pageRes.ok) {
    if (pageRes.error === "no_encontrada") notFound();
    return <StatusScreen error={pageRes.error} message={pageRes.error === "sin_acceso" ? undefined : pageRes.message} />;
  }
  if (!historyRes.ok) return <StatusScreen error={historyRes.error} message={historyRes.message} />;

  const page = pageRes.data;
  const history = historyRes.data;
  const selected = history.find((h) => String(h.version) === version) ?? history[0];
  const editable = canEdit(user, page);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <Link href={`/paginas/${page.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> {page.title}
      </Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold"><History size={26} aria-hidden /> Historial de ediciones</h1>
      <p className="mt-1 text-muted">Cada vez que se guarda la página, la versión anterior queda aquí. Versión actual: {page.version}.</p>

      {history.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">Esta página todavía no tiene versiones anteriores.</p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <nav aria-label="Versiones" className="self-start rounded-xl border border-line bg-surface lg:sticky lg:top-6">
            <ol className="max-h-[70dvh] divide-y divide-line overflow-y-auto">
              {history.map((h) => {
                const active = h.version === selected.version;
                return (
                  <li key={h.id}>
                    <Link href={`?version=${h.version}`} scroll={false} aria-current={active ? "true" : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm ${active ? "bg-basil-soft" : "hover:bg-paper"}`}>
                      <Avatar name={h.changedBy?.name ?? "?"} size={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">Versión {h.version}</span>
                        <span className="block truncate text-xs text-muted">{h.changedBy?.name ?? "Alguien"} · {timeAgo(h.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>

          <article className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Versión {selected.version}</p>
                <p className="text-xs text-muted">Reemplazada el {fullDate(selected.createdAt)} por {selected.changedBy?.name ?? "alguien"}</p>
              </div>
              {editable && (
                <ActionButton
                  action={restoreVersion.bind(null, page.id, selected.version)}
                  successHref={`/paginas/${page.id}`}
                  confirm={{ title: `¿Restaurar la versión ${selected.version}?`, body: "El contenido actual se guardará como una versión más del historial, así que no se pierde nada.", cta: "Restaurar esta versión" }}
                >
                  <RotateCcw size={14} aria-hidden /> Restaurar
                </ActionButton>
              )}
            </div>
            <PageBackground background={selected.snapshot.background} seed={page.id} className="h-24" sizes="800px" />
            <div className="px-5 pb-8 sm:px-8">
              <PageIcon icon={selected.snapshot.icon} size={48} className="-mt-6" />
              <h2 className="mt-2 font-display text-3xl font-bold">{selected.snapshot.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <VisibilityBadge visibility={selected.snapshot.visibility} />
                {selected.snapshot.tags.map((t) => <span key={t}>#{t}</span>)}
              </div>
              <hr className="my-6 border-line" />
              <BlockRenderer blocks={selected.snapshot.blocks} subpages={{}} />
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
