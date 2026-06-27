import { prisma } from "@/lib/db";
import { ProjectStatus, WorkspaceRole } from "@/generated/prisma/enums";
import {
  addDaysToKey,
  dateToLocalKey,
  dbDateToKey,
  keyToDbDate,
  keyToLocalDate,
  mondayKeyOf,
  monthRangeKeys,
} from "@/features/time/week";

async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

// Rol del usuario en el espacio (null si no es miembro). Lo usa la página de
// horas para decidir si muestra las pestañas de equipo/resumen.
export async function getWorkspaceRole(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

// Las vistas de equipo y los resúmenes son solo para OWNER/ADMIN.
async function assertWorkspaceAdmin(workspaceId: string, userId: string) {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
    throw new Error("Solo el propietario o administradores pueden ver esto");
  }
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

// ── Vista de equipo (solo OWNER/ADMIN) ──────────────────────────────────────

export type TeamMemberWeek = {
  userId: string;
  name: string | null;
  email: string;
  minutes: number[]; // 7 días
  total: number;
};

export type TeamWeek = {
  weekStartKey: string;
  dayKeys: string[];
  members: TeamMemberWeek[];
  dayTotals: number[];
  grandTotal: number;
  projectTotals: {
    projectId: string;
    name: string;
    color: string | null;
    total: number;
  }[];
};

// Horas de toda la gente del espacio en una semana: filas = miembros,
// columnas = días, más un desglose por proyecto.
export async function getTeamWeek(
  workspaceId: string,
  userId: string,
  anchorKey?: string,
): Promise<TeamWeek> {
  await assertWorkspaceAdmin(workspaceId, userId);

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );

  const [members, entries] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        project: { workspaceId },
        date: {
          gte: keyToDbDate(weekStartKey),
          lt: keyToDbDate(addDaysToKey(weekStartKey, 7)),
        },
      },
      select: {
        userId: true,
        projectId: true,
        date: true,
        minutes: true,
        project: { select: { name: true, color: true } },
      },
    }),
  ]);

  const userDay = new Map<string, number>(); // `${userId}|${dayKey}` -> min
  const projTotals = new Map<
    string,
    { name: string; color: string | null; total: number }
  >();
  for (const e of entries) {
    const dk = dbDateToKey(new Date(e.date));
    const uk = `${e.userId}|${dk}`;
    userDay.set(uk, (userDay.get(uk) ?? 0) + e.minutes);
    const pt = projTotals.get(e.projectId) ?? {
      name: e.project.name,
      color: e.project.color,
      total: 0,
    };
    pt.total += e.minutes;
    projTotals.set(e.projectId, pt);
  }

  const dayTotals = new Array(7).fill(0) as number[];
  const memberRows: TeamMemberWeek[] = members.map((m) => {
    const minutes = dayKeys.map((dk, i) => {
      const v = userDay.get(`${m.user.id}|${dk}`) ?? 0;
      dayTotals[i] += v;
      return v;
    });
    return {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      minutes,
      total: minutes.reduce((a, b) => a + b, 0),
    };
  });

  const grandTotal = dayTotals.reduce((a, b) => a + b, 0);
  const projectTotals = [...projTotals.entries()]
    .map(([projectId, v]) => ({ projectId, ...v }))
    .sort((a, b) => b.total - a.total);

  return {
    weekStartKey,
    dayKeys,
    members: memberRows,
    dayTotals,
    grandTotal,
    projectTotals,
  };
}

// ── Resumen mensual (solo OWNER/ADMIN) ──────────────────────────────────────

export type MonthlySummary = {
  monthKey: string;
  projects: { id: string; name: string; color: string | null; total: number }[];
  members: { id: string; name: string | null; email: string; total: number }[];
  matrix: Record<string, number>; // `${projectId}|${userId}` -> minutos
  grandTotal: number;
};

