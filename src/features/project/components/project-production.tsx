import { ImageIcon } from "lucide-react";
import type {
  CompletedTaskEntry,
  ProjectMemberProduction,
} from "@/server/services/manager";
import { hoursLabel } from "@/features/time/week";
import { Card } from "@/components/ui/card";

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ProjectProduction({
  members,
  recentCompleted,
}: {
  members: ProjectMemberProduction[];
  recentCompleted: CompletedTaskEntry[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card variant="glass" className="gap-3 p-0">
        <div className="px-5 pt-5">
          <p className="text-sm font-medium">Horas del mes por miembro</p>
        </div>
        {members.length === 0 ? (
          <p className="text-muted-foreground px-5 pb-5 text-sm">
            Sin actividad registrada este mes.
          </p>
        ) : (
          <div className="divide-border/60 divide-y pb-1">
            {members.map((m) => {
              const max = Math.max(
                1,
                ...members.map((x) => x.minutesThisMonth),
              );
              const pct = Math.max(
                4,
                Math.round((m.minutesThisMonth / max) * 100),
              );
              return (
                <div key={m.userId} className="space-y-1.5 px-5 py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {m.name?.trim() || m.email}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {hoursLabel(m.minutesThisMonth)} h · {m.tasksCompleted}{" "}
                      {m.tasksCompleted === 1 ? "tarea" : "tareas"}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card variant="glass" className="gap-3 p-0">
        <div className="px-5 pt-5">
          <p className="text-sm font-medium">Últimas tareas completadas</p>
        </div>
        {recentCompleted.length === 0 ? (
          <p className="text-muted-foreground px-5 pb-5 text-sm">
            Todavía no se ha completado ninguna tarea.
          </p>
        ) : (
          <div className="divide-border/60 divide-y pb-1">
            {recentCompleted.map((t) => (
              <div key={t.id} className="px-5 py-2.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    #{t.number} {t.title || "Sin título"}
                  </span>
                  {t.evidenceCount > 0 && (
                    <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                      <ImageIcon className="size-3" />
                      {t.evidenceCount}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {t.assignee?.name?.trim() ||
                    t.assignee?.email ||
                    "Sin asignar"}
                  {t.completedAt &&
                    ` · ${dateFmt.format(new Date(t.completedAt))}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
