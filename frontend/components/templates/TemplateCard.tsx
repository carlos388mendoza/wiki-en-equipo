import { Building2, Lock, Sparkles, Users } from "lucide-react";
import type { Background, TemplateSummary } from "@/lib/types";
import { PageBackground } from "../page/PageBackground";
import { PageIcon } from "../ui/PageIcon";

const scopeView = {
  PRIVATE: { label: "Solo yo", Icon: Lock },
  DEPARTMENT: { label: "Mi departamento", Icon: Users },
  COMPANY: { label: "Toda la empresa", Icon: Building2 },
} as const;

/** Vista compacta de una plantilla (fondo, icono, título y alcance). */
export function TemplateCard({ template, background, icon, selected, children }: {
  template: Pick<TemplateSummary, "id" | "title" | "description" | "scope" | "isDefault">;
  background?: Background | null; icon?: string | null; selected?: boolean; children?: React.ReactNode;
}) {
  const scope = scopeView[template.scope];
  return (
    <div className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-surface ${selected ? "border-basil ring-2 ring-basil" : "border-line"}`}>
      <PageBackground background={background ?? null} seed={template.id} className="h-16" sizes="320px" />
      <PageIcon icon={icon} size={34} className="absolute left-3 top-[42px] drop-shadow-sm" />
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-7">
        <p className="font-display font-semibold leading-snug">{template.title}</p>
        {template.description && <p className="line-clamp-2 text-xs text-muted">{template.description}</p>}
        {template.id !== "blank" && <p className="mt-auto flex items-center gap-2 pt-1 text-[11px] text-muted">
          {template.isDefault ? <span className="inline-flex items-center gap-1 font-medium text-saffron"><Sparkles size={11} aria-hidden /> Grupo Comidas</span>
            : <span className="inline-flex items-center gap-1"><scope.Icon size={11} aria-hidden /> {scope.label}</span>}
        </p>}
        {children}
      </div>
    </div>
  );
}
