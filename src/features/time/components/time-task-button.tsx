"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { useTimerWidget } from "@/features/time/timer-widget-context";
import { StartTimerDialog } from "@/features/time/components/start-timer-dialog";

// Arranca el cronómetro directamente sobre esta tarea (el atajo natural: ya
// estás mirando en qué vas a trabajar). Solo hay un cronómetro por persona.
export function TimeTaskButton({
  workspaceId,
  projectId,
  issueId,
  issueNumber,
  title,
  projectName,
  isTodo,
}: {
  workspaceId: string;
  projectId: string;
  issueId: string;
  issueNumber: number;
  title: string;
  projectName: string;
  isTodo: boolean;
}) {
  const { timer, start, pending } = useTimerWidget();

  if (timer?.issueId === issueId) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
        <span className="relative flex size-2">
          <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
          <span className="bg-primary relative inline-flex size-2 rounded-full" />
        </span>
        Cronómetro corriendo en esta tarea
      </span>
    );
  }

  if (timer) {
    return (
      <span className="text-muted-foreground text-sm">
        Tienes el cronómetro en{" "}
        <Link
          href={`/w/${timer.workspaceId}/tasks/${timer.issueNumber}`}
          className="hover:text-foreground underline underline-offset-2"
        >
          #{timer.issueNumber}
        </Link>
        . Deténlo para cronometrar esta.
      </span>
    );
  }

  return (
    <StartTimerDialog
      projectName={projectName}
      taskTitle={`#${issueNumber} ${title}`}
      willStartTask={isTodo}
      onConfirm={() => start({ workspaceId, projectId, issueId })}
      trigger={
        <button
          disabled={pending}
          className="glass hover:bg-accent transition-ios inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium active:scale-95 disabled:opacity-50"
        >
          <Timer className="size-4" />
          Cronometrar esta tarea
        </button>
      }
    />
  );
}
