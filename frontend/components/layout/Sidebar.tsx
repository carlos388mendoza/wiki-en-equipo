"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Building2, ChevronRight, Home, LayoutTemplate, Shield, Menu, Search, Trash2, UserRound, X } from "lucide-react";
import { canManageUsers, roleLabel } from "@/lib/permissions";
import type { PageSummary, SidebarSections, User } from "@/lib/types";
import { LogoutButton } from "../auth/LogoutButton";
import { NewPageButton } from "../pages/NewPageDialog";
import { Avatar } from "../ui/Avatar";
import { BrandLogo } from "../ui/BrandLogo";
import { PageIcon } from "../ui/PageIcon";
import { PageMenu } from "./PageMenu";

/** Quién mira la barra y qué páginas ancló (para el menú ⋯ de cada página). */
const MenuContext = createContext<{ user: User; pinned: Set<string> } | null>(null);


function TreeNode({ page, all, depth }: { page: PageSummary; all: PageSummary[]; depth: number }) {
  const pathname = usePathname();
  const children = all.filter((p) => p.parentId === page.id);
  const active = pathname === `/paginas/${page.id}`;
  const containsActive = children.some((c) => pathname === `/paginas/${c.id}`);
  const [open, setOpen] = useState(containsActive);
  const menu = useContext(MenuContext);

  return (
    <li>
      <div
        className={`group flex items-center rounded-md pr-1 text-sm ${active ? "bg-brand-soft font-semibold text-brand-strong" : "hover:bg-line/60"}`}
        style={{ paddingLeft: depth * 12 }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? `Contraer ${page.title}` : `Expandir ${page.title}`}
            className="grid h-7 w-6 place-items-center text-muted hover:text-ink"
          >
            <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-6" />
        )}
        <Link href={`/paginas/${page.id}`} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
          <PageIcon icon={page.icon} size={16} />
          <span className="truncate">{page.title}</span>
        </Link>
        {menu && <PageMenu page={page} user={menu.user} pinned={menu.pinned.has(page.id)} />}
      </div>
      {open && children.length > 0 && (
        <ul>{children.map((c) => <TreeNode key={c.id} page={c} all={all} depth={depth + 1} />)}</ul>
      )}
    </li>
  );
}

function Section({ title, pages, empty }: { title: string; pages: PageSummary[]; empty?: string }) {
  const ids = new Set(pages.map((p) => p.id));
  const roots = pages.filter((p) => !p.parentId || !ids.has(p.parentId));
  if (roots.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-2 text-xs font-semibold text-muted">{title}</h2>
      {roots.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted">{empty}</p>
      ) : (
        <ul>{roots.map((p) => <TreeNode key={p.id} page={p} all={pages} depth={0} />)}</ul>
      )}
    </section>
  );
}

