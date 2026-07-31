"use client";

import { useTransition } from "react";
import { toDateInputValue } from "@/features/task/labels";
import { setTaskDueDateAction } from "@/server/actions/task";

export function TaskDueDateInput({
  taskId,
  workspaceId,
  projectId,
  dueDate,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  dueDate: Date | string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="date"
      defaultValue={toDateInputValue(dueDate)}
      disabled={pending}
      aria-label="Fecha límite"
      onChange={(e) =>
        startTransition(() =>
          setTaskDueDateAction({
            taskId,
            workspaceId,
            projectId,
            dueDate: e.target.value || null,
          }),
        )
      }
      className="border-input bg-background hover:bg-accent transition-ios cursor-pointer rounded-full border px-2.5 py-1 text-xs outline-none disabled:opacity-50"
    />
  );
}
