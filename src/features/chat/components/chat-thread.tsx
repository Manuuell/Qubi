"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Hash, Paperclip, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/features/task/labels";
import { cn } from "@/lib/utils";
import {
  sendChatMessageAction,
  markConversationReadAction,
} from "@/server/actions/chat";

export type ChatMessageData = {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: Date | string;
  senderId: string | null;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

function appendUnique(cur: ChatMessageData[], fresh: ChatMessageData[]) {
  const ids = new Set(cur.map((m) => m.id));
  const toAdd = fresh.filter((m) => !ids.has(m.id));
  return toAdd.length > 0 ? [...cur, ...toAdd] : cur;
}

export function ChatThread({
  workspaceId,
  conversationId,
  currentUserId,
  kind,
  title,
  otherUser,
  memberCount,
  initialMessages,
}: {
  workspaceId: string;
  conversationId: string;
  currentUserId: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  memberCount: number;
  initialMessages: ChatMessageData[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Marca como leída al entrar y cuando llegan mensajes nuevos.
  useEffect(() => {
    markConversationReadAction({ conversationId, workspaceId });
  }, [conversationId, workspaceId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Polling: pregunta por mensajes nuevos cada 3s mientras el chat está abierto.
  useEffect(() => {
    const interval = setInterval(async () => {
      const last = messages.at(-1);
      const after = last
        ? new Date(last.createdAt).toISOString()
        : new Date(0).toISOString();
      try {
        const res = await fetch(
          `/api/chat/${conversationId}/messages?after=${encodeURIComponent(after)}`,
        );
        if (!res.ok) return;
        const fresh: ChatMessageData[] = await res.json();
        if (fresh.length > 0) {
          setMessages((cur) => appendUnique(cur, fresh));
          if (fresh.some((m) => m.senderId !== currentUserId)) {
            markConversationReadAction({ conversationId, workspaceId });
          }
        }
      } catch {
        // silencioso: se reintenta en el próximo tick
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId, workspaceId, currentUserId, messages]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setSending(true);
    const fd = new FormData();
    fd.set("conversationId", conversationId);
    fd.set("workspaceId", workspaceId);
    fd.set("body", body);
    if (file) fd.set("file", file);
    setBody("");
    setFile(null);
    try {
      await sendChatMessageAction(fd);
      // El polling normalmente lo recoge en el próximo tick; forzamos uno
      // ahora para que se sienta instantáneo.
      const last = messages.at(-1);
      const after = last
        ? new Date(last.createdAt).toISOString()
        : new Date(0).toISOString();
      const res = await fetch(
        `/api/chat/${conversationId}/messages?after=${encodeURIComponent(after)}`,
      );
      if (res.ok) {
        const fresh: ChatMessageData[] = await res.json();
        if (fresh.length > 0) setMessages((cur) => appendUnique(cur, fresh));
      }
    } finally {
      setSending(false);
    }
  }

  const label =
    kind === "GROUP"
      ? title
      : otherUser?.name?.trim() || otherUser?.email || "Conversación";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border/60 flex shrink-0 items-center gap-2.5 border-b px-5 py-3.5">
        {kind === "GROUP" ? (
          <div className="flex items-center gap-2.5">
            <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full">
              <Hash className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{label}</span>
              <span className="text-muted-foreground block text-xs">
                {memberCount}{" "}
                {memberCount === 1 ? "participante" : "participantes"}
              </span>
            </span>
          </div>
        ) : (
          otherUser && (
            <Link
              href={`/w/${workspaceId}/members/${otherUser.id}`}
              className="flex items-center gap-2.5 hover:underline"
            >
              <Avatar size="sm">
                <AvatarImage src={otherUser.image ?? undefined} alt="" />
                <AvatarFallback>
                  {initials(otherUser.name, otherUser.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          )
        )}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Todavía no hay mensajes. Saluda 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md",
                  )}
                >
                  {kind === "GROUP" && !mine && m.sender && (
                    <p className="mb-0.5 text-xs font-medium opacity-80">
                      {m.sender.name?.trim() || m.sender.email}
                    </p>
                  )}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  {m.attachmentUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.attachmentUrl}
                      alt="Adjunto"
                      className="mt-1 max-h-56 w-auto rounded-xl object-contain"
                    />
                  )}
                  <p className={cn("mt-0.5 text-right text-[10px] opacity-70")}>
                    {timeFmt.format(new Date(m.createdAt))}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={submit}
        className="border-border/60 flex shrink-0 items-center gap-2 border-t px-4 py-3"
      >
        <label className="text-muted-foreground hover:text-foreground transition-ios cursor-pointer">
          <Paperclip className="size-4" />
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={file ? file.name : "Escribe un mensaje…"}
          disabled={sending}
          className="bg-muted focus:ring-ring transition-ios flex-1 rounded-full px-4 py-2 text-sm outline-none focus:ring-2"
        />
        <button
          type="submit"
          disabled={sending || (!body.trim() && !file)}
          aria-label="Enviar"
          className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios grid size-9 shrink-0 place-items-center rounded-full disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
