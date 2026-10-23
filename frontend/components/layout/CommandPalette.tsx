"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, FilePlus2, Home, LayoutTemplate, LoaderCircle, LogOut, Monitor, Moon, Pencil, Search, Share2, Shield, Sun, Trash2, UserRound } from "lucide-react";
import { searchForPalette, type PaletteResult } from "@/app/actions/search";
import { fold } from "@/lib/icon-search";
import { canManageUsers } from "@/lib/permissions";
import { formatShortcut, isPaletteShortcut } from "@/lib/shortcuts";
import { THEMES, type ThemeChoice } from "@/lib/theme";
import type { PageSummary, SidebarDepartment, SidebarSections, User } from "@/lib/types";
import { useTheme } from "@/lib/use-theme";
import { PageIcon } from "../ui/PageIcon";
import { DepartmentIcon } from "./DepartmentIcon";

/** Abre la búsqueda desde cualquier botón (por ejemplo, el de la barra del celular). */
export const openPalette = () => window.dispatchEvent(new Event("wiki-buscar"));

type Item = { id: string; group: string; label: string; hint?: string; icon: ReactNode; words: string; run: () => void };

/** Clic en el botón visible de una acción de la pantalla (`data-wiki-accion`): solo existe si la persona puede hacerla. */
const actionButton = (name: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-wiki-accion="${name}"]`)].find((el) => el.getClientRects().length > 0) ?? null;

const themeIcon: Record<ThemeChoice, ReactNode> = { claro: <Sun size={16} aria-hidden />, oscuro: <Moon size={16} aria-hidden />, auto: <Monitor size={16} aria-hidden /> };

/**
 * Búsqueda con Ctrl/⌘ + K (#67): desde cualquier pantalla busca las páginas de la barra lateral y, en la wiki, por
 * título, contenido o etiqueta ("#etiqueta"); también acciones (nueva página, tema, cerrar sesión) y, dentro de una
 * página, editarla, compartirla o agregarle una subpágina si la persona puede. Flechas para moverse y Enter para abrir.
 * Lo que puede ver cada quien lo decide el backend.
 */
export function CommandPalette({ user, sections, departments }: { user: User; sections: SidebarSections; departments: SidebarDepartment[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<PaletteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [contextual, setContextual] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Ctrl/⌘ + K en cualquier pantalla (también dentro del editor) y el botón de búsqueda del celular.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (isPaletteShortcut(e)) { e.preventDefault(); setOpen((v) => !v); } };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("wiki-buscar", onOpen);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("wiki-buscar", onOpen); };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // Las acciones de la página abierta que la persona puede hacer (sus botones están en pantalla).
      setContextual(["editar", "compartir", "subpagina", "guardar", "plantilla", "salir-edicion"].filter((a) => actionButton(a)));
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
    // Cada vez que se abre empieza vacía.
    if (!open) { setQuery(""); setRemote([]); }
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { setActive(0); }, [query]);

  // Búsqueda en la wiki (título, contenido o "#etiqueta"), un momento después de dejar de escribir.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) { setRemote([]); setSearching(false); return; }
    setSearching(true);
    let alive = true;
    const timer = setTimeout(() => {
      searchForPalette(text).then((r) => { if (alive) setRemote(r); }).catch(() => { if (alive) setRemote([]); }).finally(() => { if (alive) setSearching(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);

  const close = () => setOpen(false);
  const go = (href: string) => () => { close(); router.push(href); };
  const click = (name: string) => () => { close(); setTimeout(() => actionButton(name)?.click(), 0); };

  const items = useMemo<Item[]>(() => {
    const pageItem = (group: string) => (p: PageSummary): Item => ({
      id: `pagina-${p.id}`, group, label: p.title, hint: p.tags.length ? p.tags.map((t) => `#${t}`).join(" ") : undefined,
      icon: <PageIcon icon={p.icon} size={18} />, words: `${p.title} ${p.tags.join(" ")}`, run: go(`/paginas/${p.id}`),
    });
    const actions: Item[] = [
      ...(contextual.includes("editar") ? [{ id: "editar", group: "En esta página", label: "Editar esta página", icon: <Pencil size={16} aria-hidden />, words: "editar modificar cambiar", run: click("editar") }] : []),
      ...(contextual.includes("compartir") ? [{ id: "compartir", group: "En esta página", label: "Compartir esta página", icon: <Share2 size={16} aria-hidden />, words: "compartir invitar enlace publicar permisos", run: click("compartir") }] : []),
      ...(contextual.includes("subpagina") ? [{ id: "subpagina", group: "En esta página", label: "Agregar una subpágina", icon: <FilePlus2 size={16} aria-hidden />, words: "agregar subpagina nueva hija", run: click("subpagina") }] : []),
...(contextual.includes("guardar") ? [{ id: "guardar", group: "En esta página", label: "Guardar", icon: <Check size={16} aria-hidden />, words: "guardar listo", run: click("guardar") }] : []),
...(contextual.includes("plantilla") ? [{ id: "plantilla", group: "En esta página", label: "Guardar como plantilla", icon: <LayoutTemplate size={16} aria-hidden />, words: "plantilla guardar modelo", run: click("plantilla") }] : []),
...(contextual.includes("salir-edicion") ? [{ id: "salir-edicion", group: "En esta página", label: "Salir del modo edición", icon: <ArrowLeft size={16} aria-hidden />, words: "salir volver modo edicion", run: click("salir-edicion") }] : []),
      { id: "nueva", group: "Acciones", label: "Nueva página", icon: <FilePlus2 size={16} aria-hidden />, words: "nueva pagina crear documento", run: click("nueva-pagina") },
      ...THEMES.map((t) => ({
        id: `tema-${t.id}`, group: "Acciones", label: `Tema: ${t.label}`, hint: theme === t.id ? "Actual" : undefined, icon: themeIcon[t.id],
        words: `tema apariencia modo ${t.label} ${t.id === "oscuro" ? "noche dark" : t.id === "claro" ? "dia light" : "sistema automatico"}`,
        run: () => { setTheme(t.id); close(); },
      })),
      { id: "salir", group: "Acciones", label: "Cerrar sesión", icon: <LogOut size={16} aria-hidden />, words: "cerrar sesion salir logout", run: click("cerrar-sesion") },
    ];
    const places: Item[] = [
      { id: "inicio", group: "Ir a", label: "Inicio de la empresa", icon: <Home size={16} aria-hidden />, words: "inicio empresa muro portada", run: go("/") },
      ...departments.map((d) => ({ id: `depto-${d.id}`, group: "Ir a", label: d.name, hint: "Departamento", icon: <DepartmentIcon department={d} />, words: `departamento muro ${d.name}`, run: go(`/departamentos/${d.slug}`) })),
      { id: "buscar", group: "Ir a", label: "Buscar", icon: <Search size={16} aria-hidden />, words: "buscar busqueda filtrar etiquetas", run: go(query.trim() ? `/buscar?q=${encodeURIComponent(query.trim())}` : "/buscar") },
      { id: "plantillas", group: "Ir a", label: "Plantillas", icon: <LayoutTemplate size={16} aria-hidden />, words: "plantillas modelos", run: go("/plantillas") },
      { id: "papelera", group: "Ir a", label: "Papelera", icon: <Trash2 size={16} aria-hidden />, words: "papelera eliminadas archivadas", run: go("/papelera") },
      { id: "cuenta", group: "Ir a", label: "Mi cuenta", icon: <UserRound size={16} aria-hidden />, words: "mi cuenta perfil contrasena", run: go("/cuenta") },
      ...(canManageUsers(user) ? [{ id: "admin", group: "Ir a", label: "Administración", icon: <Shield size={16} aria-hidden />, words: "administracion usuarios permisos admin", run: go("/admin") }] : []),
    ];
    // Páginas de la barra lateral, sin repetir.
    const seen = new Set<string>();
    const sidebar = [...sections.ancladas, ...sections.empresa, ...departments.flatMap((d) => d.pages), ...sections.compartidas, ...sections.privadas]
      .filter((p) => !seen.has(p.id) && seen.add(p.id)).map(pageItem("Páginas"));

    const q = fold(query).split(/\s+/).filter(Boolean);
    const matches = (item: Item) => q.every((t) => fold(`${item.label} ${item.words}`).split(/[^a-z0-9ñ#]+/).some((w) => w.startsWith(t.replace(/^#/, ""))));
    if (!q.length) return [...actions.filter((a) => a.group === "En esta página"), ...actions.filter((a) => a.group === "Acciones"), ...places, ...sidebar.slice(0, 8)];
    const local = [...actions, ...places, ...sidebar].filter(matches);
    const inLocal = new Set(local.map((i) => i.id));
    const fromWiki = remote.map((r): Item => ({
      id: `pagina-${r.id}`, group: "En la wiki", label: r.title, hint: r.excerpt ?? (r.tags.length ? r.tags.map((t) => `#${t}`).join(" ") : undefined),
      icon: <PageIcon icon={r.icon} size={18} />, words: r.title, run: go(`/paginas/${r.id}`),
    })).filter((i) => !inLocal.has(i.id));
    return [...local.slice(0, 30), ...fromWiki];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go/click solo cierran y navegan
  }, [query, remote, sections, departments, user, contextual, theme]);

  const current = Math.min(active, Math.max(items.length - 1, 0));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((current + 1) % Math.max(items.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((current - 1 + items.length) % Math.max(items.length, 1)); }
    else if (e.key === "Enter" && items[current]) { e.preventDefault(); items[current].run(); }
  };
  useEffect(() => { document.getElementById(`${listId}-${current}`)?.scrollIntoView({ block: "nearest" }); }, [current, listId]);

  let lastGroup = "";
  return (
    <dialog ref={dialogRef} onClose={close} onClick={(e) => { if (e.target === dialogRef.current) close(); }} aria-label="Buscar en la wiki"
      className="m-0 mx-auto mt-[8vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl outline-none backdrop:bg-shade/40">
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search size={18} className="shrink-0 text-muted" aria-hidden />
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Busca páginas, #etiquetas o acciones…" aria-label="Buscar páginas y acciones"
          role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={items.length ? `${listId}-${current}` : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none focus:outline-none focus:ring-0 focus-visible:outline-none" />
        {searching && <LoaderCircle size={16} className="shrink-0 animate-spin text-muted" aria-label="Buscando" />}
        <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[11px] text-muted sm:inline">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-[60vh] overflow-y-auto p-2">
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">{searching ? "Buscando…" : `No encontramos nada con “${query.trim()}”.`}</li>
        )}
        {items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <li key={item.id} role="presentation">
              {header && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">{header}</p>}
              <div id={`${listId}-${i}`} role="option" aria-selected={i === current} onMouseMove={() => setActive(i)} onClick={() => item.run()}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === current ? "bg-brand-soft text-brand-strong" : "hover:bg-paper"}`}>
                <span className="grid w-5 shrink-0 place-items-center">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.hint && <span className="block truncate text-xs text-muted">{item.hint}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-xs text-muted">
        <span>↑ ↓ para moverte</span><span>Enter para abrir</span><span>{formatShortcut("Mod-K")} abre y cierra</span>
      </p>
    </dialog>
  );
}
