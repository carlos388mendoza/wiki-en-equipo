import { createHash, randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "../storage/files.js";
import type { Prisma, Page } from "@prisma/client";
import type { Actor, PageAccessRecord } from "../permissions/access.js";
import { assertCanEditPage, assertCanReadPage, canReadPage } from "../permissions/access.js";
import { prisma } from "../models/client.js";
import { badRequest, conflict, forbidden, notFound } from "./errors.js";
import { foldText, pageSearchText, searchExcerpt, searchTerms } from "./search-text.js";

const accessInclude = { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } }, tags: { select: { name: true } } } satisfies Prisma.PageInclude;
const snapshot = (page: Page & { tags?: { name: string }[] }) => JSON.stringify({ title: page.title, icon: page.icon, contentJson: page.contentJson, backgroundJson: page.backgroundJson, visibility: page.visibility, parentId: page.parentId, tags: page.tags?.map((tag) => tag.name) ?? [] });

/** Campos de las páginas en listados (barra lateral, tarjetas, destacadas, más visitadas, búsqueda). */
export const pageCardSelect = { id: true, title: true, icon: true, backgroundJson: true, visibility: true, version: true, ownerId: true, owner: { select: { id: true, name: true } }, departmentId: true, parentId: true, updatedAt: true, tags: { select: { name: true } } } satisfies Prisma.PageSelect;

/** Relación directa con la página: dueño o permiso compartido. `null` si se ve por estar publicada o por ser administrador. */
export type MyPermission = "OWNER" | "EDIT" | "READ" | null;
export const myShareSelect = (actor: Actor) => ({ shares: { where: { userId: actor.id }, select: { permission: true } } }) satisfies Prisma.PageSelect;
export function withMyPermission<T extends { ownerId: string; shares: { permission: string }[] }>(actor: Actor, { shares, ...page }: T) {
  return { ...page, myPermission: (page.ownerId === actor.id ? "OWNER" : shares[0]?.permission ?? null) as MyPermission };
}

export async function findAccessiblePage(id: string, actor: Actor) {
  // Primero verificar si la página existe (sin filtros de permiso) para distinguir 404 vs 403
  const pageExists = await prisma.page.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!pageExists) throw notFound("No se encontró la página.");

  // Aplicar filtro de permiso a la página principal
  const pageWhere: Prisma.PageWhereInput = { id, deletedAt: null };
  if (actor.role !== "ADMIN") {
    pageWhere.OR = [
      { ownerId: actor.id },
      { shares: { some: { userId: actor.id } } },
      { visibility: "COMPANY" },
      { visibility: "DEPARTMENT", departmentId: actor.departmentId },
      { isWall: true, departmentId: actor.departmentId },
    ];
  }

  const childWhere: Prisma.PageWhereInput = { deletedAt: null };
  if (actor.role !== "ADMIN") childWhere.OR = [
    { ownerId: actor.id },
    { shares: { some: { userId: actor.id } } },
    { visibility: "COMPANY" },
    { visibility: "DEPARTMENT", departmentId: actor.departmentId },
    { isWall: true, departmentId: actor.departmentId },
  ];
  const page = await prisma.page.findFirst({ where: pageWhere, include: { ...accessInclude, shares: { select: shareWithUserSelect, orderBy: { createdAt: "asc" } }, children: { where: childWhere, select: { id: true, title: true, icon: true, visibility: true, updatedAt: true } }, owner: { select: { id: true, name: true } }, _count: { select: { visits: true } } } });
  if (!page) throw forbidden("No tienes acceso a esta página.");
  // Leer no cuenta visitas (el editor y el historial también leen): ver recordVisit().
  const { _count, ...rest } = page;
  return { ...rest, visitCount: page.visibility === "PRIVATE" ? null : _count.visits, ancestors: await readableAncestors(page.parentId, actor) };
}

/** Personas con acceso con su nombre y departamento (nunca el correo: también lo ven quienes solo leen). */
export const shareWithUserSelect = { userId: true, permission: true, user: { select: { id: true, name: true, department: { select: { name: true } } } } } as const;

/**
 * Ruta de páginas superiores, de la raíz a la página padre. Se corta en la primera que la persona
 * no puede leer para no revelar títulos de páginas privadas.
 */
