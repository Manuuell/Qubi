"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  deletePageForeverAction,
  restorePageAction,
} from "@/server/actions/page";
import { Card } from "@/components/ui/card";

type Item = { id: string; title: string };

export function TrashList({
  workspaceId,
  items,
}: {
  workspaceId: string;
  items: Item[];
}) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <Card variant="glass" className="py-10 text-center">
        <p className="text-muted-foreground text-sm">La papelera está vacía.</p>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="divide-border/60 gap-0 divide-y p-0">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between gap-2 px-4 py-2.5"
        >
          <span className="truncate text-sm">{it.title || "Sin título"}</span>
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
              onClick={() =>
                startTransition(() =>
                  deletePageForeverAction({ pageId: it.id, workspaceId }),
                )
              }
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
  );
}
