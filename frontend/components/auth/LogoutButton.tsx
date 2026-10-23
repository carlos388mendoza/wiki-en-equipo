"use client";

import { useState, useTransition } from "react";
import { CloudOff, DoorOpen, LoaderCircle, LogOut } from "lucide-react";
import { signOut, signOutAll } from "@/app/actions/session";
import { clearLocalData, findUnsynced, type Unsynced } from "@/lib/collab/local-data";
import { Modal } from "../ui/Modal";

/**
 * Cerrar sesión borra lo que la wiki guardó en este dispositivo (copias para
 * trabajar sin conexión, borradores y páginas en caché). Siempre pide confirmar;
 * si hay cambios sin subir, el aviso los lista.
 */
export function LogoutButton({ userId, variant = "icon", mode = "salir", otherUserIds = [], hiddenTrigger = false }: {
  userId: string;
  /** `icon`: botón pequeño; `menu`: opción con texto (ventana de cuentas). */
  variant?: "icon" | "menu";
  /** `todas`: «Cerrar sesión en todas» las cuentas de este dispositivo (`otherUserIds`: las demás guardadas). */
  mode?: "salir" | "todas";
  otherUserIds?: string[];
  /** Botón invisible que usa la acción "Cerrar sesión" de la búsqueda Ctrl/⌘ + K (#67), con la misma confirmación. */
  hiddenTrigger?: boolean;
}) {
  const label = mode === "todas" ? "Cerrar sesión en todas" : "Cerrar sesión";
  const Icon = mode === "todas" ? DoorOpen : LogOut;
  const ids = mode === "todas" ? [userId, ...otherUserIds] : [userId];
  const [pending, start] = useTransition();
  const [unsynced, setUnsynced] = useState<Unsynced[] | null>(null);
  // null: cerrado; [] : confirmación simple; con elementos: aviso de cambios sin subir.
  const open = unsynced !== null;
  const close = () => setUnsynced(null);

  const finish = () => start(async () => {
    for (const id of ids) await clearLocalData(id).catch(() => {});
    await (mode === "todas" ? signOutAll() : signOut());
  });

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={variant === "icon" ? label : undefined}
        title={variant === "icon" ? label : undefined}
        data-wiki-accion={hiddenTrigger ? "cerrar-sesion" : undefined}
        tabIndex={hiddenTrigger ? -1 : undefined}
        onClick={() => start(async () => setUnsynced((await Promise.all(ids.map((id) => findUnsynced(id).catch(() => [])))).flat()))}
        className={hiddenTrigger ? "sr-only" : variant === "icon" ? "grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-line/60 hover:text-ink disabled:opacity-60" : "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm hover:bg-paper disabled:opacity-60"}
      >
        {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Icon size={16} aria-hidden />}
        {variant === "menu" && label}
      </button>

      <Modal open={open && unsynced.length === 0} onClose={close} title={mode === "todas" ? "¿Cerrar sesión en todas las cuentas?" : "¿Cerrar sesión?"}
        description={`${mode === "todas" ? "Se cerrarán todas las cuentas de este dispositivo. " : ""}Se borrará lo que la wiki guardó en este dispositivo para trabajar sin conexión. Tus páginas siguen guardadas en la wiki.`}>
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          <button type="button" onClick={close} className="rounded-lg px-3 py-2 font-medium hover:bg-paper">Cancelar</button>
          <button type="button" disabled={pending} onClick={finish} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 font-medium text-on-ink hover:bg-brand hover:text-white disabled:opacity-60">
            {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} {label}
          </button>
        </div>
      </Modal>

      <Modal open={open && unsynced.length > 0} onClose={close} title="Tienes cambios sin subir"
        description="Si cierras sesión ahora, se borrarán de este dispositivo y no se podrán recuperar.">
        <div className="flex flex-col gap-4 text-sm">
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {unsynced?.map((u, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <CloudOff size={14} className="text-sun-ink" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{u.title}</span>
                <span className="text-xs text-muted">{u.kind === "pagina" ? "Página con cambios sin subir" : "Borrador sin conexión"}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted">Para conservarlos: cancela, conéctate a internet y abre esas páginas (se suben solas) o publica los borradores desde “Sin conexión”.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} className="rounded-lg px-3 py-2 font-medium hover:bg-paper">Cancelar</button>
            <button type="button" disabled={pending} onClick={finish} className="inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 font-medium text-on-danger disabled:opacity-60">
              {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Borrar y cerrar sesión
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