// Matriz proyecto × miembro de un mes (solo filas/columnas con horas).
export async function getMonthlySummary(
  workspaceId: string,
  userId: string,
  monthKey: string,
): Promise<MonthlySummary> {
  await assertWorkspaceAdmin(workspaceId, userId);
  const { startKey, endKey } = monthRangeKeys(monthKey);

  const [projects, members, entries] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        project: { workspaceId },
        date: { gte: keyToDbDate(startKey), lt: keyToDbDate(endKey) },
      },
      select: { projectId: true, userId: true, minutes: true },
    }),
  ]);

  const matrix: Record<string, number> = {};
  const projTotal = new Map<string, number>();
  const memberTotal = new Map<string, number>();
  for (const e of entries) {
    const k = `${e.projectId}|${e.userId}`;
    matrix[k] = (matrix[k] ?? 0) + e.minutes;
    projTotal.set(e.projectId, (projTotal.get(e.projectId) ?? 0) + e.minutes);
    memberTotal.set(e.userId, (memberTotal.get(e.userId) ?? 0) + e.minutes);
  }

  const projectRows = projects
    .filter((p) => (projTotal.get(p.id) ?? 0) > 0)
    .map((p) => ({ ...p, total: projTotal.get(p.id)! }));
  const memberCols = members
    .filter((m) => (memberTotal.get(m.user.id) ?? 0) > 0)
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      total: memberTotal.get(m.user.id)!,
    }));
  const grandTotal = entries.reduce((a, e) => a + e.minutes, 0);

  return {
    monthKey,
    projects: projectRows,
    members: memberCols,
    matrix,
    grandTotal,
  };
}

// Entradas detalladas del mes para exportar a CSV (una fila por registro).
export async function getMonthEntriesForExport(
  workspaceId: string,
  userId: string,
  monthKey: string,
) {
  await assertWorkspaceAdmin(workspaceId, userId);
  const { startKey, endKey } = monthRangeKeys(monthKey);

  const entries = await prisma.timeEntry.findMany({
    where: {
      project: { workspaceId },
      date: { gte: keyToDbDate(startKey), lt: keyToDbDate(endKey) },
    },
    select: {
      date: true,
      minutes: true,
      note: true,
      user: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { project: { name: "asc" } }],
  });

  return entries.map((e) => ({
    dateKey: dbDateToKey(new Date(e.date)),
    memberName: e.user.name ?? "",
    memberEmail: e.user.email,
    projectName: e.project.name,
    minutes: e.minutes,
    note: e.note,
  }));
}

// ── Temporizador (cronómetro) ───────────────────────────────────────────────

// SUMA minutos a las horas de un proyecto+día (a diferencia de setTimesheetHours
// que las fija). Lo usa el temporizador al detenerse.
async function addTimeEntryMinutes(
  projectId: string,
  userId: string,
  date: Date,
  minutesToAdd: number,
) {
  if (minutesToAdd <= 0) return;
  const existing = await prisma.timeEntry.findFirst({
    where: { projectId, userId, date },
    select: { id: true, minutes: true },
  });
  if (existing) {
    await prisma.timeEntry.update({
      where: { id: existing.id },
      data: { minutes: existing.minutes + minutesToAdd },
    });
  } else {
    await prisma.timeEntry.create({
      data: { projectId, userId, date, minutes: minutesToAdd },
    });
  }
}

export type RunningTimerInfo = {
  projectId: string;
  projectName: string;
  workspaceId: string;
  startedAt: Date;
};

// Temporizador activo del usuario (global, uno por persona). Incluye el espacio
// del proyecto para que la UI sepa si pertenece al espacio que se está viendo.
export async function getRunningTimer(
  userId: string,
): Promise<RunningTimerInfo | null> {
  const timer = await prisma.runningTimer.findUnique({
    where: { userId },
    select: {
      startedAt: true,
      project: { select: { id: true, name: true, workspaceId: true } },
    },
  });
  if (!timer) return null;
  return {
    projectId: timer.project.id,
    projectName: timer.project.name,
    workspaceId: timer.project.workspaceId,
    startedAt: timer.startedAt,
  };
}

// Inicia un temporizador para un proyecto. Falla si ya hay uno activo.
export async function startTimer(
  workspaceId: string,
  userId: string,
  projectId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado");

  const existing = await prisma.runningTimer.findUnique({ where: { userId } });
  if (existing) throw new Error("Ya tienes un temporizador en marcha");

  await prisma.runningTimer.create({ data: { userId, projectId } });
}

// Detiene el temporizador y suma el tiempo a las horas del día en que empezó.
export async function stopTimer(userId: string) {
  const timer = await prisma.runningTimer.findUnique({ where: { userId } });
  if (!timer) return;

  const minutes = Math.round((Date.now() - timer.startedAt.getTime()) / 60000);
  const date = keyToDbDate(dateToLocalKey(timer.startedAt));
  await addTimeEntryMinutes(timer.projectId, userId, date, minutes);
  await prisma.runningTimer.delete({ where: { userId } });
}

// Cancela el temporizador sin registrar el tiempo.
export async function cancelTimer(userId: string) {
  await prisma.runningTimer.deleteMany({ where: { userId } });
}
