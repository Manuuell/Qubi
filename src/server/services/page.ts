import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// Nodo mínimo que necesita el sidebar para armar el árbol.
export type PageTreeItem = {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  type: "PAGE" | "DATABASE";
};

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

// Páginas no archivadas del workspace; el árbol se arma en el cliente.
export async function getPageTree(
  workspaceId: string,
): Promise<PageTreeItem[]> {
  return prisma.page.findMany({
    // databaseId: null excluye las filas de bases de datos (no van en el árbol).
    where: { workspaceId, archivedAt: null, databaseId: null },
    select: { id: true, title: true, icon: true, parentId: true, type: true },
    orderBy: { createdAt: "asc" },
  });
}

// Devuelve la página solo si el usuario es miembro del workspace al que pertenece.
export function getPage(pageId: string, userId: string) {
  return prisma.page.findFirst({
    where: {
      id: pageId,
      archivedAt: null,
      workspace: { members: { some: { userId } } },
    },
  });
}

export async function createPage(opts: {
  workspaceId: string;
  userId: string;
  parentId?: string | null;
  title?: string;
}) {
  await assertWorkspaceAccess(opts.workspaceId, opts.userId);
  return prisma.page.create({
    data: {
      workspaceId: opts.workspaceId,
      parentId: opts.parentId ?? null,
      title: opts.title ?? "",
      createdById: opts.userId,
    },
  });
}

export async function renamePage(
  pageId: string,
  userId: string,
  title: string,
) {
  const page = await getPage(pageId, userId);
  if (!page) throw new Error("Página no encontrada");
  return prisma.page.update({ where: { id: pageId }, data: { title } });
}

// Recolecta recursivamente los ids de todos los descendientes de una página.
async function collectDescendantIds(pageId: string): Promise<string[]> {
  const children = await prisma.page.findMany({
    where: { parentId: pageId, archivedAt: null },
    select: { id: true },
  });
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id, ...(await collectDescendantIds(child.id)));
  }
  return ids;
}

// Mueve a la papelera la página y todo su subárbol (soft-delete).
export async function archivePage(pageId: string, userId: string) {
  const page = await getPage(pageId, userId);
  if (!page) throw new Error("Página no encontrada");
  const ids = [pageId, ...(await collectDescendantIds(pageId))];
  return prisma.page.updateMany({
    where: { id: { in: ids } },
    data: { archivedAt: new Date() },
  });
}

// Guarda el documento de bloques (BlockNote) de una página.
export async function savePageContent(
  pageId: string,
  userId: string,
  content: Prisma.InputJsonValue,
) {
  const page = await getPage(pageId, userId);
  if (!page) throw new Error("Página no encontrada");
  return prisma.page.update({
    where: { id: pageId },
    data: { content },
  });
}

// ── Papelera ───────────────────────────────────────────────────────────────

// Acceso a una página sin importar si está archivada (para restaurar/borrar).
async function assertPageAccess(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspace: { members: { some: { userId } } } },
  });
  if (!page) throw new Error("Página no encontrada");
  return page;
}

export async function getArchivedPages(workspaceId: string) {
  return prisma.page.findMany({
    where: { workspaceId, archivedAt: { not: null }, databaseId: null },
    select: { id: true, title: true, icon: true, archivedAt: true },
    orderBy: { archivedAt: "desc" },
  });
}

export async function restorePage(pageId: string, userId: string) {
  const page = await assertPageAccess(pageId, userId);
  // Si el padre ya no existe o sigue archivado, la subimos a primer nivel.
  let parentId = page.parentId;
  if (parentId) {
    const parent = await prisma.page.findFirst({
      where: { id: parentId, archivedAt: null },
    });
    if (!parent) parentId = null;
  }
  return prisma.page.update({
    where: { id: pageId },
    data: { archivedAt: null, parentId },
  });
}

export async function deletePageForever(pageId: string, userId: string) {
  await assertPageAccess(pageId, userId);
  // onDelete: Cascade en la relación PageTree borra también los descendientes.
  return prisma.page.delete({ where: { id: pageId } });
}

// ── Compartición ─────────────────────────────────────────────────────────────

// Activa/desactiva el enlace público de solo lectura de una página.
export async function setPagePublic(
  pageId: string,
  userId: string,
  isPublic: boolean,
) {
  await assertPageAccess(pageId, userId);
  return prisma.page.update({ where: { id: pageId }, data: { isPublic } });
}

// Página accesible públicamente (sin autenticación). null si no es pública.
export function getPublicPage(pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, isPublic: true, archivedAt: null },
  });
}

// ── Búsqueda ─────────────────────────────────────────────────────────────────

// Busca páginas por título en los workspaces del usuario (excluye filas y papelera).
export async function searchPages(userId: string, query: string) {
  const q = query.trim();
  if (!q) return [];
  return prisma.page.findMany({
    where: {
      archivedAt: null,
      databaseId: null,
      workspace: { members: { some: { userId } } },
      title: { contains: q, mode: "insensitive" },
    },
    select: { id: true, title: true, type: true, workspaceId: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}

// ── Favoritos ────────────────────────────────────────────────────────────────

export async function toggleFavorite(userId: string, pageId: string) {
  const existing = await prisma.favorite.findUnique({
    where: { userId_pageId: { userId, pageId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.favorite.create({ data: { userId, pageId } });
  return true;
}

export async function isPageFavorite(userId: string, pageId: string) {
  const fav = await prisma.favorite.findUnique({
    where: { userId_pageId: { userId, pageId } },
  });
  return Boolean(fav);
}

export async function getFavoritePages(userId: string, workspaceId: string) {
  const favs = await prisma.favorite.findMany({
    where: { userId, page: { workspaceId, archivedAt: null } },
    select: {
      page: { select: { id: true, title: true, icon: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return favs.map((f) => f.page);
}
