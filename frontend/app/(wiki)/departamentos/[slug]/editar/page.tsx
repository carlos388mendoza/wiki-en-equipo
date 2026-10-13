import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FeaturedEditor, WallPagePicker } from "@/components/departments/WallEditor";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getDepartmentWall, listDepartmentPages } from "@/lib/api";
import { canEditWall } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Editar muro" };

export default async function EditDepartmentWall({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const res = await getDepartmentWall(user, slug);
  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    return <StatusScreen error={res.error} message={res.error === "sin_acceso" ? "Solo los miembros del departamento y los administradores pueden entrar." : res.message} />;
  }
  const { department, wall, featured } = res.data;
  if (!canEditWall(user, department)) {
    return <StatusScreen error="sin_acceso" title="Solo el administrador del departamento puede editar el muro" message="Si necesitas cambiar algo del muro, pídeselo a quien administra tu departamento." />;
  }
  const pages = await listDepartmentPages(user, department.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <Link href={`/departamentos/${department.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Muro de {department.name}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Editar muro</h1>
      <p className="mt-1 text-muted">Elige la página de inicio y las páginas destacadas de {department.name}.</p>

      <div className="mt-8 flex flex-col gap-6">
        <WallPagePicker
          target={{ kind: "department", departmentId: department.id, name: department.name }}
          wall={wall ? { id: wall.id, title: wall.title } : null}
          candidates={pages.filter((p) => p.departmentId === department.id)}
        />
        <FeaturedEditor departmentId={department.id} initial={featured} candidates={pages.filter((p) => p.departmentId === department.id && p.id !== wall?.id)} />
      </div>
    </div>
  );
}
