import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getSidebar } from "@/lib/api";
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
  const sections = await getSidebar(user);

  return (
    <div className="lg:flex">
      <Sidebar user={user} sections={sections} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
