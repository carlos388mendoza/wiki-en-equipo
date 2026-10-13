import { RotateCcw } from "lucide-react";
import { listTrash } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Papelera" };

export default async function TrashPage() {
  const user = (await getCurrentUser())!;
  const items = await listTrash(user);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-bold">Papelera</h1>
      <p className="mt-2 text-muted">Las páginas que elimines quedan aquí hasta que las restaures.</p>

      {items.length === 0 ? (
        <p className="mt-10 text-muted">La papelera está vacía.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden>{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-sm text-muted">Eliminada {timeAgo(p.deletedAt!)}</p>
              </div>
              <button type="button" disabled title="Disponible en la fase 4 (administración)" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-basil disabled:cursor-not-allowed disabled:opacity-60">
                <RotateCcw size={14} aria-hidden /> Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
