"use client";

import { useState, useTransition } from "react";
import { setTaskTitleAction } from "@/server/actions/task";

export function TaskTitle({
  taskId,
  workspaceId,
  projectId,
  initialTitle,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [, startTransition] = useTransition();

  function save() {
    if (title === initialTitle) return;
    startTransition(() =>
      setTaskTitleAction({ taskId, workspaceId, projectId, title }),
    );
  }

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      placeholder="Sin título"
      className="placeholder:text-muted-foreground/40 font-display w-full bg-transparent text-3xl font-bold tracking-tight outline-none"
    />
  );
}
