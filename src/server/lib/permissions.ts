import { prisma } from "@/lib/db";
import { WorkspaceRole } from "@/generated/prisma/enums";

// Rol del usuario en el espacio (null si no es miembro).
export async function getWorkspaceRole(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function assertWorkspaceMember(
  workspaceId: string,
  userId: string,
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

// Solo OWNER/ADMIN: gestión de miembros, vistas de equipo/manager.
export async function assertWorkspaceAdmin(
  workspaceId: string,
  userId: string,
) {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
    throw new Error("Solo el propietario o administradores pueden ver esto");
  }
}

export function isAdminRole(role: WorkspaceRole | null) {
  return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
}

// Escribir un número de horas a mano (en vez de acumularlas con el cronómetro)
// es un privilegio de quien manda en el espacio: OWNER/ADMIN. Va aparte de
// assertWorkspaceAdmin solo por el mensaje, que aquí habla de editar y no de ver.
export async function assertCanEditTimeManually(
  workspaceId: string,
  userId: string,
) {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (!isAdminRole(role)) {
    throw new Error(
      "Solo el propietario o administradores pueden editar horas manualmente",
    );
  }
}
