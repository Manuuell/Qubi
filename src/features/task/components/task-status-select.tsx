"use client";

import { useTransition } from "react";
import { IssueStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_ORDER } from "@/features/task/labels";
import { setTaskStatusAction } from "@/server/actions/task";

export function TaskStatusSelect({
  taskId,
  workspaceId,
  projectId,
  status,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  status: IssueStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      aria-label="Estado de la tarea"
      onChange={(e) =>
        startTransition(() =>
          setTaskStatusAction({
            taskId,
            workspaceId,
            projectId,
            status: e.target.value as IssueStatus,
          }),
        )
      }
      className="border-input bg-background hover:bg-accent cursor-pointer rounded border px-1.5 py-0.5 text-xs outline-none disabled:opacity-50"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
