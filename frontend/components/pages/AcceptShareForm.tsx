"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { acceptShareLink } from "@/app/actions/sharing";

export function AcceptShareForm({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6 flex flex-col gap-3">
      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const res = await acceptShareLink(token);
          if (res && !res.ok) setError(res.message);
        })}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink font-medium text-white hover:bg-brand disabled:opacity-60"
      >
        {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden />} Aceptar y abrir
      </button>
      <Link href="/" className="text-center text-sm text-muted hover:text-ink hover:underline">Ir al inicio</Link>
    </div>
  );
}
