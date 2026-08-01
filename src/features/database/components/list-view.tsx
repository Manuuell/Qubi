"use client";

import { useTransition } from "react";
import { FileText, Plus } from "lucide-react";
import type { Property, Row } from "./database-table";
import { formatPropertyValue } from "../format";
import { Card } from "@/components/ui/card";
import { addRowAction } from "@/server/actions/database";

export function ListView({
  databaseId,
  workspaceId,
  properties,
  rows,
}: {
  databaseId?: string;
  workspaceId?: string;
  properties: Property[];
  rows: Row[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6">
      {rows.length === 0 ? (
        <Card variant="glass" className="py-10 text-center">
          <p className="text-muted-foreground text-sm">Sin resultados.</p>
        </Card>
      ) : (
        <Card variant="glass" className="divide-border/60 gap-0 divide-y p-0">
          {rows.map((row) => (
            <div
              key={row.id}
              className="hover:bg-accent/60 transition-ios flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
            >
              <span className="bg-primary/10 text-primary grid size-7 shrink-0 place-items-center rounded-full">
                <FileText className="size-3.5" />
              </span>
              <span className="text-sm font-medium">
                {row.title || "Sin título"}
              </span>
              {properties.map((p) => {
                const v = formatPropertyValue(p, row.values[p.id]);
                if (!v) return null;
                return (
                  <span key={p.id} className="text-muted-foreground text-xs">
                    <span className="opacity-60">{p.name}:</span> {v}
                  </span>
                );
              })}
            </div>
          ))}
        </Card>
      )}

      {databaseId && workspaceId && (
        <button
          onClick={() =>
            startTransition(() => addRowAction({ databaseId, workspaceId }))
          }
          disabled={pending}
          className="bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-ios mt-2 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium active:scale-[0.98] disabled:opacity-50"
        >
          <Plus className="size-4" />
          Agregar
        </button>
      )}
    </div>
  );
}
