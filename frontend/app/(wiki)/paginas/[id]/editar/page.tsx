import { notFound } from "next/navigation";
import { PageEditor } from "@/components/editor/PageEditor";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getPage, listAccessible, listTags, pageTitle } from "@/lib/api";
import { canEdit } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Editar · ${await pageTitle((await params).id)}` };
}

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const res = await getPage(user, id);
  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    return <StatusScreen error={res.error} message={res.error === "sin_acceso" ? undefined : res.message} />;
  }
  const page = res.data;
  if (!canEdit(user, page)) {
    return <StatusScreen error="sin_acceso" title="Solo puedes leer esta página" message="Tienes permiso de lectura. Pide a quien la creó que te dé permiso de edición." />;
  }
  const [pages, tags] = await Promise.all([listAccessible(user), listTags(user)]);

  return (
    <PageEditor
      mode="page"
      id={page.id}
      viewer={user}
      backHref={`/paginas/${page.id}`}
      pages={pages.filter((p) => p.id !== page.id)}
      tagSuggestions={tags}
      initial={{ title: page.title, blocks: page.blocks, background: page.background, icon: page.icon, tags: page.tags, version: page.version, parentId: page.parentId }}
    />
  );
}
