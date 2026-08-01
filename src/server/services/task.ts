import { prisma } from "@/lib/db";
import {
  IssueStatus,
  IssueType,
  IssueCommentKind,
  Priority,
  ProgressTimerPolicy,
  ProjectStatus,
} from "@/generated/prisma/enums";
import {
  notifyTaskAssigned,
  notifyReviewFeedback,
  notifyTaskReopened,
  notifyMentionedInTask,
} from "@/server/services/notification";
import { extractMentionedUserIds } from "@/features/mentions/mentions";
import {
  assertWorkspaceMember,
  assertWorkspaceAdmin,
} from "@/server/lib/permissions";
import { MAX_ASSIGNEES, QUICK_REACTIONS } from "@/features/task/labels";

// Las "tareas" son filas del modelo Issue ligadas a un proyecto (projectId).
// Una tarea admite hasta 3 personas asignadas (tabla puente IssueAssignee);
// el límite vive en features/task/labels.ts para poder importarlo desde el
// cliente sin arrastrar Prisma al bundle del navegador.
export { MAX_ASSIGNEES };

const personSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

async function assertTaskAccess(taskId: string, userId: string) {
  const task = await prisma.issue.findUnique({
    where: { id: taskId },
    select: { workspaceId: true },
  });
  if (!task) throw new Error("Tarea no encontrada");
  await assertWorkspaceMember(task.workspaceId, userId);
  return task;
}

export type TaskCard = {
  id: string;
  number: number;
  title: string;
  body: string;
  type: IssueType;
  status: IssueStatus;
  priority: Priority;
  startDate: Date | null;
  dueDate: Date | null;
  assignees: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }[];
  labels: { id: string; name: string; color: string }[];
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

  const rows = await prisma.issue.findMany({
    where: { projectId },
    select: {
      id: true,
      number: true,
      title: true,
      body: true,
      type: true,
      status: true,
      priority: true,
      startDate: true,
      dueDate: true,
      assignees: { select: { user: { select: personSelect } } },
      labels: {
        select: { label: { select: { id: true, name: true, color: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    assignees: r.assignees.map((a) => a.user),
    labels: r.labels.map((l) => l.label),
  }));
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
      assignees: { some: { userId } },
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
  body?: string;
  type?: IssueType;
  priority?: Priority;
  assigneeIds?: string[];
  labelIds?: string[];
  dueDate?: Date | null;
  startDate?: Date | null;
  linkedPageId?: string | null;
}) {
  await assertWorkspaceMember(input.workspaceId, input.userId);
  const assigneeIds = [...new Set(input.assigneeIds ?? [])].slice(
    0,
    MAX_ASSIGNEES,
  );
  const labelIds = [...new Set(input.labelIds ?? [])];

  // Número secuencial por espacio (compartido con el resto de tareas/issues).
  const last = await prisma.issue.findFirst({
    where: { workspaceId: input.workspaceId },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const issue = await prisma.issue.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      number: (last?.number ?? 0) + 1,
      title: input.title.trim() || "Sin título",
      body: input.body ?? "",
      type: input.type ?? IssueType.TASK,
      priority: input.priority ?? Priority.MEDIUM,
      dueDate: input.dueDate ?? null,
      startDate: input.startDate ?? null,
      linkedPageId: input.linkedPageId ?? null,
      authorId: input.userId,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      labels: { create: labelIds.map((labelId) => ({ labelId })) },
      statusEvents: {
        create: { toStatus: IssueStatus.TODO, actorId: input.userId },
      },
    },
  });

  // Avisa a las personas si se les asignó la tarea al crearla.
  await notifyTaskAssigned(issue, assigneeIds, input.userId);
  return issue;
}

// Cambia el estado de una tarea. Reglas de negocio:
// - No se puede pasar a HECHA sin al menos un avance verificable (un
//   comentario de tipo PROGRESS documentado mientras estaba en curso).
// - Reabrir una tarea que ya estaba HECHA (volverla a pendiente o en curso)
//   solo lo puede hacer un manager (owner/admin), y queda notificado.
export async function setTaskStatus(
  taskId: string,
  userId: string,
  status: IssueStatus,
  note?: string,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { userId: true } } },
  });
  if (!issue) throw new Error("Tarea no encontrada");
  await assertWorkspaceMember(issue.workspaceId, userId);

  const isReopen =
    issue.status === IssueStatus.DONE && status !== IssueStatus.DONE;
  if (isReopen) {
    await assertWorkspaceAdmin(issue.workspaceId, userId);
  }

  if (status === IssueStatus.DONE && issue.status !== IssueStatus.DONE) {
    const progressCount = await prisma.issueComment.count({
      where: { issueId: taskId, kind: IssueCommentKind.PROGRESS },
    });
    if (progressCount === 0) {
      throw new Error(
        "Registra al menos un avance verificable antes de marcar la tarea como Hecha.",
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.issue.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === IssueStatus.DONE ? new Date() : null,
      },
    });
    await tx.issueStatusEvent.create({
      data: {
        issueId: taskId,
        fromStatus: issue.status,
        toStatus: status,
        actorId: userId,
        note: note?.trim() ?? "",
      },
    });
    return u;
  });

  if (isReopen) {
    await notifyTaskReopened(
      updated,
      issue.assignees.map((a) => a.userId),
      userId,
    );
  }
  return updated;
}

