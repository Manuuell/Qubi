"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Database, FileText, RotateCcw, Trash2 } from "lucide-react";
import {
  deletePageForeverAction,
  emptyTrashAction,
  restorePageAction,
} from "@/server/actions/page";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ReadonlyBlockEditor = dynamic(
  () => import("@/features/editor/components/readonly-block-editor"),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground text-sm">Cargando…</p>,
  },
);

type Item = {
  id: string;
  title: string;
  icon: string | null;
  type: "PAGE" | "DATABASE";
  archivedAt: string;
  updatedAt: string;
};

const fmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function TrashList({
  workspaceId,
  items,
}: {
  workspaceId: string;
  items: Item[];
}) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [previewing, setPreviewing] = useState<Item | null>(null);

  return (
    <>
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={() => setEmptying(true)}
          disabled={pending || items.length === 0}
          className="text-destructive hover:bg-destructive/10 transition-ios flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          <Trash2 className="size-4" />
          Vaciar papelera
        </button>
      </div>

      {items.length === 0 ? (
        <Card variant="glass" className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            La papelera está vacía.
          </p>
        </Card>
      ) : (
        <Card variant="glass" className="divide-border/60 gap-0 divide-y p-0">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-2 px-4 py-2.5"
            >
              <button
                onClick={() => setPreviewing(it)}
                className="hover:text-primary transition-ios flex min-w-0 flex-1 items-center gap-2 truncate text-left text-sm"
              >
                {it.type === "DATABASE" ? (
                  <Database className="text-muted-foreground size-4 shrink-0" />
                ) : (
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                )}
                <span className="truncate">
                  {it.icon ? `${it.icon} ` : ""}
                  {it.title || "Sin título"}
                </span>
              </button>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() =>
                    startTransition(() =>
                      restorePageAction({ pageId: it.id, workspaceId }),
                    )
                  }
                  disabled={pending}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-1 rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" />
                  Restaurar
                </button>
                <button
                  onClick={() => setDeleting(it)}
                  disabled={pending}
                  className="text-destructive hover:bg-destructive/10 transition-ios flex items-center gap-1 rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`¿Eliminar "${deleting?.title || "Sin título"}" para siempre?`}
        description="Esta acción no se podrá deshacer."
        confirmLabel="Eliminar"
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(() =>
            deletePageForeverAction({ pageId: deleting.id, workspaceId }),
          );
          setDeleting(null);
        }}
      />

      <ConfirmDialog
        open={emptying}
        onOpenChange={setEmptying}
        title="¿Vaciar la papelera?"
        description={`Se eliminarán para siempre las ${items.length} páginas archivadas. Esta acción no se podrá deshacer.`}
        confirmLabel="Vaciar papelera"
        pending={pending}
        onConfirm={() => {
          startTransition(() => emptyTrashAction({ workspaceId }));
          setEmptying(false);
        }}
      />

      <Dialog
        open={previewing !== null}
        onOpenChange={(o) => !o && setPreviewing(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {previewing?.icon ? `${previewing.icon} ` : ""}
              {previewing?.title || "Sin título"}
            </DialogTitle>
            <DialogDescription>
              {previewing?.type === "DATABASE" ? "Base de datos" : "Página"} ·
              Archivada el{" "}
              {previewing && fmt.format(new Date(previewing.archivedAt))} ·
              Última edición{" "}
              {previewing && fmt.format(new Date(previewing.updatedAt))}
            </DialogDescription>
          </DialogHeader>
          {previewing && (
            <div className="bg-background/40 max-h-[50vh] overflow-y-auto rounded-2xl border p-3">
              <ReadonlyBlockEditor pageId={previewing.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
