import { Download } from "lucide-react";
import type { MonthlySummary as MonthlySummaryData } from "@/server/services/time";
import { hoursLabel } from "@/features/time/week";

// Resumen mensual: matriz proyecto × miembro con totales, y descarga CSV.
export function MonthlySummary({
  summary,
  workspaceId,
}: {
  summary: MonthlySummaryData;
  workspaceId: string;
}) {
  const exportHref = `/w/${workspaceId}/hours/export?month=${summary.monthKey}`;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <a
          href={exportHref}
          className="hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
        >
          <Download className="size-4" />
          Descargar CSV
        </a>
      </div>

      {summary.grandTotal === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No hay horas registradas este mes.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-xs">
                <th className="px-3 py-2 text-left font-medium">Proyecto</th>
                {summary.members.map((m) => (
                  <th key={m.id} className="px-2 py-2 text-center font-medium">
                    {m.name?.trim() || m.email}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-1.5">
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
                  <td className="px-3 py-1.5 text-center font-medium">
                    {hoursLabel(p.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t">
              <tr className="font-medium">
                <td className="px-3 py-2">Total</td>
                {summary.members.map((m) => (
                  <td key={m.id} className="px-2 py-2 text-center">
                    {hoursLabel(m.total)}
                  </td>
                ))}
                <td className="text-primary px-3 py-2 text-center">
                  {hoursLabel(summary.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
