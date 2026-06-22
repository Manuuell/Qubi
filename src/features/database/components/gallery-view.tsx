"use client";

import type { Property, Row } from "./database-table";
import { formatPropertyValue } from "../format";

export function GalleryView({
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
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="bg-background rounded-lg border p-3 shadow-sm"
        >
          <div className="mb-2 text-sm font-medium">
            {row.title || "Sin título"}
          </div>
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
        </div>
      ))}
    </div>
  );
}