async function readableAncestors(parentId: string | null, actor: Actor) {
  const chain: { id: string; title: string; icon: string | null }[] = [];
  const seen = new Set<string>();
  while (parentId && chain.length < 20 && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = await prisma.page.findFirst({ where: { id: parentId, deletedAt: null }, include: { shares: { select: { userId: true, permission: true } }, departmentWall: { select: { id: true } } } });
    if (!parent || !canReadPage(parent as PageAccessRecord, actor)) break;
    chain.unshift({ id: parent.id, title: parent.title, icon: parent.icon });
    parentId = parent.parentId;
  }
  return chain;
}

/** Minutos en los que otra visita de la misma persona a la misma página no vuelve a contar (recargas). */
export const VISIT_WINDOW_MINUTES = 30;

/**
 * Registra que alguien vio la página (la vista de lectura llama a POST /pages/:id/visit).
 * Solo cuenta en páginas publicadas al departamento o a la empresa, y una vez cada 30 minutos por persona.
 */
export async function recordVisit(actor: Actor, id: string) {
  // Primero verificar si la página existe (sin filtros de permiso) para distinguir 404 vs 403
  const pageExists = await prisma.page.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!pageExists) throw notFound("No se encontró la página.");

  // Aplicar filtro de permiso
  const pageWhere: Prisma.PageWhereInput = { id, deletedAt: null };
  if (actor.role !== "ADMIN") {
    pageWhere.OR = [
      { ownerId: actor.id },
      { shares: { some: { userId: actor.id } } },
      { visibility: "COMPANY" },
      { visibility: "DEPARTMENT", departmentId: actor.departmentId },
      { isWall: true, departmentId: actor.departmentId },
    ];
  }

  const page = await prisma.page.findFirst({ where: pageWhere, include: accessInclude });
  if (!page) throw forbidden("No tienes acceso a esta página.");
  if (page.visibility === "PRIVATE") return { counted: false, visits: null };
  const since = new Date(Date.now() - VISIT_WINDOW_MINUTES * 60_000);
  const counted = await prisma.$transaction(async (tx) => {
    if (await tx.pageVisit.findFirst({ where: { pageId: id, userId: actor.id, visitedAt: { gte: since } }, select: { id: true } })) return false;
    await tx.pageVisit.create({ data: { pageId: id, userId: actor.id } });
    return true;
  });
  return { counted, visits: await prisma.pageVisit.count({ where: { pageId: id } }) };
}

/**
 * Páginas que la persona puede ver (hasta 100 más recientes). Con `ids` devuelve exactamente esas páginas
 * (hasta 100), estén o no entre las recientes: sirve para mostrar subpáginas y menciones del contenido.
 */
export async function listAccessiblePages(actor: Actor, query: { q?: string; tag?: string; departmentId?: string; parentId?: string; cursor?: string; limit?: number; ids?: string[] }) {
  const where: Prisma.PageWhereInput = { deletedAt: null };
  if (query.ids) where.id = { in: query.ids };
  // Busca en el título y en el texto del contenido; todas las palabras deben aparecer.
  const terms = query.q ? searchTerms(query.q) : [];
  if (terms.length) where.AND = terms.map((term) => ({ searchText: { contains: term } }));
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.parentId) where.parentId = query.parentId;
  if (actor.role === "ADMIN") { /* admins can list every active page */ }
  else where.OR = [
    { ownerId: actor.id },
    { shares: { some: { userId: actor.id } } },
    { visibility: "COMPANY" },
    { visibility: "DEPARTMENT", departmentId: actor.departmentId },
  ];
  if (actor.role !== "ADMIN" && query.departmentId && query.departmentId !== actor.departmentId) {
    where.departmentId = query.departmentId;
    where.OR = [{ ownerId: actor.id }, { shares: { some: { userId: actor.id } } }, { visibility: "COMPANY" }];
  }
  if (query.tag) where.tags = { some: { name: query.tag } };

  const take = Math.min(query.limit ?? 100, 100); // default 100, max 100
  const cursor = query.cursor ? { id: query.cursor } : undefined;

  if (!terms.length) {
    const pages = await prisma.page.findMany({ where, orderBy: { updatedAt: "desc" }, take: take + 1, cursor, select: { ...pageCardSelect, ...myShareSelect(actor) } });
    const hasMore = pages.length > take;
    const items = hasMore ? pages.slice(0, take) : pages;
    return { pages: items.map((page) => withMyPermission(actor, page)), hasMore, nextCursor: hasMore ? items[items.length - 1].id : undefined };
  }
  // Con búsqueda: primero las que coinciden en el título; las demás traen un fragmento del contenido.
  const found = await prisma.page.findMany({ where, orderBy: { updatedAt: "desc" }, take: take + 1, cursor, select: { ...pageCardSelect, ...myShareSelect(actor), contentJson: true } });
  const hasMore = found.length > take;
  const items = hasMore ? found.slice(0, take) : found;
  const results = items.map(({ contentJson, ...page }) => {
    const inTitle = terms.every((term) => foldText(page.title).includes(term));
    return { ...withMyPermission(actor, page), match: inTitle ? "title" as const : "content" as const, excerpt: searchExcerpt(contentJson, terms) };
  });
  return { pages: [...results.filter((page) => page.match === "title"), ...results.filter((page) => page.match === "content")], hasMore, nextCursor: hasMore ? items[items.length - 1].id : undefined };
}

