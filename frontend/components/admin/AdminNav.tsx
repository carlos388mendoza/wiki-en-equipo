"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/usuarios", label: "Usuarios y departamentos" },
  { href: "/admin/muro", label: "Muro de la empresa" },
  { href: "/plantillas", label: "Plantillas por defecto" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administración" className="mt-4 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((i) => {
        const active = pathname === i.href;
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${active ? "border-basil text-basil" : "border-transparent text-muted hover:text-ink"}`}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
