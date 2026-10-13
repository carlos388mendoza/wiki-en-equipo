import { notFound } from "next/navigation";
import { Pencil, Users } from "lucide-react";
import { WallSections } from "@/components/layout/WallSections";
import { BlockRenderer } from "@/components/page/BlockRenderer";
import { PageBackground } from "@/components/page/PageBackground";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getDepartmentWall, getPageSummaries } from "@/lib/api";
import { linkedPageIds } from "@/lib/blocks";
import { canEditWall } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function DepartmentWall({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const res = await getDepartmentWall(user, slug);

  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    if (res.error === "sin_acceso") {
      return <StatusScreen error="sin_acceso" title="Este muro es solo para su departamento" message="Solo los miembros del departamento y los administradores pueden entrar. Si necesitas algo de este equipo, pídeles que te compartan la página." />;
    }
    return <StatusScreen error={res.error} message={res.message} />;
  }
  const { department, wall, ...sections } = res.data;
  const subpages = wall ? Object.fromEntries((await getPageSummaries(user, linkedPageIds(wall.blocks))).map((p) => [p.id, p])) : {};
  const editable = canEditWall(user, department);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-line bg-surface">
        <PageBackground background={wall?.background ?? null} seed={department.id} className="h-28 sm:h-36" priority />
        <div className="flex flex-col gap-4 px-6 pb-8 sm:flex-row sm:items-end sm:px-10">
          <span className="-mt-10 text-6xl drop-shadow" aria-hidden>{wall?.icon ?? "🏢"}</span>
          <div className="flex-1">
            <h1 className="font-display text-4xl font-bold leading-tight">{department.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <Users size={14} aria-hidden />
              {department.memberCount !== undefined ? `${department.memberCount} ${department.memberCount === 1 ? "persona" : "personas"} · ` : ""}
              Muro del departamento
            </p>
          </div>
          {editable && (
            <button type="button" disabled title="Disponible en la fase 4 (administración)" className="inline-flex items-center gap-2 self-start rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-basil disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto">
              <Pencil size={14} aria-hidden /> Editar muro
            </button>
          )}
        </div>
      </header>

      {wall && wall.blocks.length > 0 ? (
        <section aria-labelledby="muro" className="mb-12 rounded-2xl border border-line bg-surface px-6 py-8 sm:px-10">
          <h2 id="muro" className="sr-only">Contenido del muro</h2>
          <BlockRenderer blocks={wall.blocks} subpages={subpages} />
        </section>
      ) : editable ? (
        <p className="mb-10 rounded-xl border border-dashed border-line px-4 py-6 text-muted">
          Este muro todavía no tiene una página de inicio. Usa <strong>Editar muro</strong> para elegir una o crearla desde la plantilla “Inicio del departamento”.
        </p>
      ) : null}

      <WallSections {...sections} emptyFeatured={editable ? "Elige hasta 12 páginas publicadas para destacarlas aquí." : "Aún no hay páginas destacadas."} />
    </div>
  );
}
