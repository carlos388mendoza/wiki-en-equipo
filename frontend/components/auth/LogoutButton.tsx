"use client";

import { useState, useTransition } from "react";
import { CloudOff, LoaderCircle, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/session";
import { clearLocalData, findUnsynced, type Unsynced } from "@/lib/collab/local-data";
import { Modal } from "../ui/Modal";

/**
 * Cerrar sesión borra lo que la wiki guardó en este dispositivo (copias para
 * trabajar sin conexión, borradores y páginas en caché). Si hay cambios sin
 * subir, primero avisa y pide confirmación.
 */
export function LogoutButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [unsynced, setUnsynced] = useState<Unsynced[] | null>(null);

  const finish = () => start(async () => {
    await clearLocalData(userId).catch(() => {});
    await signOut();
  });

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label="Cerrar sesión"
        onClick={() => start(async () => {
          const found = await findUnsynced(userId).catch(() => []);
          if (found.length) { setUnsynced(found); return; }
          await clearLocalData(userId).catch(() => {});
          await signOut();
        })}
        className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-line/60 hover:text-ink disabled:opacity-60"
      >
        {pending ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
      </button>

      <Modal open={unsynced !== null} onClose={() => setUnsynced(null)} title="Tienes cambios sin subir"
        description="Si cierras sesión ahora, se borrarán de este dispositivo y no se podrán recuperar.">
        <div className="flex flex-col gap-4 text-sm">
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {unsynced?.map((u, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <CloudOff size={14} className="text-saffron" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{u.title}</span>
                <span className="text-xs text-muted">{u.kind === "pagina" ? "Página con cambios sin subir" : "Borrador sin conexión"}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted">Para conservarlos: cancela, conéctate a internet y abre esas páginas (se suben solas) o publica los borradores desde “Sin conexión”.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setUnsynced(null)} className="rounded-lg px-3 py-2 font-medium hover:bg-paper">Cancelar</button>
            <button type="button" disabled={pending} onClick={finish} className="inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 font-medium text-white disabled:opacity-60">
              {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Borrar y cerrar sesión
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
