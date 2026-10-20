import type { DefaultTemplate } from "./default-templates";
import type { TemplateSummary } from "./types";

type Installed = Pick<TemplateSummary, "id" | "title" | "scope" | "isDefault" | "background" | "icon">;

/**
 * Plantillas por defecto que se dejaron de recomendar porque repetían otra más completa (las creaba la
 * configuración inicial del backend). El instalador las retira de "De Grupo Comidas" (botón "Retirar"),
 * sin borrarlas ni tocar las páginas creadas con ellas, y nunca las vuelve a crear.
 */
export const RETIRED_DEFAULTS: Record<string, string> = {
  "Documentación de proceso": "Documentación general",
  "Bienvenida al departamento": "Bienvenido al departamento",
  "Inicio del departamento": "Página de inicio de departamento",
};

/**
 * Qué hace el instalador de plantillas de Grupo Comidas con lo que ya hay. Nunca borra ni cambia contenido:
 * - crea las que faltan (no hay ninguna plantilla de toda la empresa con ese título);
 * - a las por defecto ya instaladas sin foto de portada les pone la foto nueva (y el icono si no tenían).
 *   Si alguien ya les eligió una foto, no se toca;
 * - retira de las por defecto las repetidas (RETIRED_DEFAULTS).
 */
export function defaultTemplatesPlan(installed: Installed[], defaults: DefaultTemplate[]) {
  const company = installed.filter((t) => t.scope === "COMPANY");
  const toCreate: DefaultTemplate[] = [];
  const toUpdateCover: { id: string; template: DefaultTemplate; setIcon: boolean }[] = [];
  for (const template of defaults) {
    const same = company.filter((t) => t.title === template.title);
    if (!same.length) { toCreate.push(template); continue; }
    if (template.background.type !== "image") continue;
    for (const t of same) {
      if (t.isDefault && t.background?.type !== "image") toUpdateCover.push({ id: t.id, template, setIcon: !t.icon });
    }
  }
  const toRetire = company.filter((t) => t.isDefault && t.title in RETIRED_DEFAULTS).map((t) => ({ id: t.id, title: t.title }));
  return { toCreate, toUpdateCover, toRetire };
}
