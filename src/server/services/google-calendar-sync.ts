import { prisma } from "@/lib/db";
import { IssueStatus, ProjectStatus } from "@/generated/prisma/enums";
import { taskCalendarWindow } from "@/features/task/calendar-window";
import {
  getAccessToken,
  callGoogle,
  EVENTS_ENDPOINT,
} from "@/server/services/google-calendar";

// Replica las tareas como eventos en el Google Calendar personal de cada
// responsable que haya conectado su cuenta.
//
// Todo pasa por reconciliar: se mira cómo está la tarea ahora y se deja el
// calendario igual, cree, actualice o borre lo que haga falta. Así da lo mismo
// desde qué acción se llame (cambiar fecha, reasignar, cerrar…) y repetir una
// sincronización nunca duplica nada.

// Una tarea ocupa sitio en el calendario mientras esté viva, tenga alguna
// fecha y su proyecto siga activo. En cuanto deja de cumplirse, el evento
// desaparece del calendario de todo el mundo.
function shouldAppear(task: {
  status: IssueStatus;
  project: { status: ProjectStatus } | null;
  startDate: Date | null;
  dueDate: Date | null;
}): boolean {
  return (
    task.status !== IssueStatus.DONE &&
    task.project?.status === ProjectStatus.ACTIVE &&
    taskCalendarWindow(task) !== null
  );
}

type SyncTask = {
  id: string;
  number: number;
  title: string;
  workspaceId: string;
  status: IssueStatus;
  startDate: Date | null;
  dueDate: Date | null;
  project: { name: string; status: ProjectStatus } | null;
  assignees: { userId: string }[];
  googleEvents: { userId: string; eventId: string }[];
};

function eventBody(task: SyncTask, baseUrl: string) {
  const window = taskCalendarWindow(task)!;
  return {
    summary: task.title,
    description: `Proyecto: ${task.project?.name ?? ""}\n${baseUrl}/w/${task.workspaceId}/tasks/${task.number}`,
    // Eventos de día completo: sin hora no hay líos de zona horaria.
    start: { date: window.startKey },
    end: { date: window.endKey },
    source: {
      title: "Qubi",
      url: `${baseUrl}/w/${task.workspaceId}/tasks/${task.number}`,
    },
  };
}

// Quita un evento del calendario de alguien y olvida la referencia.
async function removeEvent(
  issueId: string,
  userId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getAccessToken(userId);
  if (accessToken) {
    await callGoogle(accessToken, `${EVENTS_ENDPOINT}/${eventId}`, "DELETE");
  }
  // La fila se borra pase lo que pase: si Google no responde, insistir en cada
  // sincronización posterior sería peor que dejar un evento huérfano.
  await prisma.googleCalendarEvent.deleteMany({ where: { issueId, userId } });
}

async function upsertEvent(
  task: SyncTask,
  userId: string,
  existingEventId: string | undefined,
  baseUrl: string,
): Promise<void> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return; // no conectado, o revocó el permiso

  const body = eventBody(task, baseUrl);

  if (existingEventId) {
    const result = await callGoogle(
      accessToken,
      `${EVENTS_ENDPOINT}/${existingEventId}`,
      "PATCH",
      body,
    );
    if (result.ok) return;
    // 404/410 = alguien borró el evento a mano en Google: se recrea abajo.
    if (result.status !== 404 && result.status !== 410) return;
    await prisma.googleCalendarEvent.deleteMany({
      where: { issueId: task.id, userId },
    });
  }

  const created = await callGoogle(accessToken, EVENTS_ENDPOINT, "POST", body);
  if (!created.ok || !created.id) return;

  await prisma.googleCalendarEvent.upsert({
    where: { issueId_userId: { issueId: task.id, userId } },
    create: { issueId: task.id, userId, eventId: created.id },
    update: { eventId: created.id },
  });
}

// Deja el calendario de cada responsable como debe estar según la tarea.
export async function syncTaskToGoogleCalendars(
  taskId: string,
  baseUrl: string,
): Promise<void> {
  const task = (await prisma.issue.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      number: true,
      title: true,
      workspaceId: true,
      status: true,
      startDate: true,
      dueDate: true,
      project: { select: { name: true, status: true } },
      assignees: { select: { userId: true } },
      googleEvents: { select: { userId: true, eventId: true } },
    },
  })) as SyncTask | null;

  if (!task) return; // se borró entre la acción y esta pasada

  const visible = shouldAppear(task);
  const assigneeIds = new Set(task.assignees.map((a) => a.userId));

  // 1) Fuera lo que ya no toca: tarea cerrada/sin fecha, o gente a la que ya
  //    no le corresponde.
  for (const event of task.googleEvents) {
    if (!visible || !assigneeIds.has(event.userId)) {
      await removeEvent(task.id, event.userId, event.eventId);
    }
  }
  if (!visible) return;

  // 2) Crear o actualizar para cada responsable.
  const byUser = new Map(task.googleEvents.map((e) => [e.userId, e.eventId]));
  for (const userId of assigneeIds) {
    await upsertEvent(task, userId, byUser.get(userId), baseUrl);
  }
}

export type PendingRemoval = { userId: string; eventId: string };

// Al borrar una tarea, sus filas se van en cascada y ya no habría forma de
// saber qué eventos limpiar: hay que fotografiarlos ANTES de borrarla.
export async function listTaskEvents(
  taskId: string,
): Promise<PendingRemoval[]> {
  return prisma.googleCalendarEvent.findMany({
    where: { issueId: taskId },
    select: { userId: true, eventId: true },
  });
}

// Limpia en Google los eventos de una tarea ya borrada.
export async function removeDeletedTaskEvents(
  events: PendingRemoval[],
): Promise<void> {
  for (const { userId, eventId } of events) {
    const accessToken = await getAccessToken(userId);
    if (!accessToken) continue;
    await callGoogle(accessToken, `${EVENTS_ENDPOINT}/${eventId}`, "DELETE");
  }
}
