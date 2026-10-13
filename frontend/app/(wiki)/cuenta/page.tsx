import { PasswordForm } from "@/components/auth/PasswordForm";
import { Avatar } from "@/components/ui/Avatar";
import { roleLabel } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-bold">Mi cuenta</h1>
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email} · {roleLabel[user.role]}{user.department ? ` en ${user.department.name}` : ""}</p>
        </div>
      </div>
      <section aria-labelledby="clave" className="mt-8 rounded-xl border border-line bg-surface p-5">
        <h2 id="clave" className="mb-4 font-display text-xl font-semibold">Cambiar contraseña</h2>
        <PasswordForm />
      </section>
      <p className="mt-4 text-sm text-muted">Para cambiar tu nombre, rol o departamento, pídeselo a un administrador.</p>
    </div>
  );
}
