"use client";

import { useTransition } from "react";
import { linkTaskPageAction } from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

export function TaskLinkedPageSelect({
  taskId,
  workspaceId,
  projectId,
  linkedPageId,
  options,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  linkedPageId: string | null;
  options: { id: string; title: string; icon: string | null }[];
}) {
  const [pending, startTransition] = useTransition();
  if (options.length === 0) return null;

  const labelOf = (id: string) => {
    if (id === NONE) return "Sin vincular";
    const opt = options.find((o) => o.id === id);
    return opt
      ? `${opt.icon ? `${opt.icon} ` : ""}${opt.title || "Base de datos"}`
      : "Sin vincular";
  };

  return (
    <Select
      value={linkedPageId ?? NONE}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(() =>
          linkTaskPageAction({
            taskId,
            workspaceId,
            projectId,
            linkedPageId: value === NONE ? null : value,
          }),
        )
      }
    >
      <SelectTrigger
        aria-label="Vincular a base de datos del proyecto"
        className="text-xs"
      >
        <SelectValue>{(v: string) => labelOf(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sin vincular</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.icon ? `${o.icon} ` : ""}
            {o.title || "Base de datos"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
