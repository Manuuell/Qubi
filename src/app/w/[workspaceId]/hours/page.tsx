import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getWorkspace } from "@/server/services/workspace";
import {
  getMonthlySummary,
  getTeamWeek,
  getWeekTimesheet,
  getWorkProgress,
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
import { DailyProgress } from "@/features/time/components/daily-progress";

const fmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

const TABS: {
  key: "personal" | "progress" | "team" | "summary";
  label: string;
  adminOnly?: boolean;
}[] = [
  { key: "personal", label: "Tus horas" },
  { key: "progress", label: "Avances" },
  { key: "team", label: "Equipo", adminOnly: true },
  { key: "summary", label: "Resumen", adminOnly: true },
];

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

  let view: "personal" | "progress" | "team" | "summary" =
    rawView === "progress"
      ? "progress"
      : rawView === "team"
        ? "team"
        : rawView === "summary"
          ? "summary"
          : "personal";
  if (!isAdmin && (view === "team" || view === "summary")) view = "personal";

  const anchor = isValidKey(week) ? week : mondayKeyOf();
  const monthAnchor = isValidMonthKey(month) ? month : monthKeyOf();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-10 sm:py-12">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full">
          <Clock className="size-5.5" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Registro de horas
        </h1>
      </div>

      <div className="bg-muted no-scrollbar mt-6 inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 text-sm">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => {
          const href =
            t.key === "personal"
              ? `/w/${workspaceId}/hours`
              : `/w/${workspaceId}/hours?view=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "transition-ios shrink-0 rounded-full px-4 py-1.5 whitespace-nowrap",
                view === t.key
                  ? "bg-card text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {view === "summary" ? (
        <MonthView
          workspaceId={workspaceId}
          monthKey={monthAnchor}
          userId={user.id}
        />
      ) : view === "progress" ? (
        <ProgressView
          workspaceId={workspaceId}
          anchor={anchor}
          userId={user.id}
        />
      ) : (
        <WeekView
          workspaceId={workspaceId}
          anchor={anchor}
          view={view}
          userId={user.id}
          editable={isAdmin}
        />
      )}
    </div>
  );
}

// ── Vista de avances (sesiones de cronómetro + notas, agrupadas por día) ───

async function ProgressView({
  workspaceId,
  anchor,
  userId,
}: {
  workspaceId: string;
  anchor: string;
  userId: string;
}) {
  const progress = await getWorkProgress(workspaceId, userId, userId, anchor);
  return (
    <WeekShell
      workspaceId={workspaceId}
      view="progress"
      weekStartKey={progress.weekStartKey}
      dayKeys={progress.dayKeys}
    >
      <DailyProgress days={progress.days} />
    </WeekShell>
  );
}

// ── Vista semanal (personal o equipo) ───────────────────────────────────────

async function WeekView({
  workspaceId,
  anchor,
  view,
  userId,
  editable,
}: {
  workspaceId: string;
  anchor: string;
  view: "personal" | "team";
  userId: string;
  editable: boolean;
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

  const sheet = await getWeekTimesheet(workspaceId, userId, anchor);
  const projectOptions = sheet.rows.map((r) => ({
    id: r.projectId,
    name: r.name,
    color: r.color,
  }));

  return (
    <>
      <div className="mt-6">
        <WorkTimer workspaceId={workspaceId} projects={projectOptions} />
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
          editable={editable}
        />
        {!editable && (
          <p className="text-muted-foreground mt-4 px-1 text-xs">
            Las horas se registran automáticamente con el cronómetro. La edición
            manual está reservada a los administradores de confianza del
            espacio.
          </p>
        )}
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
  view: "personal" | "team" | "progress";
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
    view === "personal"
      ? `/w/${workspaceId}/hours?`
      : `/w/${workspaceId}/hours?view=${view}&`;
  const thisWeekHref =
    view === "personal" ? `/w/${workspaceId}/hours` : `${base}week=${thisWeek}`;

  return (
    <>
      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`${base}week=${prevWeek}`}
          aria-label="Semana anterior"
          className="hover:bg-accent transition-ios glass grid size-8 place-items-center rounded-full"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={`${base}week=${nextWeek}`}
          aria-label="Semana siguiente"
          className="hover:bg-accent transition-ios glass grid size-8 place-items-center rounded-full"
        >
          <ChevronRight className="size-4" />
        </Link>
        <span className="ml-1 text-sm font-medium">{rangeLabel}</span>
        {weekStartKey !== thisWeek && (
          <Link
            href={thisWeekHref}
            className="text-primary hover:bg-accent transition-ios ml-2 rounded-full px-3 py-1 text-sm font-medium"
          >
            Esta semana
          </Link>
        )}
      </div>

      <div className="mt-5">{children}</div>
    </>
  );
}

// ── Vista mensual (resumen + Excel) ─────────────────────────────────────────

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
          className="hover:bg-accent transition-ios glass grid size-8 place-items-center rounded-full"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={`/w/${workspaceId}/hours?view=summary&month=${nextMonth}`}
          aria-label="Mes siguiente"
          className="hover:bg-accent transition-ios glass grid size-8 place-items-center rounded-full"
        >
          <ChevronRight className="size-4" />
        </Link>
        <span className="ml-1 text-sm font-medium capitalize">
          {monthLabel(monthKey)}
        </span>
        {monthKey !== thisMonth && (
          <Link
            href={`/w/${workspaceId}/hours?view=summary`}
            className="text-primary hover:bg-accent transition-ios ml-2 rounded-full px-3 py-1 text-sm font-medium"
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
