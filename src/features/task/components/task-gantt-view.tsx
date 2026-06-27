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

const SELECT_CLASS =
  "border-input bg-background hover:bg-accent cursor-pointer rounded border px-2 py-1 text-xs outline-none";

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Filtrar por responsable"
          className={SELECT_CLASS}
        >
          <option value="all">Todos los responsables</option>
          <option value="none">Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name?.trim() || m.email}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por estado"
          className={SELECT_CLASS}
        >
          <option value="all">Todos los estados</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filtrar por prioridad"
          className={SELECT_CLASS}
        >
          <option value="all">Todas las prioridades</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>

        {active && (
          <button
            onClick={reset}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1 rounded border px-2 py-1 text-xs"
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
