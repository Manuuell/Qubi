import { prisma } from "@/lib/db";
import { WorkspaceRole } from "@/generated/prisma/enums";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // quitar acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "espacio"}-${suffix}`;
}

export function getUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
  });
}

// Devuelve el workspace solo si el usuario es miembro (control de acceso básico).
export function getWorkspace(workspaceId: string, userId: string) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId } } },
  });
}

// Solo el propietario puede renombrar o eliminar el espacio.
async function assertWorkspaceOwner(workspaceId: string, userId: string) {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!ws) throw new Error("Espacio no encontrado");
  if (ws.ownerId !== userId) {
    throw new Error("Solo el propietario puede modificar este espacio");
  }
}

export async function renameWorkspace(
  workspaceId: string,
  userId: string,
  name: string,
) {
  await assertWorkspaceOwner(workspaceId, userId);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre no puede estar vacío");
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: trimmed },
  });
}

// Elimina el espacio y, en cascada, sus miembros, proyectos, tareas y páginas.
export async function deleteWorkspace(workspaceId: string, userId: string) {
  await assertWorkspaceOwner(workspaceId, userId);
  return prisma.workspace.delete({ where: { id: workspaceId } });
}

export function createWorkspace(userId: string, name: string) {
  return prisma.workspace.create({
    data: {
      name,
      slug: slugify(name),
      ownerId: userId,
      members: { create: { userId, role: WorkspaceRole.OWNER } },
    },
  });
}

// Garantiza que el usuario tenga al menos un workspace (lo crea en el primer uso).
export async function ensureDefaultWorkspace(userId: string) {
  const existing = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
  });
  return existing ?? createWorkspace(userId, "Mi espacio");
}
