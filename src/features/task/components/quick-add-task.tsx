"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createTaskAction } from "@/server/actions/task";

export function QuickAddTask({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTitle("");
    startTransition(() =>
      createTaskAction({ workspaceId, projectId, title: value }),
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="glass focus-within:ring-ring transition-ios flex flex-1 items-center gap-2 rounded-full px-4 py-2 focus-within:ring-2">
        <Plus className="text-muted-foreground size-4 shrink-0" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Añadir tarea y pulsar Enter…"
          disabled={pending}
          className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
        />
      </div>
    </form>
  );
}