async function tagsConnect(names: string[] | undefined) {
  const clean = [...new Set((names ?? []).map((name) => name.trim().slice(0, 40)).filter(Boolean))];
  return Promise.all(clean.map((name) => prisma.tag.upsert({ where: { name }, create: { name }, update: {} }).then((tag) => ({ id: tag.id }))));
}

export async function createPage(actor: Actor, input: { title: string; icon?: string | null; content?: unknown; background?: unknown; visibility?: string; parentId?: string | null; tags?: string[] }) {
  const visibility = input.visibility ?? "PRIVATE";
  if (!["PRIVATE", "DEPARTMENT", "COMPANY"].includes(visibility)) throw badRequest("El nivel de visibilidad no es válido.");
  if (visibility === "COMPANY" && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede publicar a nivel empresa.");
  if (input.parentId) {
    const parent = await prisma.page.findFirst({ where: { id: input.parentId, deletedAt: null }, include: accessInclude });
    if (!parent) throw notFound("No se encontró la página superior.");
    assertCanEditPage(parent as PageAccessRecord, actor);
    if (parent.departmentId !== actor.departmentId && actor.role !== "ADMIN") throw forbidden("La subpágina debe pertenecer a tu departamento.");
  }
  const tags = await tagsConnect(input.tags);
  const contentJson = JSON.stringify(input.content ?? []);
  return prisma.page.create({ data: { title: input.title.trim(), icon: input.icon ?? null, contentJson, searchText: pageSearchText(input.title.trim(), contentJson), backgroundJson: input.background === undefined ? null : JSON.stringify(input.background), visibility, ownerId: actor.id, departmentId: actor.departmentId, parentId: input.parentId ?? null, tags: { connect: tags } }, include: { tags: { select: { name: true } } } });
}

/** Minutos en los que los autoguardados de la misma persona se agrupan en una sola versión del historial. */
export const HISTORY_GROUP_MINUTES = 10;

/** ¿La última versión guardada es de esta persona y de hace menos de 10 minutos? */
async function recentOwnSnapshot(tx: Prisma.TransactionClient, pageId: string, userId: string) {
  const last = await tx.pageHistory.findFirst({ where: { pageId }, orderBy: { version: "desc" }, select: { changedById: true, createdAt: true } });
  return Boolean(last && last.changedById === userId && last.createdAt > new Date(Date.now() - HISTORY_GROUP_MINUTES * 60_000));
}

export async function updatePage(actor: Actor, id: string, input: { title?: string; icon?: string | null; content?: unknown; background?: unknown; visibility?: string; parentId?: string | null; tags?: string[]; expectedVersion?: number; autosave?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const page = await tx.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
    if (!page) throw notFound("No se encontró la página.");
    assertCanEditPage(page as PageAccessRecord, actor);
    if (input.expectedVersion !== undefined && input.expectedVersion !== page.version) throw conflict("La página cambió desde que la abriste.", { currentVersion: page.version });
    if (input.visibility === "COMPANY" && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede publicar a nivel empresa.");
    if (input.visibility && !["PRIVATE", "DEPARTMENT", "COMPANY"].includes(input.visibility)) throw badRequest("El nivel de visibilidad no es válido.");
    if (page.isWall && input.visibility === "PRIVATE") throw badRequest("El muro del departamento debe permanecer visible para el departamento.");
    if (page.isCompanyWall && input.visibility && input.visibility !== "COMPANY") throw badRequest("El muro de la empresa debe permanecer publicado a nivel empresa.");
    if (input.parentId !== undefined && input.parentId !== page.parentId) {
      if (input.parentId === id) throw badRequest("Una página no puede ser su propia página superior.");
      if (input.parentId) {
        const parent = await tx.page.findFirst({ where: { id: input.parentId, deletedAt: null }, include: accessInclude });
        if (!parent) throw notFound("No se encontró la página superior.");
        assertCanEditPage(parent as PageAccessRecord, actor);
        let ancestor: { id: string; parentId: string | null } | null = parent;
        while (ancestor) {
          if (ancestor.id === id) throw badRequest("La estructura de subpáginas no puede contener ciclos.");
          ancestor = ancestor.parentId ? await tx.page.findUnique({ where: { id: ancestor.parentId }, select: { id: true, parentId: true } }) : null;
        }
      }
    }
    // Un autoguardado no crea otra versión si la persona ya guardó una hace poco: el historial queda legible.
    if (!input.autosave || !await recentOwnSnapshot(tx, id, actor.id)) await tx.pageHistory.create({ data: { pageId: id, changedById: actor.id, version: page.version, snapshotJson: snapshot(page) } });
    const tags = input.tags === undefined ? undefined : await Promise.all([...new Set(input.tags.map((name) => name.trim().slice(0, 40)).filter(Boolean))].map((name) => tx.tag.upsert({ where: { name }, create: { name }, update: {} }).then((tag) => ({ id: tag.id }))));
    return tx.page.update({ where: { id }, data: {
      ...(input.title === undefined ? {} : { title: input.title.trim() }),
      ...(input.icon === undefined ? {} : { icon: input.icon }),
      ...(input.content === undefined ? {} : { contentJson: JSON.stringify(input.content) }),
      ...(input.title === undefined && input.content === undefined ? {} : { searchText: pageSearchText(input.title?.trim() ?? page.title, input.content === undefined ? page.contentJson : JSON.stringify(input.content)) }),
      ...(input.background === undefined ? {} : { backgroundJson: JSON.stringify(input.background) }),
      ...(input.visibility === undefined ? {} : { visibility: input.visibility }),
      ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
      ...(tags === undefined ? {} : { tags: { set: tags } }),
      version: { increment: 1 },
    }, include: { tags: { select: { name: true } } } });
  });
}

export async function trashPage(actor: Actor, id: string) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  if (actor.role !== "ADMIN" && page.ownerId !== actor.id) throw forbidden("Solo quien creó la página puede enviarla a la papelera.");
  const deletedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const ids = [id];
    let frontier = [id];
    while (frontier.length) {
      const children = await tx.page.findMany({ where: { parentId: { in: frontier }, deletedAt: null }, select: { id: true } });
      frontier = children.map((child) => child.id);
      ids.push(...frontier);
    }
    await tx.page.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt, version: { increment: 1 } } });
    await tx.department.updateMany({ where: { wallPageId: { in: ids } }, data: { wallPageId: null } });
    await tx.page.updateMany({ where: { id: { in: ids } }, data: { isWall: false } });
    await tx.companySettings.updateMany({ where: { wallPageId: { in: ids } }, data: { wallPageId: null } });
    await tx.page.updateMany({ where: { id: { in: ids } }, data: { isCompanyWall: false } });
  });
  return { id, deletedAt: deletedAt.toISOString() };
}

