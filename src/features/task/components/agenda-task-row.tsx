import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AgendaTask } from "@/server/services/task";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  formatDueDate,
} from "@/features/task/labels";
import { TaskStatusSelect } from "@/features/task/components/task-status-select";

export function AgendaTaskRow({
  task,
  workspaceId,
}: {
  task: AgendaTask;
  workspaceId: string;
}) {
  const due = formatDueDate(task.dueDate);

  return (
    <div className="hover:bg-accent/40 flex items-center gap-3 rounded-md border px-3 py-2">
      <TaskStatusSelect
        taskId={task.id}
        workspaceId={workspaceId}
        projectId={task.project.id}
        status={task.status}
      />
      <Link
        href={`/w/${workspaceId}/tasks/${task.number}`}
        className="min-w-0 flex-1 truncate text-sm hover:underline"
      >
        {task.title}
      </Link>
      <Link
        href={`/w/${workspaceId}/projects/${task.project.id}`}
        className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-xs sm:flex"
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: task.project.color ?? "#888888" }}
        />
        <span className="max-w-32 truncate">{task.project.name}</span>
      </Link>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[11px] font-medium",
          PRIORITY_CLASS[task.priority],
        )}
      >
        {PRIORITY_LABEL[task.priority]}
      </span>
      {due && (
        <span className="text-muted-foreground w-14 shrink-0 text-right text-xs">
          {due}
        </span>
      )}
    </div>
  );
}
