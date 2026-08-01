"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  IssueStatus,
  IssueType,
  IssueCommentKind,
  Priority,
} from "@/generated/prisma/enums";
import * as taskService from "@/server/services/task";
import { uploadFile } from "@/lib/storage";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function revalidateProject(workspaceId: string, projectId: string) {
  revalidatePath(`/w/${workspaceId}/projects/${projectId}`);
  // "Mi agenda" muestra tareas de todos los proyectos: mantenerla fresca.
  revalidatePath(`/w/${workspaceId}/agenda`);
}

export async function createTaskAction(input: {
  workspaceId: string;
  projectId: string;
  title: string;
  body?: string;
  type?: IssueType;
  priority?: Priority;
  assigneeIds?: string[];
  labelIds?: string[];
  dueDate?: string | null;
  startDate?: string | null;
  linkedPageId?: string | null;
}) {
  if (!input.title.trim()) return;
  const user = await getCurrentUser();
  const issue = await taskService.createTask({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    userId: user.id,
    title: input.title,
    body: input.body,
    type: input.type,
    priority: input.priority,
    assigneeIds: input.assigneeIds,
    labelIds: input.labelIds,
    dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00`) : null,
    startDate: input.startDate ? new Date(`${input.startDate}T00:00:00`) : null,
    linkedPageId: input.linkedPageId,
  });
  revalidateProject(input.workspaceId, input.projectId);
  return issue;
}

export async function setTaskStatusAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  status: IssueStatus;
  note?: string;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskStatus(
    input.taskId,
    user.id,
    input.status,
    input.note,
  );
  revalidateProject(input.workspaceId, input.projectId);
}

export async function startTaskAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
}) {
  const user = await getCurrentUser();
  await taskService.startTask(input.taskId, user.id);
  revalidateProject(input.workspaceId, input.projectId);
}

// Soltar una tarea sobre la foto de alguien (drag & drop) la asigna sin
// tocar al resto de responsables ya asignados.
export async function addTaskAssigneeAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  assigneeId: string;
}) {
  const user = await getCurrentUser();
  await taskService.addTaskAssignee(input.taskId, user.id, input.assigneeId);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskAssigneesAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  assigneeIds: string[];
}) {
  const user = await getCurrentUser();
  await taskService.setTaskAssignees(input.taskId, user.id, input.assigneeIds);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskLabelsAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  labelIds: string[];
}) {
  const user = await getCurrentUser();
  await taskService.setTaskLabels(input.taskId, user.id, input.labelIds);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function setTaskTypeAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  type: IssueType;
}) {
  const user = await getCurrentUser();
  await taskService.setTaskType(input.taskId, user.id, input.type);
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

export async function linkTaskPageAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  linkedPageId: string | null;
}) {
  const user = await getCurrentUser();
  await taskService.linkTaskPage(input.taskId, user.id, input.linkedPageId);
  revalidateProject(input.workspaceId, input.projectId);
}

async function extractAttachment(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("El adjunto debe ser una imagen.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("La imagen no puede superar 8 MB.");
  }
  return uploadFile(file);
}

export async function addTaskCommentAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "");
  const attachmentUrl = await extractAttachment(formData);

  if (!body.trim() && !attachmentUrl) return;
  const user = await getCurrentUser();
  await taskService.addTaskComment(taskId, user.id, body, attachmentUrl);
  revalidateProject(workspaceId, projectId);
}

// Avance documentado mientras la tarea está en curso (nota + captura opcional).
export async function addTaskProgressAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "");
  const attachmentUrl = await extractAttachment(formData);

  if (!body.trim() && !attachmentUrl) return;
  const user = await getCurrentUser();
  await taskService.addTaskComment(
    taskId,
    user.id,
    body,
    attachmentUrl,
    IssueCommentKind.PROGRESS,
  );
  revalidateProject(workspaceId, projectId);
}

// Feedback del manager sobre los avances (solo owner/admin).
export async function addTaskReviewFeedbackAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "");
  const attachmentUrl = await extractAttachment(formData);

  if (!body.trim() && !attachmentUrl) return;
  const user = await getCurrentUser();
  await taskService.addTaskComment(
    taskId,
    user.id,
    body,
    attachmentUrl,
    IssueCommentKind.REVIEW_FEEDBACK,
  );
  revalidateProject(workspaceId, projectId);
}

export async function addTaskAttachmentAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("El archivo no puede superar 8 MB.");
  }
  const url = await uploadFile(file);
  const user = await getCurrentUser();
  await taskService.addTaskAttachment(taskId, user.id, {
    url,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  });
  revalidateProject(workspaceId, projectId);
}

export async function removeTaskAttachmentAction(input: {
  attachmentId: string;
  workspaceId: string;
  projectId: string;
}) {
  const user = await getCurrentUser();
  await taskService.removeTaskAttachment(input.attachmentId, user.id);
  revalidateProject(input.workspaceId, input.projectId);
}

export async function deleteTaskAction(input: {
  taskId: string;
  workspaceId: string;
  projectId: string;
}) {
  const user = await getCurrentUser();
  await taskService.deleteTask(input.taskId, user.id);
  revalidateProject(input.workspaceId, input.projectId);
}

// No revalida ruta: el propio componente cliente refresca con router.refresh()
// tras llamar a esta acción (no tenemos a mano el número de tarea aquí).
export async function toggleCommentReactionAction(input: {
  commentId: string;
  emoji: string;
}) {
  const user = await getCurrentUser();
  await taskService.toggleCommentReaction(
    input.commentId,
    user.id,
    input.emoji,
  );
}
