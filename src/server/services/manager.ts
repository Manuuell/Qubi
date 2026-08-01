import { prisma } from "@/lib/db";
import { IssueStatus } from "@/generated/prisma/enums";
import { assertWorkspaceAdmin } from "@/server/lib/permissions";
import {
  addDaysToKey,
  dateToLocalKey,
  dbDateToKey,
  keyToDbDate,
  keyToLocalDate,
  mondayKeyOf,
} from "@/features/time/week";
import { memberWeeklyCapacity } from "@/features/time/capacity";
import { plannedMinutesPerDay } from "@/features/time/planning";

// ── Resumen de equipo para el dashboard de manager ──────────────────────────

export type ActiveWorker = {
  userId: string;
  name: string | null;
  email: string;
  projectName: string;
  startedAt: Date;
  paused: boolean;
};

export type OverdueTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  projectId: string;
  projectName: string;
  projectColor: string | null;
};

export type TeamOverview = {
  activeNow: ActiveWorker[];
  weekMinutes: number;
  tasksCompletedThisWeek: number;
  completedByMember: {
    userId: string;
    name: string | null;
    email: string;
    count: number;
  }[];
  overdueTasks: OverdueTask[];
};

// Solo OWNER/ADMIN. Foto del estado del equipo ahora mismo: quién está
// trabajando, horas de la semana, tareas completadas por miembro y tareas
// vencidas sin terminar.
export async function getTeamOverview(
  workspaceId: string,
  userId: string,
): Promise<TeamOverview> {
  await assertWorkspaceAdmin(workspaceId, userId);

  const weekStartKey = mondayKeyOf();
  const weekStart = keyToDbDate(weekStartKey);
  const weekEnd = keyToDbDate(addDaysToKey(weekStartKey, 7));
  const todayStart = keyToDbDate(dateToLocalKey(new Date()));

  const [activeTimers, weekEntries, doneThisWeek, overdue] = await Promise.all([
    prisma.runningTimer.findMany({
      where: { project: { workspaceId } },
      select: {
        userId: true,
        startedAt: true,
        pausedAt: true,
        user: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.timeEntry.findMany({
      where: {
        project: { workspaceId },
        date: { gte: weekStart, lt: weekEnd },
      },
      select: { minutes: true },
    }),
    prisma.issue.findMany({
      where: {
        workspaceId,
        status: IssueStatus.DONE,
        completedAt: { gte: weekStart, lt: weekEnd },
      },
      select: {
        assignees: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.issue.findMany({
      where: {
        workspaceId,
        status: { not: IssueStatus.DONE },
        dueDate: { lt: todayStart },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
  ]);

  const weekMinutes = weekEntries.reduce((a, e) => a + e.minutes, 0);

  const completedMap = new Map<
    string,
    { name: string | null; email: string; count: number }
  >();
  for (const t of doneThisWeek) {
    for (const a of t.assignees) {
      const cur = completedMap.get(a.userId) ?? {
        name: a.user.name,
        email: a.user.email,
        count: 0,
      };
      cur.count += 1;
      completedMap.set(a.userId, cur);
    }
  }

  return {
    activeNow: activeTimers.map((t) => ({
      userId: t.userId,
      name: t.user.name,
      email: t.user.email,
      projectName: t.project.name,
      startedAt: t.startedAt,
      paused: t.pausedAt !== null,
    })),
    weekMinutes,
    tasksCompletedThisWeek: doneThisWeek.length,
    completedByMember: [...completedMap.entries()]
      .map(([memberUserId, v]) => ({ userId: memberUserId, ...v }))
      .sort((a, b) => b.count - a.count),
    overdueTasks: overdue
      .filter((t) => t.project)
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        projectId: t.project!.id,
        projectName: t.project!.name,
        projectColor: t.project!.color,
      })),
  };
}

// ── Producción de un proyecto por miembro ───────────────────────────────────

export type ProjectMemberProduction = {
  userId: string;
  name: string | null;
  email: string;
  minutesThisMonth: number;
  tasksCompleted: number;
};

export type CompletedTaskEntry = {
  id: string;
  number: number;
  title: string;
  completedAt: Date | null;
  assignees: { name: string | null; email: string }[];
  evidenceCount: number;
};

export async function getProjectProduction(
  projectId: string,
  workspaceId: string,
  userId: string,
): Promise<{
  members: ProjectMemberProduction[];
  recentCompleted: CompletedTaskEntry[];
}> {
  await assertWorkspaceAdmin(workspaceId, userId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [members, timeEntries, doneCounts, recentDone] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: { projectId, date: { gte: monthStart, lt: monthEnd } },
      select: { userId: true, minutes: true },
    }),
    prisma.issue.findMany({
      where: { projectId, status: IssueStatus.DONE },
      select: { assignees: { select: { userId: true } } },
    }),
    prisma.issue.findMany({
      where: { projectId, status: IssueStatus.DONE },
      select: {
        id: true,
        number: true,
        title: true,
        completedAt: true,
        assignees: {
          select: { user: { select: { name: true, email: true } } },
        },
        comments: { select: { attachmentUrl: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 12,
    }),
  ]);

  const minutesByUser = new Map<string, number>();
  for (const e of timeEntries) {
    minutesByUser.set(e.userId, (minutesByUser.get(e.userId) ?? 0) + e.minutes);
  }
  const countByUser = new Map<string, number>();
  for (const d of doneCounts) {
    for (const a of d.assignees) {
      countByUser.set(a.userId, (countByUser.get(a.userId) ?? 0) + 1);
    }
  }

  const memberRows = members
    .map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      minutesThisMonth: minutesByUser.get(m.user.id) ?? 0,
      tasksCompleted: countByUser.get(m.user.id) ?? 0,
    }))
    .filter((m) => m.minutesThisMonth > 0 || m.tasksCompleted > 0)
    .sort((a, b) => b.minutesThisMonth - a.minutesThisMonth);

  return {
    members: memberRows,
    recentCompleted: recentDone.map((t) => ({
      id: t.id,
      number: t.number,
      title: t.title,
      completedAt: t.completedAt,
      assignees: t.assignees.map((a) => a.user),
      evidenceCount: t.comments.filter((c) => c.attachmentUrl).length,
    })),
  };
}

// ── Carga de trabajo del equipo (miembros × días) ───────────────────────────

export type WorkloadSegment = {
  projectId: string;
  projectName: string;
  projectColor: string | null;
  minutes: number;
};

export type WorkloadDay = {
  dateKey: string;
  minutes: number; // horas ya registradas con el cronómetro
  segments: WorkloadSegment[];
  plannedMinutes: number; // carga prevista (tareas asignadas con estimación)
  plannedTasks: number; // cuántas tareas caen ese día
  unestimatedTasks: number; // de esas, cuántas no tienen estimación
};

export type WorkloadMember = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  weeklyCapacityMinutes: number; // la suya, o la del equipo por defecto
  hasOwnCapacity: boolean;
  days: WorkloadDay[]; // 7 (lun..dom)
  weekMinutes: number;
  plannedWeekMinutes: number;
  busiestDayMinutes: number;
};

export type TeamWorkload = {
  weekStartKey: string;
  dayKeys: string[]; // 7
  members: WorkloadMember[];
  dayTotals: number[]; // 7
  weekMinutes: number;
};

// Solo OWNER/ADMIN. Reparto de las horas de la semana por persona y día, con
// el desglose por proyecto de cada día: es lo que alimenta la vista de carga
// (quién va sobrado, quién está al límite y en qué se le fue el tiempo).
export async function getTeamWorkload(
  workspaceId: string,
  userId: string,
  anchorKey?: string,
): Promise<TeamWorkload> {
  await assertWorkspaceAdmin(workspaceId, userId);

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );

  const [members, entries, openTasks] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        weeklyCapacityMinutes: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
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
        date: true,
        minutes: true,
        project: { select: { id: true, name: true, color: true } },
      },
    }),
    // Tareas vivas con fecha límite: son las que ocupan los días que aún no
    // han pasado (el tiempo registrado solo existe hacia atrás).
    prisma.issue.findMany({
      where: {
        workspaceId,
        status: { not: IssueStatus.DONE },
        dueDate: { not: null },
        assignees: { some: {} },
      },
      select: {
        id: true,
        startDate: true,
        dueDate: true,
        estimateMinutes: true,
        assignees: { select: { userId: true } },
      },
    }),
  ]);

  // `${userId}|${dayKey}|${projectId}` -> minutos acumulados.
  const buckets = new Map<string, WorkloadSegment>();
  for (const e of entries) {
    const key = `${e.userId}|${dbDateToKey(new Date(e.date))}|${e.project.id}`;
    const current = buckets.get(key);
    if (current) {
      current.minutes += e.minutes;
    } else {
      buckets.set(key, {
        projectId: e.project.id,
        projectName: e.project.name,
        projectColor: e.project.color,
        minutes: e.minutes,
      });
    }
  }

  // Carga prevista: la estimación de cada tarea se reparte entre sus días de
  // trabajo y, si tiene varias personas asignadas, entre ellas (el trabajo se
  // comparte, no se duplica).
  const today = dateToLocalKey(new Date());
  const planned = new Map<
    string,
    { minutes: number; tasks: number; unestimated: number }
  >();
  for (const task of openTasks) {
    const { days, minutesPerDay } = plannedMinutesPerDay(task, today);
    if (days.length === 0) continue;
    const people = task.assignees.length || 1;
    const share = Math.round(minutesPerDay / people);
    for (const day of days) {
      if (!dayKeys.includes(day)) continue;
      for (const a of task.assignees) {
        const key = `${a.userId}|${day}`;
        const slot = planned.get(key) ?? {
          minutes: 0,
          tasks: 0,
          unestimated: 0,
        };
        slot.minutes += share;
        slot.tasks += 1;
        if (!task.estimateMinutes || task.estimateMinutes <= 0) {
          slot.unestimated += 1;
        }
        planned.set(key, slot);
      }
    }
  }

  const dayTotals = new Array(7).fill(0) as number[];
  const memberRows: WorkloadMember[] = members.map((m) => {
    const days = dayKeys.map((dateKey, i) => {
      const segments = [...buckets.entries()]
        .filter(([key]) => key.startsWith(`${m.user.id}|${dateKey}|`))
        .map(([, segment]) => segment)
        .sort((a, b) => b.minutes - a.minutes);
      const minutes = segments.reduce((sum, s) => sum + s.minutes, 0);
      dayTotals[i] += minutes;
      const slot = planned.get(`${m.user.id}|${dateKey}`);
      return {
        dateKey,
        minutes,
        segments,
        plannedMinutes: slot?.minutes ?? 0,
        plannedTasks: slot?.tasks ?? 0,
        unestimatedTasks: slot?.unestimated ?? 0,
      };
    });
    return {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      weeklyCapacityMinutes: memberWeeklyCapacity(m.weeklyCapacityMinutes),
      hasOwnCapacity: m.weeklyCapacityMinutes != null,
      days,
      weekMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
      plannedWeekMinutes: days.reduce((sum, d) => sum + d.plannedMinutes, 0),
      busiestDayMinutes: Math.max(0, ...days.map((d) => d.minutes)),
    };
  });

  return {
    weekStartKey,
    dayKeys,
    members: memberRows,
    dayTotals,
    weekMinutes: dayTotals.reduce((a, b) => a + b, 0),
  };
}
