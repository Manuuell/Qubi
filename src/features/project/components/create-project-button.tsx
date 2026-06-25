"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FolderPlus } from "lucide-react";
import { createProjectAction } from "@/server/actions/project";

// Botón que se expande a un campo de texto para nombrar el proyecto.
export function CreateProjectButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(() => createProjectAction({ workspaceId, name }));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
      >
        <FolderPlus className="size-4" />
        Nuevo proyecto
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="px-2 py-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (!name.trim()) setOpen(false);
        }}
        placeholder="Nombre del proyecto…"
        disabled={pending}
        className="border-input bg-background focus:ring-ring w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-1"
      />
    </form>
  );
}
