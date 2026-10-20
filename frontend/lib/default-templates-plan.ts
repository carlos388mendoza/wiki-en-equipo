import type { DefaultTemplate } from "./default-templates";
import type { TemplateSummary } from "./types";

type Installed = Pick<TemplateSummary, "id" | "title" | "scope" | "isDefault" | "background" | "icon">;

/**
 * Qué hace el instalador de plantillas de Grupo Comidas con lo que ya hay. Nunca borra ni cambia contenido:
 * - crea las que faltan (no hay ninguna plantilla de toda la empresa con ese título);
 * - a las por defecto ya instaladas sin foto de portada les pone la foto nueva (y el icono si no tenían).
 *   Si alguien ya les eligió una foto, no se toca.
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
  return { toCreate, toUpdateCover };
}
