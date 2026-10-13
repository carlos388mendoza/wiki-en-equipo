import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Eye, Pencil, Share2, BookOpen } from "lucide-react";
import { BlockRenderer } from "@/components/page/BlockRenderer";
import { PageBackground } from "@/components/page/PageBackground";
import { Avatar } from "@/components/ui/Avatar";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { TagChip } from "@/components/ui/TagChip";
import { VisibilityBadge } from "@/components/ui/VisibilityBadge";
import { getChildren, getPage, getPageSummaries, getUser } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { canEdit, canShare } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export default async function PageView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const res = await getPage(user, id);

  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    return <StatusScreen error={res.error} />;
  }
  const page = res.data;

  const subpageIds = page.blocks.flatMap((b) => (b.type === "subpagina" ? [b.pageId] : []));
  const [owner, children, linked, parent] = await Promise.all([
    getUser(page.ownerId),
    getChildren(user, page.id),
    getPageSummaries(user, subpageIds),
    page.parentId ? getPageSummaries(user, [page.parentId]).then((r) => r[0]) : Promise.resolve(undefined),
  ]);
  const subpages = Object.fromEntries([...children, ...linked].map((p) => [p.id, p]));
  const unlinkedChildren = children.filter((c) => !subpageIds.includes(c.id));

  const editable = canEdit(user, page);
  const shareable = canShare(user, page);

  return (
    <article>
      <PageBackground background={page.background} className="h-44 sm:h-56" priority />

      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <div className="-mt-10 flex items-end justify-between gap-4">
          <span className="text-7xl leading-none drop-shadow" aria-hidden>{page.emoji}</span>
          <div className="flex gap-2 pb-1">
            {shareable && (
              <button type="button" disabled title="Disponible en la fase 2 (compartir)" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-basil disabled:cursor-not-allowed disabled:opacity-60">
                <Share2 size={14} aria-hidden /> Compartir
              </button>
            )}
            {editable ? (
              <button type="button" disabled title="Disponible en la fase 3 (editor)" className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-basil disabled:cursor-not-allowed disabled:opacity-60">
                <Pencil size={14} aria-hidden /> Editar
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm text-muted">
                <BookOpen size={14} aria-hidden /> Solo lectura
              </span>
            )}
          </div>
        </div>

        {parent && (
          <nav aria-label="Ruta" className="mt-4 flex items-center gap-1 text-sm text-muted">
            <Link href={`/paginas/${parent.id}`} className="hover:text-ink hover:underline">{parent.emoji} {parent.title}</Link>
            <ChevronRight size={14} aria-hidden />
            <span className="text-ink">{page.title}</span>
          </nav>
        )}

        <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{page.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          {owner && <span className="inline-flex items-center gap-2"><Avatar name={owner.name} size={22} /> {owner.name}</span>}
          <span>Editada {timeAgo(page.updatedAt)}</span>
          <VisibilityBadge visibility={page.visibility} />
          {page.visibility !== "privada" && (
            <span className="inline-flex items-center gap-1"><Eye size={14} aria-hidden /> {page.views} visitas</span>
          )}
        </div>

        {page.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">{page.tags.map((t) => <TagChip key={t} tag={t} />)}</div>
        )}

        <hr className="my-8 border-line" />

        <BlockRenderer blocks={page.blocks} subpages={subpages} />

        {unlinkedChildren.length > 0 && (
          <section className="mt-10" aria-labelledby="subpaginas">
            <h2 id="subpaginas" className="mb-3 font-display text-lg font-semibold">Subpáginas</h2>
            <ul className="flex flex-col gap-2">
              {unlinkedChildren.map((c) => (
                <li key={c.id}>
                  <Link href={`/paginas/${c.id}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-basil">
                    <span aria-hidden>{c.emoji}</span> {c.title}
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
