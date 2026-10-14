import { notFound } from "next/navigation";
import { PageEditor } from "@/components/editor/PageEditor";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { getTemplate, listAccessible } from "@/lib/api";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Editar plantilla" };

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const res = await getTemplate(user, id);
  if (!res.ok) {
    if (res.error === "no_encontrada") notFound();
    return <StatusScreen error={res.error} message={res.message} />;
  }
  const t = res.data;
  if (!t.canEdit) {
    return (
      <StatusScreen
        error="sin_acceso"
        title="Solo puedes usar esta plantilla"
        message="Para editarla, pide a quien la creó que te dé permiso de edición. También puedes guardar tu propia copia desde el editor."
      />
    );
  }
  const pages = await listAccessible(user);
  return (
    <PageEditor
      mode="template"
      id={t.id}
      viewer={user}
      backHref="/plantillas"
      pages={pages}
      tagSuggestions={[]}
      initial={{ title: t.title, blocks: t.blocks, background: t.background, icon: t.icon, tags: [], version: 1, parentId: null, description: t.description, scope: t.scope, canManage: t.canManage }}
    />
  );
}
