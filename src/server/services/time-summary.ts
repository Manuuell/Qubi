import { prisma } from "@/lib/db";
import { dbDateToKey, keyToDbDate, monthRangeKeys } from "@/features/time/week";
import { assertWorkspaceAdmin } from "@/server/lib/permissions";

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
