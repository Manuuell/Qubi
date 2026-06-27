import { getCurrentUser } from "@/lib/auth";
import { getMonthEntriesForExport } from "@/server/services/time";
import { isValidMonthKey, monthKeyOf } from "@/features/time/week";

// Escapa un campo para CSV (comillas, comas, saltos de línea).
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /w/[workspaceId]/hours/export?month=YYYY-MM  →  CSV detallado del mes.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const monthParam = new URL(req.url).searchParams.get("month") ?? undefined;
  const monthKey = isValidMonthKey(monthParam) ? monthParam : monthKeyOf();

  let rows;
  try {
    rows = await getMonthEntriesForExport(workspaceId, user.id, monthKey);
  } catch {
    // assertWorkspaceAdmin lanza si no es OWNER/ADMIN.
    return new Response("No autorizado", { status: 403 });
  }

  const header = ["Fecha", "Miembro", "Correo", "Proyecto", "Horas", "Nota"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.dateKey,
        csvField(r.memberName),
        csvField(r.memberEmail),
        csvField(r.projectName),
        (r.minutes / 60).toFixed(2),
        csvField(r.note),
      ].join(","),
    );
  }
  // BOM para que Excel reconozca UTF-8 (acentos).
  const csv = "﻿" + lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="horas-${workspaceId}-${monthKey}.csv"`,
    },
  });
}
