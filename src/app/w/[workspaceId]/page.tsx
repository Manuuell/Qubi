import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  Clock,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { listMyTasks } from "@/server/services/task";
import { listProjects } from "@/server/services/project";
import { getWeekTimesheet, getWorkspaceRole } from "@/server/services/time";
import { getTeamOverview, getTeamWorkload } from "@/server/services/manager";
import { TeamWorkloadGrid } from "@/features/workspace/components/team-workload";
import { isValidKey } from "@/features/time/week";
import { WEEKDAY_LABELS, hoursLabel, todayKey } from "@/features/time/week";
import { AgendaTaskRow } from "@/features/task/components/agenda-task-row";
import { Card } from "@/components/ui/card";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function firstName(name: string | null, email: string) {
  return (name?.trim().split(" ")[0] || email.split("@")[0]) ?? "";
}

const HOME_TABS = [
  { key: "me", label: "Mi resumen" },
  { key: "team", label: "Equipo" },
] as const;

export default async function WorkspaceHome({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  const { workspaceId } = await params;
  const { view: rawView, week } = await searchParams;
  const user = await getCurrentUser();

  const role = await getWorkspaceRole(workspaceId, user.id);
  const isAdmin = role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
  const view = isAdmin && rawView === "team" ? "team" : "me";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-10 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm capitalize">
            {DATE_FMT.format(new Date())}
          </p>
          <h1 className="font-heading mt-1 text-3xl font-bold tracking-tight">
            Hola, {firstName(user.name, user.email)}
          </h1>
        </div>
        {isAdmin && (
          <div className="bg-muted inline-flex items-center gap-0.5 rounded-full p-1 text-sm">
            {HOME_TABS.map((t) => (
              <Link
                key={t.key}
                href={
                  t.key === "me"
                    ? `/w/${workspaceId}`
                    : `/w/${workspaceId}?view=team`
                }
                className={cn(
                  "transition-ios rounded-full px-4 py-1.5",
                  view === t.key
                    ? "bg-card text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {view === "team" ? (
        <TeamHome
          workspaceId={workspaceId}
          userId={user.id}
          week={isValidKey(week) ? week : undefined}
        />
      ) : (
        <PersonalHome workspaceId={workspaceId} userId={user.id} />
      )}
    </div>
  );
}

async function PersonalHome({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const [tasks, projects, week] = await Promise.all([
    listMyTasks(workspaceId, userId),
    listProjects(workspaceId),
    getWeekTimesheet(workspaceId, userId),
  ]);

  const today = todayKey();
  const overdueOrToday = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const k = new Date(t.dueDate).toISOString().slice(0, 10);
    return k <= today;
  });
  const upcoming = tasks.slice(0, 5);
  const maxDay = Math.max(1, ...week.dayTotals);

  return (
    <>
      <p className="text-muted-foreground mt-1 text-sm">
        ¿Por dónde quieres empezar hoy?
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Horas esta semana
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {hoursLabel(week.grandTotal)} h
          </p>
        </Card>
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Pendientes
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {tasks.length}
          </p>
        </Card>
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Vencen hoy o antes
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {overdueOrToday.length}
          </p>
        </Card>
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Proyectos activos
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {projects.length}
          </p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="glass" className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Horas de la semana</p>
            <Link
              href={`/w/${workspaceId}/hours`}
              className="text-primary text-xs font-medium hover:underline"
            >
              Ver registro
            </Link>
          </div>
          <div className="mt-4 flex h-28 items-end gap-2.5">
            {week.dayTotals.map((min, i) => {
              const pct = Math.max(4, Math.round((min / maxDay) * 100));
              const isToday = week.dayKeys[i] === today;
              return (
                <div
                  key={week.dayKeys[i]}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div className="flex h-20 w-full items-end">
                    <div
                      className="transition-ios w-full rounded-full"
                      style={{
                        height: `${pct}%`,
                        background: isToday
                          ? "var(--primary)"
                          : "color-mix(in oklab, var(--primary) 25%, transparent)",
                      }}
                    />
                  </div>
                  <span
                    className={
                      isToday
                        ? "text-primary text-xs font-semibold"
                        : "text-muted-foreground text-xs"
                    }
                  >
                    {WEEKDAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card variant="glass" className="gap-2">
          <p className="text-sm font-medium">Accesos rápidos</p>
          <Link
            href={`/w/${workspaceId}/agenda`}
            className="hover:bg-accent transition-ios flex items-center gap-2 rounded-full px-3 py-2 text-sm"
          >
            <CalendarCheck className="text-muted-foreground size-4" />
            Mi agenda
          </Link>
          <Link
            href={`/w/${workspaceId}/hours`}
            className="hover:bg-accent transition-ios flex items-center gap-2 rounded-full px-3 py-2 text-sm"
          >
            <Clock className="text-muted-foreground size-4" />
            Registro de horas
          </Link>
          <Link
            href={`/w/${workspaceId}/members`}
            className="hover:bg-accent transition-ios flex items-center gap-2 rounded-full px-3 py-2 text-sm"
          >
            <Users className="text-muted-foreground size-4" />
            Miembros
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="glass" className="gap-3 p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <p className="text-sm font-medium">Tus pendientes</p>
            <Link
              href={`/w/${workspaceId}/agenda`}
              className="text-primary text-xs font-medium hover:underline"
            >
              Ver toda la agenda
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground px-5 pb-5 text-sm">
              No tienes tareas pendientes asignadas.
            </p>
          ) : (
            <div className="divide-border/60 divide-y pb-1">
              {upcoming.map((task) => (
                <AgendaTaskRow
                  key={task.id}
                  task={task}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          )}
        </Card>

        <Card variant="glass" className="gap-2 p-0">
          <div className="flex items-center justify-between px-5 pt-5">
            <p className="text-sm font-medium">Tus proyectos</p>
          </div>
          {projects.length === 0 ? (
            <p className="text-muted-foreground px-5 pb-5 text-sm">
              Sin proyectos todavía.
            </p>
          ) : (
            <div className="divide-border/60 divide-y pb-1">
              {projects.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/w/${workspaceId}/projects/${p.id}`}
                  className="hover:bg-accent/40 transition-ios flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: p.color ?? "#888888" }}
                  />
                  <span className="truncate">{p.name || "Sin nombre"}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

const dayTimeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});
const dueFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

async function TeamHome({
  workspaceId,
  userId,
  week,
}: {
  workspaceId: string;
  userId: string;
  week?: string;
}) {
  const [overview, workload] = await Promise.all([
    getTeamOverview(workspaceId, userId),
    getTeamWorkload(workspaceId, userId, week),
  ]);

  return (
    <>
      <p className="text-muted-foreground mt-1 text-sm">
        Cómo va el equipo ahora mismo.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Trabajando ahora
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {overview.activeNow.length}
          </p>
        </Card>
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Horas del equipo (semana)
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {hoursLabel(overview.weekMinutes)} h
          </p>
        </Card>
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Tareas completadas (semana)
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {overview.tasksCompletedThisWeek}
          </p>
        </Card>
      </div>

      <TeamWorkloadGrid workload={workload} workspaceId={workspaceId} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="glass" className="gap-3 p-0 lg:col-span-2">
          <div className="flex items-center gap-2 px-5 pt-5">
            <span className="relative flex size-2">
              <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
              <span className="bg-primary relative inline-flex size-2 rounded-full" />
            </span>
            <p className="text-sm font-medium">Trabajando ahora</p>
          </div>
          {overview.activeNow.length === 0 ? (
            <p className="text-muted-foreground px-5 pb-5 text-sm">
              Nadie tiene el cronómetro activo en este momento.
            </p>
          ) : (
            <div className="divide-border/60 divide-y pb-1">
              {overview.activeNow.map((w) => (
                <div
                  key={w.userId}
                  className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {w.name?.trim() || w.email}
                    <span className="text-muted-foreground">
                      {" "}
                      · {w.projectName}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {w.paused
                      ? "En pausa"
                      : `desde ${dayTimeFmt.format(new Date(w.startedAt))}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="glass" className="gap-2 p-0">
          <div className="flex items-center gap-2 px-5 pt-5">
            <Trophy className="text-muted-foreground size-4" />
            <p className="text-sm font-medium">Top de la semana</p>
          </div>
          {overview.completedByMember.length === 0 ? (
            <p className="text-muted-foreground px-5 pb-5 text-sm">
              Nadie ha completado tareas esta semana.
            </p>
          ) : (
            <div className="divide-border/60 divide-y pb-1">
              {overview.completedByMember.slice(0, 6).map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {m.name?.trim() || m.email}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {m.count} {m.count === 1 ? "tarea" : "tareas"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card variant="glass" className="mt-4 gap-3 p-0">
        <div className="flex items-center gap-2 px-5 pt-5">
          <AlertTriangle className="text-destructive size-4" />
          <p className="text-sm font-medium">Tareas vencidas</p>
        </div>
        {overview.overdueTasks.length === 0 ? (
          <p className="text-muted-foreground px-5 pb-5 text-sm">
            No hay tareas vencidas sin terminar. 🎉
          </p>
        ) : (
          <div className="divide-border/60 divide-y pb-1">
            {overview.overdueTasks.map((t) => (
              <Link
                key={t.id}
                href={`/w/${workspaceId}/projects/${t.projectId}`}
                className="hover:bg-accent/40 transition-ios flex items-center justify-between gap-2 px-5 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: t.projectColor ?? "#888888" }}
                  />
                  <span className="truncate">{t.title || "Sin título"}</span>
                </span>
                {t.dueDate && (
                  <span className="text-destructive shrink-0 text-xs font-medium">
                    {dueFmt.format(new Date(t.dueDate))}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
