"use client";

import { useState, useTransition } from "react";
import { setTaskBodyAction } from "@/server/actions/task";

export function TaskDescription({
  taskId,
  workspaceId,
  projectId,
  initialBody,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [, startTransition] = useTransition();

  function save() {
    if (body === initialBody) return;
    startTransition(() =>
      setTaskBodyAction({ taskId, workspaceId, projectId, body }),
    );
  }

  return (
    <textarea
      value={body}
      onChange={(e) => setBody(e.target.value)}
      onBlur={save}
      rows={4}
      placeholder="Añade una descripción…"
      className="bg-background focus:ring-ring placeholder:text-muted-foreground w-full rounded-md border p-3 text-sm outline-none focus:ring-1"
    />
  );
}
