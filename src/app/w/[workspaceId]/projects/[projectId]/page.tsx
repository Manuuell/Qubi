import { notFound } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, List, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/server/services/project";
import { listProjectTasks } from "@/server/services/task";
import { getWorkspaceMembers } from "@/server/services/member";
import { ProjectTitle } from "@/features/project/components/project-title";
import { ArchiveProjectButton } from "@/features/project/components/archive-project-button";
import { QuickAddTask } from "@/features/task/components/quick-add-task";
import { TaskBoard } from "@/features/task/components/task-board";
import { TaskList } from "@/features/task/components/task-list";
import { TaskCalendar } from "@/features/task/components/task-calendar";

const VIEWS = [
  { key: "board", label: "Tablero", icon: LayoutGrid },
  { key: "list", label: "Lista", icon: List },
  { key: "calendar", label: "Calendario", icon: Calendar },
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
  const view =
    rawView === "list" ? "list" : rawView === "calendar" ? "calendar" : "board";
  const user = await getCurrentUser();

  const project = await getProject(projectId, user.id);
  if (!project || project.workspaceId !== workspaceId) notFound();

  const [tasks, members] = await Promise.all([
    listProjectTasks(projectId, user.id),
    getWorkspaceMembers(workspaceId),
  ]);
  const memberOptions = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  return (
    <div className="mx-auto max-w-5xl px-10 py-12">
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
        <QuickAddTask workspaceId={workspaceId} projectId={projectId} />
      </div>

      <div className="text-muted-foreground mt-6 flex gap-4 border-b text-sm">
        {VIEWS.map((v) => {
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
                "-mb-px flex items-center gap-1.5 border-b-2 pb-2 transition-colors",
                active
                  ? "border-foreground text-foreground font-medium"
                  : "hover:text-foreground border-transparent",
              )}
            >
              <v.icon className="size-4" />
              {v.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        {view === "board" && (
          <TaskBoard
            tasks={tasks}
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
      </div>
    </div>
  );
}
