import { cn } from "@/lib/utils";
import type { Timesheet as TimesheetData } from "@/server/services/time";
import { WEEKDAY_LABELS, dayNumber, hoursLabel } from "@/features/time/week";
import { TimesheetCell } from "./timesheet-cell";
import { Card } from "@/components/ui/card";

export function Timesheet({
  sheet,
  workspaceId,
  todayKey,
  editable,
}: {
  sheet: TimesheetData;
  workspaceId: string;
  todayKey: string;
  editable: boolean;
}) {
  if (sheet.rows.length === 0) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <p className="text-muted-foreground text-sm">
          No hay proyectos activos. Crea uno para registrar horas.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="no-scrollbar overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th className="px-4 py-3 text-left font-medium">Proyecto</th>
            {sheet.dayKeys.map((key, i) => (
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
          {sheet.rows.map((row) => (
            <tr key={row.projectId}>
              <td className="px-4 py-1.5">
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
                    editable={editable}
                  />
                </td>
              ))}
              <td className="px-4 py-1.5 text-center font-medium">
                {hoursLabel(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-border/60 border-t">
          <tr className="font-medium">
            <td className="px-4 py-3">Total día</td>
            {sheet.dayTotals.map((min, i) => (
              <td key={sheet.dayKeys[i]} className="px-2 py-3 text-center">
                {hoursLabel(min)}
              </td>
            ))}
            <td className="text-primary px-4 py-3 text-center">
              {hoursLabel(sheet.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