export async function listTrash(actor: Actor) {
  return prisma.page.findMany({ where: { deletedAt: { not: null }, ...(actor.role === "ADMIN" ? {} : { ownerId: actor.id }) }, orderBy: { deletedAt: "desc" }, select: { id: true, title: true, icon: true, deletedAt: true, ownerId: true, visibility: true } });
}

/**
 * Borra para siempre páginas que están en la papelera, con sus subpáginas del mismo dueño que también
 * estén en la papelera, su historial, visitas, permisos y archivos (también del disco). Las subpáginas de
 * otras personas no se tocan: quedan en su papelera, sin página superior.
 */
async function purgeTrashedPages(rootIds: string[]) {
  const roots = await prisma.page.findMany({ where: { id: { in: rootIds }, deletedAt: { not: null } }, select: { id: true, ownerId: true } });
  const ids = roots.map((root) => root.id);
  for (const root of roots) {
    let frontier = [root.id];
    while (frontier.length) {
      const children = await prisma.page.findMany({ where: { parentId: { in: frontier }, ownerId: root.ownerId, deletedAt: { not: null } }, select: { id: true } });
      frontier = children.map((child) => child.id).filter((childId) => !ids.includes(childId));
      ids.push(...frontier);
    }
  }
  const files = await prisma.fileAsset.findMany({ where: { pageId: { in: ids } }, select: { id: true, storageName: true } });
  await prisma.$transaction([
    prisma.fileAsset.deleteMany({ where: { id: { in: files.map((file) => file.id) } } }),
    prisma.syncOperation.deleteMany({ where: { pageId: { in: ids } } }),
    prisma.page.deleteMany({ where: { id: { in: ids }, deletedAt: { not: null } } }),
  ]);
  await Promise.all(files.map((file) => rm(path.join(uploadDirectory, path.basename(file.storageName)), { force: true })));
  return ids.length;
}

