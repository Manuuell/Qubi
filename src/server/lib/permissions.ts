import { prisma } from "@/lib/db";
import { WorkspaceRole } from "@/generated/prisma/enums";

// Los únicos correos autorizados a editar horas manualmente (fijar/corregir
// un número a mano). Cualquier otro usuario solo puede acumular horas
// trabajando con el cronómetro, nunca escribir el número directamente.
export const TRUSTED_TIME_EDITOR_EMAILS = [
  "djerson347@gmail.com",
  "angelacero.sistemas@gmail.com",
  "estebangood209@gmail.com",
];

export function isTrustedTimeEditor(email: string | null | undefined) {
  return !!email && TRUSTED_TIME_EDITOR_EMAILS.includes(email);
}

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
