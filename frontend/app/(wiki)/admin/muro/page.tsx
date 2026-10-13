import { WallPagePicker } from "@/components/departments/WallEditor";
import { getCompanyWall, listAccessible } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Muro de la empresa" };

export default async function CompanyWallAdmin() {
  const user = await requireUser();
  const [wall, pages] = await Promise.all([getCompanyWall(user), listAccessible(user)]);

  return (
    <div className="flex flex-col gap-6">
      <WallPagePicker target={{ kind: "company" }} wall={wall.wall ? { id: wall.wall.id, title: wall.wall.title } : null} candidates={pages} />
      <section className="rounded-xl border border-line bg-surface p-5 text-sm">
        <h2 className="font-display text-xl font-semibold">Páginas destacadas de la empresa</h2>
        <p className="mt-1 text-muted">
          Las destacadas del inicio son las páginas que enlaces dentro de la página del muro (con “/Subpágina” o mencionándolas con @), en el mismo orden.
          Edita el contenido del muro para cambiarlas. Las más visitadas y las recientes se calculan solas.
        </p>
        {wall.featured.length > 0 && (
          <ol className="mt-3 list-decimal pl-5">
            {wall.featured.map((p) => <li key={p.id}>{p.title}</li>)}
          </ol>
        )}
      </section>
    </div>
  );
}
