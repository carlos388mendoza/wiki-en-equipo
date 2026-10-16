import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, History, Pencil, Trash2 } from "lucide-react";
import { trashPage } from "@/app/actions/admin";
import { ActionButton } from "@/components/ui/ActionButton";
import { BlockRenderer } from "@/components/page/BlockRenderer";
import { PageBackground } from "@/components/page/PageBackground";
import { VisitCounter } from "@/components/page/VisitCounter";
import { NewPageButton } from "@/components/pages/NewPageDialog";
import { ShareButton } from "@/components/pages/ShareDialog";
import { Avatar } from "@/components/ui/Avatar";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { TagChip } from "@/components/ui/TagChip";
import { VisibilityBadge } from "@/components/ui/VisibilityBadge";
import { getPage, getPageSummaries, pageTitle } from "@/lib/api";
import { linkedPageIds } from "@/lib/blocks";
import { timeAgo } from "@/lib/format";
import { canDelete, canEdit, canShare } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { PageIcon } from "@/components/ui/PageIcon";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: await pageTitle((await params).id) };
}

export default async function PageView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const res = await getPage(user, id);

  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    return <StatusScreen error={res.error} message={res.error === "sin_acceso" ? undefined : res.message} />;
  }
  const page = res.data;

  const linkedIds = linkedPageIds(page.blocks);
  const linked = await getPageSummaries(user, linkedIds);
  const { ancestors } = page;
  const subpages = Object.fromEntries([...page.children, ...linked].map((p) => [p.id, p]));
  const unlinkedChildren = page.children.filter((c) => !linkedIds.includes(c.id));

  const editable = canEdit(user, page);
  const shareable = canShare(user, page);

  return (
    <article>
      <PageBackground background={page.background} seed={page.id} className="h-44 sm:h-56" priority />

      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
          <PageIcon icon={page.icon} size={76} className="drop-shadow" />
          <div className="flex flex-wrap gap-2 pb-1">
            {shareable && <ShareButton page={page} viewer={user} />}
            {editable ? (
              <>
                <NewPageButton parentId={page.id} parentTitle={page.title} variant="secondary" />
                <Link href={`/paginas/${page.id}/editar`} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-brand">
                  <Pencil size={14} aria-hidden /> Editar
                </Link>
              </>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm text-muted">
                <BookOpen size={14} aria-hidden /> Solo lectura
              </span>
            )}
          </div>
        </div>

        {(ancestors.length > 0 || page.parentId) && (
          <nav aria-label="Ruta" className="mt-4 flex flex-wrap items-center gap-1 text-sm text-muted">
            {ancestors.length > 0 ? ancestors.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1">
                <Link href={`/paginas/${a.id}`} className="hover:text-ink hover:underline">{a.title}</Link>
                <ChevronRight size={14} aria-hidden />
              </span>
            )) : (
              <span className="inline-flex items-center gap-1">
                <Link href={`/paginas/${page.parentId}`} className="hover:text-ink hover:underline">Página superior</Link>
                <ChevronRight size={14} aria-hidden />
              </span>
            )}
            <span className="text-ink">{page.title}</span>
          </nav>
        )}

        <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{page.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          {page.owner && <span className="inline-flex items-center gap-2"><Avatar name={page.owner.name} size={22} /> {page.owner.name}</span>}
          <span>Editada {timeAgo(page.updatedAt)}</span>
          <VisibilityBadge visibility={page.visibility} />
          <VisitCounter pageId={page.id} initial={page.views} isPublic={page.visibility !== "PRIVATE"} />
        </div>

        {page.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">{page.tags.map((t) => <TagChip key={t} tag={t} />)}</div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/paginas/${page.id}/historial`} className="inline-flex items-center gap-1.5 text-muted hover:text-ink hover:underline">
            <History size={14} aria-hidden /> Historial
          </Link>
          {canDelete(user, page) && !page.isWall && !page.isCompanyWall && (
            <ActionButton
              action={trashPage.bind(null, page.id)}
              successHref="/papelera"
              danger
              className="inline-flex items-center gap-1.5 text-muted hover:text-danger hover:underline"
              confirm={{ title: "¿Mover a la papelera?", body: page.children.length ? `“${page.title}” y sus subpáginas dejarán de verse en la wiki. Podrás restaurarlas desde la papelera.` : `“${page.title}” dejará de verse en la wiki. Podrás restaurarla desde la papelera.`, cta: "Mover a la papelera" }}
            >
              <Trash2 size={14} aria-hidden /> Mover a la papelera
            </ActionButton>
          )}
        </div>

        <hr className="my-8 border-line" />

        <BlockRenderer blocks={page.blocks} subpages={subpages} />

        {unlinkedChildren.length > 0 && (
          <section className="mt-10" aria-labelledby="subpaginas">
            <h2 id="subpaginas" className="mb-3 font-display text-lg font-semibold">Subpáginas</h2>
            <ul className="flex flex-col gap-2">
              {unlinkedChildren.map((c) => (
                <li key={c.id}>
                  <Link href={`/paginas/${c.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-brand">
                    <PageIcon icon={c.icon} size={18} /> {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="h-24" />
      </div>
    </article>
  );
}
