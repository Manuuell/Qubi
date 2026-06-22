"use client";

import { useState, useTransition, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCardAction, moveCardAction } from "@/server/actions/database";
import type { Property, Row } from "./database-table";

const NONE = "__none__";

export function KanbanBoard({
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
  const groupProp = properties.find((p) => p.type === "SELECT");
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);

  if (!groupProp) {
    return (
      <p className="text-muted-foreground mt-6 text-sm">
        Añade una columna de tipo «Selección» para usar el tablero.
      </p>
    );
  }

  const options =
    (groupProp.config as { options?: string[] } | null)?.options ?? [];
  const columns = [...options, NONE];

  const columnOf = (row: Row) => {
    const v = row.values[groupProp.id];
    return typeof v === "string" && v ? v : NONE;
  };

  function handleDrop(col: string) {
    return (e: DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const pageId = e.dataTransfer.getData("text/plain");
      if (!pageId) return;
      startTransition(() =>
        moveCardAction({
          pageId,
          propertyId: groupProp!.id,
          value: col === NONE ? "" : col,
          databaseId,
          workspaceId,
        }),
      );
    };
  }

  return (
    <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colRows = rows.filter((r) => columnOf(r) === col);
        const label = col === NONE ? "Sin estado" : col;
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={handleDrop(col)}
            className={cn(
              "bg-muted/40 w-64 shrink-0 rounded-lg p-2",
              dragOver === col && "ring-primary ring-2",
            )}
          >
            <div className="text-muted-foreground mb-2 px-1 text-xs font-medium">
              {label} · {colRows.length}
            </div>
            <div className="space-y-2">
              {colRows.map((r) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", r.id)
                  }
                  className="bg-background cursor-grab rounded-md border px-3 py-2 text-sm shadow-sm active:cursor-grabbing"
                >
                  {r.title || "Sin título"}
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                startTransition(() =>
                  addCardAction({
                    databaseId,
                    workspaceId,
                    propertyId: groupProp.id,
                    value: col === NONE ? "" : col,
                  }),
                )
              }
              className="text-muted-foreground hover:bg-accent hover:text-foreground mt-2 flex w-full items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
            >
              <Plus className="size-3.5" />
              Añadir
            </button>
          </div>
        );
      })}
    </div>
  );
}
