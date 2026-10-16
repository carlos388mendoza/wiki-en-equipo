import { prisma } from "../models/client.js";
import type { Actor } from "../permissions/access.js";
import { assertCanEditPage } from "../permissions/access.js";
import { conflict, notFound } from "../services/errors.js";
import { pageSearchText } from "../services/search-text.js";

/** Sube cambios hechos sin conexión. Contenido, fondo, icono y etiquetas se guardan juntos (una sola transacción). */
export async function syncPage(actor: Actor, input: { operationId: string; pageId: string; baseVersion: number; title?: string; icon?: string | null; content: unknown; background?: unknown; tags?: string[] }) {
  const previous = await prisma.syncOperation.findUnique({ where: { userId_operationId: { userId: actor.id, operationId: input.operationId } } });
  if (previous) return JSON.parse(previous.resultJson);
  return prisma.$transaction(async (tx) => {
    const page = await tx.page.findFirst({ where: { id: input.pageId, deletedAt: null }, include: { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } }, tags: { select: { name: true } } } });
    if (!page) throw notFound("No se encontró la página.");
    assertCanEditPage(page, actor);
    if (page.version !== input.baseVersion) throw conflict("Hay cambios más recientes en esta página. Revisa la versión actual y vuelve a sincronizar.", { currentVersion: page.version, current: { title: page.title, icon: page.icon, content: JSON.parse(page.contentJson), background: page.backgroundJson ? JSON.parse(page.backgroundJson) : null, tags: page.tags.map((tag) => tag.name), updatedAt: page.updatedAt } });
    await tx.pageHistory.create({ data: { pageId: page.id, changedById: actor.id, version: page.version, snapshotJson: JSON.stringify({ title: page.title, icon: page.icon, contentJson: page.contentJson, backgroundJson: page.backgroundJson, visibility: page.visibility, parentId: page.parentId, tags: page.tags.map((tag) => tag.name) }) } });
    const tags = input.tags === undefined ? undefined : await Promise.all([...new Set(input.tags.map((name) => name.trim().slice(0, 40)).filter(Boolean))].map((name) => tx.tag.upsert({ where: { name }, create: { name }, update: {} }).then((tag) => ({ id: tag.id }))));
    const updated = await tx.page.update({ where: { id: page.id }, data: { ...(input.title === undefined ? {} : { title: input.title.trim() }), ...(input.icon === undefined ? {} : { icon: input.icon }), contentJson: JSON.stringify(input.content), searchText: pageSearchText(input.title?.trim() ?? page.title, JSON.stringify(input.content)), ...(input.background === undefined ? {} : { backgroundJson: JSON.stringify(input.background) }), ...(tags === undefined ? {} : { tags: { set: tags } }), version: { increment: 1 } }, select: { id: true, title: true, version: true, updatedAt: true } });
    const result = { status: "synced", page: updated };
    await tx.syncOperation.create({ data: { operationId: input.operationId, userId: actor.id, pageId: page.id, resultJson: JSON.stringify(result) } });
    return result;
  });
}
