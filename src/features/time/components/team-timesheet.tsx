import { cn } from "@/lib/utils";
import type { TeamWeek } from "@/server/services/time";
import { WEEKDAY_LABELS, dayNumber, hoursLabel } from "@/features/time/week";

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
      <p className="text-muted-foreground py-10 text-center text-sm">
        Nadie ha registrado horas esta semana.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-muted-foreground text-xs">
              <th className="px-3 py-2 text-left font-medium">Miembro</th>
              {week.dayKeys.map((key, i) => (
                <th
                  key={key}
                  className={cn(
                    "px-2 py-2 text-center font-medium",
                    key === todayKey && "text-primary",
                  )}
                >
                  {WEEKDAY_LABELS[i]} {dayNumber(key)}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {week.members.map((m) => (
              <tr key={m.userId}>
                <td className="px-3 py-1.5">
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
                <td className="px-3 py-1.5 text-center font-medium">
                  {hoursLabel(m.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t">
            <tr className="font-medium">
              <td className="px-3 py-2">Total día</td>
              {week.dayTotals.map((min, i) => (
                <td key={week.dayKeys[i]} className="px-2 py-2 text-center">
                  {hoursLabel(min)}
                </td>
              ))}
              <td className="text-primary px-3 py-2 text-center">
                {hoursLabel(week.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {week.projectTotals.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Por proyecto
          </p>
          <ul className="divide-y rounded-md border">
            {week.projectTotals.map((p) => (
              <li
                key={p.projectId}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: p.color ?? "#888888" }}
                />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto font-medium">
                  {hoursLabel(p.total)} h
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
