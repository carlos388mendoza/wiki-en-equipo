import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DepartmentInfoEditor, FeaturedEditor, WallPagePicker } from "@/components/departments/WallEditor";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getDepartment, getDepartmentWall, listDepartmentPages } from "@/lib/api";
import { canEditWall } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const res = await getDepartment((await params).slug);
  return { title: res.ok ? `Editar muro · ${res.data.name}` : res.error === "sin_acceso" ? "Muro de otro departamento" : "Departamento no encontrado" };
}

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
      <p className="mt-1 text-muted">Presentación, página de inicio y páginas destacadas de {department.name}.</p>

      <div className="mt-8 flex flex-col gap-6">
        <DepartmentInfoEditor departmentId={department.id} initial={{ description: department.description, icon: department.icon }} />
        <WallPagePicker
          target={{ kind: "department", departmentId: department.id, name: department.name }}
          wall={wall ? { id: wall.id, title: wall.title } : null}
          candidates={pages.filter((p) => p.departmentId === department.id)}
        />
        <FeaturedEditor target={{ kind: "department", departmentId: department.id, name: department.name }} initial={featured} candidates={pages.filter((p) => p.departmentId === department.id && p.id !== wall?.id)} />
      </div>
    </div>
  );
}
