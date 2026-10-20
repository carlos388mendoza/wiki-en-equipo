import { LayoutTemplate } from "lucide-react";
import { InstallDefaultsButton, NewTemplateButton, TemplateActions } from "@/components/templates/TemplateActions";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { listTemplates } from "@/lib/api";
import { DEFAULT_TEMPLATES } from "@/lib/default-templates";
import { defaultTemplatesPlan } from "@/lib/default-templates-plan";
import { requireUser } from "@/lib/session";
import type { TemplateSummary } from "@/lib/types";

export const metadata = { title: "Plantillas" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ plantilla?: string }> }) {
  const [user, { plantilla }] = await Promise.all([requireUser(), searchParams]);
  const res = await listTemplates(user);
  if (!res.ok) return <StatusScreen error={res.error} message={res.message} />;

  // El listado ya trae fondo, icono, autor y permisos; el contenido se pide solo para la vista previa.
  const templates = res.data;
  const sharedWithMe = (t: TemplateSummary) => t.myPermission === "EDIT" || t.myPermission === "READ";

  const groups: { key: string; title: string; help: string; items: TemplateSummary[] }[] = [
    { key: "default", title: "De Grupo Comidas", help: "Plantillas recomendadas para toda la empresa.", items: templates.filter((t) => t.isDefault) },
    { key: "mine", title: "Mis plantillas", help: "Las que creaste tú.", items: templates.filter((t) => !t.isDefault && t.ownerId === user.id) },
    { key: "shared", title: "Compartidas conmigo", help: "Te invitaron a usarlas o a editarlas.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && sharedWithMe(t)) },
    { key: "dept", title: "De mi departamento", help: "Compartidas por compañeros de tu departamento.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && !sharedWithMe(t) && t.scope === "DEPARTMENT") },
    { key: "company", title: "De toda la empresa", help: "Compartidas con toda la empresa.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && !sharedWithMe(t) && t.scope === "COMPANY") },
    ...(user.role === "ADMIN"
      ? [{ key: "private", title: "Privadas de otras personas", help: "Visibles solo para administradores.", items: templates.filter((t) => !t.isDefault && t.ownerId !== user.id && !sharedWithMe(t) && t.scope === "PRIVATE") }]
      : []),
  ];
  const plan = defaultTemplatesPlan(templates, DEFAULT_TEMPLATES);
  const missingDefaults = plan.toCreate.length;
  const missingCovers = plan.toUpdateCover.length;
  const repeated = plan.toRetire.length;

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

      {plantilla && !templates.some((t) => t.id === plantilla) && (
        <p role="alert" className="mt-6 rounded-lg bg-sun-soft px-4 py-3 text-sm">
          No tienes acceso a esa plantilla o ya no existe. Pide a quien te la envió que te invite o te comparta un enlace.
        </p>
      )}

      {user.role === "ADMIN" && (missingDefaults > 0 || missingCovers > 0 || repeated > 0) && (
        <div className="mt-6 rounded-xl border border-sun/40 bg-sun-soft/60 p-4">
          <p className="mb-3 text-sm">
            {[
              missingDefaults > 0 && `Hay ${missingDefaults} ${missingDefaults === 1 ? "plantilla" : "plantillas"} de Grupo Comidas sin instalar (manual de puesto, onboarding, reporte de incidente, inventario, capacitación y más).`,
              missingCovers > 0 && `${missingCovers === 1 ? "Una plantilla ya instalada no tiene" : `${missingCovers} plantillas ya instaladas no tienen`} foto de portada.`,
              repeated > 0 && `${repeated === 1 ? "Una plantilla repite" : `${repeated} plantillas repiten`} otra más completa (${plan.toRetire.map((t) => `“${t.title}”`).join(", ")}): se retirarán de las recomendadas, pero seguirán disponibles.`,
            ].filter(Boolean).join(" ")} No se borra ni se cambia el contenido de ninguna plantilla.
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
                    <TemplateActions template={t} viewer={user} autoOpen={t.id === plantilla} />
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
