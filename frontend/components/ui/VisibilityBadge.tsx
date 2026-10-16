import { Building2, Lock, Users } from "lucide-react";
import { visibilityLabel } from "@/lib/permissions";
import type { PageVisibility } from "@/lib/types";

const map = {
  PRIVATE: { Icon: Lock, cls: "text-muted bg-paper" },
  DEPARTMENT: { Icon: Users, cls: "text-sky bg-sky-soft" },
  COMPANY: { Icon: Building2, cls: "text-brand-strong bg-brand-soft" },
} as const;

export function VisibilityBadge({ visibility }: { visibility: PageVisibility }) {
  const { Icon, cls } = map[visibility];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={12} aria-hidden /> {visibilityLabel[visibility]}
    </span>
  );
}
