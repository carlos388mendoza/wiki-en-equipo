import { RotateCcw, Trash2 } from "lucide-react";
import { deletePermanently, emptyTrash, restorePage } from "@/app/actions/admin";
import { ActionButton } from "@/components/ui/ActionButton";
import { PageIcon } from "@/components/ui/PageIcon";
import { TrashVisibility } from "@/components/page/TrashVisibility";
import { listTrash } from "@/lib/api";
import { canDelete } from "@/lib/permissions";
import { timeAgo } from "@/lib/format";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Papelera" };

/** Días que una página pasa en la papelera antes de borrarse sola (TRASH_RETENTION_DAYS del backend). */
const RETENTION_DAYS = Number(process.env.NEXT_PUBLIC_TRASH_RETENTION_DAYS ?? 30);

export default async function TrashPage() {
  const user = await requireUser();
  const res = await listTrash(user);
  if (!res.ok) return <StatusScreen error={res.error} message={res.message} />;
  const items = res.data;
  const mine = items.filter((p) => p.ownerId === user.id).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Papelera</h1>
          <p className="mt-2 text-muted">
            Las páginas que elimines (y sus subpáginas) quedan aquí hasta que las restaures.
            {RETENTION_DAYS > 0 && ` Pasados ${RETENTION_DAYS} días se eliminan para siempre.`}
          </p>
        </div>
        {mine > 0 && (
          <ActionButton
            action={emptyTrash}
            danger
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-line px-3 py-2 text-sm font-medium text-danger hover:border-danger hover:bg-danger-soft"
            confirm={{ title: "¿Vaciar la papelera?", body: `Se eliminarán para siempre ${mine === 1 ? "la página que creaste" : `las ${mine} páginas que creaste`} y sus archivos. No se puede deshacer.`, cta: "Vaciar papelera" }}
          >
            <Trash2 size={14} aria-hidden /> Vaciar papelera
          </ActionButton>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line px-4 py-8 text-center text-muted">La papelera está vacía. 🧹</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <PageIcon icon={p.icon} size={20} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">Eliminada {timeAgo(p.deletedAt!)} <TrashVisibility visibility={p.visibility} /></p>
              </div>
              {canDelete(user, p) && (
                <div className="flex items-center gap-2">
                  <ActionButton action={restorePage.bind(null, p.id)} ariaLabel={`Restaurar ${p.title}`}>
                    <RotateCcw size={14} aria-hidden /> Restaurar
                  </ActionButton>
                  <ActionButton
                    action={deletePermanently.bind(null, p.id)}
                    danger
                    ariaLabel={`Eliminar definitivamente ${p.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-danger-soft hover:text-danger"
                    confirm={{ title: "¿Eliminar definitivamente?", body: `“${p.title}”, sus subpáginas en la papelera, su historial y sus archivos se borrarán para siempre.`, cta: "Eliminar para siempre" }}
                  >
                    <Trash2 size={14} aria-hidden /> <span className="max-sm:sr-only">Eliminar</span>
                  </ActionButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
