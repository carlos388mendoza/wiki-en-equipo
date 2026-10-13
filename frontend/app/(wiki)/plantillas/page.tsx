import { LayoutTemplate } from "lucide-react";
import { InstallDefaultsButton, NewTemplateButton, TemplateActions } from "@/components/templates/TemplateActions";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getTemplate, listTemplates } from "@/lib/api";
import { DEFAULT_TEMPLATES } from "@/lib/default-templates";
import { requireUser } from "@/lib/session";
import type { Template } from "@/lib/types";

export const metadata = { title: "Plantillas" };

export default async function TemplatesPage() {
  const user = await requireUser();
  const res = await listTemplates(user);
  if (!res.ok) return <StatusScreen error={res.error} message={res.message} />;

  // El listado no trae fondo ni contenido: se piden los detalles para mostrar vistas previas.
  const details = await Promise.all(res.data.map((t) => getTemplate(user, t.id)));
  const templates = details.flatMap((d) => (d.ok ? [d.data] : []));
  const canManage = (t: Template) => user.role === "ADMIN" || t.ownerId === user.id;

  const groups: { key: string; title: string; help: string; items: Template[] }[] = [
    { key: "default", title: "De Grupo Comidas", help: "Plantillas recomendadas para toda la empresa.", items: templates.filter((t) => t.isDefault) },
    { key: "mine", title: "Mis plantillas", help: "Las que creaste tú.", items: templates.filter((t) => !t.isDefault && t.ownerId === user.id) },
    { key: "dept", title: "De mi departamento", help: "Compartidas por compañeros de tu departamento.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && t.scope === "DEPARTMENT") },
    { key: "company", title: "De toda la empresa", help: "Compartidas con toda la empresa.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && t.scope === "COMPANY") },
    ...(user.role === "ADMIN"
      ? [{ key: "private", title: "Privadas de otras personas", help: "Visibles solo para administradores.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && t.scope === "PRIVATE") }]
      : []),
  ];
  const installedTitles = new Set(templates.filter((t) => t.scope === "COMPANY").map((t) => t.title));
  const missingDefaults = DEFAULT_TEMPLATES.filter((t) => !installedTitles.has(t.title)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Plantillas</h1>
          <p className="mt-1 max-w-xl text-muted">
            Empieza páginas con una estructura lista o guarda la tuya. Desde el editor también puedes insertar una plantilla como sección con “/Plantilla”.
          </p>
        </div>
        <NewTemplateButton />
      </header>

      {user.role === "ADMIN" && missingDefaults > 0 && (
        <div className="mt-6 rounded-xl border border-saffron/40 bg-saffron-soft/60 p-4">
          <p className="mb-3 text-sm">
            Hay {missingDefaults} plantillas de Grupo Comidas sin instalar (documentación, bienvenida, inicio de departamento, recetas, actas y más).
          </p>
          <InstallDefaultsButton />
        </div>
      )}

      {templates.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-2 rounded-xl border border-dashed border-line p-8 text-muted">
          <LayoutTemplate size={28} aria-hidden />
          <p>Todavía no hay plantillas. Crea la primera con “Nueva plantilla” o guarda una página como plantilla desde el editor.</p>
        </div>
      ) : (
        groups.filter((g) => g.items.length).map((g) => (
          <section key={g.key} className="mt-10" aria-labelledby={`grupo-${g.key}`}>
            <h2 id={`grupo-${g.key}`} className="font-display text-xl font-semibold">{g.title}</h2>
            <p className="mb-4 text-sm text-muted">{g.help}</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map((t) => (
                <li key={t.id}>
                  <TemplateCard template={t} background={t.background} icon={t.icon}>
                    <TemplateActions template={t} canManage={canManage(t)} isAdmin={user.role === "ADMIN"} />
                  </TemplateCard>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
