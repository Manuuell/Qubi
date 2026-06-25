import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getWeekTimesheet } from "@/server/services/time";
import {
  addDaysToKey,
  isValidKey,
  keyToLocalDate,
  mondayKeyOf,
  todayKey,
} from "@/features/time/week";
import { Timesheet } from "@/features/time/components/timesheet";

const fmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

export default async function HoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { workspaceId } = await params;
  const { week } = await searchParams;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const anchor = isValidKey(week) ? week : mondayKeyOf();
  const sheet = await getWeekTimesheet(workspaceId, user.id, anchor);

  const prevWeek = addDaysToKey(sheet.weekStartKey, -7);
  const nextWeek = addDaysToKey(sheet.weekStartKey, 7);
  const thisWeek = mondayKeyOf();
  const rangeLabel = `${fmt.format(keyToLocalDate(sheet.dayKeys[0]))} – ${fmt.format(
    keyToLocalDate(sheet.dayKeys[6]),
  )}`;

  return (
    <div className="mx-auto max-w-4xl px-10 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <Clock className="text-muted-foreground size-6" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Registro de horas
        </h1>
        <span className="text-muted-foreground ml-auto text-sm">Tus horas</span>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={`/w/${workspaceId}/hours?week=${prevWeek}`}
          aria-label="Semana anterior"
          className="hover:bg-accent grid size-8 place-items-center rounded-md border"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={`/w/${workspaceId}/hours?week=${nextWeek}`}
          aria-label="Semana siguiente"
          className="hover:bg-accent grid size-8 place-items-center rounded-md border"
        >
          <ChevronRight className="size-4" />
        </Link>
        <span className="ml-1 text-sm font-medium">{rangeLabel}</span>
        {sheet.weekStartKey !== thisWeek && (
          <Link
            href={`/w/${workspaceId}/hours`}
            className="text-muted-foreground hover:text-foreground ml-2 text-sm underline"
          >
            Esta semana
          </Link>
        )}
      </div>

      <div className="mt-5">
        <Timesheet
          sheet={sheet}
          workspaceId={workspaceId}
          todayKey={todayKey()}
        />
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        Escribe las horas en cada celda (p. ej. <code>1.5</code> = 1 h 30 min) y
        pulsa Enter o sal del campo para guardar.
      </p>
    </div>
  );
}
