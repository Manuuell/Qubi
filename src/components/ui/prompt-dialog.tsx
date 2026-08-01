"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Widget de entrada de texto propio (reemplaza window.prompt nativo).
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue = "",
  placeholder,
  confirmLabel = "Guardar",
  pendingLabel = "Guardando…",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: (value: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* key remonta el formulario cada vez que se abre, para partir del
            initialValue actual sin sincronizar estado en un efecto. */}
        {open && (
          <PromptForm
            key={initialValue}
            initialValue={initialValue}
            placeholder={placeholder}
            confirmLabel={confirmLabel}
            pendingLabel={pendingLabel}
            pending={pending}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PromptForm({
  initialValue,
  placeholder,
  confirmLabel,
  pendingLabel,
  pending,
  onConfirm,
}: {
  initialValue: string;
  placeholder?: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();

  return (
    <>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && trimmed && !pending) onConfirm(trimmed);
        }}
        placeholder={placeholder}
        className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
      />
      <button
        onClick={() => onConfirm(trimmed)}
        disabled={pending || !trimmed}
        className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios self-end rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
      >
        {pending ? pendingLabel : confirmLabel}
      </button>
    </>
  );
}
