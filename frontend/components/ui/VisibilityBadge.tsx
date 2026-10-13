import { Building2, Lock, Users } from "lucide-react";
import type { Visibility } from "@/lib/types";

const map = {
  privada: { label: "Privada", Icon: Lock, cls: "text-muted bg-paper" },
  departamento: { label: "Departamento", Icon: Users, cls: "text-basil bg-basil-soft" },
  empresa: { label: "Toda la empresa", Icon: Building2, cls: "text-saffron bg-saffron-soft" },
} as const;

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const { label, Icon, cls } = map[visibility];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={12} aria-hidden /> {label}
    </span>
  );
}