/** Eliminar definitivamente una página de la papelera: su dueño o un ADMIN. */
export async function deletePagePermanently(actor: Actor, id: string) {
  const page = await prisma.page.findUnique({ where: { id }, select: { ownerId: true, deletedAt: true } });
  if (!page) throw notFound("No se encontró la página.");
  if (actor.role !== "ADMIN" && page.ownerId !== actor.id) throw forbidden("Solo quien creó la página puede eliminarla definitivamente.");
  if (!page.deletedAt) throw conflict("Primero envía la página a la papelera.");
  await purgeTrashedPages([id]);
}

/** Vaciar papelera: las páginas propias (también para administradores, que ven la papelera de todos). */
export async function emptyTrash(actor: Actor) {
  const pages = await prisma.page.findMany({ where: { ownerId: actor.id, deletedAt: { not: null } }, select: { id: true } });
  return { deleted: pages.length ? await purgeTrashedPages(pages.map((page) => page.id)) : 0 };
}

/** Retención: borra lo que lleva más de `days` días en la papelera (TRASH_RETENTION_DAYS; 0 lo desactiva). */
export async function purgeExpiredTrash(days: number) {
  if (!(days > 0)) return 0;
  const pages = await prisma.page.findMany({ where: { deletedAt: { lt: new Date(Date.now() - days * 86_400_000) } }, select: { id: true } });
  return pages.length ? purgeTrashedPages(pages.map((page) => page.id)) : 0;
}

export async function restorePage(actor: Actor, id: string) {
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page || !page.deletedAt) throw notFound("No se encontró la página en la papelera.");
  if (actor.role !== "ADMIN" && page.ownerId !== actor.id) throw forbidden("Solo quien creó la página puede restaurarla.");
  return prisma.$transaction(async (tx) => {
    const ids = [id];
    let frontier = [id];
    while (frontier.length) {
      const children = await tx.page.findMany({ where: { parentId: { in: frontier }, deletedAt: { not: null } }, select: { id: true } });
      frontier = children.map((child) => child.id);
      ids.push(...frontier);
    }
    await tx.page.updateMany({ where: { id: { in: ids }, deletedAt: { not: null } }, data: { deletedAt: null, version: { increment: 1 } } });
    return tx.page.findUniqueOrThrow({ where: { id } });
  });
}

export async function pageHistory(actor: Actor, id: string) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanReadPage(page as PageAccessRecord, actor);
  return prisma.pageHistory.findMany({ where: { pageId: id }, orderBy: { version: "desc" }, include: { changedBy: { select: { id: true, name: true } } } });
}

export async function restoreVersion(actor: Actor, id: string, version: number) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanEditPage(page as PageAccessRecord, actor);
  const old = await prisma.pageHistory.findUnique({ where: { pageId_version: { pageId: id, version } } });
  if (!old) throw notFound("No se encontró esa versión.");
  const data = JSON.parse(old.snapshotJson) as { title: string; icon?: string | null; contentJson: string; backgroundJson: string | null; visibility: string; parentId: string | null; tags?: string[] };
  if (data.visibility === "COMPANY" && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede restaurar una versión publicada a nivel empresa.");
  const { tags: oldTags, ...pageData } = data;
  return prisma.$transaction(async (tx) => {
    await tx.pageHistory.create({ data: { pageId: id, changedById: actor.id, version: page.version, snapshotJson: snapshot(page) } });
    const tagIds = oldTags ? await Promise.all(oldTags.map((name) => tx.tag.upsert({ where: { name }, create: { name }, update: {} }).then((tag) => ({ id: tag.id })))) : undefined;
    return tx.page.update({ where: { id }, data: { ...pageData, searchText: pageSearchText(pageData.title, pageData.contentJson), ...(tagIds ? { tags: { set: tagIds } } : {}), version: { increment: 1 } } });
  });
}

