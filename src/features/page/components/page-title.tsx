"use client";

import { useState, useTransition } from "react";
import { renamePageAction } from "@/server/actions/page";

export function PageTitle({
  pageId,
  workspaceId,
  initialTitle,
}: {
  pageId: string;
  workspaceId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [, startTransition] = useTransition();

  function save() {
    if (title === initialTitle) return;
    startTransition(() => renamePageAction({ pageId, workspaceId, title }));
  }

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      placeholder="Sin título"
      className="placeholder:text-muted-foreground/40 w-full bg-transparent text-4xl font-bold tracking-tight outline-none"
    />
  );
}
