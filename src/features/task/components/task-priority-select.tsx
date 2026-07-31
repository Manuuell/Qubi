"use client";

import { useTransition } from "react";
import { Priority } from "@/generated/prisma/enums";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/features/task/labels";
import { setTaskPriorityAction } from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Select
      value={priority}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(() =>
          setTaskPriorityAction({
            taskId,
            workspaceId,
            projectId,
            priority: value as Priority,
          }),
        )
      }
    >
      <SelectTrigger aria-label="Prioridad de la tarea" className="text-xs">
        <SelectValue>{(v: Priority) => PRIORITY_LABEL[v]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
