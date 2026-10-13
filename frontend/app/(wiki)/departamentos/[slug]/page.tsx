import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { WallSections } from "@/components/layout/WallSections";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getDepartmentWall } from "@/lib/api";
import { canEditWall } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export default async function DepartmentWall({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = (await getCurrentUser())!;
  const res = await getDepartmentWall(user, slug);

  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    return <StatusScreen error={res.error} />;
  }
  const { department, ...wall } = res.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className="mb-10 flex flex-col gap-4 rounded-2xl border border-line bg-surface px-6 py-8 sm:flex-row sm:items-end sm:px-10">
        <span className="text-6xl" aria-hidden>{department.emoji}</span>
        <div className="flex-1">
          <h1 className="font-display text-4xl font-bold leading-tight">{department.name}</h1>
          <p className="mt-1 max-w-lg text-muted">{department.description}</p>
        </div>
        {canEditWall(user, department) && (
          <button type="button" disabled title="Disponible en la fase 4 (administración)" className="inline-flex items-center gap-2 self-start rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-basil disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto">
            <Pencil size={14} aria-hidden /> Editar muro
          </button>
        )}
      </header>
      <WallSections {...wall} />
    </div>
  );
}
