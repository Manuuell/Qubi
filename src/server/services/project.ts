import { prisma } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma/enums";

// Colores por defecto; rotan según el nº de proyectos del espacio.
const PALETTE = [
  "#378ADD", // azul
  "#1D9E75", // verde azulado
  "#EF9F27", // ámbar
  "#D4537E", // rosa
  "#7F77DD", // morado
  "#D85A30", // coral
];

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

export type ProjectListItem = {
  id: string;
  name: string;
  color: string | null;
};

// Proyectos activos del espacio (para la barra lateral).
export function listProjects(workspaceId: string): Promise<ProjectListItem[]> {
  return prisma.project.findMany({
    where: { workspaceId, status: ProjectStatus.ACTIVE },
    select: { id: true, name: true, color: true },
    orderBy: { createdAt: "asc" },
  });
}

// Devuelve el proyecto solo si el usuario es miembro del espacio al que pertenece.
export function getProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, workspace: { members: { some: { userId } } } },
  });
}

export async function createProject(
  workspaceId: string,
  userId: string,
  name: string,
) {
  await assertWorkspaceAccess(workspaceId, userId);
  const count = await prisma.project.count({ where: { workspaceId } });
  return prisma.project.create({
    data: {
      workspaceId,
      name: name.trim() || "Nuevo proyecto",
      color: PALETTE[count % PALETTE.length],
    },
  });
}

export async function renameProject(
  projectId: string,
  userId: string,
  name: string,
) {
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Proyecto no encontrado");
  return prisma.project.update({
    where: { id: projectId },
    data: { name: name.trim() || "Sin nombre" },
  });
}

// Mueve el proyecto a archivado (no se borra; deja de salir en la barra lateral).
export async function archiveProject(projectId: string, userId: string) {
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Proyecto no encontrado");
  return prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.ARCHIVED },
  });
}
