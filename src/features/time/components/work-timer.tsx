"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Square, X } from "lucide-react";
import type { RunningTimerInfo } from "@/server/services/time";
import {
  cancelTimerAction,
  startTimerAction,
  stopTimerAction,
} from "@/server/actions/timer";

type ProjectOption = { id: string; name: string; color: string | null };

// hh:mm:ss a partir de milisegundos.
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function WorkTimer({
  workspaceId,
  projects,
  timer,
}: {
  workspaceId: string;
  projects: ProjectOption[];
  timer: RunningTimerInfo | null;
}) {
  const [pending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  const running = timer !== null && timer.workspaceId === workspaceId;
  const elsewhere = timer !== null && timer.workspaceId !== workspaceId;

  if (elsewhere) {
    return (
      <div className="text-muted-foreground bg-muted/30 mb-5 rounded-md border px-4 py-3 text-sm">
        Tienes un temporizador en marcha en otro espacio de trabajo. Deténlo
        allí para registrar tiempo aquí.
      </div>
    );
  }

  if (running) {
    return (
      <div className="bg-card mb-5 flex flex-wrap items-center gap-3 rounded-md border p-4">
        <span className="relative flex size-2.5">
          <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
          <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Trabajando en</p>
          <p className="truncate text-sm font-medium">{timer.projectName}</p>
        </div>
        <Elapsed startedAt={timer.startedAt} />
        <div className="ml-auto flex gap-2">
          <button
            onClick={() =>
              startTransition(() => stopTimerAction({ workspaceId }))
            }
            disabled={pending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            <Square className="size-3.5" />
            Detener y guardar
          </button>
          <button
            onClick={() =>
              startTransition(() => cancelTimerAction({ workspaceId }))
            }
            disabled={pending}
            aria-label="Descartar temporizador"
            title="Descartar (no guarda el tiempo)"
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-8 place-items-center rounded-md border disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card mb-5 flex flex-wrap items-center gap-2 rounded-md border p-4">
      <p className="text-muted-foreground text-sm">Cronómetro:</p>
      {projects.length === 0 ? (
        <span className="text-muted-foreground text-sm">
          Crea un proyecto para empezar a cronometrar.
        </span>
      ) : (
        <>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Proyecto a cronometrar"
            className="border-input bg-background hover:bg-accent cursor-pointer rounded border px-2 py-1.5 text-sm outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              startTransition(() =>
                startTimerAction({ workspaceId, projectId }),
              )
            }
            disabled={pending || !projectId}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            <Play className="size-3.5" />
            Iniciar
          </button>
        </>
      )}
    </div>
  );
}

// Reloj que avanza cada segundo desde startedAt.
function Elapsed({ startedAt }: { startedAt: Date | string }) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-lg tabular-nums" suppressHydrationWarning>
      {formatElapsed(now - start)}
    </span>
  );
}
