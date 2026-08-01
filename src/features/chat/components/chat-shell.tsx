"use client";

import { useRef, useState, type TouchEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Check, Hash, MessageCircle, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/features/task/labels";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/server/services/chat";
import { stripMentionMarkup } from "@/features/mentions/mentions";
import { NewChatDialog } from "@/features/chat/components/new-chat-dialog";
import {
  leaveConversationAction,
  markConversationReadAction,
} from "@/server/actions/chat";

// "hace 5 min" corto, reutilizado del patrón de notificaciones.
function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

type Member = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function ChatShell({
  workspaceId,
  conversations,
  members,
  children,
}: {
  workspaceId: string;
  conversations: ConversationListItem[];
  members: Member[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isConversationOpen = pathname !== `/w/${workspaceId}/chat`;

  return (
    <div className="flex h-full min-h-0">
      <aside
        className={cn(
          "border-border/60 flex w-full shrink-0 flex-col border-r md:w-72",
          isConversationOpen && "hidden md:flex",
        )}
      >
        <div className="border-border/60 flex items-center gap-2 border-b px-4 py-3.5">
          <MessageCircle className="text-muted-foreground size-4" />
          <p className="flex-1 text-sm font-medium">Chat</p>
          <NewChatDialog workspaceId={workspaceId} members={members} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-10 text-center text-xs">
              <MessageCircle className="animate-chat-float size-8" />
              Sin conversaciones. Escríbele a alguien desde su perfil o crea un
              chat nuevo con el botón +.
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                workspaceId={workspaceId}
                active={pathname === `/w/${workspaceId}/chat/${c.id}`}
              />
            ))
          )}
        </div>
      </aside>
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1",
          !isConversationOpen && "hidden md:block",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation: c,
  workspaceId,
  active,
}: {
  conversation: ConversationListItem;
  workspaceId: string;
  active: boolean;
}) {
  const router = useRouter();
  const href = `/w/${workspaceId}/chat/${c.id}`;
  const label =
    c.kind === "GROUP"
      ? c.title
      : (c.otherUser?.name?.trim() ?? c.otherUser?.email ?? "");

  const [swipe, setSwipe] = useState<"none" | "left" | "right">("none");
  const startX = useRef(0);
  const dragging = useRef(false);

  function onTouchStart(e: TouchEvent) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function onTouchEnd(e: TouchEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (delta < -50) setSwipe("left");
    else if (delta > 50 && c.unreadCount > 0) setSwipe("right");
    else setSwipe("none");
  }

  function open() {
    if (swipe !== "none") {
      setSwipe("none");
      return;
    }
    router.push(href);
  }

  return (
    <div className="relative overflow-hidden md:overflow-visible">
      {/* Acciones reveladas al deslizar (solo relevantes en mobile). */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 md:hidden">
        <button
          onClick={() => {
            setSwipe("none");
            leaveConversationAction({ workspaceId, conversationId: c.id });
          }}
          aria-label="Eliminar conversación"
          className="bg-destructive text-destructive-foreground transition-ios grid size-9 place-items-center rounded-full active:scale-90"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 md:hidden">
        <button
          onClick={() => {
            setSwipe("none");
            markConversationReadAction({ workspaceId, conversationId: c.id });
          }}
          aria-label="Marcar como leído"
          className="bg-primary text-primary-foreground transition-ios grid size-9 place-items-center rounded-full active:scale-90"
        >
          <Check className="size-4" />
        </button>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          "bg-card transition-ios relative",
          swipe === "left" && "-translate-x-20",
          swipe === "right" && "translate-x-20",
        )}
      >
        <Link
          href={href}
          onClick={(e) => {
            if (swipe !== "none") {
              e.preventDefault();
              open();
            }
          }}
          className={cn(
            "hover:bg-accent transition-ios flex items-center gap-2.5 px-4 py-3",
            active && "bg-accent",
          )}
        >
          {c.kind === "GROUP" ? (
            <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full">
              <Hash className="size-4" />
            </span>
          ) : (
            <Avatar size="sm" className="shrink-0">
              <AvatarImage src={c.otherUser?.image ?? undefined} alt="" />
              <AvatarFallback>
                {initials(c.otherUser?.name ?? null, c.otherUser?.email ?? "")}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{label}</span>
              {c.lastMessage && (
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {timeAgo(c.lastMessage.createdAt)}
                </span>
              )}
            </span>
            <span className="text-muted-foreground flex items-center justify-between gap-2">
              <span className="truncate text-xs">
                {c.lastMessage
                  ? stripMentionMarkup(c.lastMessage.body)
                  : "Sin mensajes todavía"}
              </span>
              {c.unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-medium">
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
