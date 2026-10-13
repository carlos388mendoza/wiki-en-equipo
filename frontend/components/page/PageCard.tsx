import Link from "next/link";
import { Eye } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { PageSummary } from "@/lib/types";
import { PageBackground } from "./PageBackground";
import { TagChip } from "../ui/TagChip";
import { VisibilityBadge } from "../ui/VisibilityBadge";
import { PageIcon } from "../ui/PageIcon";

export function PageCard({ page, showViews = false }: { page: PageSummary; showViews?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface hover:border-basil">
      <PageBackground background={page.background} seed={page.id} className="h-20" sizes="(min-width: 1024px) 320px, 100vw" />
      <PageIcon icon={page.icon} size={40} className="absolute left-4 top-11 drop-shadow-sm" />
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-8">
        <h3 className="font-display text-lg font-semibold leading-snug">
          <Link href={`/paginas/${page.id}`} className="after:absolute after:inset-0 group-hover:text-basil">
            {page.title}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {page.updatedAt ? `Editada ${timeAgo(page.updatedAt)}` : <VisibilityBadge visibility={page.visibility} />}
          {showViews && page.views !== undefined && (
            <span className="ml-3 inline-flex items-center gap-1"><Eye size={14} aria-hidden /> {page.views}</span>
          )}
        </p>
        {page.tags.length > 0 && (
          <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-2">
            {page.tags.map((t) => <TagChip key={t} tag={t} />)}
          </div>
        )}
      </div>
    </article>
  );
}

export function PageRow({ page, rank }: { page: PageSummary; rank?: number }) {
  return (
    <li>
      <Link href={`/paginas/${page.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper">
        {rank !== undefined && <span className="w-5 text-right text-sm font-semibold text-muted tabular-nums">{rank}</span>}
        <PageIcon icon={page.icon} size={18} />
        <span className="flex-1 truncate font-medium">{page.title}</span>
        <span className="inline-flex items-center gap-1 text-sm text-muted tabular-nums"><Eye size={14} aria-hidden />{page.views ?? 0}</span>
      </Link>
    </li>
  );
}
