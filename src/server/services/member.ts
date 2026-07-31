import { prisma } from "@/lib/db";
import { IssueStatus, WorkspaceRole } from "@/generated/prisma/enums";
import {
  assertWorkspaceAdmin,
  assertWorkspaceMember,
  getWorkspaceRole,
  isAdminRole,
} from "@/server/lib/permissions";

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

export type MemberProfile = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: WorkspaceRole;
  joinedAt: Date;
  isSelf: boolean;
  // Solo visible para el propio usuario o para OWNER/ADMIN (evita filtrar
  // horas/productividad de un compañero a cualquier otro miembro).
  stats: { minutesThisMonth: number; tasksCompleted: number } | null;
};

// Perfil de un miembro dentro del espacio. La info básica (foto, nombre,
// rol, fecha de ingreso) la ve cualquier miembro; las estadísticas de
// productividad solo el propio usuario o un admin.
export async function getMemberProfile(
  workspaceId: string,
  targetUserId: string,
  viewerUserId: string,
): Promise<MemberProfile | null> {
  await assertWorkspaceMember(workspaceId, viewerUserId);

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  if (!member) return null;

  const isSelf = viewerUserId === targetUserId;
  const viewerRole = await getWorkspaceRole(workspaceId, viewerUserId);
  const canSeeStats = isSelf || isAdminRole(viewerRole);

  let stats: MemberProfile["stats"] = null;
  if (canSeeStats) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [minutesAgg, tasksCompleted] = await Promise.all([
      prisma.timeEntry.aggregate({
        where: {
          userId: targetUserId,
          project: { workspaceId },
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { minutes: true },
      }),
      prisma.issue.count({
        where: {
          workspaceId,
          assignees: { some: { userId: targetUserId } },
          status: IssueStatus.DONE,
        },
      }),
    ]);
    stats = {
      minutesThisMonth: minutesAgg._sum.minutes ?? 0,
      tasksCompleted,
    };
  }

  return {
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    image: member.user.image,
    role: member.role,
    joinedAt: member.createdAt,
    isSelf,
    stats,
  };
}
