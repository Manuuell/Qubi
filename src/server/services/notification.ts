import { prisma } from "@/lib/db";
import { IssueStatus, NotificationType } from "@/generated/prisma/enums";

// Tarea recién actualizada de la que conocemos los campos necesarios para armar
// la notificación de asignación (evita una segunda consulta).
type IssueForNotice = {
  id: string;
  number: number;
  title: string;
  workspaceId: string;
  assigneeId: string | null;
};

// Notifica a la persona asignada como responsable de una tarea. No notifica si
// se asignó a sí misma (no tiene sentido avisarse a uno mismo).
export async function notifyTaskAssigned(
  issue: IssueForNotice,
  actorId: string,
) {
  if (!issue.assigneeId || issue.assigneeId === actorId) return;
  await prisma.notification.create({
    data: {
      userId: issue.assigneeId,
      type: NotificationType.TASK_ASSIGNED,
      title: `Te asignaron la tarea #${issue.number}`,
      body: issue.title,
      href: `/w/${issue.workspaceId}/tasks/${issue.number}`,
      workspaceId: issue.workspaceId,
      issueId: issue.id,
      actorId,
    },
  });
}

// Genera notificaciones para las tareas del usuario que vencen pronto (o ya
// vencieron) y todavía no se han avisado. Se ejecuta de forma perezosa al abrir
// la bandeja, así no hace falta un cron. Crea como máximo una por tarea.
async function generateDueSoonNotifications(userId: string) {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000); // próximas 24 h
  const tasks = await prisma.issue.findMany({
    where: {
      assigneeId: userId,
      status: { not: IssueStatus.DONE },
      dueDate: { not: null, lte: soon },
    },
    select: { id: true, number: true, title: true, workspaceId: true },
  });
  if (tasks.length === 0) return;

  const already = await prisma.notification.findMany({
    where: {
      userId,
      type: NotificationType.TASK_DUE_SOON,
      issueId: { in: tasks.map((t) => t.id) },
    },
    select: { issueId: true },
  });
  const notified = new Set(already.map((n) => n.issueId));
  const pending = tasks.filter((t) => !notified.has(t.id));
  if (pending.length === 0) return;

  await prisma.notification.createMany({
    data: pending.map((t) => ({
      userId,
      type: NotificationType.TASK_DUE_SOON,
      title: `La tarea #${t.number} vence pronto`,
      body: t.title,
      href: `/w/${t.workspaceId}/tasks/${t.number}`,
      workspaceId: t.workspaceId,
      issueId: t.id,
    })),
  });
}

export type Inbox = Awaited<ReturnType<typeof getInbox>>;

// Bandeja de entrada del usuario: invitaciones pendientes (por email) +
// notificaciones recientes. El contador de no leídas alimenta el badge.
export async function getInbox(user: { id: string; email: string }) {
  await generateDueSoonNotifications(user.id);

  const [invites, notifications] = await Promise.all([
    prisma.workspaceInvite.findMany({
      where: { email: user.email, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  const unreadCount =
    invites.length + notifications.filter((n) => !n.readAt).length;

  return { invites, notifications, unreadCount };
}

export async function markNotificationRead(userId: string, id: string) {
  // updateMany acota por userId: nadie marca notificaciones ajenas.
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
