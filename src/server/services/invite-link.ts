import { randomBytes } from "node:crypto";
import { InviteStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { isValidJoinToken } from "@/lib/join-token";
import { getWorkspaceRole, isAdminRole } from "@/server/lib/permissions";
import { notifyMemberJoined } from "@/server/services/notification";

export const INVALID_LINK_ERROR =
  "Este enlace ya no es válido. Pide uno nuevo a quien te lo compartió.";

function newToken() {
  return randomBytes(32).toString("base64url");
}

async function assertCanManageLink(workspaceId: string, userId: string) {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (!isAdminRole(role)) {
    throw new Error(
      "Solo el propietario o los administradores pueden gestionar el enlace de invitación",
    );
  }
}

async function readToken(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    // El omit global protege el token; este servicio lo pide expresamente
    // después de comprobar que quien actúa es propietario o administrador.
    select: { inviteLinkToken: true },
  });
  return workspace?.inviteLinkToken ?? null;
}

export async function getInviteLinkToken(
  workspaceId: string,
  actingUserId: string,
): Promise<string | null> {
  await assertCanManageLink(workspaceId, actingUserId);
  return readToken(workspaceId);
}

export async function enableInviteLink(
  workspaceId: string,
  actingUserId: string,
): Promise<string> {
  await assertCanManageLink(workspaceId, actingUserId);
  const existing = await readToken(workspaceId);
  if (existing) return existing;

  await prisma.workspace.updateMany({
    where: { id: workspaceId, inviteLinkToken: null },
    data: { inviteLinkToken: newToken() },
  });

  // La condición del update hace que dos administradores concurrentes no se
  // pisen: ambos releen y reciben exactamente el token que terminó guardado.
  const token = await readToken(workspaceId);
  if (!token)
    throw new Error("No se pudo crear el enlace. Inténtalo de nuevo.");
  return token;
}

export async function regenerateInviteLink(
  workspaceId: string,
  actingUserId: string,
): Promise<string> {
  await assertCanManageLink(workspaceId, actingUserId);
  const token = newToken();
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { inviteLinkToken: token },
  });
  return token;
}

export async function disableInviteLink(
  workspaceId: string,
  actingUserId: string,
): Promise<void> {
  await assertCanManageLink(workspaceId, actingUserId);
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { inviteLinkToken: null },
  });
}

export type JoinPreview = {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
};

export async function findWorkspaceByInviteToken(
  token: string,
): Promise<JoinPreview | null> {
  // Rechazar antes de Prisma también evita que entradas arbitrarias lleguen a
  // consultas o terminen interpoladas en rutas posteriores.
  if (!isValidJoinToken(token)) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { inviteLinkToken: token },
    select: {
      id: true,
      name: true,
      icon: true,
      _count: { select: { members: true } },
    },
  });
  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    icon: workspace.icon,
    memberCount: workspace._count.members,
  };
}

export async function joinWorkspaceViaLink(
  token: string,
  user: { id: string; email: string; name: string | null },
): Promise<{ workspaceId: string; joined: boolean }> {
  const workspace = await findWorkspaceByInviteToken(token);
  if (!workspace) throw new Error(INVALID_LINK_ERROR);

  const joined = await prisma.$transaction(async (tx) => {
    const { count } = await tx.workspaceMember.createMany({
      data: [
        {
          workspaceId: workspace.id,
          userId: user.id,
          role: WorkspaceRole.MEMBER,
        },
      ],
      skipDuplicates: true,
    });
    if (count === 0) return false;

    await tx.workspaceInvite.updateMany({
      where: {
        workspaceId: workspace.id,
        email: user.email.toLowerCase(),
        status: InviteStatus.PENDING,
      },
      data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() },
    });
    return true;
  });

  if (joined) {
    try {
      await notifyMemberJoined(
        { id: workspace.id, name: workspace.name },
        user,
      );
    } catch (error) {
      // La membresía ya está confirmada: un aviso secundario no debe convertir
      // el alta en un falso error ni tentar al usuario a repetirla.
      console.error("[invite-link] no se pudo avisar del alta", error);
    }
  }

  return { workspaceId: workspace.id, joined };
}
