"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Widget de confirmación propio (reemplaza window.confirm nativo del navegador
// por algo consistente con el resto del sistema, estilo glass).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  pendingLabel = "Eliminando…",
  destructive = true,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
                : "bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
            }
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
