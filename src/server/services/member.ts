import { prisma } from "@/lib/db";
import { WorkspaceRole } from "@/generated/prisma/enums";

// Solo OWNER/ADMIN pueden gestionar miembros.
async function assertWorkspaceAdmin(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (
    !member ||
    (member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.ADMIN)
  ) {
    throw new Error("No tienes permisos para gestionar miembros");
  }
}

export function getWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Invita por email: crea el usuario si no existe y lo añade al workspace.
export async function addMemberByEmail(
  workspaceId: string,
  actingUserId: string,
  email: string,
  role: WorkspaceRole,
) {
  await assertWorkspaceAdmin(workspaceId, actingUserId);
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email no válido");

  const user = await prisma.user.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized },
  });

  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    update: { role },
    create: { workspaceId, userId: user.id, role },
  });
}

export async function removeMember(
  workspaceId: string,
  actingUserId: string,
  memberUserId: string,
) {
  await assertWorkspaceAdmin(workspaceId, actingUserId);
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
  });
  if (target?.role === WorkspaceRole.OWNER) {
    throw new Error("No puedes quitar al propietario");
  }
  return prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
  });
}
