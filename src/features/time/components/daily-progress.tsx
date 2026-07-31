import { Camera } from "lucide-react";
import type { DayProgress } from "@/server/services/time";
import {
  WEEKDAY_LABELS,
  dayNumber,
  hoursLabel,
  todayKey,
} from "@/features/time/week";
import { Card } from "@/components/ui/card";

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export function DailyProgress({ days }: { days: DayProgress[] }) {
  const withActivity = days.filter((d) => d.sessions.length > 0);

  if (withActivity.length === 0) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <p className="text-muted-foreground text-sm">
          Sin sesiones de cronómetro esta semana todavía.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {withActivity.map((day) => {
        const dow =
          WEEKDAY_LABELS[
            (new Date(`${day.dateKey}T00:00:00`).getDay() + 6) % 7
          ];
        return (
          <div key={day.dateKey}>
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <span
                className={
                  day.dateKey === todayKey()
                    ? "text-primary text-sm font-semibold"
                    : "text-sm font-semibold"
                }
              >
                {dow} {dayNumber(day.dateKey)}
              </span>
              <span className="text-muted-foreground text-xs">
                {hoursLabel(day.minutes)} h
              </span>
            </div>
            <div className="space-y-2">
              {day.sessions.map((s) => (
                <Card key={s.id} variant="glass" className="gap-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: s.projectColor ?? "#888888" }}
                      />
                      <span className="truncate text-sm font-medium">
                        {s.projectName}
                      </span>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {timeFmt.format(new Date(s.startedAt))}
                      {s.endedAt && ` – ${timeFmt.format(new Date(s.endedAt))}`}
                      {" · "}
                      {hoursLabel(s.minutes)} h
                    </span>
                  </div>
                  {s.notes.length > 0 && (
                    <div className="space-y-2 pl-4.5">
                      {s.notes.map((n) => (
                        <div key={n.id} className="space-y-1.5">
                          {n.body && (
                            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                              {n.body}
                            </p>
                          )}
                          {n.screenshotUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={n.screenshotUrl}
                              alt="Captura del avance"
                              className="max-h-56 w-auto rounded-xl border object-contain"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {s.notes.length === 0 && (
                    <p className="text-muted-foreground/70 flex items-center gap-1.5 pl-4.5 text-xs italic">
                      <Camera className="size-3" />
                      Sin avance registrado en esta sesión.
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
