import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getSidebar } from "@/lib/api";
import { savedAccounts } from "@/lib/accounts";
import { getSession } from "@/lib/session";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.ok) {
    if (session.error === "no_autenticado") {
      const path = (await headers()).get("x-pathname");
      redirect(path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login");
    }
    return <StatusScreen error={session.error} message={session.message} />;
  }
  const user = session.data;
  const [sections, accounts] = await Promise.all([getSidebar(user), savedAccounts()]);

  return (
    <div className="lg:flex">
      <Sidebar user={user} sections={sections} accounts={accounts} />
      {/* pb: espacio para la barra de navegación del celular (está fija abajo). */}
      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <OfflineBanner user={{ id: user.id, name: user.name }} />
        {children}
      </main>
    </div>
  );
}
