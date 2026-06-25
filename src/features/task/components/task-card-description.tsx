"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { linkify } from "@/lib/linkify";

// Muestra la descripción de la tarea en la tarjeta del tablero, recortada a unas
// pocas líneas. Si el texto no cabe, ofrece "Ver más…" para desplegarlo.
// Detecta URLs y las vuelve enlaces clicables.
export function TaskCardDescription({ body }: { body: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    if (expanded) return; // al desplegar conservamos el estado para el toggle
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [body, expanded]);

  return (
    <div className="mt-1.5">
      <p
        ref={ref}
        className={cn(
          "text-muted-foreground text-xs break-words whitespace-pre-wrap",
          !expanded && "line-clamp-2",
        )}
      >
        {linkify(body)}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground/80 hover:text-foreground mt-0.5 text-[11px] font-medium"
        >
          {expanded ? "Ver menos" : "Ver más…"}
        </button>
      )}
    </div>
  );
}
