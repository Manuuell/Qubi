import { notFound } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  Calendar,
  GanttChartSquare,
  BarChart3,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getProject } from "@/server/services/project";
import { listProjectTasks } from "@/server/services/task";
import { getWorkspaceMembers } from "@/server/services/member";
import { getWorkspaceRole } from "@/server/services/time";
import { getProjectProduction } from "@/server/services/manager";
import { listLabels } from "@/server/services/label";
import {
  listProjectDatabases,
  listLinkableDatabases,
} from "@/server/services/project-database";
import { ProjectTitle } from "@/features/project/components/project-title";
import { ArchiveProjectButton } from "@/features/project/components/archive-project-button";
import { ProjectProduction } from "@/features/project/components/project-production";
import { ProjectDatabases } from "@/features/project/components/project-databases";
import { NewTaskDialog } from "@/features/task/components/new-task-dialog";
import { TaskBoard } from "@/features/task/components/task-board";
import { TaskList } from "@/features/task/components/task-list";
import { TaskCalendar } from "@/features/task/components/task-calendar";
import { TaskGanttView } from "@/features/task/components/task-gantt-view";

const VIEWS = [
  { key: "board", label: "Tablero", icon: LayoutGrid },
  { key: "list", label: "Lista", icon: List },
  { key: "calendar", label: "Calendario", icon: Calendar },
  { key: "gantt", label: "Cronograma", icon: GanttChartSquare },
  { key: "databases", label: "Bases de datos", icon: Database },
  {
    key: "production",
    label: "Producción",
    icon: BarChart3,
    adminOnly: true,
  },
] as const;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { workspaceId, projectId } = await params;
  const { view: rawView } = await searchParams;
  const user = await getCurrentUser();

  const [project, role] = await Promise.all([
    getProject(projectId, user.id),
    getWorkspaceRole(workspaceId, user.id),
  ]);
  if (!project || project.workspaceId !== workspaceId) notFound();
  const isAdmin = role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;

  const view =
    rawView === "list"
      ? "list"
      : rawView === "calendar"
        ? "calendar"
        : rawView === "gantt"
          ? "gantt"
          : rawView === "databases"
            ? "databases"
            : rawView === "production" && isAdmin
              ? "production"
              : "board";

  const [tasks, members, labels] = await Promise.all([
    listProjectTasks(projectId, user.id),
    getWorkspaceMembers(workspaceId),
    listLabels(workspaceId, user.id),
  ]);
  const memberOptions = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-10 sm:py-12">
      <div className="flex items-center gap-3">
        <span
          className="size-3.5 shrink-0 rounded-full"
          style={{ background: project.color ?? "#888888" }}
        />
        <div className="min-w-0 flex-1">
          <ProjectTitle
            projectId={project.id}
            workspaceId={workspaceId}
            initialName={project.name}
          />
        </div>
        <ArchiveProjectButton
          projectId={project.id}
          workspaceId={workspaceId}
        />
      </div>

      <div className="mt-6">
        <NewTaskDialog
          workspaceId={workspaceId}
          projectId={projectId}
          members={memberOptions}
          labels={labels}
        />
      </div>

      <div className="no-scrollbar mt-6 max-w-full overflow-x-auto">
        <div className="bg-muted inline-flex w-max items-center gap-0.5 rounded-full p-1 text-sm">
          {VIEWS.filter((v) => !("adminOnly" in v) || isAdmin).map((v) => {
            const active = view === v.key;
            const href =
              v.key === "board"
                ? `/w/${workspaceId}/projects/${projectId}`
                : `/w/${workspaceId}/projects/${projectId}?view=${v.key}`;
            return (
              <Link
                key={v.key}
                href={href}
                className={cn(
                  "transition-ios flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 whitespace-nowrap",
                  active
                    ? "bg-card text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <v.icon className="size-4" />
                {v.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {view === "board" && (
          <TaskBoard
            tasks={tasks}
            members={memberOptions}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}
        {view === "list" && (
          <TaskList
            tasks={tasks}
            members={memberOptions}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}
        {view === "calendar" && (
          <TaskCalendar tasks={tasks} workspaceId={workspaceId} />
        )}
        {view === "gantt" && (
          <TaskGanttView
            tasks={tasks}
            members={memberOptions}
            workspaceId={workspaceId}
          />
        )}
        {view === "databases" && (
          <DatabasesTab
            projectId={projectId}
            workspaceId={workspaceId}
            userId={user.id}
          />
        )}
        {view === "production" && isAdmin && (
          <ProductionTab
            projectId={projectId}
            workspaceId={workspaceId}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
}

async function DatabasesTab({
  projectId,
  workspaceId,
  userId,
}: {
  projectId: string;
  workspaceId: string;
  userId: string;
}) {
  const [databases, linkable] = await Promise.all([
    listProjectDatabases(projectId, userId),
    listLinkableDatabases(projectId, workspaceId, userId),
  ]);
  return (
    <ProjectDatabases
      workspaceId={workspaceId}
      projectId={projectId}
      databases={databases}
      linkable={linkable}
    />
  );
}

async function ProductionTab({
  projectId,
  workspaceId,
  userId,
}: {
  projectId: string;
  workspaceId: string;
  userId: string;
}) {
  const production = await getProjectProduction(projectId, workspaceId, userId);
  return (
    <ProjectProduction
      members={production.members}
      recentCompleted={production.recentCompleted}
    />
  );
}
