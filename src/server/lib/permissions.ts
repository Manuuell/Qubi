import { prisma } from "@/lib/db";
import { WorkspaceRole } from "@/generated/prisma/enums";

// Los únicos correos autorizados a editar horas manualmente (fijar/corregir
// un número a mano). Cualquier otro usuario solo puede acumular horas
// trabajando con el cronómetro, nunca escribir el número directamente.
// Configurable por variable de entorno (lista separada por comas) para poder
// cambiar quién tiene este privilegio sin tocar código ni redeployar; si no
// está definida, se usa esta lista como valor por defecto.
const DEFAULT_TRUSTED_TIME_EDITOR_EMAILS = [
  "djerson347@gmail.com",
  "angelacero.sistemas@gmail.com",
  "estebangood209@gmail.com",
];

export const TRUSTED_TIME_EDITOR_EMAILS = process.env.TRUSTED_TIME_EDITOR_EMAILS
  ? process.env.TRUSTED_TIME_EDITOR_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : DEFAULT_TRUSTED_TIME_EDITOR_EMAILS;

export function isTrustedTimeEditor(email: string | null | undefined) {
  return (
    !!email && TRUSTED_TIME_EDITOR_EMAILS.includes(email.trim().toLowerCase())
  );
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
