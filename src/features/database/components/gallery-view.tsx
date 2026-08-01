"use client";

import { useTransition } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import type { Property, Row } from "./database-table";
import { formatPropertyValue } from "../format";
import { Card } from "@/components/ui/card";
import { addRowAction } from "@/server/actions/database";

export function GalleryView({
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
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <Card
          key={row.id}
          variant="glass"
          className="transition-ios gap-2 p-4 hover:shadow-md"
        >
          <div className="bg-primary/10 text-primary mb-1 grid size-9 place-items-center rounded-xl">
            <LayoutGrid className="size-4" />
          </div>
          <div className="text-sm font-medium">{row.title || "Sin título"}</div>
          <div className="space-y-1">
            {properties.map((p) => {
              const v = formatPropertyValue(p, row.values[p.id]);
              if (!v) return null;
              return (
                <div key={p.id} className="flex gap-1 text-xs">
                  <span className="text-muted-foreground">{p.name}:</span>
                  <span>{v}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <button
        onClick={() =>
          startTransition(() => addRowAction({ databaseId, workspaceId }))
        }
        disabled={pending}
        className="border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed text-sm font-medium active:scale-[0.98] disabled:opacity-50"
      >
        <Plus className="size-5" />
        Agregar
      </button>
    </div>
  );
}
