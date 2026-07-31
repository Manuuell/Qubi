"use client";

import { useTransition } from "react";
import { IssueStatus } from "@/generated/prisma/enums";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from "@/features/task/labels";
import { setTaskStatusAction } from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(() =>
          setTaskStatusAction({
            taskId,
            workspaceId,
            projectId,
            status: value as IssueStatus,
          }),
        )
      }
    >
      <SelectTrigger aria-label="Estado de la tarea" className="text-xs">
        <span
          className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
        />
        <SelectValue>{(v: IssueStatus) => STATUS_LABEL[v]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            <span
              className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[s])}
            />
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
