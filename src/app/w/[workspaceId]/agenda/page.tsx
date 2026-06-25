import { notFound } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { listMyTasks, type AgendaTask } from "@/server/services/task";
import {
  addDaysToKey,
  dateToLocalKey,
  mondayKeyOf,
  todayKey,
} from "@/features/time/week";
import { AgendaTaskRow } from "@/features/task/components/agenda-task-row";

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const tasks = await listMyTasks(workspaceId, user.id);

  const today = todayKey();
  const endOfWeek = addDaysToKey(mondayKeyOf(), 6);

  const buckets: Record<string, AgendaTask[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    noDate: [],
  };
  for (const t of tasks) {
    if (!t.dueDate) {
      buckets.noDate.push(t);
      continue;
    }
    const k = dateToLocalKey(new Date(t.dueDate));
    if (k < today) buckets.overdue.push(t);
    else if (k === today) buckets.today.push(t);
    else if (k <= endOfWeek) buckets.week.push(t);
    else buckets.later.push(t);
  }

  const sections = [
    { key: "overdue", label: "Vencidas", danger: true },
    { key: "today", label: "Hoy", danger: false },
    { key: "week", label: "Esta semana", danger: false },
    { key: "later", label: "Más adelante", danger: false },
    { key: "noDate", label: "Sin fecha", danger: false },
  ].filter((s) => buckets[s.key].length > 0);

  return (
    <div className="mx-auto max-w-3xl px-10 py-12">
      <div className="flex items-center gap-3">
        <CalendarCheck className="text-muted-foreground size-6" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mi agenda
        </h1>
        <span className="text-muted-foreground ml-auto text-sm">
          {tasks.length} pendiente{tasks.length === 1 ? "" : "s"}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">
          No tienes tareas pendientes asignadas. 🎉
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.key}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <span className={cn(s.danger && "text-destructive")}>
                  {s.label}
                </span>
                <span className="text-muted-foreground">
                  {buckets[s.key].length}
                </span>
              </h2>
              <div className="space-y-1.5">
                {buckets[s.key].map((task) => (
                  <AgendaTaskRow
                    key={task.id}
                    task={task}
                    workspaceId={workspaceId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
