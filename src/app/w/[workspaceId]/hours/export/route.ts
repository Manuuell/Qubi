import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { buildXlsx, columnName, type Cell, type SheetSpec } from "@/lib/xlsx";
import {
  getMonthEntriesForExport,
  getMonthlySummary,
  type MonthlySummary,
} from "@/server/services/time";
import { getWorkspace } from "@/server/services/workspace";
import {
  isValidMonthKey,
  keyToLocalDate,
  monthKeyOf,
  monthLabel,
} from "@/features/time/week";

type Entry = Awaited<ReturnType<typeof getMonthEntriesForExport>>[number];

// Minutos -> horas decimales (90 -> 1.5). Excel las guarda como número.
function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function memberLabel(name: string | null, email: string): string {
  return name?.trim() || email;
}

// Las notas pueden traer saltos de línea: en una celda se leen mejor en una sola.
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Hoja 1: matriz proyecto × miembro, igual que la tabla de la pantalla.
function summarySheet(
  summary: MonthlySummary,
  workspaceName: string,
): SheetSpec {
  const colCount = summary.members.length + 2; // proyecto + miembros + total
  const lastCol = columnName(colCount);
  const rows: Cell[][] = [
    [{ value: `Horas de trabajo · ${workspaceName}`, style: "title" }],
    [{ value: capitalize(monthLabel(summary.monthKey)), style: "subtitle" }],
    [],
  ];

  if (summary.grandTotal === 0) {
    rows.push([
      { value: "No hay horas registradas en este mes.", style: "text" },
    ]);
  } else {
    rows.push([
      { value: "Proyecto", style: "header" },
      ...summary.members.map(
        (m): Cell => ({
          value: memberLabel(m.name, m.email),
          style: "headerCenter",
        }),
      ),
      { value: "Total", style: "headerCenter" },
    ]);

    for (const p of summary.projects) {
      rows.push([
        { value: p.name, style: "text" },
        ...summary.members.map((m): Cell => {
          const minutes = summary.matrix[`${p.id}|${m.id}`] ?? 0;
          return { value: toHours(minutes), style: "hours" };
        }),
        { value: toHours(p.total), style: "hours" },
      ]);
    }

    rows.push([
      { value: "Total", style: "totalText" },
      ...summary.members.map(
        (m): Cell => ({ value: toHours(m.total), style: "totalHours" }),
      ),
      { value: toHours(summary.grandTotal), style: "totalHours" },
    ]);
  }

  return {
    name: "Resumen",
    columns: [32, ...summary.members.map(() => 16), 12],
    rows,
    freeze: { rows: 4, columns: 1 },
    merges: [`A1:${lastCol}1`, `A2:${lastCol}2`],
  };
}

// Hoja 2: una fila por registro de horas, con filtros.
function detailSheet(
  entries: Entry[],
  monthKey: string,
  workspaceName: string,
): SheetSpec {
  const rows: Cell[][] = [
    [{ value: `Detalle de horas · ${workspaceName}`, style: "title" }],
    [{ value: capitalize(monthLabel(monthKey)), style: "subtitle" }],
    [],
  ];

  const headers = ["Fecha", "Miembro", "Proyecto", "Horas", "Nota", "Correo"];
  rows.push(
    headers.map(
      (h, i): Cell => ({
        value: h,
        style: i === 3 ? "headerCenter" : "header",
      }),
    ),
  );

  for (const e of entries) {
    rows.push([
      { value: keyToLocalDate(e.dateKey), style: "date" },
      { value: memberLabel(e.memberName, e.memberEmail), style: "text" },
      { value: e.projectName, style: "text" },
      { value: toHours(e.minutes), style: "hours" },
      { value: oneLine(e.note), style: "text" },
      { value: e.memberEmail, style: "text" },
    ]);
  }

  const total = entries.reduce((sum, e) => sum + e.minutes, 0);
  rows.push([
    { value: "Total", style: "totalText" },
    { value: null, style: "totalText" },
    { value: null, style: "totalText" },
    { value: toHours(total), style: "totalHours" },
    { value: null, style: "totalText" },
    { value: null, style: "totalText" },
  ]);

  return {
    name: "Detalle",
    columns: [12, 24, 26, 10, 46, 28],
    rows,
    freeze: { rows: 4 },
    // El filtro cubre encabezado + datos, dejando fuera la fila de totales.
    autoFilter: entries.length ? `A4:F${4 + entries.length}` : undefined,
  };
}

// Quita lo que Windows/macOS no aceptan en un nombre de archivo.
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

// GET /w/[workspaceId]/hours/export?month=YYYY-MM  →  .xlsx del mes.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const monthParam = new URL(req.url).searchParams.get("month") ?? undefined;
  const monthKey = isValidMonthKey(monthParam) ? monthParam : monthKeyOf();

  let summary, entries;
  try {
    [summary, entries] = await Promise.all([
      getMonthlySummary(workspaceId, user.id, monthKey),
      getMonthEntriesForExport(workspaceId, user.id, monthKey),
    ]);
  } catch {
    // assertWorkspaceAdmin lanza si no es OWNER/ADMIN.
    return new Response("No autorizado", { status: 403 });
  }

  const file = buildXlsx([
    summarySheet(summary, workspace.name),
    detailSheet(entries, monthKey, workspace.name),
  ]);

  const fileName = safeFileName(
    `Horas de trabajo ${workspace.name} - ${monthLabel(monthKey)}.xlsx`,
  );
  // filename= solo admite ASCII; filename* lleva el nombre real con tildes.
  const ascii = [...fileName]
    .map((ch) => (ch.charCodeAt(0) < 128 ? ch : "_"))
    .join("");

  return new Response(file, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="${ascii}"; ` +
        `filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(file.length),
    },
  });
}
