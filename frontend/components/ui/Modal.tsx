"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Ventana modal accesible basada en <dialog>: atrapa el foco, se cierra con Esc
 * o tocando fuera. En celular se muestra como hoja inferior.
 */
export function Modal({ open, onClose, title, description, children, size = "md" }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width = { md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="modal-title"
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40 sm:m-auto sm:rounded-2xl ${width}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="font-display text-xl font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted hover:bg-line/60 hover:text-ink">
              <X size={18} />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
