"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { login, type LoginState } from "@/app/actions/session";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-6 flex flex-col gap-3" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Correo
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          defaultValue={state.email}
          placeholder="nombre@grupocomidas.com"
          className="h-11 rounded-lg border border-line px-3 font-normal outline-none focus:border-basil"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="h-11 rounded-lg border border-line px-3 font-normal outline-none focus:border-basil"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink font-medium text-white hover:bg-basil disabled:opacity-60"
      >
        {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
