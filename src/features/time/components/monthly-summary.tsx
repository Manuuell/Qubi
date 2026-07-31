import { Download } from "lucide-react";
import type { MonthlySummary as MonthlySummaryData } from "@/server/services/time";
import { hoursLabel } from "@/features/time/week";
import { Card } from "@/components/ui/card";

// Resumen mensual: matriz proyecto × miembro con totales, y descarga en Excel.
export function MonthlySummary({
  summary,
  workspaceId,
}: {
  summary: MonthlySummaryData;
  workspaceId: string;
}) {
  const exportHref = `/w/${workspaceId}/hours/export?month=${summary.monthKey}`;
  const memberCount = summary.members.length;
  const average =
    memberCount > 0 ? Math.round(summary.grandTotal / memberCount) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Total del mes
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {hoursLabel(summary.grandTotal)} h
          </p>
        </Card>
        <Card variant="glass" className="gap-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Promedio por persona
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {hoursLabel(average)} h
          </p>
        </Card>
        <a
          href={exportHref}
          className="glass hover:bg-accent/40 transition-ios col-span-2 flex items-center justify-center gap-2 rounded-3xl p-5 text-sm font-medium sm:col-span-1"
        >
          <Download className="size-4" />
          Descargar Excel
        </a>
      </div>

      {summary.grandTotal === 0 ? (
        <Card variant="glass" className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            No hay horas registradas este mes.
          </p>
        </Card>
      ) : (
        <Card variant="glass" className="no-scrollbar overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="px-4 py-3 text-left font-medium">Proyecto</th>
                {summary.members.map((m) => (
                  <th key={m.id} className="px-2 py-3 text-center font-medium">
                    {m.name?.trim() || m.email}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-border/60 divide-y">
              {summary.projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-1.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: p.color ?? "#888888" }}
                      />
                      <span className="truncate">{p.name}</span>
                    </span>
                  </td>
                  {summary.members.map((m) => {
                    const min = summary.matrix[`${p.id}|${m.id}`] ?? 0;
                    return (
                      <td
                        key={m.id}
                        className={
                          min === 0
                            ? "text-muted-foreground/40 px-2 py-1.5 text-center"
                            : "px-2 py-1.5 text-center"
                        }
                      >
                        {hoursLabel(min)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-1.5 text-center font-medium">
                    {hoursLabel(p.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-border/60 border-t">
              <tr className="font-medium">
                <td className="px-4 py-3">Total</td>
                {summary.members.map((m) => (
                  <td key={m.id} className="px-2 py-3 text-center">
                    {hoursLabel(m.total)}
                  </td>
                ))}
                <td className="text-primary px-4 py-3 text-center">
                  {hoursLabel(summary.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}
