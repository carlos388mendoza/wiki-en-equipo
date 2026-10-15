import { prisma } from "../models/client.js";
import type { Actor } from "../permissions/access.js";
import { canManageDepartment } from "../permissions/access.js";
import { badRequest, forbidden, notFound } from "./errors.js";
import { myShareSelect, pageCardSelect, withMyPermission } from "./page-service.js";

function makeSlug(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const departmentSelect = { id: true, name: true, slug: true, description: true, icon: true, wallPage: { select: { id: true, title: true, updatedAt: true } }, _count: { select: { users: true, pages: true } } } as const;

export async function listDepartments(actor: Actor) {
  return prisma.department.findMany({ where: actor.role === "ADMIN" ? {} : { id: actor.departmentId }, orderBy: { name: "asc" }, select: departmentSelect });
}

/** Un departamento por id o slug: 404 si no existe y 403 si existe pero la persona no pertenece a él. */
export async function getDepartment(actor: Actor, idOrSlug: string) {
  const department = await prisma.department.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: departmentSelect });
  if (!department) throw notFound("No se encontró el departamento.");
  if (actor.role !== "ADMIN" && actor.departmentId !== department.id) throw forbidden("Solo los miembros del departamento pueden ver su muro.");
  return department;
}

export async function createDepartment(input: { name: string; description?: string; icon?: string | null }) {
  const slug = makeSlug(input.name);
  if (!slug) throw badRequest("El nombre del departamento no es válido.");
  return prisma.department.create({ data: { name: input.name.trim(), slug, description: input.description?.trim() ?? "", icon: input.icon ?? null } });
}

/** Descripción e icono: ADMIN o el administrador del departamento. El nombre solo un ADMIN (el slug no cambia para no romper enlaces). */
export async function updateDepartment(actor: Actor, departmentId: string, input: { name?: string; description?: string; icon?: string | null }) {
  if (!canManageDepartment(actor, departmentId)) throw forbidden("No puedes administrar este departamento.");
  if (input.name !== undefined && actor.role !== "ADMIN") throw forbidden("Solo un administrador puede cambiar el nombre del departamento.");
  if (!await prisma.department.findUnique({ where: { id: departmentId } })) throw notFound("No se encontró el departamento.");
  await prisma.department.update({ where: { id: departmentId }, data: {
    ...(input.name === undefined ? {} : { name: input.name.trim() }),
    ...(input.description === undefined ? {} : { description: input.description.trim() }),
    ...(input.icon === undefined ? {} : { icon: input.icon }),
  } });
  return getDepartment(actor, departmentId);
}

export async function setDepartmentWall(actor: Actor, departmentId: string, pageId: string) {
  if (!canManageDepartment(actor, departmentId)) throw forbidden("No puedes administrar este departamento.");
  return prisma.$transaction(async (tx) => {
    const department = await tx.department.findUnique({ where: { id: departmentId } });
    if (!department) throw notFound("No se encontró el departamento.");
    const page = await tx.page.findFirst({ where: { id: pageId, deletedAt: null } });
    if (!page) throw notFound("No se encontró la página.");
    if (actor.role !== "ADMIN" && page.departmentId !== departmentId) throw forbidden("La página debe pertenecer a tu departamento.");
    if (department.wallPageId && department.wallPageId !== pageId) await tx.page.update({ where: { id: department.wallPageId }, data: { isWall: false } });
    // Si la página era muro de empresa, quitar esa marca para evitar 403 en /company/wall.
    const updated = await tx.page.update({ where: { id: pageId }, data: { departmentId, isWall: true, isCompanyWall: false, visibility: "DEPARTMENT", version: { increment: 1 } } });
    await tx.department.update({ where: { id: departmentId }, data: { wallPageId: pageId } });
    return updated;
  });
}

export async function clearDepartmentWall(actor: Actor, departmentId: string) {
  if (!canManageDepartment(actor, departmentId)) throw forbidden("No puedes administrar este departamento.");
  return prisma.$transaction(async (tx) => {
    const department = await tx.department.findUnique({ where: { id: departmentId } });
    if (!department) throw notFound("No se encontró el departamento.");
    if (department.wallPageId) await tx.page.update({ where: { id: department.wallPageId }, data: { isWall: false } });
    return tx.department.update({ where: { id: departmentId }, data: { wallPageId: null } });
  });
}

