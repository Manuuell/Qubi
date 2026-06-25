import { prisma } from "@/lib/db";
import { ProjectStatus } from "@/generated/prisma/enums";
import {
  addDaysToKey,
  dbDateToKey,
  keyToDbDate,
  keyToLocalDate,
  mondayKeyOf,
} from "@/features/time/week";

async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

export type TimesheetRow = {
  projectId: string;
  name: string;
  color: string | null;
  minutes: number[]; // 7 días (lun..dom)
  total: number;
};

export type Timesheet = {
  weekStartKey: string;
  dayKeys: string[]; // 7
  rows: TimesheetRow[];
  dayTotals: number[]; // 7
  grandTotal: number;
};

// Hoja semanal de horas del usuario (filas = proyectos activos, columnas = días).
export async function getWeekTimesheet(
  workspaceId: string,
  userId: string,
  anchorKey?: string,
): Promise<Timesheet> {
  await assertWorkspaceMember(workspaceId, userId);

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );

  const projects = await prisma.project.findMany({
    where: { workspaceId, status: ProjectStatus.ACTIVE },
    select: { id: true, name: true, color: true },
    orderBy: { createdAt: "asc" },
  });

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      project: { workspaceId },
      date: {
        gte: keyToDbDate(weekStartKey),
        lt: keyToDbDate(addDaysToKey(weekStartKey, 7)),
      },
    },
    select: { projectId: true, date: true, minutes: true },
  });

  // Suma de minutos por `${projectId}|${dateKey}`.
  const map = new Map<string, number>();
  for (const e of entries) {
    const k = `${e.projectId}|${dbDateToKey(new Date(e.date))}`;
    map.set(k, (map.get(k) ?? 0) + e.minutes);
  }

  const dayTotals = new Array(7).fill(0) as number[];
  const rows: TimesheetRow[] = projects.map((p) => {
    const minutes = dayKeys.map((dk, i) => {
      const m = map.get(`${p.id}|${dk}`) ?? 0;
      dayTotals[i] += m;
      return m;
    });
    return {
      projectId: p.id,
      name: p.name,
      color: p.color,
      minutes,
      total: minutes.reduce((a, b) => a + b, 0),
    };
  });

  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  return { weekStartKey, dayKeys, rows, dayTotals, grandTotal };
}

// Fija las horas (en minutos) de un proyecto+día para el usuario.
// Un único registro por (proyecto, usuario, día); minutos<=0 lo elimina.
export async function setTimesheetHours(
  workspaceId: string,
  userId: string,
  projectId: string,
  date: Date,
  minutes: number,
) {
  await assertWorkspaceMember(workspaceId, userId);
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado");

  const existing = await prisma.timeEntry.findMany({
    where: { projectId, userId, date },
    select: { id: true },
  });

  if (minutes <= 0) {
    if (existing.length) {
      await prisma.timeEntry.deleteMany({ where: { projectId, userId, date } });
    }
    return;
  }

  if (existing.length === 0) {
    await prisma.timeEntry.create({
      data: { projectId, userId, date, minutes },
    });
    return;
  }

  await prisma.timeEntry.update({
    where: { id: existing[0].id },
    data: { minutes },
  });
  if (existing.length > 1) {
    await prisma.timeEntry.deleteMany({
      where: { id: { in: existing.slice(1).map((e) => e.id) } },
    });
  }
}
