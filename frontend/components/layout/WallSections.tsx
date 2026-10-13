import type { PageSummary } from "@/lib/types";
import { PageCard, PageRow } from "../page/PageCard";

/** Bloques comunes del muro de empresa y del muro de departamento. */
export function WallSections({ featured, mostVisited, recent, emptyFeatured = "Aún no hay páginas destacadas." }: {
  featured: PageSummary[]; mostVisited: PageSummary[]; recent: PageSummary[]; emptyFeatured?: string;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-10">
        <section aria-labelledby="destacadas">
          <h2 id="destacadas" className="mb-4 font-display text-xl font-semibold">Destacadas</h2>
          {featured.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">{emptyFeatured}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {featured.map((p) => <PageCard key={p.id} page={p} />)}
            </div>
          )}
        </section>
        <section aria-labelledby="recientes">
          <h2 id="recientes" className="mb-4 font-display text-xl font-semibold">Actualizadas recientemente</h2>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">Todavía no se ha publicado nada.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recent.map((p) => <PageCard key={p.id} page={p} />)}
            </div>
          )}
        </section>
      </div>
      <aside aria-labelledby="visitadas" className="self-start rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-6">
        <h2 id="visitadas" className="mb-2 font-display text-lg font-semibold">Más visitadas</h2>
        {mostVisited.length === 0 ? (
          <p className="text-sm text-muted">Sin visitas registradas.</p>
        ) : (
          <ol className="flex flex-col">{mostVisited.map((p, i) => <PageRow key={p.id} page={p} rank={i + 1} />)}</ol>
        )}
      </aside>
    </div>
  );
}
