import Link from "next/link";
import { cn } from "@/lib/utils";
import type { IssueStatus } from "@/generated/prisma/enums";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import {
  STATUS_DOT,
  STATUS_LABEL,
  formatDueDate,
} from "@/features/task/labels";

const DAY_W = 30; // ancho de cada día (px)
const ROW_H = 36; // alto de cada fila (px)
const LEFT_W = 200; // ancho de la columna de nombres (px)
const MS_DAY = 86_400_000;

// Color de la barra según el estado de la tarea.
const BAR_CLASS: Record<IssueStatus, string> = {
  TODO: "bg-muted-foreground/70",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-green-500",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isWeekend(d: Date) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

type Scheduled = { task: TaskCardData; start: Date; end: Date };

// Cronograma (Gantt) de las tareas del proyecto: cada tarea es una barra de su
// fecha de inicio a su fecha límite. Las tareas sin ninguna fecha se listan
// aparte como "sin programar".
export function TaskGantt({
  tasks,
  workspaceId,
}: {
  tasks: TaskCardData[];
  workspaceId: string;
}) {
  const scheduled: Scheduled[] = [];
  const unscheduled: TaskCardData[] = [];

  for (const t of tasks) {
    if (!t.startDate && !t.dueDate) {
      unscheduled.push(t);
      continue;
    }
    // Si falta una de las dos fechas, la barra dura un día sobre la que haya.
    let start = startOfDay(new Date(t.startDate ?? t.dueDate!));
    let end = startOfDay(new Date(t.dueDate ?? t.startDate!));
    if (start > end) [start, end] = [end, start];
    scheduled.push({ task: t, start, end });
  }

  if (scheduled.length === 0) {
    return (
      <div>
        <p className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
          Ninguna tarea tiene fechas todavía. Asigna una fecha de inicio o
          límite para verla en el cronograma.
        </p>
        <UnscheduledList tasks={unscheduled} workspaceId={workspaceId} />
      </div>
    );
  }

  // Rango visible: del inicio más temprano al final más tardío (incluye hoy),
  // con 2 días de margen a cada lado.
  const today = startOfDay(new Date());
  let min = scheduled[0].start;
  let max = scheduled[0].end;
  for (const s of scheduled) {
    if (s.start < min) min = s.start;
    if (s.end > max) max = s.end;
  }
  if (today < min) min = today;
  if (today > max) max = today;
  const rangeStart = new Date(min.getTime() - 2 * MS_DAY);
  const rangeEnd = new Date(max.getTime() + 2 * MS_DAY);

  const dayCount =
    Math.round((rangeEnd.getTime() - rangeStart.getTime()) / MS_DAY) + 1;
  const days = Array.from(
    { length: dayCount },
    (_, i) => new Date(rangeStart.getTime() + i * MS_DAY),
  );
  const dayIndex = (d: Date) =>
    Math.round((startOfDay(d).getTime() - rangeStart.getTime()) / MS_DAY);

  // Agrupa los días por mes para la cabecera superior.
  const months: { label: string; span: number }[] = [];
  for (const d of days) {
    const label = new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    }).format(d);
    const last = months[months.length - 1];
    if (last && last.label === label) last.span += 1;
    else months.push({ label, span: 1 });
  }

  const timelineW = dayCount * DAY_W;
  const todayLeft = dayIndex(today) * DAY_W;

  return (
    <div>
      <div className="overflow-x-auto rounded-md border">
        <div style={{ width: LEFT_W + timelineW }}>
          {/* Cabecera: meses + números de día */}
          <div className="bg-muted/40 flex border-b">
            <div
              className="bg-muted/40 sticky left-0 z-10 shrink-0 border-r"
              style={{ width: LEFT_W }}
            />
            <div className="relative" style={{ width: timelineW }}>
              <div className="flex">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground truncate border-r px-2 py-1 text-xs font-medium capitalize"
                    style={{ width: m.span * DAY_W }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex border-t">
                {days.map((d, i) => {
                  const isToday = d.getTime() === today.getTime();
                  return (
                    <div
                      key={i}
                      className={cn(
                        "text-muted-foreground shrink-0 text-center text-[10px] leading-5",
                        isWeekend(d) && "bg-muted/50",
                        isToday && "text-primary font-bold",
                      )}
                      style={{ width: DAY_W }}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filas de tareas */}
          {scheduled.map(({ task, start, end }) => {
            const left = dayIndex(start) * DAY_W;
            const width = (dayIndex(end) - dayIndex(start) + 1) * DAY_W;
            const range = `${formatDueDate(start)} – ${formatDueDate(end)}`;
            return (
              <div
                key={task.id}
                className="flex border-b last:border-b-0"
                style={{ height: ROW_H }}
              >
                <Link
                  href={`/w/${workspaceId}/tasks/${task.number}`}
                  className="bg-background hover:bg-accent sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r px-2 text-sm"
                  style={{ width: LEFT_W }}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      STATUS_DOT[task.status],
                    )}
                  />
                  <span className="truncate">{task.title}</span>
                </Link>

                <div className="relative" style={{ width: timelineW }}>
                  {/* sombreado de fines de semana */}
                  {days.map((d, i) =>
                    isWeekend(d) ? (
                      <div
                        key={i}
                        className="bg-muted/40 absolute top-0 bottom-0"
                        style={{ left: i * DAY_W, width: DAY_W }}
                      />
                    ) : null,
                  )}
                  {/* línea de hoy */}
                  <div
                    className="bg-primary/60 absolute top-0 bottom-0 z-10 w-px"
                    style={{ left: todayLeft + DAY_W / 2 }}
                  />
                  {/* barra de la tarea */}
                  <Link
                    href={`/w/${workspaceId}/tasks/${task.number}`}
                    title={`#${task.number} ${task.title} · ${range}`}
                    className={cn(
                      "absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-[11px] text-white hover:opacity-90",
                      BAR_CLASS[task.status],
                    )}
                    style={{
                      left: left + 2,
                      width: Math.max(width - 4, 6),
                      height: 20,
                    }}
                  >
                    <span className="truncate">{task.title}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-xs">
        {(["TODO", "IN_PROGRESS", "DONE"] as IssueStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", BAR_CLASS[s])} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <UnscheduledList tasks={unscheduled} workspaceId={workspaceId} />
    </div>
  );
}

function UnscheduledList({
  tasks,
  workspaceId,
}: {
  tasks: TaskCardData[];
  workspaceId: string;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="text-muted-foreground mb-2 text-xs font-medium">
        Sin programar ({tasks.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((t) => (
          <Link
            key={t.id}
            href={`/w/${workspaceId}/tasks/${t.number}`}
            className="bg-muted hover:bg-accent flex items-center gap-1 rounded px-2 py-1 text-xs"
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                STATUS_DOT[t.status],
              )}
            />
            <span className="truncate">{t.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
