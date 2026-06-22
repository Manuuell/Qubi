"use client";

import { ArrowDownUp, Plus, X } from "lucide-react";
import type { Property } from "./database-table";
import {
  OPERATORS,
  TITLE_FIELD,
  fieldsFromProperties,
  type Filter,
  type Sort,
} from "../filter-sort";

type PropType = Property["type"];

const ctrl =
  "rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring";

function defaultValue(type: PropType) {
  return type === "CHECKBOX" ? "true" : "";
}

export function FilterSortBar({
  properties,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
}: {
  properties: Property[];
  filters: Filter[];
  sort: Sort | null;
  onFiltersChange: (filters: Filter[]) => void;
  onSortChange: (sort: Sort | null) => void;
}) {
  const fields = fieldsFromProperties(properties);

  const typeOf = (field: string): PropType =>
    field === TITLE_FIELD
      ? "TEXT"
      : (properties.find((p) => p.id === field)?.type ?? "TEXT");

  function addFilter() {
    const field = fields[0].value;
    const type = typeOf(field);
    onFiltersChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        field,
        op: OPERATORS[type][0].value,
        value: defaultValue(type),
      },
    ]);
  }

  function updateFilter(id: string, patch: Partial<Filter>) {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
      <div className="flex items-center gap-1">
        <ArrowDownUp className="text-muted-foreground size-3.5" />
        <select
          className={ctrl}
          value={sort?.field ?? ""}
          onChange={(e) =>
            onSortChange(
              e.target.value
                ? { field: e.target.value, dir: sort?.dir ?? "asc" }
                : null,
            )
          }
        >
          <option value="">Sin orden</option>
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {sort && (
          <button
            className={ctrl}
            onClick={() =>
              onSortChange({
                ...sort,
                dir: sort.dir === "asc" ? "desc" : "asc",
              })
            }
          >
            {sort.dir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        )}
      </div>

      {filters.map((f) => {
        const type = typeOf(f.field);
        const prop = properties.find((p) => p.id === f.field);
        const options =
          (prop?.config as { options?: string[] } | null)?.options ?? [];
        return (
          <div
            key={f.id}
            className="bg-muted/30 flex items-center gap-1 rounded border px-1 py-0.5"
          >
            <select
              className={ctrl}
              value={f.field}
              onChange={(e) => {
                const t = typeOf(e.target.value);
                updateFilter(f.id, {
                  field: e.target.value,
                  op: OPERATORS[t][0].value,
                  value: defaultValue(t),
                });
              }}
            >
              {fields.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              className={ctrl}
              value={f.op}
              onChange={(e) => updateFilter(f.id, { op: e.target.value })}
            >
              {OPERATORS[type].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {type === "CHECKBOX" ? (
              <select
                className={ctrl}
                value={f.value}
                onChange={(e) => updateFilter(f.id, { value: e.target.value })}
              >
                <option value="true">Marcado</option>
                <option value="false">Sin marcar</option>
              </select>
            ) : type === "SELECT" ? (
              <select
                className={ctrl}
                value={f.value}
                onChange={(e) => updateFilter(f.id, { value: e.target.value })}
              >
                <option value="">—</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={ctrl}
                type={
                  type === "NUMBER"
                    ? "number"
                    : type === "DATE"
                      ? "date"
                      : "text"
                }
                value={f.value}
                placeholder="valor"
                onChange={(e) => updateFilter(f.id, { value: e.target.value })}
              />
            )}

            <button
              onClick={() => removeFilter(f.id)}
              aria-label="Quitar filtro"
              className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-5 place-items-center rounded"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}

      <button
        onClick={addFilter}
        className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1 rounded px-2 py-1 transition-colors"
      >
        <Plus className="size-3.5" />
        Filtro
      </button>
    </div>
  );
}
