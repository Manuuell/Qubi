import { prisma } from "@/lib/db";
import {
  addDaysToKey,
  dateToLocalKey,
  keyToLocalDate,
  mondayKeyOf,
} from "@/features/time/week";
import {
  assertWorkspaceAdmin,
  assertWorkspaceMember,
} from "@/server/lib/permissions";

// ── Avances (historial de sesiones + notas, agrupado por día) ──────────────

export type WorkSessionSummary = {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string | null;
  issueNumber: number | null;
  issueTitle: string | null;
  startedAt: Date;
  endedAt: Date | null;
  minutes: number;
  discarded: boolean; // sesión corta: no se imputó a las horas
  notes: {
    id: string;
    body: string;
    screenshotUrl: string | null;
    createdAt: Date;
  }[];
};

export type DayProgress = {
  dateKey: string;
  minutes: number;
  sessions: WorkSessionSummary[];
};

// Sesiones de cronómetro de una semana, agrupadas por día. targetUserId
// permite a un admin ver el avance de otro miembro (accessUserId es quien
// mira la pantalla).
export async function getWorkProgress(
  workspaceId: string,
  accessUserId: string,
  targetUserId: string,
  anchorKey?: string,
): Promise<{ weekStartKey: string; dayKeys: string[]; days: DayProgress[] }> {
  if (targetUserId === accessUserId) {
    await assertWorkspaceMember(workspaceId, accessUserId);
  } else {
    await assertWorkspaceAdmin(workspaceId, accessUserId);
  }

  const weekStartKey = mondayKeyOf(
    anchorKey ? keyToLocalDate(anchorKey) : new Date(),
  );
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysToKey(weekStartKey, i),
  );
  const weekStart = keyToLocalDate(weekStartKey);
  const weekEnd = keyToLocalDate(addDaysToKey(weekStartKey, 7));

  const sessions = await prisma.workSession.findMany({
    where: {
      workspaceId,
      userId: targetUserId,
      startedAt: { gte: weekStart, lt: weekEnd },
    },
    include: {
      project: { select: { name: true, color: true } },
      issue: { select: { number: true, title: true } },
      notes: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { startedAt: "desc" },
  });

  const byDay = new Map<string, DayProgress>(
    dayKeys.map((dk) => [dk, { dateKey: dk, minutes: 0, sessions: [] }]),
  );
  for (const s of sessions) {
    const dk = dateToLocalKey(s.startedAt);
    const bucket = byDay.get(dk);
    if (!bucket) continue;
    // Las sesiones descartadas (demasiado cortas) no suman al total del día,
    // pero se listan igual para que se vea que existieron.
    if (!s.discarded) bucket.minutes += s.minutes;
    bucket.sessions.push({
      id: s.id,
      projectId: s.projectId,
      projectName: s.project.name,
      projectColor: s.project.color,
      issueNumber: s.issue?.number ?? null,
      issueTitle: s.issue?.title ?? null,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      minutes: s.minutes,
      discarded: s.discarded,
      notes: s.notes,
    });
  }

  return { weekStartKey, dayKeys, days: [...byDay.values()].reverse() };
}
