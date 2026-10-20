import Link from "next/link";
import { ArrowRight, Pencil } from "lucide-react";
import { WallSections } from "@/components/layout/WallSections";
import { BlockRenderer } from "@/components/page/BlockRenderer";
import { PageBackground } from "@/components/page/PageBackground";
import { getCompanyWall, getPageSummaries } from "@/lib/api";
import { linkedPageIds } from "@/lib/blocks";
import { requireUser } from "@/lib/session";
import { PageIcon } from "@/components/ui/PageIcon";
import { BRAND_ICON } from "@/lib/icons";
import type { Metadata } from "next";

/** El inicio lleva solo el nombre de la wiki, sin "<Página> |" delante. */
export const metadata: Metadata = {
  title: { absolute: "Wiki Grupo Comidas" },
  description: "Inicio de la empresa: políticas, guías y anuncios publicados para todo Grupo Comidas.",
  openGraph: { title: "Wiki Grupo Comidas", description: "Documentación y procesos de Grupo Comidas", siteName: "Wiki Grupo Comidas", locale: "es", type: "website", images: [{ url: "/brand/logo-grupo-comidas.png", width: 512, height: 512, alt: "Grupo Comidas" }] },
};

export default async function CompanyWall() {
  const user = await requireUser();
  const wall = await getCompanyWall(user);
  const firstName = user.name.split(" ")[0];
  const subpages = wall.wall ? Object.fromEntries((await getPageSummaries(user, linkedPageIds(wall.wall.blocks))).map((p) => [p.id, p])) : {};
  const hasCustomHero = Boolean(wall.wall?.background);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className={`relative mb-10 overflow-hidden rounded-2xl px-6 py-10 sm:px-10 ${hasCustomHero ? "text-ink" : "bg-brand text-white"}`}>
        {hasCustomHero && <PageBackground background={wall.wall!.background} className="absolute inset-0" priority />}
        {hasCustomHero && <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-surface/90 to-surface/40" />}
        {/* El logo (o el icono del muro) va dentro del recuadro, con espacio alrededor: arriba en el celular y a la
            derecha, centrado en altura, desde tableta. Antes era una marca de agua cortada por la orilla. */}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div aria-hidden className="shrink-0 drop-shadow-md sm:order-last sm:ml-auto">
          <span className="block sm:hidden"><PageIcon icon={wall.wall?.icon} fallback={BRAND_ICON} size={72} /></span>
          <span className="hidden sm:block"><PageIcon icon={wall.wall?.icon} fallback={BRAND_ICON} size={136} /></span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={hasCustomHero ? "text-muted" : "text-white/80"}>Hola, {firstName}</p>
          <h1 className="mt-1 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            {wall.wall?.title ?? "Lo que todo el grupo necesita saber"}
          </h1>
          <p className={`mt-3 max-w-lg ${hasCustomHero ? "text-muted" : "text-white/85"}`}>Políticas, guías y anuncios publicados para toda la empresa.</p>
          {user.role === "ADMIN" && (
            <Link href="/admin/muro" className={`mr-4 mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline ${hasCustomHero ? "text-sky" : "text-white"}`}>
              <Pencil size={14} aria-hidden /> Editar muro
            </Link>
          )}
          {wall.wall && (
            <Link href={`/paginas/${wall.wall.id}`} className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline ${hasCustomHero ? "text-sky" : "text-white"}`}>
              Abrir la página del muro <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
        </div>
      </header>

      {wall.wall && wall.wall.blocks.length > 0 && (
        <section aria-labelledby="muro" className="mb-12 rounded-2xl border border-line bg-surface px-6 py-8 sm:px-10">
          <h2 id="muro" className="sr-only">Contenido del muro</h2>
          <BlockRenderer blocks={wall.wall.blocks} subpages={subpages} />
        </section>
      )}

      <WallSections featured={wall.featured} mostVisited={wall.mostVisited} recent={wall.recent}
        emptyFeatured={user.role === "ADMIN" ? "Elige las destacadas de la empresa en Administración → Muro de la empresa." : "Aún no hay páginas destacadas."} />
    </div>
  );
}
