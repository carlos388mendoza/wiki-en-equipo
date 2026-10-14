import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../models/client.js";
import type { Actor } from "../permissions/access.js";
import { canEditTemplate, canManageTemplate, canReadTemplate } from "../permissions/access.js";
import { badRequest, forbidden, notFound } from "./errors.js";
import { copyReferencedFiles } from "./file-service.js";
import { activeLink, createPage, hashShareToken, shareLinkSelect, shareWithUserSelect, strongestPermission, type MyPermission } from "./page-service.js";

const SCOPES = ["PRIVATE", "DEPARTMENT", "COMPANY"];

/** Plantilla con lo necesario para decidir permisos. Sin acceso responde 404: no se revela que existe. */
async function findTemplate(actor: Actor, id: string) {
  const template = await prisma.template.findUnique({ where: { id }, include: { shares: { select: { userId: true, permission: true } }, owner: { select: { id: true, departmentId: true } } } });
  if (!template || !canReadTemplate(template, actor)) throw notFound("No se encontró la plantilla.");
  return template;
}

async function findEditableTemplate(actor: Actor, id: string) {
  const template = await findTemplate(actor, id);
  if (!canEditTemplate(template, actor)) throw forbidden("Necesitas permiso de edición para cambiar esta plantilla.");
  return template;
}

/** Permiso propio y qué puede hacer la persona con la plantilla (la interfaz decide qué botones mostrar). */
function access(actor: Actor, template: { scope: string; ownerId: string | null; departmentId: string | null }, myShares: { permission: string }[]) {
  const record = { ...template, shares: myShares.map((share) => ({ userId: actor.id, permission: share.permission })) };
  const myPermission = (template.ownerId === actor.id ? "OWNER" : myShares[0]?.permission ?? null) as MyPermission;
  return { myPermission, canEdit: canEditTemplate(record, actor), canManage: canManageTemplate(record, actor) };
}

export async function listTemplates(actor: Actor) {
  const where: Prisma.TemplateWhereInput = actor.role === "ADMIN" ? {} : { OR: [{ scope: "COMPANY" }, { ownerId: actor.id }, { scope: "DEPARTMENT", departmentId: actor.departmentId }, { shares: { some: { userId: actor.id } } }] };
  const templates = await prisma.template.findMany({ where, orderBy: [{ isDefault: "desc" }, { title: "asc" }], select: {
    id: true, title: true, description: true, icon: true, backgroundJson: true, scope: true, isDefault: true, ownerId: true, owner: { select: { id: true, name: true } }, departmentId: true, updatedAt: true,
    shares: { where: { userId: actor.id }, select: { permission: true } },
  } });
  return templates.map(({ shares, ...template }) => ({ ...template, ...access(actor, template, shares) }));
}

export async function getTemplate(actor: Actor, id: string) {
  const template = await prisma.template.findUnique({ where: { id }, include: { shares: { select: shareWithUserSelect, orderBy: { createdAt: "asc" } }, owner: { select: { id: true, name: true } } } });
  if (!template || !canReadTemplate(template, actor)) throw notFound("No se encontró la plantilla.");
  return { ...template, ...access(actor, template, template.shares.filter((share) => share.userId === actor.id)) };
}

/** Los archivos que cita el contenido pasan a ser de la plantilla (por ejemplo, al guardar una página como plantilla). */
async function withOwnFiles<T extends { id: string; contentJson: string; backgroundJson: string | null }>(actor: Actor, template: T): Promise<T> {
  const copied = await copyReferencedFiles(actor, { templateId: template.id }, template);
  if (copied.contentJson === template.contentJson && copied.backgroundJson === template.backgroundJson) return template;
  return prisma.template.update({ where: { id: template.id }, data: copied }) as unknown as Promise<T>;
}

