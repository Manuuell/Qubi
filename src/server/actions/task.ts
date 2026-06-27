"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { IssueStatus, Priority } from "@/generated/prisma/enums";
import * as taskService from "@/server/services/task";

function revalidateProject(workspaceId: string, projectId: string) {
  revalidatePath(`/w/${workspaceId}/projects/${projectId}`);
  // "Mi agenda" muestra tareas de todos los proyectos: mantenerla fresca.
  revalidatePath(`/w/${workspaceId}/agenda`);
}

export async function createTaskAction(input: {
  workspaceId: string;
  projectId: string;
  title: string;
  assigneeId?: string | null;
}) {
  if (!input.title.trim()) return;
  const user = await getCurrentUser();
  await taskService.createTask({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    userId: user.id,
    title: input.title,
    assigneeId: input.assigneeId ?? null,
  });
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskStatusAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  status: IssueStatus;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskStatus(input.taskId, user.id, input.status);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskAssigneeAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  assigneeId: string | null;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskAssignee(input.taskId, user.id, input.assigneeId);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskPriorityAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  priority: Priority;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskPriority(input.taskId, user.id, input.priority);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskDueDateAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  dueDate: string | null;
}) {
  const user = await getCurrentUser();
  // "YYYY-MM-DD" -> medianoche local (evita el desfase de un día por zona horaria).
  const date = input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null;
  await taskService.setTaskDueDate(input.taskId, user.id, date);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskStartDateAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  startDate: string | null;
}) {
  const user = await getCurrentUser();
  // "YYYY-MM-DD" -> medianoche local (igual que la fecha límite).
  const date = input.startDate ? new Date(`${input.startDate}T00:00:00`) : null;
  await taskService.setTaskStartDate(input.taskId, user.id, date);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskTitleAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  title: string;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskTitle(input.taskId, user.id, input.title);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskBodyAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  body: string;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskBody(input.taskId, user.id, input.body);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function addTaskCommentAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  body: string;
}) {
  if (!input.body.trim()) return;
  const user = await getCurrentUser();
  await taskService.addTaskComment(input.taskId, user.id, input.body);
  revalidateProject(input.workspaceId, input.projectId);
}
