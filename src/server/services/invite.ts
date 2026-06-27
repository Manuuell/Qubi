import { prisma } from "@/lib/db";
import { WorkspaceRole } from "@/generated/prisma/enums";

// Solo OWNER/ADMIN pueden invitar o revocar invitaciones.
async function assertWorkspaceAdmin(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (
    !member ||
    (member.role !== WorkspaceRole.OWNER && member.role !== WorkspaceRole.ADMIN)
  ) {
    throw new Error("No tienes permisos para gestionar invitaciones");
  }
}

// Crea (o reactiva) una invitación pendiente para un email. NO añade a la
// persona al espacio: debe aceptarla desde sus notificaciones.
export async function inviteToWorkspace(
  workspaceId: string,
  actingUserId: string,
  email: string,
  role: WorkspaceRole,
) {
  await assertWorkspaceAdmin(workspaceId, actingUserId);
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Email no válido");

  // Si ya es miembro, no tiene sentido invitar.
  const existingUser = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (existingUser) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: existingUser.id },
      },
    });
    if (member) throw new Error("Esa persona ya es miembro del espacio");
  }

  // Una invitación por (espacio, email): si existe, la deja de nuevo pendiente.
  return prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId, email: normalized } },
    update: {
      role,
      status: "PENDING",
      invitedById: actingUserId,
      respondedAt: null,
      createdAt: new Date(),
    },
    create: {
      workspaceId,
      email: normalized,
      role,
      invitedById: actingUserId,
    },
  });
}

// Invitaciones pendientes de un espacio (para la pantalla de Miembros).
export function listWorkspacePendingInvites(workspaceId: string) {
  return prisma.workspaceInvite.findMany({
    where: { workspaceId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });
}

// Acepta una invitación: valida que el email coincida con el del usuario y lo
// añade como miembro. Idempotente si ya era miembro.
export async function acceptInvite(
  inviteId: string,
  user: {
    id: string;
    email: string;
  },
) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
  });
  if (!invite || invite.status !== "PENDING") {
    throw new Error("La invitación ya no está disponible");
  }
  if (invite.email !== user.email.toLowerCase()) {
    throw new Error("Esta invitación no es para tu cuenta");
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      },
    }),
    prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
  ]);

  return invite.workspaceId;
}

// Rechaza una invitación dirigida al usuario.
export async function declineInvite(
  inviteId: string,
  user: {
    email: string;
  },
) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
    select: { email: true, status: true },
  });
  if (!invite || invite.status !== "PENDING") return;
  if (invite.email !== user.email.toLowerCase()) {
    throw new Error("Esta invitación no es para tu cuenta");
  }
  await prisma.workspaceInvite.update({
    where: { id: inviteId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
}

// Revoca (borra) una invitación pendiente; solo OWNER/ADMIN del espacio.
export async function revokeInvite(inviteId: string, actingUserId: string) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
    select: { workspaceId: true },
  });
  if (!invite) return;
  await assertWorkspaceAdmin(invite.workspaceId, actingUserId);
  await prisma.workspaceInvite.delete({ where: { id: inviteId } });
}
