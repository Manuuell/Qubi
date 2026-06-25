"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createWorkspaceAction,
  renameWorkspaceAction,
  deleteWorkspaceAction,
} from "@/server/actions/workspace";

type Ws = { id: string; name: string; icon: string | null; isOwner: boolean };

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

  function renameWorkspace(w: Ws) {
    setOpen(false);
    setTimeout(() => {
      const name = window.prompt("Nuevo nombre del espacio:", w.name);
      if (name?.trim() && name.trim() !== w.name) {
        startTransition(() =>
          renameWorkspaceAction({ workspaceId: w.id, name: name.trim() }),
        );
      }
    }, 0);
  }

  function deleteWorkspace(w: Ws) {
    setOpen(false);
    setTimeout(() => {
      const ok = window.confirm(
        `¿Eliminar el espacio "${w.name}"?\n\nSe borrarán también sus proyectos, tareas, horas y páginas. Esta acción no se puede deshacer.`,
      );
      if (ok) {
        startTransition(() => deleteWorkspaceAction({ workspaceId: w.id }));
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
              <div
                key={w.id}
                className="group hover:bg-accent flex items-center gap-1 rounded pr-1"
              >
                <Link
                  href={`/w/${w.id}`}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <span className="bg-primary/10 grid size-5 shrink-0 place-items-center rounded text-[10px]">
                    {w.icon ?? "Q"}
                  </span>
                  <span className="min-w-0 truncate">{w.name}</span>
                  {w.id === current.id && (
                    <Check className="text-primary ml-auto size-4 shrink-0" />
                  )}
                </Link>
                {w.isOwner && (
                  <>
                    <button
                      onClick={() => renameWorkspace(w)}
                      disabled={pending}
                      aria-label={`Renombrar ${w.name}`}
                      className="text-muted-foreground hover:bg-accent-foreground/10 hover:text-foreground grid size-6 shrink-0 place-items-center rounded opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => deleteWorkspace(w)}
                      disabled={pending}
                      aria-label={`Eliminar ${w.name}`}
                      className="text-muted-foreground hover:bg-accent-foreground/10 hover:text-destructive grid size-6 shrink-0 place-items-center rounded opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
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
