"use client";

import { useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  File as FileIcon,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS: Record<PropType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  SELECT: "Selección",
  DATE: "Fecha",
  CHECKBOX: "Casilla",
  FILE: "Archivo",
};

type PropType = "TEXT" | "NUMBER" | "SELECT" | "DATE" | "CHECKBOX" | "FILE";
type FileValue = { url: string; name: string };
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
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
    <div className="no-scrollbar mt-6 overflow-x-auto">
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
            <tr
              key={row.id}
              className="group hover:bg-muted/20 animate-in fade-in-0 border-b duration-200"
            >
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
                  className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-6 place-items-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-50"
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
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios mt-2 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm disabled:opacity-50"
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
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-6 place-items-center rounded-full"
      >
        <Plus className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
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
        </DropdownMenuGroup>
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
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-6 shrink-0 place-items-center rounded-full"
          >
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {TYPE_LABELS[property.type]}
              </DropdownMenuLabel>
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
            </DropdownMenuGroup>
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
    case "FILE":
      return (
        <FileCell
          pageId={pageId}
          propertyId={property.id}
          initial={
            value && typeof value === "object" && "url" in value
              ? (value as FileValue)
              : null
          }
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
    <DatePicker
      value={value}
      className="border-none bg-transparent px-2 py-1"
      onChange={(next) => {
        setValue(next);
        startTransition(() =>
          setCellAction({ pageId, propertyId, value: next }),
        );
      }}
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
    <Select
      value={value}
      onValueChange={(v) => {
        const next = v ?? "";
        setValue(next);
        startTransition(() =>
          setCellAction({ pageId, propertyId, value: next }),
        );
      }}
    >
      <SelectTrigger variant="ghost" className="w-full text-sm">
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
  );
}

function FileCell({
  pageId,
  propertyId,
  initial,
}: {
  pageId: string;
  propertyId: string;
  initial: FileValue | null;
}) {
  const [value, setValue] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) return;
      const data = (await res.json()) as { url: string };
      const next: FileValue = { url: data.url, name: file.name };
      setValue(next);
      startTransition(() => setCellAction({ pageId, propertyId, value: next }));
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    setValue(null);
    startTransition(() => setCellAction({ pageId, propertyId, value: null }));
  }

  if (!value) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-1.5 rounded-full px-2 py-1 text-xs disabled:opacity-50"
        >
          <Paperclip className="size-3.5" />
          {uploading ? "Subiendo…" : "Subir"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </>
    );
  }

  const isImage = IMAGE_EXT.test(value.url);

  return (
    <div className="group/file flex items-center gap-1 px-1">
      <a
        href={value.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:bg-accent transition-ios flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-1.5 py-1"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.url}
            alt=""
            className="size-5 shrink-0 rounded object-cover"
          />
        ) : (
          <FileIcon className="text-muted-foreground size-4 shrink-0" />
        )}
        <span className="truncate text-xs">{value.name}</span>
      </a>
      <button
        type="button"
        onClick={remove}
        aria-label="Quitar archivo"
        className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity group-hover/file:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