export async function setFeaturedPages(actor: Actor, departmentId: string, pageIds: string[]) {
  if (!canManageDepartment(actor, departmentId)) throw forbidden("No puedes administrar este departamento.");
  if (pageIds.length > 12 || new Set(pageIds).size !== pageIds.length) throw badRequest("Puedes destacar hasta 12 páginas distintas.");
  const pages = await prisma.page.findMany({ where: { id: { in: pageIds }, departmentId, deletedAt: null } });
  if (pages.length !== pageIds.length) throw badRequest("Todas las páginas destacadas deben pertenecer al departamento.");
  if (pages.some((page) => page.visibility === "PRIVATE")) throw badRequest("Solo se pueden destacar páginas publicadas en el departamento o en la empresa.");
  await prisma.$transaction([
    prisma.departmentFeaturedPage.deleteMany({ where: { departmentId } }),
    prisma.departmentFeaturedPage.createMany({ data: pageIds.map((pageId, sortOrder) => ({ departmentId, pageId, sortOrder })) }),
  ]);
  return listFeaturedPages(actor, departmentId);
}

export async function listFeaturedPages(actor: Actor, departmentId: string) {
  if (actor.role !== "ADMIN" && actor.departmentId !== departmentId) throw forbidden("Solo puedes ver las páginas destacadas de tu departamento.");
  const records = await prisma.departmentFeaturedPage.findMany({ where: { departmentId, page: { deletedAt: null, visibility: { in: ["DEPARTMENT", "COMPANY"] } } }, orderBy: { sortOrder: "asc" }, include: { page: { select: { ...pageCardSelect, ...myShareSelect(actor) } } } });
  return records.map(({ page }) => withMyPermission(actor, page));
}

/** Destacadas del muro de la empresa: las ve cualquier persona con sesión (son páginas publicadas a la empresa). */
export async function listCompanyFeaturedPages(actor: Actor) {
  const records = await prisma.companyFeaturedPage.findMany({ where: { page: { deletedAt: null, visibility: "COMPANY" } }, orderBy: { sortOrder: "asc" }, include: { page: { select: { ...pageCardSelect, ...myShareSelect(actor) } } } });
  return records.map(({ page }) => withMyPermission(actor, page));
}

export async function setCompanyFeaturedPages(actor: Actor, pageIds: string[]) {
  if (actor.role !== "ADMIN") throw forbidden("Solo un administrador puede elegir las destacadas de la empresa.");
  if (pageIds.length > 12 || new Set(pageIds).size !== pageIds.length) throw badRequest("Puedes destacar hasta 12 páginas distintas.");
  const pages = await prisma.page.findMany({ where: { id: { in: pageIds }, deletedAt: null }, select: { visibility: true } });
  if (pages.length !== pageIds.length) throw badRequest("No se encontraron todas las páginas.");
  if (pages.some((page) => page.visibility !== "COMPANY")) throw badRequest("Solo se pueden destacar páginas publicadas para toda la empresa.");
  await prisma.$transaction([
    prisma.companyFeaturedPage.deleteMany(),
    prisma.companyFeaturedPage.createMany({ data: pageIds.map((pageId, sortOrder) => ({ pageId, sortOrder })) }),
  ]);
  return listCompanyFeaturedPages(actor);
}

export async function setCompanyWall(actor: Actor, pageId: string) {
  if (actor.role !== "ADMIN") throw forbidden("Solo un administrador puede cambiar el muro de la empresa.");
  return prisma.$transaction(async (tx) => {
    const page = await tx.page.findFirst({ where: { id: pageId, deletedAt: null } });
    if (!page) throw notFound("No se encontró la página.");
    const old = await tx.companySettings.findUnique({ where: { id: "main" } });
    if (old?.wallPageId && old.wallPageId !== pageId) await tx.page.update({ where: { id: old.wallPageId }, data: { isCompanyWall: false } });
    // Si la página era muro de departamento, quitar esa marca.
    const updated = await tx.page.update({ where: { id: pageId }, data: { visibility: "COMPANY", isCompanyWall: true, isWall: false, version: { increment: 1 } } });
    await tx.companySettings.upsert({ where: { id: "main" }, create: { id: "main", wallPageId: pageId }, update: { wallPageId: pageId } });
    return updated;
  });
}

export async function getCompanyWall() {
  const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, include: { wallPage: { select: { id: true, title: true, visibility: true, version: true, updatedAt: true } } } });
  return settings?.wallPage ?? null;
}

export async function clearCompanyWall(actor: Actor) {
  if (actor.role !== "ADMIN") throw forbidden("Solo un administrador puede cambiar el muro de la empresa.");
  return prisma.$transaction(async (tx) => {
    const settings = await tx.companySettings.findUnique({ where: { id: "main" } });
    if (settings?.wallPageId) await tx.page.update({ where: { id: settings.wallPageId }, data: { isCompanyWall: false } });
    if (settings) await tx.companySettings.update({ where: { id: "main" }, data: { wallPageId: null } });
  });
}