// Atajo: "Empezar a hacer" (TODO -> IN_PROGRESS).
export async function startTask(taskId: string, userId: string) {
  return setTaskStatus(taskId, userId, IssueStatus.IN_PROGRESS);
}

// Agrega una sola persona a la tarea sin tocar al resto de asignados (usado
// al soltar una tarjeta de tarea sobre la foto de alguien). No hace nada si
// ya estaba asignada o si la tarea ya tiene el máximo de responsables.
export async function addTaskAssignee(
  taskId: string,
  userId: string,
  newAssigneeId: string,
) {
  const task = await assertTaskAccess(taskId, userId);
  const current = await prisma.issueAssignee.findMany({
    where: { issueId: taskId },
    select: { userId: true },
  });
  if (current.some((c) => c.userId === newAssigneeId)) return;
  if (current.length >= MAX_ASSIGNEES) {
    throw new Error(`Una tarea admite hasta ${MAX_ASSIGNEES} responsables.`);
  }
  await prisma.issueAssignee.create({
    data: { issueId: taskId, userId: newAssigneeId },
  });
  const issue = await prisma.issue.findUniqueOrThrow({
    where: { id: taskId },
    select: { id: true, number: true, title: true, workspaceId: true },
  });
  await notifyTaskAssigned(issue, [newAssigneeId], userId);
  return { ...issue, workspaceId: task.workspaceId };
}

export async function setTaskAssignees(
  taskId: string,
  userId: string,
  assigneeIds: string[],
) {
  const capped = [...new Set(assigneeIds)].slice(0, MAX_ASSIGNEES);
  const task = await assertTaskAccess(taskId, userId);
  const current = await prisma.issueAssignee.findMany({
    where: { issueId: taskId },
    select: { userId: true },
  });
  const currentIds = new Set(current.map((c) => c.userId));
  const nextIds = new Set(capped);
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
  const toAdd = capped.filter((id) => !currentIds.has(id));

  await prisma.$transaction([
    prisma.issueAssignee.deleteMany({
      where: { issueId: taskId, userId: { in: toRemove } },
    }),
    prisma.issueAssignee.createMany({
      data: toAdd.map((assigneeUserId) => ({
        issueId: taskId,
        userId: assigneeUserId,
      })),
      skipDuplicates: true,
    }),
  ]);

  const issue = await prisma.issue.findUniqueOrThrow({
    where: { id: taskId },
    select: { id: true, number: true, title: true, workspaceId: true },
  });
  await notifyTaskAssigned(issue, toAdd, userId);
  return { ...issue, workspaceId: task.workspaceId };
}

