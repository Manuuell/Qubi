"use client";

import { useState, useTransition } from "react";
import { Tag } from "lucide-react";
import { setTaskLabelsAction } from "@/server/actions/task";
import { createLabelAction } from "@/server/actions/label";
import type { LabelOption } from "./new-task-dialog";

export function TaskLabelsEditor({
  taskId,
  workspaceId,
  projectId,
  taskLabelIds,
  workspaceLabels,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  taskLabelIds: string[];
  workspaceLabels: LabelOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [labels, setLabels] = useState(workspaceLabels);
  const [selected, setSelected] = useState(taskLabelIds);
  const [newLabelName, setNewLabelName] = useState("");

  function apply(next: string[]) {
    setSelected(next);
    startTransition(() =>
      setTaskLabelsAction({ taskId, workspaceId, projectId, labelIds: next }),
    );
  }

  function toggle(id: string) {
    apply(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  async function createNewLabel() {
    const name = newLabelName.trim();
    if (!name) return;
    setNewLabelName("");
    const label = await createLabelAction({ workspaceId, name });
    setLabels((cur) =>
      [...cur, label].sort((a, b) => a.name.localeCompare(b.name)),
    );
    apply([...selected, label.id]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((l) => {
        const active = selected.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(l.id)}
            className="transition-ios rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-60"
            style={{
              background: active ? l.color : `${l.color}20`,
              color: active ? "#fff" : l.color,
            }}
          >
            {l.name}
          </button>
        );
      })}
      <span className="flex items-center gap-1">
        <Tag className="text-muted-foreground size-3" />
        <input
          value={newLabelName}
          onChange={(e) => setNewLabelName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createNewLabel();
            }
          }}
          placeholder="Nueva etiqueta…"
          className="placeholder:text-muted-foreground w-24 bg-transparent text-xs outline-none"
        />
      </span>
    </div>
  );
}
