"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  deletePageForeverAction,
  restorePageAction,
} from "@/server/actions/page";

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
      <p className="text-muted-foreground text-sm">La papelera está vacía.</p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center justify-between gap-2 px-3 py-2"
        >
          <span className="truncate text-sm">{it.title || "Sin título"}</span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() =>
                startTransition(() =>
                  restorePageAction({ pageId: it.id, workspaceId }),
                )
              }
              disabled={pending}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-50"
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
              className="text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
