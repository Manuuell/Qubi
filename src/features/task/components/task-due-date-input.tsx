"use client";

import { useTransition } from "react";
import { toDateInputValue } from "@/features/task/labels";
import { setTaskDueDateAction } from "@/server/actions/task";
import { DatePicker } from "@/components/ui/date-picker";

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
    <DatePicker
      value={toDateInputValue(dueDate)}
      disabled={pending}
      ariaLabel="Fecha límite"
      onChange={(value) =>
        startTransition(() =>
          setTaskDueDateAction({
            taskId,
            workspaceId,
            projectId,
            dueDate: value || null,
          }),
        )
      }
    />
  );
}
