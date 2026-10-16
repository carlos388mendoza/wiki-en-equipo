import Link from "next/link";
import { Building2, FileUp, LayoutTemplate, Users } from "lucide-react";
import { listDepartments, listTemplates, listUsers } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { ALLOWED_UPLOADS, MAX_UPLOAD_MB } from "@/lib/uploads";

export default async function AdminHome() {
  const user = await requireUser();
  const [users, departments, templates] = await Promise.all([listUsers(), listDepartments(), listTemplates(user)]);
  const defaults = templates.ok ? templates.data.filter((t) => t.isDefault).length : 0;

  const cards = [
    { href: "/admin/usuarios", Icon: Users, title: "Usuarios", value: users.ok ? `${users.data.length} activos` : "—", help: "Crear cuentas, cambiar roles y departamentos, desactivar accesos." },
    { href: "/admin/usuarios#departamentos", Icon: Building2, title: "Departamentos", value: `${departments.length}`, help: "Crear departamentos. Cada persona pertenece a uno." },
    { href: "/admin/muro", Icon: Building2, title: "Muro de la empresa", value: "Inicio", help: "Elegir la página del muro y destacar contenido para todo el grupo." },
    { href: "/plantillas", Icon: LayoutTemplate, title: "Plantillas por defecto", value: `${defaults}`, help: "Agregar o retirar las plantillas recomendadas para todos." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ href, Icon, title, value, help }) => (
          <li key={title}>
            <Link href={href} className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 hover:border-brand">
              <Icon size={20} className="text-brand-strong" aria-hidden />
              <span className="font-display text-lg font-semibold">{title}</span>
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-sm text-muted">{help}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="limites" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="limites" className="flex items-center gap-2 font-display text-xl font-semibold"><FileUp size={18} aria-hidden /> Límites de archivos</h2>
        <p className="mt-1 text-sm text-muted">Los define el servidor (variables <code>MAX_UPLOAD_BYTES</code> y <code>MAX_UPLOADS_PER_USER</code>). La interfaz avisa antes de subir.</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-paper p-3"><dt className="text-muted">Tamaño máximo por archivo</dt><dd className="text-lg font-semibold">{MAX_UPLOAD_MB} MB</dd></div>
          <div className="rounded-lg bg-paper p-3"><dt className="text-muted">Archivos por persona</dt><dd className="text-lg font-semibold">1 000 (configurable)</dd></div>
          <div className="rounded-lg bg-paper p-3"><dt className="text-muted">Tipos permitidos</dt><dd className="font-medium">{[...new Set(Object.values(ALLOWED_UPLOADS))].join(", ")}</dd></div>
        </dl>
      </section>
    </div>
  );
}
