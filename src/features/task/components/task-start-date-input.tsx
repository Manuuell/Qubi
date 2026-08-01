"use client";

import { useTransition } from "react";
import { toDateInputValue } from "@/features/task/labels";
import { setTaskStartDateAction } from "@/server/actions/task";
import { DatePicker } from "@/components/ui/date-picker";

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
    <DatePicker
      value={toDateInputValue(startDate)}
      disabled={pending}
      ariaLabel="Fecha de inicio"
      onChange={(value) =>
        startTransition(() =>
          setTaskStartDateAction({
            taskId,
            workspaceId,
            projectId,
            startDate: value || null,
          }),
        )
      }
    />
  );
}
