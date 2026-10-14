import { FeaturedEditor, WallPagePicker } from "@/components/departments/WallEditor";
import { getCompanyWall, listAccessible } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Muro de la empresa" };

export default async function CompanyWallAdmin() {
  const user = await requireUser();
  const [wall, pages] = await Promise.all([getCompanyWall(user), listAccessible(user)]);

  return (
    <div className="flex flex-col gap-6">
      <WallPagePicker target={{ kind: "company" }} wall={wall.wall ? { id: wall.wall.id, title: wall.wall.title } : null} candidates={pages} />
      <FeaturedEditor target={{ kind: "company" }} initial={wall.featuredChosen} candidates={pages.filter((p) => p.id !== wall.wall?.id)} />
      {wall.featuredChosen.length === 0 && wall.featured.length > 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          Mientras no elijas destacadas, el inicio muestra las páginas enlazadas en la página del muro.
        </p>
      )}
    </div>
  );
}
