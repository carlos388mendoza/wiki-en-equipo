import { AdminNav } from "@/components/admin/AdminNav";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { canManageUsers } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata = { title: { default: "Administración", template: "%s · Administración" } };

/** Sección solo para administradores (el backend vuelve a verificar cada acción). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!canManageUsers(user)) {
    return <StatusScreen error="sin_acceso" title="Esta sección es para administradores" message="Si necesitas crear usuarios o cambiar permisos, pídeselo a un administrador de la wiki." />;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-bold">Administración</h1>
      <AdminNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
