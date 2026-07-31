"use client";

import { useState } from "react";
import { addTaskAssigneeAction } from "@/server/actions/task";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/features/task/labels";
import { cn } from "@/lib/utils";
import { TASK_DRAG_MIME } from "./task-card";
import type { MemberOption } from "./task-assignee-select";

// Fotos del equipo: arrastra una tarjeta de tarea hasta la foto de alguien
// para asignársela al instante, sin abrir la tarea.
export function TaskTeamStrip({
  workspaceId,
  projectId,
  members,
}: {
  workspaceId: string;
  projectId: string;
  members: MemberOption[];
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (members.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground text-xs">
        Arrastra una tarea aquí para asignarla:
      </span>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <div
            key={m.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setHoverId(m.id);
            }}
            onDragLeave={() => setHoverId((cur) => (cur === m.id ? null : cur))}
            onDrop={async (e) => {
              e.preventDefault();
              setHoverId(null);
              const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
              if (!taskId) return;
              try {
                await addTaskAssigneeAction({
                  taskId,
                  workspaceId,
                  projectId,
                  assigneeId: m.id,
                });
                setToast(`Asignada a ${m.name?.trim() || m.email}`);
                setTimeout(() => setToast(null), 2000);
              } catch (err) {
                setToast(
                  err instanceof Error ? err.message : "No se pudo asignar.",
                );
                setTimeout(() => setToast(null), 2500);
              }
            }}
            title={m.name?.trim() || m.email}
            className={cn(
              "transition-ios rounded-full ring-2 ring-transparent",
              hoverId === m.id && "ring-primary scale-110",
            )}
          >
            <Avatar size="sm" className="pointer-events-none">
              <AvatarImage src={m.image ?? undefined} alt="" />
              <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
            </Avatar>
          </div>
        ))}
      </div>
      {toast && (
        <span className="glass animate-in fade-in-0 rounded-full px-3 py-1 text-xs">
          {toast}
        </span>
      )}
    </div>
  );
}
