"use server";

import { revalidatePath } from "next/cache";
import { getTemplate, listTemplates } from "@/lib/api";
import { backend } from "@/lib/api/client";
import { splitAppearance, toStoredAppearance, type WikiBlock } from "@/lib/blocks";
import { requireUser } from "@/lib/session";
import type { Background, Template, TemplateScope, TemplateSummary } from "@/lib/types";
import type { ActionResult } from "./sharing";

const tooBig = "La página es demasiado grande para guardarla (máx. 2 MB). Divide el contenido en subpáginas.";

function failMessage(res: { error: string; message: string }, fallback?: string) {
  if (res.error === "archivo_rechazado") return tooBig;
  if (res.error === "sin_acceso") return fallback ?? "No tienes permiso para hacer esto.";
  return res.message;
}

function refreshAll(pageId?: string) {
  if (pageId) revalidatePath(`/paginas/${pageId}`);
  revalidatePath("/", "layout");
}

/* ---------- Páginas ---------- */

/** Crea una página (vacía, desde una plantilla o ya con contenido, como los borradores sin conexión) en una sola petición. */
export async function createPage(input: { title: string; parentId?: string | null; templateId?: string; blocks?: WikiBlock[]; icon?: string }): Promise<ActionResult<{ id: string; title: string }>> {
  const title = input.title.trim().slice(0, 200) || "Página sin título";
  const res = input.templateId
    ? await backend<{ page: { id: string; title: string } }>(`/pages/from-template/${encodeURIComponent(input.templateId)}`, { method: "POST", body: { title, parentId: input.parentId ?? null } })
    : await backend<{ page: { id: string; title: string } }>("/pages", { method: "POST", body: { title, parentId: input.parentId ?? null, content: input.blocks ?? [], icon: input.icon ?? "📄", background: toStoredAppearance(null) } });
  if (!res.ok) {
    return { ok: false, message: failMessage(res, input.parentId ? "Solo puedes crear subpáginas en páginas que puedes editar y que sean de tu departamento." : undefined) };
  }
  refreshAll(input.parentId ?? undefined);
  return { ok: true, data: { id: res.data.page.id, title: res.data.page.title } };
}

export type PageDraft = {
  title: string;
  blocks: WikiBlock[];
  background: Background | null;
  icon: string | null;
  tags: string[];
  parentId?: string | null;
};

/** `autosave`: guardado automático mientras se escribe (el historial agrupa los de los últimos 10 minutos). */
export async function savePage(pageId: string, draft: PageDraft, expectedVersion: number, autosave = false): Promise<ActionResult<{ version: number; updatedAt: string }> & { currentVersion?: number }> {
  const body = {
    title: draft.title.trim().slice(0, 200) || "Página sin título",
    content: draft.blocks,
    icon: draft.icon,
    background: toStoredAppearance(draft.background),
    tags: draft.tags.slice(0, 30).map((t) => t.slice(0, 40)),
    ...(draft.parentId !== undefined && { parentId: draft.parentId }),
    expectedVersion,
    ...(autosave && { autosave: true }),
  };
  const res = await backend<{ page: { version: number; updatedAt: string } }>(`/pages/${encodeURIComponent(pageId)}`, { method: "PATCH", body });
  if (!res.ok) {
    if (res.error === "conflicto") {
      const current = (res.details as { currentVersion?: number } | undefined)?.currentVersion;
      return { ok: false, conflict: true, currentVersion: current, message: "Alguien más guardó cambios en esta página mientras editabas." };
    }
    return { ok: false, message: failMessage(res, "Ya no tienes permiso de edición en esta página.") };
  }
  refreshAll(pageId);
  return { ok: true, data: { version: res.data.page.version, updatedAt: res.data.page.updatedAt } };
}

/** Lee la versión actual (para resolver un conflicto). */
export async function loadPageForConflict(pageId: string) {
  const res = await backend<{ page: { version: number; title: string; contentJson: string; updatedAt: string } }>(`/pages/${encodeURIComponent(pageId)}`);
  if (!res.ok) return { ok: false as const, message: res.message };
  return { ok: true as const, data: { version: res.data.page.version, title: res.data.page.title, updatedAt: res.data.page.updatedAt } };
}

