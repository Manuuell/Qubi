import { cn } from "@/lib/utils";
import type { TeamWeek } from "@/server/services/time";
import { WEEKDAY_LABELS, dayNumber, hoursLabel } from "@/features/time/week";
import { Card } from "@/components/ui/card";

// Vista de equipo de una semana: filas = miembros, columnas = días. Solo
// lectura (cada quien edita sus horas en "Tus horas").
export function TeamTimesheet({
  week,
  todayKey,
}: {
  week: TeamWeek;
  todayKey: string;
}) {
  if (week.grandTotal === 0) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <p className="text-muted-foreground text-sm">
          Nadie ha registrado horas esta semana.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card variant="glass" className="no-scrollbar overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs">
              <th className="px-4 py-3 text-left font-medium">Miembro</th>
              {week.dayKeys.map((key, i) => (
                <th key={key} className="px-1 py-3 text-center font-medium">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-2 py-1",
                      key === todayKey && "bg-primary/10 text-primary",
                    )}
                  >
                    {WEEKDAY_LABELS[i]} {dayNumber(key)}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-border/60 divide-y">
            {week.members.map((m) => (
              <tr key={m.userId}>
                <td className="px-4 py-1.5">
                  <span className="truncate">{m.name?.trim() || m.email}</span>
                </td>
                {m.minutes.map((min, i) => (
                  <td
                    key={week.dayKeys[i]}
                    className={cn(
                      "px-2 py-1.5 text-center",
                      min === 0 && "text-muted-foreground/40",
                    )}
                  >
                    {hoursLabel(min)}
                  </td>
                ))}
                <td className="px-4 py-1.5 text-center font-medium">
                  {hoursLabel(m.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-border/60 border-t">
            <tr className="font-medium">
              <td className="px-4 py-3">Total día</td>
              {week.dayTotals.map((min, i) => (
                <td key={week.dayKeys[i]} className="px-2 py-3 text-center">
                  {hoursLabel(min)}
                </td>
              ))}
              <td className="text-primary px-4 py-3 text-center">
                {hoursLabel(week.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {week.projectTotals.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 px-1 text-xs font-medium tracking-wide uppercase">
            Por proyecto
          </p>
          <Card variant="glass" className="divide-border/60 gap-0 divide-y p-0">
            {week.projectTotals.map((p) => (
              <div
                key={p.projectId}
                className="flex items-center gap-2 px-4 py-3 text-sm"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: p.color ?? "#888888" }}
                />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto font-medium">
                  {hoursLabel(p.total)} h
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
