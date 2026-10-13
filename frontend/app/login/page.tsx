import { redirect } from "next/navigation";
import { signInAs } from "@/app/actions";
import { Avatar } from "@/components/ui/Avatar";
import { listDepartments, listUsers } from "@/lib/api";
import { roleLabel } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const [users, departments] = await Promise.all([listUsers(), listDepartments()]);
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? "";

  return (
    <main className="grid min-h-dvh place-items-center bg-basil px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8">
        <span className="text-4xl" aria-hidden>🍽️</span>
        <h1 className="mt-3 font-display text-3xl font-bold">Wiki Grupo Comidas</h1>

        <form className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Correo
            <input type="email" disabled placeholder="nombre@grupocomidas.com" className="h-11 rounded-lg border border-line px-3 font-normal disabled:bg-paper" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Contraseña
            <input type="password" disabled className="h-11 rounded-lg border border-line px-3 disabled:bg-paper" />
          </label>
          <button type="button" disabled className="h-11 rounded-lg bg-ink font-medium text-white disabled:opacity-60">Iniciar sesión</button>
          <p className="text-xs text-muted">Se activa al conectar con el inicio de sesión del backend.</p>
        </form>

        <div className="mt-8 border-t border-line pt-6">
          <h2 className="text-sm font-semibold">Entrar como usuario de prueba</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {users.map((u) => (
              <li key={u.id}>
                <form action={signInAs.bind(null, u.id)}>
                  <button type="submit" className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left hover:border-basil hover:bg-basil-soft">
                    <Avatar name={u.name} />
                    <span className="flex-1">
                      <span className="block font-medium">{u.name}</span>
                      <span className="block text-xs text-muted">{roleLabel[u.role]} en {deptName(u.departmentId)}</span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
