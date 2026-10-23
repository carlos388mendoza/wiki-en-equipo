import { departmentIconFor } from "@/lib/departments";
import type { SidebarDepartment } from "@/lib/types";
import { PageIcon } from "../ui/PageIcon";

/** Icono de un departamento: el suyo de la base si lo tiene (emoji, Lucide, 3D) o el que sale de su nombre. */
export function DepartmentIcon({ department, size = 16 }: { department: Pick<SidebarDepartment, "name" | "icon">; size?: number }) {
  if (department.icon) return <PageIcon icon={department.icon} size={size} />;
  const Icon = departmentIconFor(department.name);
  return <Icon size={size} aria-hidden className="shrink-0" />;
}
