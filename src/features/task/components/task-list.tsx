import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import { TaskStatusSelect } from "./task-status-select";
import { TaskAssigneeSelect, type MemberOption } from "./task-assignee-select";
import { TaskPrioritySelect } from "./task-priority-select";
import { TaskDueDateInput } from "./task-due-date-input";

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
      <p className="text-muted-foreground py-10 text-center text-sm">
        Aún no hay tareas. Añade una arriba.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Tarea</th>
            <th className="px-3 py-2 font-medium">Responsable</th>
            <th className="px-3 py-2 font-medium">Prioridad</th>
            <th className="px-3 py-2 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-accent/40">
              <td className="px-3 py-2">
                <TaskStatusSelect
                  taskId={task.id}
                  workspaceId={workspaceId}
                  projectId={projectId}
                  status={task.status}
                />
              </td>
              <td className="px-3 py-2">
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
              <td className="px-3 py-2">
                <TaskAssigneeSelect
                  taskId={task.id}
                  workspaceId={workspaceId}
                  projectId={projectId}
                  assigneeId={task.assignee?.id ?? null}
                  members={members}
                />
              </td>
              <td className="px-3 py-2">
                <TaskPrioritySelect
                  taskId={task.id}
                  workspaceId={workspaceId}
                  projectId={projectId}
                  priority={task.priority}
                />
              </td>
              <td className="px-3 py-2">
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
    </div>
  );
}
