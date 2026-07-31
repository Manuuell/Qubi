import { prisma } from "@/lib/db";
import { IssueStatus } from "@/generated/prisma/enums";
import { assertWorkspaceAdmin } from "@/server/lib/permissions";
import {
  addDaysToKey,
  dateToLocalKey,
  keyToDbDate,
  mondayKeyOf,
} from "@/features/time/week";

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
        assigneeId: true,
        assignee: { select: { name: true, email: true } },
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
    if (!t.assigneeId || !t.assignee) continue;
    const cur = completedMap.get(t.assigneeId) ?? {
      name: t.assignee.name,
      email: t.assignee.email,
      count: 0,
    };
    cur.count += 1;
    completedMap.set(t.assigneeId, cur);
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
  assignee: { name: string | null; email: string } | null;
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
    prisma.issue.groupBy({
      by: ["assigneeId"],
      where: { projectId, status: IssueStatus.DONE, assigneeId: { not: null } },
      _count: { _all: true },
    }),
    prisma.issue.findMany({
      where: { projectId, status: IssueStatus.DONE },
      select: {
        id: true,
        number: true,
        title: true,
        completedAt: true,
        assignee: { select: { name: true, email: true } },
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
  const countByUser = new Map<string, number>(
    doneCounts.map((d) => [d.assigneeId!, d._count._all]),
  );

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
      assignee: t.assignee,
      evidenceCount: t.comments.filter((c) => c.attachmentUrl).length,
    })),
  };
}
