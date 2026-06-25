"use client";

import { useTransition } from "react";
import { setTaskAssigneeAction } from "@/server/actions/task";

export type MemberOption = { id: string; name: string | null; email: string };

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

  return (
    <select
      value={assigneeId ?? ""}
      disabled={pending}
      aria-label="Responsable de la tarea"
      onChange={(e) =>
        startTransition(() =>
          setTaskAssigneeAction({
            taskId,
            workspaceId,
            projectId,
            assigneeId: e.target.value || null,
          }),
        )
      }
      className="border-input bg-background hover:bg-accent cursor-pointer rounded border px-1.5 py-0.5 text-xs outline-none disabled:opacity-50"
    >
      <option value="">Sin asignar</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name?.trim() || m.email}
        </option>
      ))}
    </select>
  );
}
