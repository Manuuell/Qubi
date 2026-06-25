import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TaskCard as TaskCardData } from "@/server/services/task";
import { STATUS_DOT } from "@/features/task/labels";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Calendario del mes actual: las tareas aparecen en su fecha límite.
export function TaskCalendar({
  tasks,
  workspaceId,
}: {
  tasks: TaskCardData[];
  workspaceId: string;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(now);

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<number, TaskCardData[]>();
  const noDate: TaskCardData[] = [];
  for (const t of tasks) {
    if (!t.dueDate) {
      noDate.push(t);
      continue;
    }
    const d = new Date(t.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      const arr = byDay.get(day) ?? [];
      arr.push(t);
      byDay.set(day, arr);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <p className="mb-3 text-sm font-medium capitalize">{monthLabel}</p>

      <div className="grid grid-cols-7 overflow-hidden rounded-md border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-muted-foreground bg-muted/40 border-b px-2 py-1 text-center text-xs font-medium"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className="min-h-20 border-r border-b p-1 last:border-r-0"
          >
            {day && (
              <>
                <div
                  className={cn(
                    "mb-1 text-right text-xs",
                    day === today
                      ? "text-primary font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {day}
                </div>
                <div className="flex flex-col gap-1">
                  {(byDay.get(day) ?? []).map((t) => (
                    <Link
                      key={t.id}
                      href={`/w/${workspaceId}/tasks/${t.number}`}
                      className="hover:bg-accent flex items-center gap-1 rounded px-1 py-0.5 text-[11px]"
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
              </>
            )}
          </div>
        ))}
      </div>

      {noDate.length > 0 && (
        <div className="mt-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Sin fecha ({noDate.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {noDate.map((t) => (
              <Link
                key={t.id}
                href={`/w/${workspaceId}/issues/${t.number}`}
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
      )}
    </div>
  );
}
