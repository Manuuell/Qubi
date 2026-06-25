"use client";

import { useState, useTransition } from "react";
import { renameProjectAction } from "@/server/actions/project";

export function ProjectTitle({
  projectId,
  workspaceId,
  initialName,
}: {
  projectId: string;
  workspaceId: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [, startTransition] = useTransition();

  function save() {
    if (name === initialName) return;
    startTransition(() =>
      renameProjectAction({ projectId, workspaceId, name }),
    );
  }

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      placeholder="Sin nombre"
      className="placeholder:text-muted-foreground/40 font-display w-full bg-transparent text-3xl font-bold tracking-tight outline-none"
    />
  );
}