/* ---------- Plantillas ---------- */

export async function loadTemplates(): Promise<ActionResult<TemplateSummary[]>> {
  const user = await requireUser();
  const res = await listTemplates(user);
  return res.ok ? { ok: true, data: res.data } : { ok: false, message: res.message };
}

export async function loadTemplate(id: string): Promise<ActionResult<Template>> {
  const user = await requireUser();
  const res = await getTemplate(user, id);
  return res.ok ? { ok: true, data: res.data } : { ok: false, message: res.message };
}

export type TemplateDraft = { title: string; description: string; scope: TemplateScope; blocks: WikiBlock[]; background: Background | null; icon: string | null };

export async function createTemplate(draft: TemplateDraft): Promise<ActionResult<{ id: string }>> {
  const res = await backend<{ template: { id: string } }>("/templates", {
    method: "POST",
    body: { title: draft.title.trim().slice(0, 200) || "Plantilla sin título", description: draft.description.slice(0, 1000), scope: draft.scope, content: draft.blocks, icon: draft.icon, background: toStoredAppearance(draft.background) },
  });
  if (!res.ok) return { ok: false, message: failMessage(res, draft.scope === "COMPANY" ? "Solo un administrador puede compartir plantillas con toda la empresa." : undefined) };
  revalidatePath("/plantillas");
  return { ok: true, data: { id: res.data.template.id } };
}

export async function updateTemplate(id: string, draft: Partial<TemplateDraft> & { isDefault?: boolean }): Promise<ActionResult> {
  const res = await backend(`/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      ...(draft.title !== undefined && { title: draft.title.trim().slice(0, 200) || "Plantilla sin título" }),
      ...(draft.description !== undefined && { description: draft.description.slice(0, 1000) }),
      ...(draft.scope !== undefined && { scope: draft.scope }),
      ...(draft.blocks !== undefined && { content: draft.blocks }),
      ...(draft.background !== undefined && { background: toStoredAppearance(draft.background) }),
      ...(draft.icon !== undefined && { icon: draft.icon }),
      ...(draft.isDefault !== undefined && { isDefault: draft.isDefault }),
    },
  });
  if (!res.ok) return { ok: false, message: failMessage(res, draft.scope !== undefined || draft.isDefault !== undefined ? "Solo quien creó la plantilla puede cambiar su alcance." : "Necesitas permiso de edición para cambiar esta plantilla.") };
  revalidatePath("/plantillas");
  return { ok: true, data: undefined };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  const res = await backend(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return { ok: false, message: failMessage(res, "Solo quien creó la plantilla puede eliminarla.") };
  revalidatePath("/plantillas");
  return { ok: true, data: undefined };
}

/** Instala (o completa) las plantillas por defecto de Grupo Comidas. Solo administradores. */
export async function installDefaultTemplates(): Promise<ActionResult<{ created: number }>> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, message: "Solo un administrador puede instalar las plantillas de Grupo Comidas." };
  const { DEFAULT_TEMPLATES } = await import("@/lib/default-templates");
  const existing = await listTemplates(user);
  if (!existing.ok) return { ok: false, message: existing.message };
  const titles = new Set(existing.data.filter((t) => t.scope === "COMPANY").map((t) => t.title));
  let created = 0;
  for (const t of DEFAULT_TEMPLATES) {
    if (titles.has(t.title)) continue;
    const { background, icon } = splitAppearance(t.background);
    const res = await backend<{ template: { id: string } }>("/templates", { method: "POST", body: { title: t.title, description: t.description, scope: "COMPANY", content: t.content, background, icon } });
    if (!res.ok) return { ok: false, message: res.message };
    const marked = await backend(`/templates/${res.data.template.id}`, { method: "PATCH", body: { isDefault: true } });
    if (!marked.ok) return { ok: false, message: marked.message };
    created++;
  }
  revalidatePath("/plantillas");
  return { ok: true, data: { created } };
}
