import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSidebar, listDepartments } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [sections, departments] = await Promise.all([getSidebar(user), listDepartments()]);
  const department = departments.find((d) => d.id === user.departmentId)!;

  return (
    <div className="lg:flex">
      <Sidebar user={user} department={department} sections={sections} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