export async function createTemplate(actor: Actor, input: { title: string; description?: string; icon?: string | null; content?: unknown; background?: unknown; scope?: string }) {
  const scope = input.scope ?? "PRIVATE";
  if (!SCOPES.includes(scope)) throw badRequest("El alcance de la plantilla no es válido.");
  if (scope === "COMPANY" && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede compartir plantillas con toda la empresa.");
  const template = await prisma.template.create({ data: { title: input.title.trim(), description: input.description?.trim() ?? "", icon: input.icon ?? null, contentJson: JSON.stringify(input.content ?? []), backgroundJson: input.background === undefined ? null : JSON.stringify(input.background), scope, ownerId: actor.id, departmentId: scope === "DEPARTMENT" ? actor.departmentId : null } });
  return withOwnFiles(actor, template);
}

/** Quien tiene permiso de edición cambia el contenido; el alcance y "predeterminada" solo el dueño o un ADMIN. */
export async function updateTemplate(actor: Actor, id: string, input: { title?: string; description?: string; icon?: string | null; content?: unknown; background?: unknown; scope?: string; isDefault?: boolean }) {
  const template = await findEditableTemplate(actor, id);
  if ((input.scope !== undefined || input.isDefault !== undefined) && !canManageTemplate(template, actor)) throw forbidden("Solo quien creó la plantilla puede cambiar su alcance.");
  if (input.isDefault !== undefined && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede administrar las plantillas predeterminadas.");
  if (input.scope && !SCOPES.includes(input.scope)) throw badRequest("El alcance de la plantilla no es válido.");
  if (input.scope === "COMPANY" && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede compartir plantillas con toda la empresa.");
  if (input.isDefault === true && (input.scope ?? template.scope) !== "COMPANY") throw badRequest("Una plantilla predeterminada debe estar disponible para toda la empresa.");
  const updated = await prisma.template.update({ where: { id }, data: {
    ...(input.title === undefined ? {} : { title: input.title.trim() }),
    ...(input.description === undefined ? {} : { description: input.description.trim() }),
    ...(input.icon === undefined ? {} : { icon: input.icon }),
    ...(input.content === undefined ? {} : { contentJson: JSON.stringify(input.content) }),
    ...(input.background === undefined ? {} : { backgroundJson: JSON.stringify(input.background) }),
    // El departamento es el de quien la creó, aunque el cambio lo haga un administrador.
    ...(input.scope === undefined ? {} : { scope: input.scope, departmentId: input.scope === "DEPARTMENT" ? template.owner?.departmentId ?? actor.departmentId : null }),
    ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
  } });
  return input.content === undefined && input.background === undefined ? updated : withOwnFiles(actor, updated);
}

export async function deleteTemplate(actor: Actor, id: string) {
  const template = await findTemplate(actor, id);
  if (!canManageTemplate(template, actor)) throw forbidden("Solo quien creó la plantilla puede eliminarla.");
  await prisma.template.delete({ where: { id } });
}

/** Crea una página con el contenido de la plantilla; sus archivos se copian a la página nueva. */
export async function createPageFromTemplate(actor: Actor, id: string, input: { title?: string; parentId?: string | null }) {
  const template = await findTemplate(actor, id);
  const page = await createPage(actor, { title: input.title ?? template.title, icon: template.icon, content: JSON.parse(template.contentJson), background: template.backgroundJson ? JSON.parse(template.backgroundJson) : undefined, parentId: input.parentId });
  const copied = await copyReferencedFiles(actor, { pageId: page.id }, page);
  if (copied.contentJson === page.contentJson && copied.backgroundJson === page.backgroundJson) return page;
  return prisma.page.update({ where: { id: page.id }, data: copied, include: { tags: { select: { name: true } } } });
}

/* ---------- Compartir (igual que las páginas: compartir = editar) ---------- */

export async function shareTemplate(actor: Actor, id: string, userId: string, permission: "READ" | "EDIT") {
  const template = await findEditableTemplate(actor, id);
  if (userId === actor.id) throw badRequest("No necesitas compartir la plantilla contigo mismo.");
  if (userId === template.ownerId) throw badRequest("Esa persona creó la plantilla y ya puede editarla.");
  if (!await prisma.user.findFirst({ where: { id: userId, active: true } })) throw notFound("No se encontró al usuario.");
  return prisma.templateShare.upsert({ where: { templateId_userId: { templateId: id, userId } }, create: { templateId: id, userId, permission }, update: { permission } });
}

export async function revokeTemplateShare(actor: Actor, id: string, userId: string) {
  await findEditableTemplate(actor, id);
  await prisma.templateShare.deleteMany({ where: { templateId: id, userId } });
}

export async function createTemplateShareLink(actor: Actor, id: string, permission: "READ" | "EDIT", expiresInHours?: number) {
  await findEditableTemplate(actor, id);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3_600_000) : null;
  const record = await prisma.templateShareLink.create({ data: { templateId: id, tokenHash: hashShareToken(token), permission, expiresAt, createdById: actor.id } });
  return { id: record.id, token, permission, expiresAt };
}

export async function listTemplateShareLinks(actor: Actor, id: string) {
  await findEditableTemplate(actor, id);
  return prisma.templateShareLink.findMany({ where: { templateId: id, ...activeLink() }, orderBy: { createdAt: "desc" }, select: shareLinkSelect });
}

export async function revokeTemplateShareLink(actor: Actor, id: string, linkId: string) {
  await findEditableTemplate(actor, id);
  const result = await prisma.templateShareLink.updateMany({ where: { id: linkId, templateId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) throw notFound("No se encontró el enlace.");
}

/** Acepta un enlace de plantilla; `null` si el token no es de una plantilla. Nunca baja un permiso. */
export async function acceptTemplateShareLink(actor: Actor, token: string) {
  const link = await prisma.templateShareLink.findUnique({ where: { tokenHash: hashShareToken(token) }, include: { template: { select: { ownerId: true } } } });
  if (!link) return null;
  if (link.revokedAt || (link.expiresAt && link.expiresAt < new Date())) throw notFound("El enlace no existe, venció o fue revocado.");
  if (link.template.ownerId === actor.id) return { type: "template" as const, templateId: link.templateId, permission: "EDIT" };
  const current = await prisma.templateShare.findUnique({ where: { templateId_userId: { templateId: link.templateId, userId: actor.id } } });
  const permission = strongestPermission(current?.permission, link.permission);
  await prisma.templateShare.upsert({ where: { templateId_userId: { templateId: link.templateId, userId: actor.id } }, create: { templateId: link.templateId, userId: actor.id, permission }, update: { permission } });
  return { type: "template" as const, templateId: link.templateId, permission };
}