export async function setTaskLabels(
  taskId: string,
  userId: string,
  labelIds: string[],
) {
  await assertTaskAccess(taskId, userId);
  const unique = [...new Set(labelIds)];
  await prisma.$transaction([
    prisma.issueLabel.deleteMany({ where: { issueId: taskId } }),
    prisma.issueLabel.createMany({
      data: unique.map((labelId) => ({ issueId: taskId, labelId })),
      skipDuplicates: true,
    }),
  ]);
}

export async function setTaskType(
  taskId: string,
  userId: string,
  type: IssueType,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { type } });
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

export async function setTaskStartDate(
  taskId: string,
  userId: string,
  startDate: Date | null,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { startDate } });
}

export async function linkTaskPage(
  taskId: string,
  userId: string,
  linkedPageId: string | null,
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issue.update({ where: { id: taskId }, data: { linkedPageId } });
}

// Detalle completo de una tarea por número (#n): proyecto, personas, etiquetas,
// comentarios, adjuntos, historial de estados y horas invertidas. Todo queda
// visible aunque la tarea ya esté Hecha.
export async function getTaskDetail(
  workspaceId: string,
  number: number,
  userId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  const issue = await prisma.issue.findUnique({
    where: { workspaceId_number: { workspaceId, number } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          color: true,
          progressTimerPolicy: true,
        },
      },
      author: { select: personSelect },
      assignees: { select: { user: { select: personSelect } } },
      labels: {
        select: { label: { select: { id: true, name: true, color: true } } },
      },
      linkedPage: { select: { id: true, title: true, icon: true } },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: personSelect } },
      },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: personSelect } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: personSelect },
          reactions: { include: { user: { select: personSelect } } },
          // Evidencia adjunta al propio avance (capturas pegadas, documentos…).
          attachments: { orderBy: { createdAt: "asc" } },
        },
      },
      timeEntries: { select: { minutes: true, userId: true, date: true } },
    },
  });
  if (!issue) return null;

  const totalMinutes = issue.timeEntries.reduce((sum, t) => sum + t.minutes, 0);

  return {
    ...issue,
    assignees: issue.assignees.map((a) => a.user),
    labels: issue.labels.map((l) => l.label),
    totalMinutes,
  };
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
  attachmentUrl?: string | null,
  kind: IssueCommentKind = IssueCommentKind.COMMENT,
) {
  const task = await assertTaskAccess(taskId, userId);
  if (kind === IssueCommentKind.REVIEW_FEEDBACK) {
    await assertWorkspaceAdmin(task.workspaceId, userId);
  }

  const comment = await prisma.issueComment.create({
    data: {
      issueId: taskId,
      authorId: userId,
      kind,
      body: body.trim(),
      attachmentUrl: attachmentUrl ?? null,
    },
  });

  const mentionCandidates = extractMentionedUserIds(body);

  if (
    kind === IssueCommentKind.REVIEW_FEEDBACK ||
    mentionCandidates.length > 0
  ) {
    const issue = await prisma.issue.findUniqueOrThrow({
      where: { id: taskId },
      select: {
        id: true,
        number: true,
        title: true,
        workspaceId: true,
        assignees: { select: { userId: true } },
      },
    });
    // Solo se notifica a IDs que de verdad son miembros del workspace: el
    // texto de la mención lo escribe el cliente y no hay que confiar en él.
    const mentionedIds = mentionCandidates.length
      ? (
          await prisma.workspaceMember.findMany({
            where: {
              workspaceId: issue.workspaceId,
              userId: { in: mentionCandidates },
            },
            select: { userId: true },
          })
        ).map((m) => m.userId)
      : [];
    if (kind === IssueCommentKind.REVIEW_FEEDBACK) {
      await notifyReviewFeedback(
        issue,
        issue.assignees.map((a) => a.userId),
        userId,
      );
    }
    if (mentionedIds.length > 0) {
      await notifyMentionedInTask(issue, mentionedIds, userId);
    }
  }

  return comment;
}

