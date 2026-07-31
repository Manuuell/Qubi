"use client";

import { ArrowDownUp, ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import type { Property } from "./database-table";
import {
  OPERATORS,
  TITLE_FIELD,
  fieldsFromProperties,
  type Filter,
  type Sort,
} from "../filter-sort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PropType = Property["type"];

const NO_SORT = "__none__";

const inputCls =
  "rounded-full border bg-background px-2.5 py-1 text-xs outline-none transition-ios focus:ring-2 focus:ring-ring";

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
        <Select
          value={sort?.field ?? NO_SORT}
          onValueChange={(value) =>
            onSortChange(
              !value || value === NO_SORT
                ? null
                : { field: value, dir: sort?.dir ?? "asc" },
            )
          }
        >
          <SelectTrigger className="text-xs">
            <SelectValue>
              {(v: string) =>
                v === NO_SORT
                  ? "Sin orden"
                  : (fields.find((f) => f.value === v)?.label ?? v)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SORT}>Sin orden</SelectItem>
            {fields.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sort && (
          <button
            className={inputCls}
            onClick={() =>
              onSortChange({
                ...sort,
                dir: sort.dir === "asc" ? "desc" : "asc",
              })
            }
          >
            {sort.dir === "asc" ? (
              <ArrowUp className="inline size-3" />
            ) : (
              <ArrowDown className="inline size-3" />
            )}{" "}
            {sort.dir === "asc" ? "Asc" : "Desc"}
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
            className="bg-muted/30 flex items-center gap-1 rounded-full border px-1.5 py-1"
          >
            <Select
              value={f.field}
              onValueChange={(value) => {
                if (!value) return;
                const t = typeOf(value);
                updateFilter(f.id, {
                  field: value,
                  op: OPERATORS[t][0].value,
                  value: defaultValue(t),
                });
              }}
            >
              <SelectTrigger variant="ghost" className="text-xs">
                <SelectValue>
                  {(v: string) => fields.find((o) => o.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {fields.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={f.op}
              onValueChange={(value) =>
                value && updateFilter(f.id, { op: value })
              }
            >
              <SelectTrigger variant="ghost" className="text-xs">
                <SelectValue>
                  {(v: string) =>
                    OPERATORS[type].find((o) => o.value === v)?.label ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {OPERATORS[type].map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {type === "CHECKBOX" ? (
              <Select
                value={f.value}
                onValueChange={(value) =>
                  value != null && updateFilter(f.id, { value })
                }
              >
                <SelectTrigger variant="ghost" className="text-xs">
                  <SelectValue>
                    {(v: string) => (v === "true" ? "Marcado" : "Sin marcar")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Marcado</SelectItem>
                  <SelectItem value="false">Sin marcar</SelectItem>
                </SelectContent>
              </Select>
            ) : type === "SELECT" ? (
              <Select
                value={f.value}
                onValueChange={(value) =>
                  value != null && updateFilter(f.id, { value })
                }
              >
                <SelectTrigger variant="ghost" className="text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <input
                className={inputCls}
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
              className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-5 place-items-center rounded-full"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}

      <button
        onClick={addFilter}
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-1 rounded-full px-2.5 py-1"
      >
        <Plus className="size-3.5" />
        Filtro
      </button>
    </div>
  );
}
