"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
} from "@/features/task/labels";
import type { MemberOption } from "./task-assignee-select";
import { TaskGantt } from "./task-gantt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Cronograma con barra de filtros (responsable, estado, prioridad). Filtra en el
// cliente sobre las tareas ya cargadas y se las pasa al Gantt para que dibuje.
export function TaskGanttView({
  tasks,
  members,
  workspaceId,
}: {
  tasks: TaskCardData[];
  members: MemberOption[];
  workspaceId: string;
}) {
  const [assignee, setAssignee] = useState("all"); // all | none | <memberId>
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");

  const filtered = tasks.filter((t) => {
    if (assignee === "none" && t.assignee) return false;
    if (
      assignee !== "all" &&
      assignee !== "none" &&
      t.assignee?.id !== assignee
    )
      return false;
    if (status !== "all" && t.status !== status) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    return true;
  });

  const active = assignee !== "all" || status !== "all" || priority !== "all";

  function reset() {
    setAssignee("all");
    setStatus("all");
    setPriority("all");
  }

  const assigneeLabel = (v: string) => {
    if (v === "all") return "Todos los responsables";
    if (v === "none") return "Sin asignar";
    return members.find((m) => m.id === v)?.name?.trim() || v;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={assignee} onValueChange={(v) => v && setAssignee(v)}>
          <SelectTrigger
            aria-label="Filtrar por responsable"
            className="text-xs"
          >
            <SelectValue>{assigneeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            <SelectItem value="none">Sin asignar</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name?.trim() || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger aria-label="Filtrar por estado" className="text-xs">
            <SelectValue>
              {(v: string) =>
                v === "all"
                  ? "Todos los estados"
                  : STATUS_LABEL[v as keyof typeof STATUS_LABEL]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
          <SelectTrigger aria-label="Filtrar por prioridad" className="text-xs">
            <SelectValue>
              {(v: string) =>
                v === "all"
                  ? "Todas las prioridades"
                  : PRIORITY_LABEL[v as keyof typeof PRIORITY_LABEL]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            {PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {active && (
          <button
            onClick={reset}
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
          >
            <X className="size-3" />
            Limpiar
          </button>
        )}

        <span className="text-muted-foreground ml-auto text-xs">
          {filtered.length} de {tasks.length}
        </span>
      </div>

      <TaskGantt tasks={filtered} workspaceId={workspaceId} />
    </div>
  );
}
