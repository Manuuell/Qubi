"use client";

import { useTransition } from "react";
import { Priority } from "@/generated/prisma/enums";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/features/task/labels";
import { setTaskPriorityAction } from "@/server/actions/task";

export function TaskPrioritySelect({
  taskId,
  workspaceId,
  projectId,
  priority,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  priority: Priority;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={priority}
      disabled={pending}
      aria-label="Prioridad de la tarea"
      onChange={(e) =>
        startTransition(() =>
          setTaskPriorityAction({
            taskId,
            workspaceId,
            projectId,
            priority: e.target.value as Priority,
          }),
        )
      }
      className="border-input bg-background hover:bg-accent cursor-pointer rounded border px-1.5 py-0.5 text-xs outline-none disabled:opacity-50"
    >
      {PRIORITY_ORDER.map((p) => (
        <option key={p} value={p}>
          {PRIORITY_LABEL[p]}
        </option>
      ))}
    </select>
  );
}
