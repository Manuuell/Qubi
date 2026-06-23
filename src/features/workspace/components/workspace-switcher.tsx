"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { createWorkspaceAction } from "@/server/actions/workspace";

type Ws = { id: string; name: string; icon: string | null };

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: Ws;
  workspaces: Ws[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function createWorkspace() {
    setOpen(false);
    setTimeout(() => {
      const name = window.prompt("Nombre del nuevo espacio:");
      if (name?.trim()) {
        startTransition(() => createWorkspaceAction({ name: name.trim() }));
      }
    }, 0);
  }

  return (
    <div className="relative px-2 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold"
      >
        <span className="bg-primary/10 grid size-6 shrink-0 place-items-center rounded text-xs">
          {current.icon ?? "Q"}
        </span>
        <span className="min-w-0 truncate">{current.name}</span>
        <ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="bg-popover absolute inset-x-2 z-20 mt-1 rounded-lg border p-1 shadow-lg">
            <p className="text-muted-foreground px-2 py-1 text-xs">
              Tus espacios
            </p>
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/w/${w.id}`}
                onClick={() => setOpen(false)}
                className="hover:bg-accent flex items-center gap-2 rounded px-2 py-1.5 text-sm"
              >
                <span className="bg-primary/10 grid size-5 shrink-0 place-items-center rounded text-[10px]">
                  {w.icon ?? "Q"}
                </span>
                <span className="min-w-0 truncate">{w.name}</span>
                {w.id === current.id && (
                  <Check className="text-primary ml-auto size-4 shrink-0" />
                )}
              </Link>
            ))}
            <button
              onClick={createWorkspace}
              disabled={pending}
              className="text-muted-foreground hover:bg-accent hover:text-foreground mt-1 flex w-full items-center gap-2 border-t px-2 py-1.5 text-sm disabled:opacity-50"
            >
              <Plus className="size-4" />
              Crear espacio
            </button>
          </div>
        </>
      )}
    </div>
  );
}
