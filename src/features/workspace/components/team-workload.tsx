import Link from "next/link";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import type { TeamWorkload } from "@/server/services/manager";
import {
  DAILY_CAPACITY_MINUTES,
  WEEKLY_CAPACITY_MINUTES,
  capacityPercent,
  loadLevel,
  overCapacityMinutes,
} from "@/features/time/capacity";
import {
  WEEKDAY_LABELS,
  addDaysToKey,
  dayNumber,
  hoursLabel,
  todayKey,
} from "@/features/time/week";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

// Carga de trabajo del equipo: una fila por persona, una columna por día.
// Cada celda apila las horas del día por proyecto (con su color), y cuando el
// día se pasa de la jornada se marca en rojo con cuánto se ha excedido.

const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "short" });

function monthLabelOf(dateKey: string) {
  return monthFmt.format(new Date(`${dateKey}T00:00:00`)).replace(".", "");
}

export function TeamWorkloadGrid({
  workload,
  workspaceId,
}: {
  workload: TeamWorkload;
  workspaceId: string;
}) {
  const { dayKeys, members, dayTotals, weekStartKey } = workload;
  const prevWeek = addDaysToKey(weekStartKey, -7);
  const nextWeek = addDaysToKey(weekStartKey, 7);
  const today = todayKey();
  const base = `/w/${workspaceId}?view=team`;

  return (
    <Card variant="glass" className="mt-4 gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-3">
        <div>
          <p className="text-sm font-medium">Carga del equipo</p>
          <p className="text-muted-foreground text-xs">
            Jornada de referencia: {hoursLabel(DAILY_CAPACITY_MINUTES)} h al día
            · {hoursLabel(WEEKLY_CAPACITY_MINUTES)} h a la semana
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`${base}&week=${prevWeek}`}
            aria-label="Semana anterior"
            className="hover:bg-accent transition-ios grid size-8 place-items-center rounded-full"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={base}
            className="hover:bg-accent transition-ios rounded-full px-3 py-1.5 text-xs font-medium"
          >
            Esta semana
          </Link>
          <Link
            href={`${base}&week=${nextWeek}`}
            aria-label="Semana siguiente"
            className="hover:bg-accent transition-ios grid size-8 place-items-center rounded-full"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* En pantallas estrechas la cuadrícula se desplaza en horizontal sin
          arrastrar consigo el resto de la página. */}
      <div className="overflow-x-auto">
        <div className="min-w-[46rem]">
          {/* Cabecera de días */}
          <div className="border-border/60 grid grid-cols-[11rem_repeat(7,minmax(0,1fr))] border-b">
            <div className="text-muted-foreground px-5 py-2 text-xs font-medium">
              {members.length} {members.length === 1 ? "persona" : "personas"}
            </div>
            {dayKeys.map((dk, i) => {
              const isToday = dk === today;
              const isWeekend = i >= 5;
              return (
                <div
                  key={dk}
                  className={`px-2 py-2 text-center ${isWeekend ? "bg-muted/30" : ""}`}
                >
                  <p
                    className={`text-[11px] ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}
                  >
                    {WEEKDAY_LABELS[i]}
                  </p>
                  <p
                    className={`text-sm tabular-nums ${isToday ? "text-primary font-semibold" : ""}`}
                  >
                    {dayNumber(dk)}
                    {(i === 0 || dayNumber(dk) === 1) && (
                      <span className="text-muted-foreground ml-1 text-[10px]">
                        {monthLabelOf(dk)}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Una fila por persona */}
          <div className="divide-border/60 divide-y">
            {members.map((m) => {
              const label = m.name?.trim() || m.email;
              const weekLevel = loadLevel(
                m.weekMinutes,
                WEEKLY_CAPACITY_MINUTES,
              );
              return (
                <div
                  key={m.userId}
                  className="grid grid-cols-[11rem_repeat(7,minmax(0,1fr))] items-stretch"
                >
                  <div className="flex min-w-0 flex-col justify-center gap-1.5 px-5 py-3">
                    <Link
                      href={`/w/${workspaceId}/members/${m.userId}`}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <Avatar>
                        {m.image && <AvatarImage src={m.image} alt={label} />}
                        <AvatarFallback>
                          {label.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 truncate text-sm font-medium hover:underline">
                        {label}
                      </span>
                    </Link>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {hoursLabel(m.weekMinutes)} /{" "}
                      {hoursLabel(WEEKLY_CAPACITY_MINUTES)} h
                    </p>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          weekLevel === "over"
                            ? "bg-destructive"
                            : weekLevel === "full"
                              ? "bg-amber-500"
                              : "bg-primary"
                        }`}
                        style={{
                          width: `${capacityPercent(m.weekMinutes, WEEKLY_CAPACITY_MINUTES)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {m.days.map((day, i) => (
                    <DayCell key={day.dateKey} day={day} weekend={i >= 5} />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Totales por día */}
          <div className="border-border/60 bg-muted/20 grid grid-cols-[11rem_repeat(7,minmax(0,1fr))] border-t">
            <div className="text-muted-foreground px-5 py-2 text-xs font-medium">
              Total del día
            </div>
            {dayTotals.map((minutes, i) => (
              <div
                key={dayKeys[i]}
                className={`px-2 py-2 text-center text-xs tabular-nums ${
                  i >= 5 ? "bg-muted/30" : ""
                } ${minutes === 0 ? "text-muted-foreground/50" : ""}`}
              >
                {minutes === 0 ? "–" : `${hoursLabel(minutes)} h`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {members.every((m) => m.weekMinutes === 0) && (
        <p className="text-muted-foreground px-5 py-4 text-sm">
          Nadie registró horas esta semana. El tiempo aparece aquí en cuanto se
          usa el cronómetro.
        </p>
      )}
    </Card>
  );
}

function DayCell({
  day,
  weekend,
}: {
  day: {
    dateKey: string;
    minutes: number;
    segments: {
      projectId: string;
      projectName: string;
      projectColor: string | null;
      minutes: number;
    }[];
  };
  weekend: boolean;
}) {
  const over = overCapacityMinutes(day.minutes);
  const level = loadLevel(day.minutes);

  return (
    <div
      className={`flex flex-col justify-end p-1.5 ${
        weekend ? "bg-muted/30" : ""
      }`}
      title={
        day.minutes === 0
          ? "Sin horas registradas"
          : day.segments
              .map((s) => `${s.projectName}: ${hoursLabel(s.minutes)} h`)
              .join(" · ")
      }
    >
      {/* Altura fija: es la jornada completa. Cada tramo ocupa la parte que le
          toca de esa jornada, así se comparan los días de un vistazo. */}
      <div className="flex h-20 flex-col justify-end gap-px">
        {over > 0 && (
          <div className="bg-destructive text-destructive-foreground mb-px flex items-center justify-center gap-1 rounded-lg px-1 py-1 text-center text-[10px] leading-tight font-semibold">
            <TriangleAlert className="size-3 shrink-0" />
            <span>+{hoursLabel(over)} h</span>
          </div>
        )}
        {day.segments.map((s) => (
          <div
            key={s.projectId}
            className="min-h-1.5 shrink-0 rounded-lg"
            style={{
              height: `${capacityPercent(s.minutes)}%`,
              background: s.projectColor ?? "var(--primary)",
              opacity: level === "over" ? 0.8 : 1,
            }}
          />
        ))}
      </div>
      {day.minutes > 0 && (
        <span
          className={`pt-0.5 text-center text-[10px] tabular-nums ${
            level === "over"
              ? "text-destructive font-semibold"
              : "text-muted-foreground"
          }`}
        >
          {hoursLabel(day.minutes)} h
        </span>
      )}
    </div>
  );
}
