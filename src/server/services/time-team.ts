import { prisma } from "@/lib/db";
import {
  addDaysToKey,
  dbDateToKey,
  keyToDbDate,
  keyToLocalDate,
  mondayKeyOf,
} from "@/features/time/week";
import { assertWorkspaceAdmin } from "@/server/lib/permissions";

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
