"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/features/task/labels";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/server/services/chat";

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

export function ChatShell({
  workspaceId,
  conversations,
  children,
}: {
  workspaceId: string;
  conversations: ConversationListItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0">
      <aside className="border-border/60 flex w-72 shrink-0 flex-col border-r">
        <div className="border-border/60 flex items-center gap-2 border-b px-4 py-3.5">
          <MessageCircle className="text-muted-foreground size-4" />
          <p className="text-sm font-medium">Chat</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-xs">
              Sin conversaciones. Escríbele a alguien desde su perfil.
            </p>
          ) : (
            conversations.map((c) => {
              const href = `/w/${workspaceId}/chat/${c.id}`;
              const active = pathname === href;
              const label = c.otherUser.name?.trim() || c.otherUser.email;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className={cn(
                    "hover:bg-accent transition-ios flex items-center gap-2.5 px-4 py-3",
                    active && "bg-accent",
                  )}
                >
                  <Avatar size="sm" className="shrink-0">
                    <AvatarImage src={c.otherUser.image ?? undefined} alt="" />
                    <AvatarFallback>
                      {initials(c.otherUser.name, c.otherUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {label}
                      </span>
                      {c.lastMessage && (
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {timeAgo(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground flex items-center justify-between gap-2">
                      <span className="truncate text-xs">
                        {c.lastMessage?.body || "Sin mensajes todavía"}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-medium">
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </aside>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}
