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

// Solo el OWNER puede cambiar el rol de otros miembros.
// El rol OWNER no se puede asignar aquí (requeriría transferir la propiedad).
export async function changeMemberRole(
  workspaceId: string,
  actingUserId: string,
  targetUserId: string,
  newRole: WorkspaceRole,
) {
  if (newRole === WorkspaceRole.OWNER) {
    throw new Error("No se puede asignar el rol de Propietario");
  }
  if (targetUserId === actingUserId) {
    throw new Error("No puedes cambiar tu propio rol");
  }

  const [actor, target] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actingUserId } },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    }),
  ]);

  if (actor?.role !== WorkspaceRole.OWNER) {
    throw new Error("Solo el propietario puede cambiar roles");
  }
  if (!target) throw new Error("El miembro no existe");
  if (target.role === WorkspaceRole.OWNER) {
    throw new Error("No puedes cambiar el rol del propietario");
  }

  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    data: { role: newRole },
  });
}