export function Sidebar({ user, sections }: { user: User; sections: SidebarSections }) {
  const department = user.department ?? { name: "Mi departamento", slug: "" };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); setAccountOpen(false); }, [pathname]);
  // El menú Cuenta se cierra al tocar fuera (no en las ventanas de confirmación) o con Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) { if (e.key === "Escape") setAccountOpen(false); return; }
      const target = e.target as HTMLElement;
      if (!accountRef.current?.contains(target) && !target.closest("dialog, [role=dialog]")) setAccountOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [accountOpen]);
  const menu = { user, pinned: new Set(sections.ancladas.map((p) => p.id)) };

  const navItem = (href: string, label: string, Icon?: typeof Home) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-brand-soft font-semibold text-brand-strong" : "hover:bg-line/60"}`}
      >
        {Icon && <Icon size={16} aria-hidden />} {label}
      </Link>
    );
  };

  const bottomItem = (href: string, label: string, Icon: typeof Home) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return (
      <Link href={href} aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${active ? "text-brand-strong" : "text-muted hover:text-ink"}`}>
        <span className={`grid h-8 w-12 place-items-center rounded-full ${active ? "bg-brand-soft" : ""}`}><Icon size={19} aria-hidden /></span>
        {label}
      </Link>
    );
  };

  const panel = (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-4">
      <Link href="/" className="flex items-center gap-2.5 px-2" aria-label="Wiki Grupo Comidas: inicio">
        <BrandLogo size={40} priority decorative />
        <span className="font-display text-lg font-bold leading-tight">Wiki Grupo Comidas</span>
      </Link>

      <NewPageButton />

      <nav className="flex flex-col gap-0.5" aria-label="Principal">
        {navItem("/", "Inicio de la empresa", Home)}
        {department.slug && navItem(`/departamentos/${department.slug}`, department.name, Building2)}
        {navItem("/buscar", "Buscar", Search)}
        {navItem("/plantillas", "Plantillas", LayoutTemplate)}
        {canManageUsers(user) && navItem("/admin", "Administración", Shield)}
      </nav>

      <Section title="Ancladas" pages={sections.ancladas} />
      <Section title="Empresa" pages={sections.empresa} />
      <Section title={department.name} pages={sections.departamento} empty="Tu departamento no ha publicado páginas." />
      <Section title="Compartidas conmigo" pages={sections.compartidas} />
      <Section title="Privadas" pages={sections.privadas} empty="Las páginas que crees aparecerán aquí." />

      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
        {navItem("/papelera", "Papelera", Trash2)}
        <div className="flex items-center gap-2 px-2">
          <Avatar name={user.name} />
          <Link href="/cuenta" className="min-w-0 flex-1 rounded-md hover:bg-line/60" title="Mi cuenta">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{roleLabel[user.role]}</p>
          </Link>
          <LogoutButton userId={user.id} />
        </div>
      </div>
    </div>
  );

  return (
    <MenuContext.Provider value={menu}>
      {/* Barra superior en pantallas pequeñas */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" className="grid h-9 w-9 place-items-center rounded-md hover:bg-line/60">
          <Menu size={20} />
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Wiki Grupo Comidas: inicio">
          <BrandLogo size={32} priority decorative />
          <span className="truncate font-display font-bold">Wiki Grupo Comidas</span>
        </Link>
      </header>

      {/* Celular y tableta: barra abajo con Inicio, Plantillas y Cuenta (#47). Buscar, Nueva página, los
          departamentos y las páginas siguen en el menú lateral (botón de arriba). */}
      <nav aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bottomItem("/", "Inicio", Home)}
        {bottomItem("/plantillas", "Plantillas", LayoutTemplate)}
        <div ref={accountRef} className="relative flex">
          <button type="button" onClick={() => setAccountOpen((v) => !v)} aria-haspopup="menu" aria-expanded={accountOpen}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${accountOpen || pathname === "/cuenta" ? "text-brand-strong" : "text-muted hover:text-ink"}`}>
            <span className={`grid h-8 w-12 place-items-center rounded-full ${accountOpen || pathname === "/cuenta" ? "bg-brand-soft" : ""}`}><UserRound size={19} aria-hidden /></span>
            Cuenta
          </button>
          {/* Oculto en lugar de desmontado: así no se pierde la ventana de confirmación de cerrar sesión. */}
          <div role="menu" aria-label="Cuenta" className={`${accountOpen ? "" : "hidden"} absolute bottom-full right-2 mb-2 w-64 rounded-xl border border-line bg-surface p-1 shadow-xl`}>
            <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
              <Avatar name={user.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">{roleLabel[user.role]}</p>
              </div>
            </div>
            <Link href="/cuenta" role="menuitem" className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm hover:bg-paper"><UserRound size={16} aria-hidden /> Mi cuenta</Link>
            <LogoutButton userId={user.id} variant="menu" mode="cambiar" />
            <LogoutButton userId={user.id} variant="menu" />
          </div>
        </div>
      </nav>

      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-line bg-paper lg:block">{panel}</aside>

      {/* Móvil: panel deslizable */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-paper shadow-xl">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="absolute right-2 top-3 grid h-9 w-9 place-items-center rounded-md hover:bg-line/60">
              <X size={18} />
            </button>
            {panel}
          </aside>
        </div>
      )}
    </MenuContext.Provider>
  );
}
