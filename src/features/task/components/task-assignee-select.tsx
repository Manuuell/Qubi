"use client";

import { useTransition } from "react";
import { Users } from "lucide-react";
import { setTaskAssigneesAction } from "@/server/actions/task";
import { MAX_ASSIGNEES } from "@/features/task/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/features/task/labels";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type MemberOption = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

// Selector de responsables: hasta MAX_ASSIGNEES personas por tarea. El disparador
// muestra las fotos apiladas; el menú deja marcar/desmarcar con checkboxes.
export function TaskAssigneeSelect({
  taskId,
  workspaceId,
  projectId,
  assigneeIds,
  members,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  assigneeIds: string[];
  members: MemberOption[];
}) {
  const [pending, startTransition] = useTransition();
  const selected = members.filter((m) => assigneeIds.includes(m.id));

  function toggle(memberId: string) {
    const next = assigneeIds.includes(memberId)
      ? assigneeIds.filter((id) => id !== memberId)
      : assigneeIds.length >= MAX_ASSIGNEES
        ? assigneeIds
        : [...assigneeIds, memberId];
    if (next === assigneeIds) return;
    startTransition(() =>
      setTaskAssigneesAction({
        taskId,
        workspaceId,
        projectId,
        assigneeIds: next,
      }),
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label="Responsables de la tarea"
        className="hover:bg-accent transition-ios flex items-center gap-1 rounded-full px-1 py-1 disabled:opacity-60"
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs italic">
            <Users className="size-3.5" />
            Sin asignar
          </span>
        ) : (
          <span className="flex -space-x-1.5">
            {selected.map((m) => (
              <Avatar key={m.id} size="sm" className="ring-card ring-2">
                <AvatarImage src={m.image ?? undefined} alt="" />
                <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
              </Avatar>
            ))}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            Responsables (máx. {MAX_ASSIGNEES})
          </DropdownMenuLabel>
          {members.map((m) => (
            <DropdownMenuCheckboxItem
              key={m.id}
              checked={assigneeIds.includes(m.id)}
              onCheckedChange={() => toggle(m.id)}
              disabled={
                !assigneeIds.includes(m.id) &&
                assigneeIds.length >= MAX_ASSIGNEES
              }
            >
              <Avatar size="sm">
                <AvatarImage src={m.image ?? undefined} alt="" />
                <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{m.name?.trim() || m.email}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
