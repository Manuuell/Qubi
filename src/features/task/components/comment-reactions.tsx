"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmilePlus } from "lucide-react";
import { toggleCommentReactionAction } from "@/server/actions/task";
import { QUICK_REACTIONS } from "@/features/task/labels";
import { cn } from "@/lib/utils";

type Reaction = {
  emoji: string;
  user: { id: string; name: string | null; email: string };
};

// Agrupa reacciones sueltas por emoji para pintar "👍 3" en vez de 3 chips.
function groupByEmoji(reactions: Reaction[]) {
  const groups = new Map<string, Reaction[]>();
  for (const r of reactions) {
    const list = groups.get(r.emoji) ?? [];
    list.push(r);
    groups.set(r.emoji, list);
  }
  return groups;
}

export function CommentReactions({
  commentId,
  reactions,
  currentUserId,
}: {
  commentId: string;
  reactions: Reaction[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const router = useRouter();

  function toggle(emoji: string) {
    setPickerOpen(false);
    startTransition(async () => {
      await toggleCommentReactionAction({ commentId, emoji });
      router.refresh();
    });
  }

  const groups = groupByEmoji(reactions);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {[...groups.entries()].map(([emoji, list]) => {
        const mine = list.some((r) => r.user.id === currentUserId);
        const names = list
          .map((r) => r.user.name?.trim() || r.user.email)
          .join(", ");
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            disabled={pending}
            title={names}
            className={cn(
              "transition-ios flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs disabled:opacity-50",
              mine
                ? "border-primary/40 bg-primary/10 text-primary"
                : "hover:bg-accent",
            )}
          >
            <span>{emoji}</span>
            <span>{list.length}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Agregar reacción"
          className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-6 place-items-center rounded-full"
        >
          <SmilePlus className="size-3.5" />
        </button>
        {pickerOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setPickerOpen(false)}
            />
            <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-full p-1 duration-100">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggle(emoji)}
                  className="hover:bg-accent transition-ios grid size-7 place-items-center rounded-full text-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
