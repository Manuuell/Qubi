"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { startDirectConversationAction } from "@/server/actions/chat";
import { cn } from "@/lib/utils";

export function StartChatButton({
  workspaceId,
  otherUserId,
  className,
  children,
}: {
  workspaceId: string;
  otherUserId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(() =>
          startDirectConversationAction({ workspaceId, otherUserId }),
        )
      }
      disabled={pending}
      className={cn(
        "text-primary hover:underline disabled:opacity-50",
        className,
      )}
    >
      {children ?? (
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="size-3.5" />
          Enviar mensaje
        </span>
      )}
    </button>
  );
}
