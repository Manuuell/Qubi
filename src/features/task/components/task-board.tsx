import { cn } from "@/lib/utils";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from "@/features/task/labels";
import { TaskCard } from "./task-card";

export function TaskBoard({
  tasks,
  workspaceId,
  projectId,
}: {
  tasks: TaskCardData[];
  workspaceId: string;
  projectId: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="glass rounded-3xl p-2.5">
            <div className="mb-2 flex items-center gap-2 px-2 py-1 text-sm font-medium">
              <span
                className={cn("size-2.5 rounded-full", STATUS_DOT[status])}
              />
              {STATUS_LABEL[status]}
              <span className="text-muted-foreground">
                {columnTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className="animate-in fade-in-0 slide-in-from-top-1 duration-200"
                >
                  <TaskCard
                    task={task}
                    workspaceId={workspaceId}
                    projectId={projectId}
                  />
                </div>
              ))}
              {columnTasks.length === 0 && (
                <p className="text-muted-foreground px-2 py-3 text-xs">
                  Sin tareas.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
