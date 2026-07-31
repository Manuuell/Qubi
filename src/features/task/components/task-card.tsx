"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  TYPE_ICON,
  formatDueDate,
  initials,
} from "@/features/task/labels";
import { TaskStatusSelect } from "./task-status-select";
import { TaskCardDescription } from "./task-card-description";

// Identificador usado en el drag & drop: al arrastrar la tarjeta sobre la
// foto de alguien (ver TaskTeamStrip) se lee este id para asignarla.
export const TASK_DRAG_MIME = "application/x-qubi-task-id";

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
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="bg-card transition-ios cursor-grab rounded-2xl p-3 shadow-sm hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span title={task.type} className="text-xs">
            {TYPE_ICON[task.type]}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              PRIORITY_CLASS[task.priority],
            )}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
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

      {task.body.trim() && <TaskCardDescription body={task.body.trim()} />}

      {task.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span
              key={l.id}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${l.color}20`, color: l.color }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
        {task.assignees.length > 0 ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="flex -space-x-1.5">
              {task.assignees.map((a) => (
                <span
                  key={a.id}
                  className="bg-primary/10 ring-card grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium ring-2"
                  title={a.name?.trim() || a.email}
                >
                  {initials(a.name, a.email)}
                </span>
              ))}
            </span>
            <span className="truncate">
              {task.assignees.map((a) => a.name?.trim() || a.email).join(", ")}
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