export async function sharePage(actor: Actor, id: string, userId: string, permission: "READ" | "EDIT") {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanEditPage(page as PageAccessRecord, actor);
  if (userId === actor.id) throw badRequest("No necesitas compartir la página contigo mismo.");
  if (!await prisma.user.findFirst({ where: { id: userId, active: true } })) throw notFound("No se encontró al usuario.");
  return prisma.pageShare.upsert({ where: { pageId_userId: { pageId: id, userId } }, create: { pageId: id, userId, permission }, update: { permission } });
}

export async function revokeShare(actor: Actor, id: string, userId: string) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanEditPage(page as PageAccessRecord, actor);
  await prisma.pageShare.deleteMany({ where: { pageId: id, userId } });
}

export async function createShareLink(actor: Actor, id: string, permission: "READ" | "EDIT", expiresInHours?: number) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanEditPage(page as PageAccessRecord, actor);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3_600_000) : null;
  const record = await prisma.pageShareLink.create({ data: { pageId: id, tokenHash, permission, expiresAt, createdById: actor.id } });
  return { id: record.id, token, permission, expiresAt };
}

/** Enlaces activos de una página (sin el token, que solo se ve al crearlo). Solo quien puede editarla. */
export async function listShareLinks(actor: Actor, id: string) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanEditPage(page as PageAccessRecord, actor);
  return prisma.pageShareLink.findMany({ where: { pageId: id, ...activeLink() }, orderBy: { createdAt: "desc" }, select: shareLinkSelect });
}

export const shareLinkSelect = { id: true, permission: true, expiresAt: true, createdAt: true, createdBy: { select: { id: true, name: true } } } as const;
export const activeLink = () => ({ revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });
export const hashShareToken = (token: string) => createHash("sha256").update(token).digest("hex");
/** Aceptar un enlace nunca baja un permiso: si ya podía editar, sigue editando. */
export const strongestPermission = (current: string | undefined, offered: string) => (current === "EDIT" || offered === "EDIT" ? "EDIT" : "READ");

/** Acepta un enlace de página; devuelve `null` si el token no es de una página (puede ser de una plantilla). */
export async function acceptShareLink(actor: Actor, token: string) {
  const link = await prisma.pageShareLink.findUnique({ where: { tokenHash: hashShareToken(token) }, include: { page: true } });
  if (!link) return null;
  if (link.revokedAt || (link.expiresAt && link.expiresAt < new Date()) || link.page.deletedAt) throw notFound("El enlace no existe, venció o fue revocado.");
  if (link.page.ownerId === actor.id) return { type: "page" as const, pageId: link.pageId, permission: "EDIT" };
  const current = await prisma.pageShare.findUnique({ where: { pageId_userId: { pageId: link.pageId, userId: actor.id } } });
  const permission = strongestPermission(current?.permission, link.permission);
  await prisma.pageShare.upsert({ where: { pageId_userId: { pageId: link.pageId, userId: actor.id } }, create: { pageId: link.pageId, userId: actor.id, permission }, update: { permission } });
  return { type: "page" as const, pageId: link.pageId, permission };
}

export async function revokeShareLink(actor: Actor, id: string, linkId: string) {
  const page = await prisma.page.findFirst({ where: { id, deletedAt: null }, include: accessInclude });
  if (!page) throw notFound("No se encontró la página.");
  assertCanEditPage(page as PageAccessRecord, actor);
  const result = await prisma.pageShareLink.updateMany({ where: { id: linkId, pageId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) throw notFound("No se encontró el enlace.");
}

export async function getMostVisited(actor: Actor, departmentId?: string) {
  const where: Prisma.PageWhereInput = { deletedAt: null, visibility: { in: ["DEPARTMENT", "COMPANY"] } };
  if (actor.role !== "ADMIN") where.OR = [{ visibility: "COMPANY" }, { visibility: "DEPARTMENT", departmentId: actor.departmentId }];
  if (departmentId && (actor.role === "ADMIN" || departmentId === actor.departmentId)) where.departmentId = departmentId;
  const pages = await prisma.page.findMany({ where, select: { ...pageCardSelect, ...myShareSelect(actor), _count: { select: { visits: true } } }, orderBy: { visits: { _count: "desc" } }, take: 20 });
  return pages.map((page) => withMyPermission(actor, page));
}
