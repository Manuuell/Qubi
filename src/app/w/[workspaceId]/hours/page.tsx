import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getWorkspace } from "@/server/services/workspace";
import {
  getMonthlySummary,
  getRunningTimer,
  getTeamWeek,
  getWeekTimesheet,
  getWorkspaceRole,
} from "@/server/services/time";
import {
  addDaysToKey,
  addMonthsToMonthKey,
  isValidKey,
  isValidMonthKey,
  keyToLocalDate,
  mondayKeyOf,
  monthKeyOf,
  monthLabel,
  todayKey,
} from "@/features/time/week";
import { Timesheet } from "@/features/time/components/timesheet";
import { TeamTimesheet } from "@/features/time/components/team-timesheet";
import { MonthlySummary } from "@/features/time/components/monthly-summary";
import { WorkTimer } from "@/features/time/components/work-timer";

const fmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

const TABS = [
  { key: "personal", label: "Tus horas" },
  { key: "team", label: "Equipo" },
  { key: "summary", label: "Resumen" },
] as const;

export default async function HoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ view?: string; week?: string; month?: string }>;
}) {
  const { workspaceId } = await params;
  const { view: rawView, week, month } = await searchParams;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const role = await getWorkspaceRole(workspaceId, user.id);
  const isAdmin = role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;

  // Las pestañas de equipo/resumen son solo para admins.
  let view: "personal" | "team" | "summary" =
    rawView === "team"
      ? "team"
      : rawView === "summary"
        ? "summary"
        : "personal";
  if (!isAdmin) view = "personal";

  const anchor = isValidKey(week) ? week : mondayKeyOf();
  const monthAnchor = isValidMonthKey(month) ? month : monthKeyOf();

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <Clock className="text-muted-foreground size-6" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Registro de horas
        </h1>
      </div>

      {isAdmin && (
        <div className="text-muted-foreground mt-6 flex gap-4 border-b text-sm">
          {TABS.map((t) => {
            const href =
              t.key === "personal"
                ? `/w/${workspaceId}/hours`
                : `/w/${workspaceId}/hours?view=${t.key}`;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "-mb-px border-b-2 pb-2 transition-colors",
                  view === t.key
                    ? "border-foreground text-foreground font-medium"
                    : "hover:text-foreground border-transparent",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}

      {view === "summary" ? (
        <MonthView
          workspaceId={workspaceId}
          monthKey={monthAnchor}
          userId={user.id}
        />
      ) : (
        <WeekView
          workspaceId={workspaceId}
          anchor={anchor}
          view={view}
          userId={user.id}
        />
      )}
    </div>
  );
}

// ── Vista semanal (personal o equipo) ───────────────────────────────────────

async function WeekView({
  workspaceId,
  anchor,
  view,
  userId,
}: {
  workspaceId: string;
  anchor: string;
  view: "personal" | "team";
  userId: string;
}) {
  if (view === "team") {
    const week = await getTeamWeek(workspaceId, userId, anchor);
    return (
      <WeekShell
        workspaceId={workspaceId}
        view="team"
        weekStartKey={week.weekStartKey}
        dayKeys={week.dayKeys}
      >
        <TeamTimesheet week={week} todayKey={todayKey()} />
      </WeekShell>
    );
  }

  const [sheet, timer] = await Promise.all([
    getWeekTimesheet(workspaceId, userId, anchor),
    getRunningTimer(userId),
  ]);
  const projectOptions = sheet.rows.map((r) => ({
    id: r.projectId,
    name: r.name,
    color: r.color,
  }));

  return (
    <>
      <div className="mt-6">
        <WorkTimer
          workspaceId={workspaceId}
          projects={projectOptions}
          timer={timer}
        />
      </div>
      <WeekShell
        workspaceId={workspaceId}
        view="personal"
        weekStartKey={sheet.weekStartKey}
        dayKeys={sheet.dayKeys}
      >
        <Timesheet
          sheet={sheet}
          workspaceId={workspaceId}
          todayKey={todayKey()}
        />
        <p className="text-muted-foreground mt-4 text-xs">
          Escribe las horas en cada celda (p. ej. <code>1.5</code> = 1 h 30 min)
          y pulsa Enter o sal del campo para guardar. El cronómetro suma su
          tiempo al detenerse.
        </p>
      </WeekShell>
    </>
  );
}

// Navegación de semana (compartida por la vista personal y la de equipo).
function WeekShell({
  workspaceId,
  view,
  weekStartKey,
  dayKeys,
  children,
}: {
  workspaceId: string;
  view: "personal" | "team";
  weekStartKey: string;
  dayKeys: string[];
  children: React.ReactNode;
}) {
  const thisWeek = mondayKeyOf();
  const prevWeek = addDaysToKey(weekStartKey, -7);
  const nextWeek = addDaysToKey(weekStartKey, 7);
  const rangeLabel = `${fmt.format(keyToLocalDate(dayKeys[0]))} – ${fmt.format(
    keyToLocalDate(dayKeys[6]),
  )}`;
  const base =
    view === "team"
      ? `/w/${workspaceId}/hours?view=team&`
      : `/w/${workspaceId}/hours?`;
  const thisWeekHref =
    view === "team" ? `${base}week=${thisWeek}` : `/w/${workspaceId}/hours`;

  return (
    <>
      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`${base}week=${prevWeek}`}
          aria-label="Semana anterior"
          className="hover:bg-accent grid size-8 place-items-center rounded-md border"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={`${base}week=${nextWeek}`}
          aria-label="Semana siguiente"
          className="hover:bg-accent grid size-8 place-items-center rounded-md border"
        >
          <ChevronRight className="size-4" />
        </Link>
        <span className="ml-1 text-sm font-medium">{rangeLabel}</span>
        {weekStartKey !== thisWeek && (
          <Link
            href={thisWeekHref}
            className="text-muted-foreground hover:text-foreground ml-2 text-sm underline"
          >
            Esta semana
          </Link>
        )}
      </div>

      <div className="mt-5">{children}</div>
    </>
  );
}

// ── Vista mensual (resumen + CSV) ───────────────────────────────────────────

async function MonthView({
  workspaceId,
  monthKey,
  userId,
}: {
  workspaceId: string;
  monthKey: string;
  userId: string;
}) {
  const summary = await getMonthlySummary(workspaceId, userId, monthKey);
  const thisMonth = monthKeyOf();
  const prevMonth = addMonthsToMonthKey(monthKey, -1);
  const nextMonth = addMonthsToMonthKey(monthKey, 1);

  return (
    <>
      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/w/${workspaceId}/hours?view=summary&month=${prevMonth}`}
          aria-label="Mes anterior"
          className="hover:bg-accent grid size-8 place-items-center rounded-md border"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={`/w/${workspaceId}/hours?view=summary&month=${nextMonth}`}
          aria-label="Mes siguiente"
          className="hover:bg-accent grid size-8 place-items-center rounded-md border"
        >
          <ChevronRight className="size-4" />
        </Link>
        <span className="ml-1 text-sm font-medium capitalize">
          {monthLabel(monthKey)}
        </span>
        {monthKey !== thisMonth && (
          <Link
            href={`/w/${workspaceId}/hours?view=summary`}
            className="text-muted-foreground hover:text-foreground ml-2 text-sm underline"
          >
            Este mes
          </Link>
        )}
      </div>

      <div className="mt-5">
        <MonthlySummary summary={summary} workspaceId={workspaceId} />
      </div>
    </>
  );
}
