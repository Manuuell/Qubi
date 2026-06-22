"use client";

import type { Property, Row } from "./database-table";
import { formatPropertyValue } from "../format";

export function ListView({
  properties,
  rows,
}: {
  properties: Property[];
  rows: Row[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground mt-6 text-sm">Sin resultados.</p>
    );
  }

  return (
    <div className="mt-6 divide-y rounded-md border">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2"
        >
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
    </div>
  );
}
