import { RotateCcw } from "lucide-react";
import { restorePage } from "@/app/actions/admin";
import { ActionButton } from "@/components/ui/ActionButton";
import { listTrash } from "@/lib/api";
import { canDelete } from "@/lib/permissions";
import { timeAgo } from "@/lib/format";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Papelera" };

export default async function TrashPage() {
  const user = await requireUser();
  const res = await listTrash(user);
  if (!res.ok) return <StatusScreen error={res.error} message={res.message} />;
  const items = res.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-bold">Papelera</h1>
      <p className="mt-2 text-muted">Las páginas que elimines (y sus subpáginas) quedan aquí hasta que las restaures. Al restaurar una página también vuelven sus subpáginas.</p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">La papelera está vacía. 🧹</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden>📄</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-sm text-muted">Eliminada {timeAgo(p.deletedAt!)}</p>
              </div>
              {canDelete(user, p) && (
                <ActionButton action={restorePage.bind(null, p.id)} ariaLabel={`Restaurar ${p.title}`}>
                  <RotateCcw size={14} aria-hidden /> Restaurar
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
