import { prisma } from "@/lib/db";
import { IssueStatus, Priority, ProjectStatus } from "@/generated/prisma/enums";

// Las "tareas" son filas del modelo Issue ligadas a un proyecto (projectId).

async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await prisma.issue.findUnique({
    where: { id: taskId },
    select: { workspaceId: true },
  });
  if (!task) throw new Error("Tarea no encontrada");
  await assertWorkspaceMember(task.workspaceId, userId);
}

export type TaskCard = {
  id: string;
  number: number;
  title: string;
  body: string;
  status: IssueStatus;
  priority: Priority;
  dueDate: Date | null;
  assignee: { id: string; name: string | null; email: string } | null;
};

// Tareas de un proyecto (para tablero/lista/calendario). Verifica pertenencia.
export async function listProjectTasks(
  projectId: string,
  userId: string,
): Promise<TaskCard[]> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspace: { members: { some: { userId } } } },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado");

  return prisma.issue.findMany({
    where: { projectId },
    select: {
      id: true,
      number: true,
      title: true,
      body: true,
      status: true,
      priority: true,
      dueDate: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export type AgendaTask = {
  id: string;
  number: number;
  title: string;
  status: IssueStatus;
  priority: Priority;
  dueDate: Date | null;
  project: { id: string; name: string; color: string | null };
};

// Mis tareas pendientes (asignadas a mí, no hechas) de todos los proyectos
// activos del espacio. Para la vista "Mi agenda".
export async function listMyTasks(
  workspaceId: string,
  userId: string,
): Promise<AgendaTask[]> {
  await assertWorkspaceMember(workspaceId, userId);
  const rows = await prisma.issue.findMany({
    where: {
      workspaceId,
      assigneeId: userId,
      status: { not: IssueStatus.DONE },
      project: { status: ProjectStatus.ACTIVE },
    },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { dueDate: "asc" },
  });
  return rows
    .filter((r) => r.project !== null)
    .map((r) => ({ ...r, project: r.project! }));
}

export async function createTask(input: {
  workspaceId: string;
  projectId: string;
  userId: string;
  title: string;
  assigneeId?: string | null;
}) {
  await assertWorkspaceMember(input.workspaceId, input.userId);
  // Número secuencial por espacio (compartido con el resto de tareas/issues).
  const last = await prisma.issue.findFirst({
    where: { workspaceId: input.workspaceId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return prisma.issue.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      number: (last?.number ?? 0) + 1,
      title: input.title.trim() || "Sin título",
      authorId: input.userId,
      assigneeId: input.assigneeId ?? null,
    },
  });
}

export async function setTaskStatus(
  taskId: string,
  userId: string,
  status: IssueStatus,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === IssueStatus.DONE ? new Date() : null,
    },
  });
}

export async function setTaskAssignee(
  taskId: string,
  userId: string,
  assigneeId: string | null,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { assigneeId } });
}

export async function setTaskPriority(
  taskId: string,
  userId: string,
  priority: Priority,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { priority } });
}

export async function setTaskDueDate(
  taskId: string,
  userId: string,
  dueDate: Date | null,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { dueDate } });
}

// Detalle completo de una tarea por número (#n), con proyecto, personas y comentarios.
export async function getTaskDetail(
  workspaceId: string,
  number: number,
  userId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  return prisma.issue.findUnique({
    where: { workspaceId_number: { workspaceId, number } },
    include: {
      project: { select: { id: true, name: true, color: true } },
      author: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export async function setTaskTitle(
  taskId: string,
  userId: string,
  title: string,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({
    where: { id: taskId },
    data: { title: title.trim() || "Sin título" },
  });
}

export async function setTaskBody(
  taskId: string,
  userId: string,
  body: string,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { body } });
}

export async function addTaskComment(
  taskId: string,
  userId: string,
  body: string,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issueComment.create({
    data: { issueId: taskId, authorId: userId, body: body.trim() },
  });
}