export type TaskUpload = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

// Avance con evidencia: nota + varios archivos de cualquier tipo (capturas
// pegadas desde el portapapeles, PDFs, hojas de cálculo…). Los archivos quedan
// colgados del avance y también en la pestaña "Archivos" de la tarea.
export async function addTaskProgress(
  taskId: string,
  userId: string,
  body: string,
  files: TaskUpload[] = [],
  kind: IssueCommentKind = IssueCommentKind.PROGRESS,
) {
  const firstImage = files.find((f) => f.mimeType.startsWith("image/")) ?? null;
  const comment = await addTaskComment(
    taskId,
    userId,
    body,
    firstImage?.url ?? null,
    kind,
  );
  if (files.length > 0) {
    await prisma.issueAttachment.createMany({
      data: files.map((f) => ({
        issueId: taskId,
        commentId: comment.id,
        url: f.url,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        uploadedById: userId,
      })),
    });
  }
  return comment;
}

// Qué hace el cronómetro mientras se documenta un avance de ESTA tarea.
// null vuelve a heredar la política del proyecto. Solo el manager decide.
export async function setTaskProgressPolicy(
  taskId: string,
  userId: string,
  policy: ProgressTimerPolicy | null,
) {
  const task = await assertTaskAccess(taskId, userId);
  await assertWorkspaceAdmin(task.workspaceId, userId);
  return prisma.issue.update({
    where: { id: taskId },
    data: { progressTimerPolicy: policy },
  });
}

// Alterna una reacción del usuario a un comentario: si ya la puso, la quita;
// si no, la agrega. Un mismo usuario puede tener varias reacciones distintas
// en el mismo comentario, pero no repetir el mismo emoji.
export async function toggleCommentReaction(
  commentId: string,
  userId: string,
  emoji: string,
) {
  if (!(QUICK_REACTIONS as readonly string[]).includes(emoji)) {
    throw new Error("Reacción no válida");
  }
  const comment = await prisma.issueComment.findUnique({
    where: { id: commentId },
    select: { issueId: true },
  });
  if (!comment) throw new Error("Comentario no encontrado");
  await assertTaskAccess(comment.issueId, userId);

  const existing = await prisma.issueCommentReaction.findUnique({
    where: { commentId_userId_emoji: { commentId, userId, emoji } },
  });
  if (existing) {
    await prisma.issueCommentReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.issueCommentReaction.create({
      data: { commentId, userId, emoji },
    });
  }
}

export async function addTaskAttachment(
  taskId: string,
  userId: string,
  file: { url: string; name: string; mimeType: string; size: number },
) {
  await assertTaskAccess(taskId, userId);
  return prisma.issueAttachment.create({
    data: {
      issueId: taskId,
      uploadedById: userId,
      url: file.url,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
    },
  });
}

export async function removeTaskAttachment(
  attachmentId: string,
  userId: string,
) {
  const attachment = await prisma.issueAttachment.findUnique({
    where: { id: attachmentId },
    select: { issueId: true },
  });
  if (!attachment) return;
  await assertTaskAccess(attachment.issueId, userId);
  await prisma.issueAttachment.delete({ where: { id: attachmentId } });
}

// Borrar la tarea (incluso ya finalizada) es una decisión explícita aparte;
// nunca ocurre automáticamente. Solo un manager puede hacerlo.
export async function deleteTask(taskId: string, userId: string) {
  const task = await assertTaskAccess(taskId, userId);
  await assertWorkspaceAdmin(task.workspaceId, userId);
  await prisma.issue.delete({ where: { id: taskId } });
}
