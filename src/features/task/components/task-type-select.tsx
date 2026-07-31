"use client";

import { useTransition } from "react";
import { IssueType } from "@/generated/prisma/enums";
import { TYPE_LABEL, TYPE_ORDER, TYPE_ICON } from "@/features/task/labels";
import { setTaskTypeAction } from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TaskTypeSelect({
  taskId,
  workspaceId,
  projectId,
  type,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  type: IssueType;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={type}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(() =>
          setTaskTypeAction({
            taskId,
            workspaceId,
            projectId,
            type: value as IssueType,
          }),
        )
      }
    >
      <SelectTrigger aria-label="Tipo de tarea" className="text-xs">
        <SelectValue>
          {(v: IssueType) => `${TYPE_ICON[v]} ${TYPE_LABEL[v]}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TYPE_ORDER.map((t) => (
          <SelectItem key={t} value={t}>
            {TYPE_ICON[t]} {TYPE_LABEL[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
