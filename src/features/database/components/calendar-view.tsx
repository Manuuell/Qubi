"use client";

import { useState, useTransition, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCardAction, moveCardAction } from "@/server/actions/database";
import type { Property, Row } from "./database-table";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function CalendarView({
  databaseId,
  workspaceId,
  properties,
  rows,
}: {
  databaseId: string;
  workspaceId: string;
  properties: Property[];
  rows: Row[];
}) {
  const dateProp = properties.find((p) => p.type === "DATE");
  const today = new Date();
  const [cursor, setCursor] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);

  if (!dateProp) {
    return (
      <p className="text-muted-foreground mt-6 text-sm">
        Añade una columna de tipo «Fecha» para usar el calendario.
      </p>
    );
  }

  const dateOf = (row: Row) => {
    const v = row.values[dateProp.id];
    return typeof v === "string" ? v.slice(0, 10) : "";
  };

  const firstWeekday = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () =>
    setCursor((c) =>
      c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 },
    );
  const next = () =>
    setCursor((c) =>
      c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 },
    );
  const goToday = () =>
    setCursor({ y: today.getFullYear(), m: today.getMonth() });

  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg font-medium capitalize">
          {MONTHS[cursor.m]} {cursor.y}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={prev}
            aria-label="Mes anterior"
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goToday}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded px-2 py-1 text-sm"
          >
            Hoy
          </button>
          <button
            onClick={next}
            aria-label="Mes siguiente"
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-t border-l">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-muted/30 text-muted-foreground border-r border-b px-2 py-1 text-xs font-medium"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div key={i} className="bg-muted/10 min-h-24 border-r border-b" />
            );
          }
          const dayIso = iso(cursor.y, cursor.m, day);
          const dayRows = rows.filter((r) => dateOf(r) === dayIso);
          return (
            <div
              key={i}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(dayIso);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                setDragOver(null);
                const pageId = e.dataTransfer.getData("text/plain");
                if (pageId) {
                  startTransition(() =>
                    moveCardAction({
                      pageId,
                      propertyId: dateProp.id,
                      value: dayIso,
                      databaseId,
                      workspaceId,
                    }),
                  );
                }
              }}
              className={cn(
                "group min-h-24 border-r border-b p-1",
                dragOver === dayIso && "bg-accent",
                dayIso === todayIso && "bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "px-1 text-xs",
                    dayIso === todayIso && "text-primary font-bold",
                  )}
                >
                  {day}
                </span>
                <button
                  onClick={() =>
                    startTransition(() =>
                      addCardAction({
                        databaseId,
                        workspaceId,
                        propertyId: dateProp.id,
                        value: dayIso,
                      }),
                    )
                  }
                  aria-label="Añadir en este día"
                  className="text-muted-foreground hover:bg-accent-foreground/10 grid size-5 place-items-center rounded opacity-0 group-hover:opacity-100"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="space-y-1">
                {dayRows.map((r) => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", r.id)
                    }
                    className="bg-background cursor-grab truncate rounded border px-1.5 py-0.5 text-xs shadow-sm"
                  >
                    {r.title || "Sin título"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
