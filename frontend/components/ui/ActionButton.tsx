"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal } from "./Modal";

type Result = { ok: true } | { ok: false; message: string };

/**
 * Botón que ejecuta una server action, con confirmación opcional,
 * estado de carga, mensaje de error y recarga de datos al terminar.
 */
export function ActionButton({ action, children, className, confirm, successHref, danger, ariaLabel }: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  confirm?: { title: string; body: string; cta: string };
  successHref?: string;
  danger?: boolean;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const run = () => start(async () => {
    setError("");
    const res = await action();
    if (!res.ok) { setError(res.message); setOpen(Boolean(confirm)); return; }
    setOpen(false);
    if (successHref) router.push(successHref);
    router.refresh();
  });

  return (
    <>
      <button type="button" disabled={pending} aria-label={ariaLabel} onClick={() => (confirm ? setOpen(true) : run())}
        className={className ?? "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand disabled:opacity-60"}>
        {pending && !confirm ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
      {!confirm && error && <span role="alert" className="text-sm text-danger">{error}</span>}
      {confirm && (
        <Modal open={open} onClose={() => setOpen(false)} title={confirm.title}>
          <p className="text-sm text-muted">{confirm.body}</p>
          {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Cancelar</button>
            <button type="button" disabled={pending} onClick={run}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60 ${danger ? "bg-danger" : "bg-ink hover:bg-brand"}`}>
              {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} {confirm.cta}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
