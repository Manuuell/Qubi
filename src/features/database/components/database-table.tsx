"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  addPropertyAction,
  addRowAction,
  addSelectOptionAction,
  deletePropertyAction,
  deleteRowAction,
  renamePropertyAction,
  setCellAction,
  setRowTitleAction,
} from "@/server/actions/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_LABELS: Record<PropType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  SELECT: "Selección",
  DATE: "Fecha",
  CHECKBOX: "Casilla",
};

type PropType = "TEXT" | "NUMBER" | "SELECT" | "DATE" | "CHECKBOX";
export type Property = {
  id: string;
  name: string;
  type: PropType;
  config: unknown;
};
export type Row = {
  id: string;
  title: string;
  values: Record<string, unknown>;
};

const inputCls = "w-full bg-transparent px-2 py-1 outline-none";

export function DatabaseTable({
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
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-muted-foreground w-64 px-3 py-2 text-left font-medium">
              Nombre
            </th>
            {properties.map((p) => (
              <PropertyHeader
                key={p.id}
                property={p}
                databaseId={databaseId}
                workspaceId={workspaceId}
              />
            ))}
            <th className="w-10 px-2 py-2">
              <AddColumnMenu
                databaseId={databaseId}
                workspaceId={workspaceId}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group hover:bg-muted/20 border-b">
              <td className="px-1">
                <RowTitle pageId={row.id} title={row.title} />
              </td>
              {properties.map((p) => (
                <td key={p.id} className="border-l px-1">
                  <Cell pageId={row.id} property={p} value={row.values[p.id]} />
                </td>
              ))}
              <td className="px-2 text-right">
                <button
                  onClick={() =>
                    startTransition(() =>
                      deleteRowAction({
                        pageId: row.id,
                        databaseId,
                        workspaceId,
                      }),
                    )
                  }
                  disabled={pending}
                  aria-label="Eliminar fila"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-6 place-items-center rounded opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() =>
          startTransition(() => addRowAction({ databaseId, workspaceId }))
        }
        disabled={pending}
        className="text-muted-foreground hover:bg-accent hover:text-foreground mt-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
      >
        <Plus className="size-4" />
        Nueva fila
      </button>
    </div>
  );
}

function AddColumnMenu({
  databaseId,
  workspaceId,
}: {
  databaseId: string;
  workspaceId: string;
}) {
  const [, startTransition] = useTransition();
  const types = Object.keys(TYPE_LABELS) as PropType[];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Añadir columna"
        className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-6 place-items-center rounded"
      >
        <Plus className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Nueva columna</DropdownMenuLabel>
        {types.map((t) => (
          <DropdownMenuItem
            key={t}
            onClick={() =>
              startTransition(() =>
                addPropertyAction({
                  databaseId,
                  workspaceId,
                  type: t,
                  name: TYPE_LABELS[t],
                }),
              )
            }
          >
            {TYPE_LABELS[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PropertyHeader({
  property,
  databaseId,
  workspaceId,
}: {
  property: Property;
  databaseId: string;
  workspaceId: string;
}) {
  const [name, setName] = useState(property.name);
  const [, startTransition] = useTransition();
  return (
    <th className="px-1 py-1 text-left">
      <div className="flex items-center gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== property.name) {
              startTransition(() =>
                renamePropertyAction({ propertyId: property.id, name }),
              );
            }
          }}
          className={`${inputCls} font-medium`}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Opciones de columna"
            className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-6 shrink-0 place-items-center rounded"
          >
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{TYPE_LABELS[property.type]}</DropdownMenuLabel>
            {property.type === "SELECT" && (
              <DropdownMenuItem
                onClick={() =>
                  setTimeout(() => {
                    const opt = window.prompt("Nueva opción:");
                    if (opt) {
                      startTransition(() =>
                        addSelectOptionAction({
                          propertyId: property.id,
                          databaseId,
                          workspaceId,
                          option: opt,
                        }),
                      );
                    }
                  }, 0)
                }
              >
                Añadir opción…
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                startTransition(() =>
                  deletePropertyAction({
                    propertyId: property.id,
                    databaseId,
                    workspaceId,
                  }),
                )
              }
            >
              Eliminar columna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </th>
  );
}

function RowTitle({ pageId, title }: { pageId: string; title: string }) {
  const [value, setValue] = useState(title);
  const [, startTransition] = useTransition();
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== title) {
          startTransition(() => setRowTitleAction({ pageId, title: value }));
        }
      }}
      placeholder="Sin título"
      className={`${inputCls} font-medium`}
    />
  );
}

// Despacha al editor de celda según el tipo (sin hooks aquí).
function Cell({
  pageId,
  property,
  value,
}: {
  pageId: string;
  property: Property;
  value: unknown;
}) {
  switch (property.type) {
    case "CHECKBOX":
      return (
        <CheckboxCell
          pageId={pageId}
          propertyId={property.id}
          initial={Boolean(value)}
        />
      );
    case "SELECT":
      return (
        <SelectCell
          pageId={pageId}
          propertyId={property.id}
          initial={typeof value === "string" ? value : ""}
          options={
            (property.config as { options?: string[] } | null)?.options ?? []
          }
        />
      );
    case "DATE":
      return (
        <DateCell
          pageId={pageId}
          propertyId={property.id}
          initial={typeof value === "string" ? value : ""}
        />
      );
    case "NUMBER":
      return (
        <NumberCell
          pageId={pageId}
          propertyId={property.id}
          initial={value == null ? "" : String(value)}
        />
      );
    default:
      return (
        <TextCell
          pageId={pageId}
          propertyId={property.id}
          initial={typeof value === "string" ? value : ""}
        />
      );
  }
}

function TextCell({
  pageId,
  propertyId,
  initial,
}: {
  pageId: string;
  propertyId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) {
          startTransition(() => setCellAction({ pageId, propertyId, value }));
        }
      }}
      className={inputCls}
    />
  );
}

function NumberCell({
  pageId,
  propertyId,
  initial,
}: {
  pageId: string;
  propertyId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) {
          startTransition(() =>
            setCellAction({
              pageId,
              propertyId,
              value: value === "" ? null : Number(value),
            }),
          );
        }
      }}
      className={inputCls}
    />
  );
}

function DateCell({
  pageId,
  propertyId,
  initial,
}: {
  pageId: string;
  propertyId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        startTransition(() =>
          setCellAction({ pageId, propertyId, value: e.target.value }),
        );
      }}
      className={inputCls}
    />
  );
}

function CheckboxCell({
  pageId,
  propertyId,
  initial,
}: {
  pageId: string;
  propertyId: string;
  initial: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        setChecked(e.target.checked);
        startTransition(() =>
          setCellAction({ pageId, propertyId, value: e.target.checked }),
        );
      }}
      className="mx-2 size-4 align-middle"
    />
  );
}

function SelectCell({
  pageId,
  propertyId,
  initial,
  options,
}: {
  pageId: string;
  propertyId: string;
  initial: string;
  options: string[];
}) {
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <select
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        startTransition(() =>
          setCellAction({ pageId, propertyId, value: e.target.value }),
        );
      }}
      className={inputCls}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
