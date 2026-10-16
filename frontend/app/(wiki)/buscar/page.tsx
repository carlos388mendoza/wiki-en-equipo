import { Search } from "lucide-react";
import { PageCard } from "@/components/page/PageCard";
import { TagChip } from "@/components/ui/TagChip";
import { listTags, searchPages } from "@/lib/api";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { requireUser } from "@/lib/session";
import type { Metadata } from "next";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; etiqueta?: string }> }): Promise<Metadata> {
  const { q, etiqueta } = await searchParams;
  const term = q?.trim().slice(0, 60) || (etiqueta ? `#${etiqueta.slice(0, 40)}` : "");
  return { title: term ? `Buscar: ${term}` : "Buscar" };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; etiqueta?: string }> }) {
  const { q = "", etiqueta } = await searchParams;
  const user = await requireUser();
  const [res, tags] = await Promise.all([searchPages(user, q, etiqueta), listTags(user)]);
  if (!res.ok) return <StatusScreen error={res.error} message={res.message} />;
  const results = res.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-bold">Buscar</h1>

      <form className="mt-6" role="search">
        {etiqueta && <input type="hidden" name="etiqueta" value={etiqueta} />}
        <label htmlFor="q" className="sr-only">Buscar páginas</label>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 focus-within:border-brand">
          <Search size={18} className="text-muted" aria-hidden />
          <input id="q" name="q" defaultValue={q} placeholder="Buscar en títulos y contenido…" className="h-12 min-w-0 flex-1 bg-transparent outline-none" />
          <button type="submit" className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-brand">Buscar</button>
        </div>
      </form>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm text-muted">Filtrar por etiqueta:</span>
          {tags.map((t) => <TagChip key={t} tag={t} active={t === etiqueta} />)}
          {etiqueta && <a href={q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar"} className="ml-2 text-sm text-muted underline hover:text-ink">Quitar filtro</a>}
        </div>
      )}

      <p className="mt-8 text-sm text-muted" aria-live="polite">
        {results.length === 1 ? "1 página" : `${results.length} páginas`}
      </p>
      {results.length === 0 ? (
        <p className="mt-4 text-muted">No hay páginas que coincidan. Prueba con otra palabra (no importan las tildes) o quita el filtro.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => <PageCard key={p.id} page={p} />)}
        </div>
      )}
    </div>
  );
}
