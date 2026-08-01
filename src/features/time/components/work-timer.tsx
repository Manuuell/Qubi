"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { useTimerWidget } from "@/features/time/timer-widget-context";
import { StartTimerDialog } from "@/features/time/components/start-timer-dialog";
import { listTimeableTasksAction } from "@/server/actions/timer";
import type { TimeableTask } from "@/server/services/time";
import { STATUS_LABEL } from "@/features/task/labels";
import { IssueStatus } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProjectOption = { id: string; name: string; color: string | null };

// Arrancar el cronómetro exige decir en qué proyecto Y en qué tarea se va a
// trabajar: puede ser una tarea pendiente o una que ya está en marcha.
export function WorkTimer({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: ProjectOption[];
}) {
  const { timer, start, pending } = useTimerWidget();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  // Tareas cacheadas por proyecto y elección explícita por proyecto: así
  // cambiar de proyecto no obliga a limpiar estado dentro del efecto.
  const [tasksByProject, setTasksByProject] = useState<
    Record<string, TimeableTask[]>
  >({});
  const [pickedByProject, setPickedByProject] = useState<
    Record<string, string>
  >({});

  const running = timer !== null;
  const tasks: TimeableTask[] | null = tasksByProject[projectId] ?? null;
  const taskId = pickedByProject[projectId] ?? tasks?.[0]?.id ?? "";

  // Al elegir un proyecto se cargan sus tareas cronometrables (una sola vez).
  useEffect(() => {
    if (!projectId || running || tasksByProject[projectId]) return;
    let active = true;
    listTimeableTasksAction({ workspaceId, projectId })
      .then((rows) => {
        if (active)
          setTasksByProject((prev) => ({ ...prev, [projectId]: rows }));
      })
      .catch(() => {
        if (active) setTasksByProject((prev) => ({ ...prev, [projectId]: [] }));
      });
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, running, tasksByProject]);

  if (running) {
    return (
      <Card variant="glass" className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
            <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
          </span>
          <p className="text-sm">
            Cronómetro activo en{" "}
            <span className="font-medium">{timer.projectName}</span> ·{" "}
            <Link
              href={`/w/${timer.workspaceId}/tasks/${timer.issueNumber}`}
              className="hover:text-primary underline underline-offset-2"
            >
              #{timer.issueNumber} {timer.issueTitle}
            </Link>
            . Míralo en el widget flotante.
          </p>
        </div>
      </Card>
    );
  }

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedTask = tasks?.find((t) => t.id === taskId);
  const noTasks = tasks !== null && tasks.length === 0;

  return (
    <Card variant="glass" className="mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted-foreground text-sm font-medium">Cronómetro</p>
        {projects.length === 0 ? (
          <span className="text-muted-foreground text-sm">
            Crea un proyecto para empezar a cronometrar.
          </span>
        ) : (
          <>
            <Select
              value={projectId}
              onValueChange={(v) => v && setProjectId(v)}
            >
              <SelectTrigger aria-label="Proyecto a cronometrar">
                <SelectValue>
                  {(v: string) => projects.find((p) => p.id === v)?.name ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {noTasks ? (
              <span className="text-muted-foreground text-sm">
                Este proyecto no tiene tareas pendientes ni en marcha.
              </span>
            ) : (
              <Select
                value={taskId}
                onValueChange={(v) =>
                  v &&
                  setPickedByProject((prev) => ({ ...prev, [projectId]: v }))
                }
              >
                <SelectTrigger aria-label="Tarea en la que vas a trabajar">
                  <SelectValue>
                    {(v: string) => {
                      const t = tasks?.find((x) => x.id === v);
                      return t ? `#${t.number} ${t.title}` : "Elige una tarea…";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(tasks ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      #{t.number} {t.title}
                      {t.status === IssueStatus.TODO
                        ? ` · ${STATUS_LABEL.TODO}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <StartTimerDialog
              projectName={selectedProject?.name ?? ""}
              taskTitle={
                selectedTask
                  ? `#${selectedTask.number} ${selectedTask.title}`
                  : ""
              }
              willStartTask={selectedTask?.status === IssueStatus.TODO}
              onConfirm={() =>
                taskId && start({ workspaceId, projectId, issueId: taskId })
              }
              trigger={
                <button
                  disabled={!projectId || !taskId || pending}
                  aria-label="Iniciar"
                  title={
                    taskId
                      ? "Iniciar"
                      : "Elige la tarea en la que vas a trabajar"
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios ml-auto grid size-14 place-items-center rounded-full shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Play className="size-5" fill="currentColor" />
                </button>
              }
            />
          </>
        )}
      </div>
    </Card>
  );
}
