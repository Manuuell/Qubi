"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Square, X } from "lucide-react";
import type { RunningTimerInfo } from "@/server/services/time";
import {
  cancelTimerAction,
  startTimerAction,
  stopTimerAction,
} from "@/server/actions/timer";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Card variant="flat" className="text-muted-foreground mb-5 text-sm">
        Tienes un temporizador en marcha en otro espacio de trabajo. Deténlo
        allí para registrar tiempo aquí.
      </Card>
    );
  }

  if (running) {
    return (
      <Card variant="glass" className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
                <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
              </span>
              <p className="text-muted-foreground text-xs">Trabajando en</p>
            </div>
            <p className="truncate text-sm font-medium">{timer.projectName}</p>
            <Elapsed startedAt={timer.startedAt} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                startTransition(() => stopTimerAction({ workspaceId }))
              }
              disabled={pending}
              aria-label="Detener y guardar"
              title="Detener y guardar"
              className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios grid size-14 place-items-center rounded-full shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Square className="size-5" fill="currentColor" />
            </button>
            <button
              onClick={() =>
                startTransition(() => cancelTimerAction({ workspaceId }))
              }
              disabled={pending}
              aria-label="Descartar temporizador"
              title="Descartar (no guarda el tiempo)"
              className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-14 place-items-center rounded-full border disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </Card>
    );
  }

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
            <button
              onClick={() =>
                startTransition(() =>
                  startTimerAction({ workspaceId, projectId }),
                )
              }
              disabled={pending || !projectId}
              aria-label="Iniciar"
              title="Iniciar"
              className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios ml-auto grid size-14 place-items-center rounded-full shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Play className="size-5" fill="currentColor" />
            </button>
          </>
        )}
      </div>
    </Card>
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
    <span
      className="font-mono text-3xl font-semibold tabular-nums"
      suppressHydrationWarning
    >
      {formatElapsed(now - start)}
    </span>
  );
}
