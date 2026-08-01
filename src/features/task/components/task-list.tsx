"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import { TaskStatusSelect } from "./task-status-select";
import { TaskAssigneeSelect, type MemberOption } from "./task-assignee-select";
import { TaskPrioritySelect } from "./task-priority-select";
import { TaskDueDateInput } from "./task-due-date-input";
import { Card } from "@/components/ui/card";
import { TaskTeamStrip } from "./task-team-strip";
import { TASK_DRAG_MIME } from "./task-card";

export function TaskList({
  tasks,
  members,
  workspaceId,
  projectId,
}: {
  tasks: TaskCardData[];
  members: MemberOption[];
  workspaceId: string;
  projectId: string;
}) {
  if (tasks.length === 0) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <p className="text-muted-foreground text-sm">
          Aún no hay tareas. Añade una arriba.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <TaskTeamStrip
        workspaceId={workspaceId}
        projectId={projectId}
        members={members}
      />
      <Card variant="glass" className="no-scrollbar overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Tarea</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Prioridad</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-border/60 divide-y">
            {tasks.map((task) => (
              <tr
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="hover:bg-accent/40 transition-ios cursor-grab active:cursor-grabbing"
              >
                <td className="px-4 py-2">
                  <TaskStatusSelect
                    taskId={task.id}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    status={task.status}
                  />
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/w/${workspaceId}/tasks/${task.number}`}
                    className={cn(
                      "hover:underline",
                      task.status === "DONE" &&
                        "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <TaskAssigneeSelect
                    taskId={task.id}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    assigneeIds={task.assignees.map((a) => a.id)}
                    members={members}
                  />
                </td>
                <td className="px-4 py-2">
                  <TaskPrioritySelect
                    taskId={task.id}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    priority={task.priority}
                  />
                </td>
                <td className="px-4 py-2">
                  <TaskDueDateInput
                    taskId={task.id}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    dueDate={task.dueDate}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
