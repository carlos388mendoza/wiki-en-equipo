"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Archive, ArchiveRestore, LoaderCircle, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { setArchived, setPinned, trashPage } from "@/app/actions/admin";
import type { ActionResult } from "@/app/actions/sharing";
import { canDelete } from "@/lib/permissions";
import type { PageSummary, User } from "@/lib/types";
import { Modal } from "../ui/Modal";

const MENU_WIDTH = 208;

/**
 * Menú ⋯ de una página en la barra lateral: anclar (cualquiera que la vea), archivar y eliminar (su dueño o un
 * administrador; los muros no). Con ratón aparece al pasar por la página; en pantallas táctiles se ve siempre, tenue.
 * El backend vuelve a revisar los permisos.
 */
export function PageMenu({ page, user, pinned }: { page: PageSummary; user: User; pinned: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const canManage = Boolean(page.ownerId) && canDelete(user, { ownerId: page.ownerId! }) && !page.isWall;
  const archived = Boolean(page.archivedAt);

  // El menú va con posición fija: la barra lateral tiene su propio desplazamiento y lo cortaría.
  function toggle() {
    if (open) { setOpen(false); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const height = canManage ? 132 : 48;
      const below = rect.bottom + 4 + height <= window.innerHeight;
      setPosition({ top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - height), left: Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8) });
    }
    setError("");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event.type === "pointerdown" && (menuRef.current?.contains(event.target as Node) || buttonRef.current?.contains(event.target as Node))) return;
      setOpen(false);
      if (event instanceof KeyboardEvent) buttonRef.current?.focus();
    };
    const closeNow = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("resize", closeNow);
    window.addEventListener("scroll", closeNow, true);
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("resize", closeNow);
      window.removeEventListener("scroll", closeNow, true);
    };
  }, [open]);

  const run = (action: () => Promise<ActionResult>, after?: () => void) => start(async () => {
    const res = await action();
    if (!res.ok) { setError(res.message); if (!confirmDelete) setOpen(true); return; }
    setOpen(false);
    setConfirmDelete(false);
    after?.();
    router.refresh();
  });
  // Si se elimina o archiva la página abierta, se va a la papelera o se queda mostrando el aviso de archivada.
  const viewing = pathname === `/paginas/${page.id}` || pathname.startsWith(`/paginas/${page.id}/`);

  const item = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper focus-visible:bg-paper focus-visible:outline-none disabled:opacity-60";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`Más opciones de ${page.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Más opciones"
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted hover:bg-line hover:text-ink focus-visible:opacity-100 aria-expanded:bg-line aria-expanded:opacity-100 [@media(any-hover:hover)]:opacity-0 [@media(any-hover:hover)]:group-hover:opacity-100 [@media(any-hover:none)]:opacity-60"
      >
        {pending && !confirmDelete ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <MoreHorizontal size={16} aria-hidden />}
      </button>

      {open && position && (
        <div ref={menuRef} role="menu" aria-label={`Opciones de ${page.title}`} style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 flex flex-col rounded-lg border border-line bg-surface p-1 text-ink shadow-lg"
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
          }}>
          <button type="button" role="menuitem" disabled={pending} className={item} onClick={() => run(() => setPinned(page.id, !pinned))}>
            {pinned ? <PinOff size={15} aria-hidden /> : <Pin size={15} aria-hidden />} {pinned ? "Desanclar" : "Anclar"}
          </button>
          {canManage && (
            <>
              <button type="button" role="menuitem" disabled={pending} className={item} onClick={() => run(() => setArchived(page.id, !archived))}>
                {archived ? <ArchiveRestore size={15} aria-hidden /> : <Archive size={15} aria-hidden />} {archived ? "Desarchivar" : "Archivar"}
              </button>
              <div className="my-1 border-t border-line" role="separator" />
              <button type="button" role="menuitem" disabled={pending} className={`${item} text-danger hover:bg-danger-soft focus-visible:bg-danger-soft`} onClick={() => { setOpen(false); setError(""); setConfirmDelete(true); }}>
                <Trash2 size={15} aria-hidden /> Eliminar
              </button>
            </>
          )}
          {error && <p role="alert" className="px-2.5 py-1.5 text-xs text-danger">{error}</p>}
        </div>
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="¿Mover a la papelera?">
        <p className="text-sm text-muted">“{page.title}” y sus subpáginas dejarán de verse en la wiki. Podrás restaurarlas desde la papelera.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Cancelar</button>
          <button type="button" disabled={pending} onClick={() => run(() => trashPage(page.id), () => { if (viewing) router.push("/papelera"); })}
            className="inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {pending && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Mover a la papelera
          </button>
        </div>
      </Modal>
    </>
  );
}
