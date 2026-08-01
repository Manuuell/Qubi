"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCardAction, moveCardAction } from "@/server/actions/database";
import type { Property, Row } from "./database-table";

const NONE = "__none__";

export function KanbanBoard({
  databaseId,
  workspaceId,
  properties,
  rows,
}: {
  databaseId: string;
  workspaceId: string;
  properties: Property[];
  rows: Row[];
}) {
  const groupProp = properties.find((p) => p.type === "SELECT");
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rows.length]);

  function scrollBy(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  if (!groupProp) {
    return (
      <p className="text-muted-foreground mt-6 text-sm">
        Añade una columna de tipo «Selección» para usar el tablero.
      </p>
    );
  }

  const options =
    (groupProp.config as { options?: string[] } | null)?.options ?? [];
  const columns = [...options, NONE];

  const columnOf = (row: Row) => {
    const v = row.values[groupProp.id];
    return typeof v === "string" && v ? v : NONE;
  };

  function handleDrop(col: string) {
    return (e: DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const pageId = e.dataTransfer.getData("text/plain");
      if (!pageId) return;
      startTransition(() =>
        moveCardAction({
          pageId,
          propertyId: groupProp!.id,
          value: col === NONE ? "" : col,
          databaseId,
          workspaceId,
        }),
      );
    };
  }

  return (
    <div className="relative mt-6">
      {canScrollLeft && (
        <>
          <div className="from-card pointer-events-none absolute top-0 bottom-4 left-0 z-10 w-10 bg-gradient-to-r to-transparent" />
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Desplazar a la izquierda"
            className="glass hover:bg-accent transition-ios absolute top-1/2 left-1 z-20 grid size-8 -translate-y-1/2 place-items-center rounded-full shadow-sm"
          >
            <ChevronLeft className="size-4" />
          </button>
        </>
      )}
      {canScrollRight && (
        <>
          <div className="from-card pointer-events-none absolute top-0 right-0 bottom-4 z-10 w-10 bg-gradient-to-l to-transparent" />
          <button
            onClick={() => scrollBy(1)}
            aria-label="Desplazar a la derecha"
            className="glass hover:bg-accent transition-ios absolute top-1/2 right-1 z-20 grid size-8 -translate-y-1/2 place-items-center rounded-full shadow-sm"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      )}
      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        className="thin-scrollbar flex gap-3 overflow-x-auto pb-4"
      >
        {columns.map((col) => {
          const colRows = rows.filter((r) => columnOf(r) === col);
          const label = col === NONE ? "Sin estado" : col;
          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={handleDrop(col)}
              className={cn(
                "glass transition-ios w-64 shrink-0 rounded-3xl p-2.5",
                dragOver === col && "ring-primary ring-2",
              )}
            >
              <div className="text-muted-foreground mb-2 px-2 py-1 text-xs font-medium">
                {label} · {colRows.length}
              </div>
              <div className="space-y-2">
                {colRows.map((r) => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", r.id)
                    }
                    className="bg-card transition-ios cursor-grab rounded-2xl px-3 py-2 text-sm shadow-sm active:scale-[0.98] active:cursor-grabbing"
                  >
                    {r.title || "Sin título"}
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  startTransition(() =>
                    addCardAction({
                      databaseId,
                      workspaceId,
                      propertyId: groupProp.id,
                      value: col === NONE ? "" : col,
                    }),
                  )
                }
                className="bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-ios mt-2 flex w-full items-center justify-center gap-1 rounded-2xl px-2.5 py-2 text-xs font-medium active:scale-[0.98]"
              >
                <Plus className="size-3.5" />
                Añadir tarjeta
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
