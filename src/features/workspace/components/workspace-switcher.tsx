"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createWorkspaceAction,
  renameWorkspaceAction,
  deleteWorkspaceAction,
} from "@/server/actions/workspace";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Ws | null>(null);
  const [deleting, setDeleting] = useState<Ws | null>(null);

  function createWorkspace(name: string) {
    startTransition(() => createWorkspaceAction({ name }));
    setCreating(false);
  }

  function renameWorkspace(w: Ws, name: string) {
    if (name !== w.name) {
      startTransition(() => renameWorkspaceAction({ workspaceId: w.id, name }));
    }
    setRenaming(null);
  }

  function deleteWorkspace(w: Ws) {
    startTransition(() => deleteWorkspaceAction({ workspaceId: w.id }));
    setDeleting(null);
  }

  return (
    <div className="relative px-2 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-semibold"
      >
        <span className="bg-primary/10 text-primary grid size-6 shrink-0 place-items-center rounded-full text-xs">
          {current.icon ?? "Q"}
        </span>
        <span className="min-w-0 truncate">{current.name}</span>
        <ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute inset-x-2 z-20 mt-1 rounded-2xl p-1.5 duration-150">
            <p className="text-muted-foreground px-2.5 py-1 text-xs">
              Tus espacios
            </p>
            {workspaces.map((w) => (
              <div
                key={w.id}
                className="group hover:bg-accent transition-ios flex items-center gap-1 rounded-xl pr-1"
              >
                <Link
                  href={`/w/${w.id}`}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-sm"
                >
                  <span className="bg-primary/10 text-primary grid size-5 shrink-0 place-items-center rounded-full text-[10px]">
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
                      onClick={() => {
                        setOpen(false);
                        setRenaming(w);
                      }}
                      disabled={pending}
                      aria-label={`Renombrar ${w.name}`}
                      className="text-muted-foreground hover:bg-accent-foreground/10 hover:text-foreground transition-ios grid size-6 shrink-0 place-items-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        setDeleting(w);
                      }}
                      disabled={pending}
                      aria-label={`Eliminar ${w.name}`}
                      className="text-muted-foreground hover:bg-accent-foreground/10 hover:text-destructive transition-ios grid size-6 shrink-0 place-items-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              disabled={pending}
              className="text-muted-foreground hover:bg-accent hover:text-foreground border-border/60 transition-ios mt-1 flex w-full items-center gap-2 rounded-xl border-t px-2.5 py-1.5 text-sm disabled:opacity-50"
            >
              <Plus className="size-4" />
              Crear espacio
            </button>
          </div>
        </>
      )}

      <PromptDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo espacio"
        placeholder="Nombre del espacio"
        confirmLabel="Crear"
        pending={pending}
        onConfirm={createWorkspace}
      />
      <PromptDialog
        open={renaming !== null}
        onOpenChange={(o) => !o && setRenaming(null)}
        title="Renombrar espacio"
        initialValue={renaming?.name ?? ""}
        confirmLabel="Guardar"
        pending={pending}
        onConfirm={(name) => renaming && renameWorkspace(renaming, name)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`¿Eliminar el espacio "${deleting?.name}"?`}
        description="Se borrarán también sus proyectos, tareas y horas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        pending={pending}
        onConfirm={() => deleting && deleteWorkspace(deleting)}
      />
    </div>
  );
}
