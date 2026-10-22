"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useState } from "react";
import { Building2, Calculator, ChevronRight, ChevronsUpDown, Cpu, Home, LayoutTemplate, Menu, Package, Search, ShoppingCart, Shield, Trash2, UserRound } from "lucide-react";
import type { SavedAccount } from "@/lib/accounts";
import { canManageUsers, roleLabel } from "@/lib/permissions";
import type { PageSummary, SidebarSections, User } from "@/lib/types";
import { AccountPanel } from "../auth/AccountPanel";
import { NewPageButton } from "../pages/NewPageDialog";
import { Avatar } from "../ui/Avatar";
import { BrandLogo } from "../ui/BrandLogo";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "../ui/drawer";
import { Modal } from "../ui/Modal";
import { PageIcon } from "../ui/PageIcon";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../ui/sheet";
import { PageMenu } from "./PageMenu";

/** Icono para cada departamento según su nombre (cuando no tiene uno propio). */
function departmentIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("tecnolog")) return Cpu;
  if (n.includes("compra")) return ShoppingCart;
  if (n.includes("contabilidad") || n.includes("finanz")) return Calculator;
  if (n.includes("recursos") || n.includes("rrhh") || n.includes("humanos")) return UserRound;
  if (n.includes("logistic") || n.includes("almacen") || n.includes("bodega")) return Package;
  return Building2;
}

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

/**
 * Páginas de un departamento, plegables (#63): el título es un botón con chevron, como los grupos de la sidebar de
 * shadcn. Empieza abierto el departamento propio y se abre solo cuando la página abierta es de ese departamento.
 */
function DepartmentSection({ id, title, pages, empty, abierta }: {
  id: string; title: string; pages: PageSummary[]; empty?: string; abierta?: boolean;
}) {
  const pathname = usePathname();
  const contieneActiva = pages.some((p) => pathname === `/paginas/${p.id}`);
  const [abierto, setAbierto] = useState(Boolean(abierta) || contieneActiva);
  useEffect(() => { if (contieneActiva) setAbierto(true); }, [contieneActiva]);
  const ids = new Set(pages.map((p) => p.id));
  const roots = pages.filter((p) => !p.parentId || !ids.has(p.parentId));
  // useId: el panel se dibuja dos veces (escritorio y menú del celular) y cada copia necesita su propio id.
  const panelId = `${useId()}-departamento-${id}`;
  if (roots.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2>
        <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-controls={panelId}
          className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs font-semibold text-muted hover:bg-line/60 hover:text-ink">
          <ChevronRight size={14} aria-hidden className={`shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`} />
          <span className="truncate">{title}</span>
        </button>
      </h2>
      <div id={panelId} hidden={!abierto}>
        {roots.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted">{empty}</p>
        ) : (
          <ul>{roots.map((p) => <TreeNode key={p.id} page={p} all={pages} depth={0} />)}</ul>
        )}
      </div>
    </section>
  );
}

