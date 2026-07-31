"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { useTimerWidget } from "@/features/time/timer-widget-context";
import { StartTimerDialog } from "@/features/time/components/start-timer-dialog";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProjectOption = { id: string; name: string; color: string | null };

export function WorkTimer({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: ProjectOption[];
}) {
  const { timer, start } = useTimerWidget();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  const running = timer !== null;
  const selected = projects.find((p) => p.id === projectId);

  if (running) {
    return (
      <Card variant="glass" className="mb-5">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
            <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
          </span>
          <p className="text-sm">
            Cronómetro activo
            {timer.projectName && (
              <>
                {" "}
                en <span className="font-medium">{timer.projectName}</span>
              </>
            )}
            . Míralo en el widget flotante.
          </p>
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
            <StartTimerDialog
              projectName={selected?.name ?? ""}
              onConfirm={() =>
                start(workspaceId, projectId, selected?.name ?? "")
              }
              trigger={
                <button
                  disabled={!projectId}
                  aria-label="Iniciar"
                  title="Iniciar"
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
