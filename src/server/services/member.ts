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

// El alta de miembros ahora pasa por una invitación que la persona debe aceptar.
// Ver `inviteToWorkspace` / `acceptInvite` en `services/invite.ts`.

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
