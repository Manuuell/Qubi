"use client";

import { useTransition } from "react";
import { setTaskAssigneeAction } from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MemberOption = { id: string; name: string | null; email: string };

const UNASSIGNED = "__unassigned__";

export function TaskAssigneeSelect({
  taskId,
  workspaceId,
  projectId,
  assigneeId,
  members,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  assigneeId: string | null;
  members: MemberOption[];
}) {
  const [pending, startTransition] = useTransition();
  const labelOf = (id: string) =>
    members.find((m) => m.id === id)?.name?.trim() ||
    members.find((m) => m.id === id)?.email ||
    "Sin asignar";

  return (
    <Select
      value={assigneeId ?? UNASSIGNED}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(() =>
          setTaskAssigneeAction({
            taskId,
            workspaceId,
            projectId,
            assigneeId: value === UNASSIGNED ? null : value,
          }),
        )
      }
    >
      <SelectTrigger aria-label="Responsable de la tarea" className="text-xs">
        <SelectValue>
          {(v: string) => (v === UNASSIGNED ? "Sin asignar" : labelOf(v))}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name?.trim() || m.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