export function Sidebar({ user, sections, accounts }: { user: User; sections: SidebarSections; accounts: SavedAccount[] }) {
  const department = user.department ?? { name: "Mi departamento", slug: "" };
  // Todos los departamentos para un administrador; para los demás, solo el suyo (lo decide el backend).
  const departments = sections.departamentos.length ? sections.departamentos
    : department.slug ? [{ id: user.departmentId, slug: department.slug, name: department.name, icon: null, pages: sections.departamento }] : [];
  const [mobileOpen, setMobileOpen] = useState(false);
  // Ventana de cuentas: sube desde abajo en el celular (Drawer); en computadora se abre desde el perfil.
  const [accountOpen, setAccountOpen] = useState(false);
  const [desktopAccountOpen, setDesktopAccountOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); setAccountOpen(false); setDesktopAccountOpen(false); }, [pathname]);
  const menu = { user, pinned: new Set(sections.ancladas.map((p) => p.id)) };

  const navItem = (href: string, label: string, Icon?: typeof Home) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
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
        {departments.length <= 1 && departments.map((d) => navItem(`/departamentos/${d.slug}`, d.name, departmentIcon(d.name)))}
        {navItem("/buscar", "Buscar", Search)}
        {navItem("/plantillas", "Plantillas", LayoutTemplate)}
        {canManageUsers(user) && navItem("/admin", "Administración", Shield)}
      </nav>

      {departments.length > 1 && (
        <section className="flex flex-col gap-1" aria-label="Departamentos">
          <h2 className="px-2 text-xs font-semibold text-muted">Departamentos</h2>
          <ul className="flex flex-col gap-0.5">
            {departments.map((d) => (
              <li key={d.id}>{navItem(`/departamentos/${d.slug}`, d.name, departmentIcon(d.name))}</li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Ancladas" pages={sections.ancladas} />
      <Section title="Empresa" pages={sections.empresa} />
      {departments.map((d) => (
        <DepartmentSection key={d.id} id={d.id} title={d.name} pages={d.pages} abierta={d.id === user.departmentId}
          empty={d.id === user.departmentId ? "Tu departamento no ha publicado páginas." : "Este departamento no ha publicado páginas."} />
      ))}
      <Section title="Compartidas conmigo" pages={sections.compartidas} />
      <Section title="Privadas" pages={sections.privadas} empty="Las páginas que crees aparecerán aquí." />

      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
        {navItem("/papelera", "Papelera", Trash2)}
        <button type="button" onClick={() => setDesktopAccountOpen(true)} aria-haspopup="dialog" title="Cuentas"
          className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-line/60 lg:flex">
          <Avatar name={user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-muted">{roleLabel[user.role]}</span>
          </span>
          <ChevronsUpDown size={15} className="shrink-0 text-muted" aria-hidden />
        </button>
        {/* En el celular las cuentas están en el botón Cuenta de abajo; aquí, el atajo a la misma ventana. */}
        <button type="button" onClick={() => { setMobileOpen(false); setAccountOpen(true); }} aria-haspopup="dialog"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-line/60 lg:hidden">
          <Avatar name={user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-muted">{roleLabel[user.role]}</span>
          </span>
          <ChevronsUpDown size={15} className="shrink-0 text-muted" aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <MenuContext.Provider value={menu}>
      {/* Barra superior en pantallas pequeñas */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" aria-haspopup="dialog" aria-expanded={mobileOpen} className="grid h-9 w-9 place-items-center rounded-md hover:bg-line/60">
          <Menu size={20} />
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Wiki Grupo Comidas: inicio">
          <BrandLogo size={32} priority decorative />
          <span className="truncate font-display font-bold">Wiki Grupo Comidas</span>
        </Link>
      </header>

      {/* Celular y tableta: barra abajo con Inicio, Plantillas y Cuenta (#47). Buscar, Nueva página, los
          departamentos y las páginas siguen en el menú lateral (botón de arriba). Cuenta solo abre su ventana. */}
<nav aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bottomItem("/", "Inicio", Home)}
        <NewPageButton variant="nav" label="Nuevo" />
        {bottomItem("/plantillas", "Plantillas", LayoutTemplate)}
        <button type="button" onClick={() => { setMobileOpen(false); setAccountOpen(true); }} aria-haspopup="dialog" aria-expanded={accountOpen}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${accountOpen || pathname === "/cuenta" ? "text-brand-strong" : "text-muted hover:text-ink"}`}>
          <span className={`grid h-8 w-12 place-items-center rounded-full ${accountOpen || pathname === "/cuenta" ? "bg-brand-soft" : ""}`}><UserRound size={19} aria-hidden /></span>
          Cuenta
        </button>
      </nav>

      {/* Cuenta en el celular: sube desde abajo; se cierra deslizándola hacia abajo o tocando afuera. */}
      <Drawer open={accountOpen} onOpenChange={setAccountOpen}>
        <DrawerContent>
          <DrawerTitle className="px-5 pt-1 font-display text-lg font-bold">Cuentas</DrawerTitle>
          <DrawerDescription className="sr-only">Cambia de cuenta, agrega otra o cierra sesión.</DrawerDescription>
          <div className="overflow-y-auto px-3 pb-4 pt-2"><AccountPanel user={user} accounts={accounts} /></div>
        </DrawerContent>
      </Drawer>

      {/* Computadora: la misma ventana desde el perfil de abajo de la barra lateral. */}
      <Modal open={desktopAccountOpen} onClose={() => setDesktopAccountOpen(false)} title="Cuentas" description="Cambia de cuenta, agrega otra o cierra sesión.">
        <AccountPanel user={user} accounts={accounts} />
      </Modal>

      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-line bg-paper lg:block">{panel}</aside>

      {/* Celular y tableta: el menú entra deslizándose desde la izquierda, con el fondo oscurecido (Sheet). */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" closeLabel="Cerrar menú">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <SheetDescription className="sr-only">Páginas, departamentos y accesos de la wiki.</SheetDescription>
          {panel}
        </SheetContent>
      </Sheet>
    </MenuContext.Provider>
  );
}
