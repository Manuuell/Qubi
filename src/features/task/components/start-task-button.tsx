"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { startTaskAction } from "@/server/actions/task";

// "Empezar a hacer": pasa la tarea de Por hacer a En curso. A partir de aquí
// se documentan avances hasta que haya al menos uno verificable.
export function StartTaskButton({
  taskId,
  workspaceId,
  projectId,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await startTaskAction({ taskId, workspaceId, projectId });
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "No se pudo iniciar.",
              );
            }
          });
        }}
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
      >
        <Play className="size-3.5" />
        {pending ? "Iniciando…" : "Empezar a hacer"}
      </button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
