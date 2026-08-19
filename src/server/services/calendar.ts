import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { IssueStatus, ProjectStatus } from "@/generated/prisma/enums";
import { buildIcsFeed, type IcsEventInput } from "@/lib/ics";
import { taskCalendarWindow } from "@/features/task/calendar-window";

// Sincronización de calendario: un feed ICS por usuario, protegido por un
// token aleatorio guardado en User.calendarToken. Google Calendar (y otros)
// se suscriben a la URL y la refrescan solos; sin OAuth ni credenciales.
// El token se puede regenerar para revocar el acceso si la URL se filtra.

const CALENDAR_FEED_PATH = "/api/calendar";

export function calendarFeedUrl(baseUrl: string, token: string): string {
  return `${baseUrl}${CALENDAR_FEED_PATH}/${token}`;
}

// Devuelve el token actual del usuario o crea uno nuevo.
export async function getOrCreateCalendarToken(
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarToken: true },
  });
  if (user?.calendarToken) return user.calendarToken;

  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { calendarToken: token },
  });
  return token;
}

// Genera un token nuevo: las URL antiguas dejan de funcionar.
export async function regenerateCalendarToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { calendarToken: token },
  });
  return token;
}

type CalendarTask = {
  id: string;
  number: number;
  title: string;
  workspaceId: string;
  startDate: Date | null;
  dueDate: Date | null;
  updatedAt: Date;
  project: { name: string };
};

// Tareas del usuario con fecha, pendientes, en todos sus espacios. Son las
// que alimentan el feed (mismo criterio que "Mi agenda", que además exige
// fecha para poder colocar el evento en el calendario).
async function listCalendarTasks(userId: string): Promise<CalendarTask[]> {
  const rows = await prisma.issue.findMany({
    where: {
      workspace: { members: { some: { userId } } },
      assignees: { some: { userId } },
      status: { not: IssueStatus.DONE },
      project: { status: ProjectStatus.ACTIVE },
      OR: [{ dueDate: { not: null } }, { startDate: { not: null } }],
    },
    select: {
      id: true,
      number: true,
      title: true,
      workspaceId: true,
      startDate: true,
      dueDate: true,
      updatedAt: true,
      project: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
  return rows.filter(
    (r): r is CalendarTask & { project: { name: string } } =>
      r.project !== null,
  );
}

// Los días los decide taskCalendarWindow, compartido con la sincronización
// de Google para que ambas integraciones coloquen la tarea en las mismas
// fechas. null = la tarea no tiene ninguna fecha y no entra en el feed.
function eventFor(task: CalendarTask, baseUrl: string): IcsEventInput | null {
  const window = taskCalendarWindow(task);
  if (!window) return null;

  return {
    uid: `${task.id}@qubi`,
    summary: task.title,
    description: `Proyecto: ${task.project.name}\n${baseUrl}/w/${task.workspaceId}/tasks/${task.number}`,
    startKey: window.startKey,
    endKey: window.endKey,
    updatedAt: task.updatedAt,
  };
}

export async function buildCalendarFeed(
  userId: string,
  baseUrl: string,
  userName: string | null,
): Promise<string> {
  const tasks = await listCalendarTasks(userId);
  const events = tasks
    .map((t) => eventFor(t, baseUrl))
    .filter((e): e is IcsEventInput => e !== null);
  return buildIcsFeed(events, `Qubi — tareas de ${userName ?? "mi equipo"}`);
}
