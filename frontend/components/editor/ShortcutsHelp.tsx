"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { EDITOR_SHORTCUTS, formatShortcut, isApplePlatform } from "@/lib/shortcuts";
import { Modal } from "../ui/Modal";

/** Botón y ventana con los atajos del editor, con las teclas del sistema de la persona (⌘ en Mac, Ctrl en Windows). */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  // El sistema se detecta en el navegador (en el servidor no se sabe): hasta entonces se muestra como en Windows.
  const [apple, setApple] = useState(false);
  useEffect(() => setApple(isApplePlatform()), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sky hover:underline">
        <Keyboard size={13} aria-hidden /> Atajos de teclado
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Atajos de teclado" description={apple ? "En Mac: ⌘ Comando, ⌥ Opción, ⇧ Mayúsculas." : "En Windows: Ctrl, Alt y Mayús."}>
        <div className="flex flex-col gap-5">
          {EDITOR_SHORTCUTS.map((g) => (
            <section key={g.group} aria-label={g.group}>
              <h3 className="mb-2 text-sm font-semibold">{g.group}</h3>
              <dl className="divide-y divide-line rounded-lg border border-line">
                {g.items.map((item) => (
                  <div key={item.label} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <dt className="text-muted">{item.label}</dt>
                    <dd className="flex flex-wrap gap-1">
                      {item.keys.map((k) => (
                        <kbd key={k} className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans text-xs font-semibold text-ink">{formatShortcut(k, apple)}</kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}
