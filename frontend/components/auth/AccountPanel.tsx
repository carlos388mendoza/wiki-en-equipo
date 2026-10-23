"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, LoaderCircle, LogOut, UserRound, UserRoundPlus } from "lucide-react";
import { signOutAccount, switchAccount } from "@/app/actions/session";
import type { SavedAccount } from "@/lib/accounts";
import { roleLabel } from "@/lib/permissions";
import type { User } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";
import { ThemePicker } from "../ui/ThemePicker";
import { LogoutButton } from "./LogoutButton";

/**
 * Cuentas de este dispositivo, como en Google: la actual (con "Mi cuenta" y "Cerrar sesión"), las demás que iniciaron
 * sesión aquí (tocar una cambia a ella sin contraseña; cada una con su "Cerrar sesión"), "Agregar otra cuenta" y
 * "Cerrar sesión en todas". Las sesiones se guardan cifradas en el servidor (`lib/accounts.ts`), nunca en el navegador.
 * Se usa en la ventana Cuenta del celular y desde el perfil de la barra lateral en computadora.
 */
export function AccountPanel({ user, accounts }: { user: User; accounts: SavedAccount[] }) {
  const others = accounts.filter((a) => a.id !== user.id);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closing, setClosing] = useState<SavedAccount | null>(null);
  const subtitle = (role: User["role"], department: string | null | undefined) => [roleLabel[role], department].filter(Boolean).join(" · ");

  const switchTo = (id: string) => { setBusyId(id); start(async () => { await switchAccount(id); }); };

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-3 rounded-xl bg-paper px-3 py-3">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{subtitle(user.role, user.department?.name)}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-strong"><Check size={12} aria-hidden /> Actual</span>
      </div>
      <Link href="/cuenta" className="flex items-center gap-2.5 rounded-md px-3 py-2.5 hover:bg-paper"><UserRound size={16} aria-hidden /> Mi cuenta</Link>
      <div className="px-3 py-1.5">
        <p className="mb-1.5 text-xs font-semibold text-muted">Tema</p>
        <ThemePicker />
      </div>
      <LogoutButton userId={user.id} variant="menu" />

      {others.length > 0 && (
        <section aria-labelledby="otras-cuentas" className="mt-1 border-t border-line pt-2">
          <h3 id="otras-cuentas" className="px-3 pb-1 text-xs font-semibold text-muted">Otras cuentas en este dispositivo</h3>
          <ul className="flex flex-col">
            {others.map((a) => (
              <li key={a.id} className="flex items-center gap-1 rounded-md hover:bg-paper">
                <button type="button" onClick={() => switchTo(a.id)} disabled={pending} aria-label={`Cambiar a ${a.name}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left disabled:opacity-60">
                  <Avatar name={a.name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-muted">{subtitle(a.role, a.department)}</span>
                  </span>
                  {pending && busyId === a.id && <LoaderCircle size={16} className="animate-spin text-muted" aria-label="Cambiando de cuenta" />}
                </button>
                <button type="button" onClick={() => setClosing(a)} disabled={pending} aria-label={`Cerrar sesión de ${a.name}`} title="Cerrar sesión"
                  className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted hover:bg-line/60 hover:text-ink disabled:opacity-60">
                  <LogOut size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-1 flex flex-col border-t border-line pt-2">
        <Link href="/login?agregar=1" className="flex items-center gap-2.5 rounded-md px-3 py-2.5 hover:bg-paper"><UserRoundPlus size={16} aria-hidden /> Agregar otra cuenta</Link>
        {others.length > 0 && <LogoutButton userId={user.id} variant="menu" mode="todas" otherUserIds={others.map((a) => a.id)} />}
      </div>

      <Modal open={closing !== null} onClose={() => setClosing(null)} title="¿Cerrar sesión?"
        description={closing ? `Se cerrará la sesión de ${closing.name} en este dispositivo. Para volver a usarla tendrá que escribir su contraseña.` : undefined}>
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          <button type="button" onClick={() => setClosing(null)} className="rounded-lg px-3 py-2 font-medium hover:bg-paper">Cancelar</button>
          <button type="button" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 font-medium text-on-ink hover:bg-brand hover:text-white disabled:opacity-60"
            onClick={() => { const id = closing!.id; start(async () => { await signOutAccount(id); setClosing(null); }); }}>
            {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Cerrar sesión
          </button>
        </div>
      </Modal>
    </div>
  );
}
