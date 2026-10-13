import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { listDepartments, listUsers } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Usuarios y departamentos" };

export default async function UsersPage() {
  const user = await requireUser();
  const [users, departments] = await Promise.all([listUsers(), listDepartments()]);
  if (!users.ok) return <StatusScreen error={users.error} message={users.message} />;
  return <UsersAdmin users={users.data} departments={departments} viewerId={user.id} />;
}
