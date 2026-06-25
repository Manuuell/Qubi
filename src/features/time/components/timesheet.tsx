import { cn } from "@/lib/utils";
import type { Timesheet as TimesheetData } from "@/server/services/time";
import { WEEKDAY_LABELS, dayNumber, hoursLabel } from "@/features/time/week";
import { TimesheetCell } from "./timesheet-cell";

export function Timesheet({
  sheet,
  workspaceId,
  todayKey,
}: {
  sheet: TimesheetData;
  workspaceId: string;
  todayKey: string;
}) {
  if (sheet.rows.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No hay proyectos activos. Crea uno para registrar horas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr className="text-muted-foreground text-xs">
            <th className="px-3 py-2 text-left font-medium">Proyecto</th>
            {sheet.dayKeys.map((key, i) => (
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
          {sheet.rows.map((row) => (
            <tr key={row.projectId}>
              <td className="px-3 py-1.5">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: row.color ?? "#888888" }}
                  />
                  <span className="truncate">{row.name}</span>
                </span>
              </td>
              {row.minutes.map((min, i) => (
                <td key={sheet.dayKeys[i]} className="px-1 py-1 text-center">
                  <TimesheetCell
                    workspaceId={workspaceId}
                    projectId={row.projectId}
                    dateKey={sheet.dayKeys[i]}
                    minutes={min}
                  />
                </td>
              ))}
              <td className="px-3 py-1.5 text-center font-medium">
                {hoursLabel(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t">
          <tr className="font-medium">
            <td className="px-3 py-2">Total día</td>
            {sheet.dayTotals.map((min, i) => (
              <td key={sheet.dayKeys[i]} className="px-2 py-2 text-center">
                {hoursLabel(min)}
              </td>
            ))}
            <td className="text-primary px-3 py-2 text-center">
              {hoursLabel(sheet.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
