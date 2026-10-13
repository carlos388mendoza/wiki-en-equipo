"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { changePassword, type PasswordState } from "@/app/actions/session";

const input = "h-11 rounded-lg border border-line px-3 font-normal outline-none focus:border-basil";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const [mismatch, setMismatch] = useState(false);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const data = new FormData(e.currentTarget);
        const differs = data.get("newPassword") !== data.get("confirmPassword");
        setMismatch(differs);
        if (differs) e.preventDefault();
      }}
      className="flex flex-col gap-3 text-sm"
    >
      <label className="flex flex-col gap-1 font-medium">
        Contraseña actual
        <input type="password" name="currentPassword" required autoComplete="current-password" className={input} />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Contraseña nueva
        <input type="password" name="newPassword" required minLength={12} autoComplete="new-password" className={input} />
        <span className="text-xs font-normal text-muted">Mínimo 12 caracteres. Usa una frase que puedas recordar.</span>
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Repite la contraseña nueva
        <input type="password" name="confirmPassword" required minLength={12} autoComplete="new-password" className={input} />
      </label>
      {(mismatch || state.error) && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-danger">
          {mismatch ? "Las contraseñas nuevas no coinciden." : state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink font-medium text-white hover:bg-basil disabled:opacity-60">
        {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden />} Cambiar contraseña
      </button>
      <p className="text-xs text-muted">Al cambiarla se cerrará tu sesión en todos los dispositivos y tendrás que entrar de nuevo.</p>
    </form>
  );
}
