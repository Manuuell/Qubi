"use client";

import { useTransition } from "react";
import { toDateInputValue } from "@/features/task/labels";
import { setTaskStartDateAction } from "@/server/actions/task";

export function TaskStartDateInput({
  taskId,
  workspaceId,
  projectId,
  startDate,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  startDate: Date | string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="date"
      defaultValue={toDateInputValue(startDate)}
      disabled={pending}
      aria-label="Fecha de inicio"
      onChange={(e) =>
        startTransition(() =>
          setTaskStartDateAction({
            taskId,
            workspaceId,
            projectId,
            startDate: e.target.value || null,
          }),
        )
      }
      className="border-input bg-background hover:bg-accent cursor-pointer rounded border px-1.5 py-0.5 text-xs outline-none disabled:opacity-50"
    />
  );
}
