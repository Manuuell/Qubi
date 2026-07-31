import { prisma } from "@/lib/db";
import { assertWorkspaceMember } from "@/server/lib/permissions";

// Paleta corta y agradable para etiquetas nuevas (se asigna por rotación).
export const LABEL_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export async function listLabels(workspaceId: string, userId: string) {
  await assertWorkspaceMember(workspaceId, userId);
  return prisma.label.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

export async function createLabel(
  workspaceId: string,
  userId: string,
  name: string,
  color?: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  const trimmed = name.trim();
  if (!trimmed)
    throw new Error("El nombre de la etiqueta no puede estar vacío.");
  const count = await prisma.label.count({ where: { workspaceId } });
  return prisma.label.upsert({
    where: { workspaceId_name: { workspaceId, name: trimmed } },
    create: {
      workspaceId,
      name: trimmed,
      color: color ?? LABEL_COLORS[count % LABEL_COLORS.length],
    },
    update: {},
  });
}

export async function deleteLabel(
  labelId: string,
  workspaceId: string,
  userId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  await prisma.label.deleteMany({ where: { id: labelId, workspaceId } });
}
