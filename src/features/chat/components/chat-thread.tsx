"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  File as FileIcon,
  Hash,
  LogOut,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Send,
  SmilePlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, QUICK_REACTIONS } from "@/features/task/labels";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  sendChatMessageAction,
  markConversationReadAction,
  toggleMessageReactionAction,
  renameConversationAction,
  leaveConversationAction,
} from "@/server/actions/chat";
import {
  CHAT_EVENT,
  type RealtimeChatEvent,
} from "@/features/realtime/realtime-provider";
import { MentionText } from "@/features/mentions/mention-text";
import { MentionSuggestions } from "@/features/mentions/mention-suggestions";
import {
  filterMentionCandidates,
  mentionMarkup,
  type MentionMember,
} from "@/features/mentions/mentions";

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
  reactions: {
    emoji: string;
    user: { id: string; name: string | null; email: string };
  }[];
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
  members,
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
  members: MentionMember[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leavePending, startLeaveTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Marca como leída al entrar y cuando llegan mensajes nuevos.
  useEffect(() => {
    markConversationReadAction({ conversationId, workspaceId });
  }, [conversationId, workspaceId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const checkForNewMessages = useCallback(async () => {
    const last = messagesRef.current.at(-1);
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
      // silencioso: se reintenta en el próximo tick / evento
    }
  }, [conversationId, workspaceId, currentUserId]);

  // Tiempo real: el SSE de RealtimeProvider avisa al instante cuando llega
  // un mensaje nuevo en esta conversación.
  useEffect(() => {
    function onChatEvent(e: Event) {
      const detail = (e as CustomEvent<RealtimeChatEvent>).detail;
      if (detail.conversationId === conversationId) checkForNewMessages();
    }
    window.addEventListener(CHAT_EVENT, onChatEvent);
    return () => window.removeEventListener(CHAT_EVENT, onChatEvent);
  }, [conversationId, checkForNewMessages]);

  // Respaldo por si el SSE se corta (reconexión, pestaña en segundo plano, etc.).
  useEffect(() => {
    const interval = setInterval(checkForNewMessages, 15_000);
    return () => clearInterval(interval);
  }, [checkForNewMessages]);

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

  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  function toggleReaction(messageId: string, emoji: string) {
    setOpenPickerId(null);
    // Optimista: no esperamos la respuesta del servidor para reflejarlo.
    setMessages((cur) =>
      cur.map((m) => {
        if (m.id !== messageId) return m;
        const already = m.reactions.some(
          (r) => r.emoji === emoji && r.user.id === currentUserId,
        );
        return {
          ...m,
          reactions: already
            ? m.reactions.filter(
                (r) => !(r.emoji === emoji && r.user.id === currentUserId),
              )
            : [
                ...m.reactions,
                { emoji, user: { id: currentUserId, name: null, email: "" } },
              ],
        };
      }),
    );
    toggleMessageReactionAction({ messageId, emoji }).catch(() => {
      checkForNewMessages();
    });
  }

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  function handleBodyChange(value: string) {
    setBody(value);
    const before = value.slice(0, value.length);
    const match = before.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function pickMention(member: MentionMember) {
    const withoutQuery = body.replace(/(?:^|\s)@([^\s@]*)$/, (m) =>
      m.startsWith(" ") ? " " : "",
    );
    setBody(`${withoutQuery}${mentionMarkup(member)} `);
    setMentionQuery(null);
  }

  const mentionCandidates =
    mentionQuery !== null ? filterMentionCandidates(members, mentionQuery) : [];

  const label =
    kind === "GROUP"
      ? title
      : otherUser?.name?.trim() || otherUser?.email || "Conversación";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border/60 flex shrink-0 items-center gap-2.5 border-b px-5 py-3.5">
        <Link
          href={`/w/${workspaceId}/chat`}
          aria-label="Volver a los chats"
          className="text-muted-foreground hover:bg-accent transition-ios -ml-1.5 grid size-8 shrink-0 place-items-center rounded-full md:hidden"
        >
          <ArrowLeft className="size-4" />
        </Link>
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

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Más opciones"
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios ml-auto grid size-8 shrink-0 place-items-center rounded-full"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {kind === "GROUP" && (
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil className="size-4" />
                Renombrar grupo
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setLeaving(true)}
            >
              <LogOut className="size-4" />
              {kind === "GROUP" ? "Salir del grupo" : "Eliminar conversación"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PromptDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Renombrar grupo"
        initialValue={title}
        confirmLabel="Guardar"
        pending={leavePending}
        onConfirm={(name) => {
          startLeaveTransition(() =>
            renameConversationAction({ workspaceId, conversationId, name }),
          );
          setRenaming(false);
        }}
      />
      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title={
          kind === "GROUP"
            ? "¿Salir de este grupo?"
            : "¿Eliminar esta conversación?"
        }
        description={
          kind === "GROUP"
            ? "Dejarás de ver este grupo y sus mensajes nuevos."
            : "Se quitará de tu lista. La otra persona seguirá viendo los mensajes."
        }
        confirmLabel={kind === "GROUP" ? "Salir" : "Eliminar"}
        pending={leavePending}
        onConfirm={() =>
          startLeaveTransition(() =>
            leaveConversationAction({ workspaceId, conversationId }),
          )
        }
      />

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
            const reactionGroups = new Map<string, number>();
            for (const r of m.reactions) {
              reactionGroups.set(
                r.emoji,
                (reactionGroups.get(r.emoji) ?? 0) + 1,
              );
            }
            return (
              <div
                key={m.id}
                className={cn(
                  "group flex flex-col",
                  mine ? "items-end" : "items-start",
                )}
              >
                <div className="flex items-end gap-1">
                  {!mine && (
                    <ReactionPicker
                      open={openPickerId === m.id}
                      onOpenChange={(o) => setOpenPickerId(o ? m.id : null)}
                      onPick={(emoji) => toggleReaction(m.id, emoji)}
                    />
                  )}
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
                    {m.body && (
                      <p className="whitespace-pre-wrap">
                        <MentionText body={m.body} />
                      </p>
                    )}
                    {m.attachmentUrl && (
                      <ChatAttachment url={m.attachmentUrl} />
                    )}
                    <p
                      className={cn("mt-0.5 text-right text-[10px] opacity-70")}
                    >
                      {timeFmt.format(new Date(m.createdAt))}
                    </p>
                  </div>
                  {mine && (
                    <ReactionPicker
                      open={openPickerId === m.id}
                      onOpenChange={(o) => setOpenPickerId(o ? m.id : null)}
                      onPick={(emoji) => toggleReaction(m.id, emoji)}
                    />
                  )}
                </div>
                {reactionGroups.size > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {[...reactionGroups.entries()].map(([emoji, count]) => {
                      const mineReacted = m.reactions.some(
                        (r) => r.emoji === emoji && r.user.id === currentUserId,
                      );
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(m.id, emoji)}
                          className={cn(
                            "transition-ios flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]",
                            mineReacted
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "hover:bg-accent",
                          )}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
        <div className="relative min-w-0 flex-1">
          {mentionQuery !== null && (
            <MentionSuggestions
              candidates={mentionCandidates}
              onSelect={pickMention}
            />
          )}
          <input
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            onBlur={() => setMentionQuery(null)}
            placeholder={
              file ? file.name : "Escribe un mensaje… (@ para mencionar)"
            }
            disabled={sending}
            className="bg-muted focus:ring-ring transition-ios w-full rounded-full px-4 py-2 text-sm outline-none focus:ring-2"
          />
        </div>
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

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i;

function ChatAttachment({ url }: { url: string }) {
  if (IMAGE_EXT.test(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Adjunto"
        className="mt-1 max-h-56 w-auto rounded-xl object-contain"
      />
    );
  }
  const filename = decodeURIComponent(url.split("/").pop() || "Archivo");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-background/50 hover:bg-background/70 transition-ios mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
    >
      <FileIcon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{filename}</span>
    </a>
  );
}

function ReactionPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => onOpenChange(!open)}
        aria-label="Agregar reacción"
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-6 place-items-center rounded-full opacity-0 group-hover:opacity-100"
      >
        <SmilePlus className="size-3.5" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => onOpenChange(false)}
          />
          <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute bottom-full z-20 mb-1 flex gap-0.5 rounded-full p-1 duration-100">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onPick(emoji)}
                className="hover:bg-accent transition-ios grid size-7 place-items-center rounded-full text-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
