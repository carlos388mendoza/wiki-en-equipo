import { VisibilityBadge } from "../ui/VisibilityBadge";
import type { PageVisibility } from "@/lib/types";

/** En la papelera: con qué visibilidad volverá la página al restaurarla (el backend la conserva). */
export function TrashVisibility({ visibility }: { visibility: PageVisibility }) {
  return (
    <span className="inline-flex items-center gap-1" title="Así quedará al restaurarla">
      <span aria-hidden>·</span> <span className="sr-only">Al restaurarla quedará:</span> <VisibilityBadge visibility={visibility} />
    </span>
  );
}
