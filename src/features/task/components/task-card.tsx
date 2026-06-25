import Link from "next/link";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  formatDueDate,
  initials,
} from "@/features/task/labels";
import { TaskStatusSelect } from "./task-status-select";

export function TaskCard({
  task,
  workspaceId,
  projectId,
}: {
  task: TaskCardData;
  workspaceId: string;
  projectId: string;
}) {
  const due = formatDueDate(task.dueDate);
  const isDone = task.status === "DONE";

  return (
    <div className="bg-card rounded-md border p-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium",
            PRIORITY_CLASS[task.priority],
          )}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <TaskStatusSelect
          taskId={task.id}
          workspaceId={workspaceId}
          projectId={projectId}
          status={task.status}
        />
      </div>

      <Link
        href={`/w/${workspaceId}/tasks/${task.number}`}
        className={cn(
          "block text-sm hover:underline",
          isDone && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </Link>

      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
        {task.assignee ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="bg-primary/10 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium">
              {initials(task.assignee.name, task.assignee.email)}
            </span>
            <span className="truncate">
              {task.assignee.name?.trim() || task.assignee.email}
            </span>
          </span>
        ) : (
          <span className="italic">Sin asignar</span>
        )}
        {due && (
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Calendar className="size-3" />
            {due}
          </span>
        )}
      </div>
    </div>
  );
}
