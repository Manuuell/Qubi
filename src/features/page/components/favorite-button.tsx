"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/server/actions/page";

export function FavoriteButton({
  pageId,
  workspaceId,
  initial,
}: {
  pageId: string;
  workspaceId: string;
  initial: boolean;
}) {
  const [fav, setFav] = useState(initial);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-pressed={fav}
      onClick={() => {
        setFav((v) => !v);
        startTransition(() => toggleFavoriteAction({ pageId, workspaceId }));
      }}
      className={cn(
        "glass hover:bg-accent/40 transition-ios grid size-9 place-items-center rounded-full",
        fav && "text-gold",
      )}
    >
      <Star className={cn("size-4", fav && "fill-current")} />
    </button>
  );
}
