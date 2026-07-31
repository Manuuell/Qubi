"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTaskAction } from "@/server/actions/task";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Borrar la tarea (incluso ya finalizada) es una decisión explícita aparte;
// nunca ocurre automáticamente. Solo la ven los managers.
export function DeleteTaskButton({
  taskId,
  workspaceId,
  projectId,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-destructive hover:bg-destructive/10 transition-ios flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
        <Trash2 className="size-3.5" />
        Eliminar tarea
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar esta tarea?</DialogTitle>
          <DialogDescription>
            Se borrará junto con todo su historial, comentarios y archivos. Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            disabled={pending}
            className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              startTransition(async () => {
                await deleteTaskAction({ taskId, workspaceId, projectId });
                router.push(`/w/${workspaceId}/projects/${projectId}`);
              })
            }
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
          >
            {pending ? "Eliminando…" : "Eliminar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
