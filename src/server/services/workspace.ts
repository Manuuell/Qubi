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
