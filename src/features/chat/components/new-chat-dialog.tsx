"use client";

import { useState, useTransition } from "react";
import { Plus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/features/task/labels";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  startDirectConversationAction,
  createGroupConversationAction,
} from "@/server/actions/chat";

type Member = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export function NewChatDialog({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleMember(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function reset() {
    setSelected([]);
    setName("");
    setTab("direct");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        aria-label="Nuevo chat"
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-8 shrink-0 place-items-center rounded-full"
      >
        <Plus className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo chat</DialogTitle>
          <DialogDescription>
            Escríbele a alguien directamente o arma un grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted inline-flex items-center gap-0.5 rounded-full p-1 text-sm">
          <button
            onClick={() => setTab("direct")}
            className={cn(
              "transition-ios rounded-full px-3.5 py-1.5",
              tab === "direct"
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Mensaje directo
          </button>
          <button
            onClick={() => setTab("group")}
            className={cn(
              "transition-ios rounded-full px-3.5 py-1.5",
              tab === "group"
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Nuevo grupo
          </button>
        </div>

        {tab === "group" && (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del grupo"
            className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
          />
        )}

        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-sm">
              No hay más personas en este espacio todavía.
            </p>
          ) : (
            members.map((m) => {
              const label = m.name?.trim() || m.email;
              const isSelected = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    if (tab === "direct") {
                      startTransition(() =>
                        startDirectConversationAction({
                          workspaceId,
                          otherUserId: m.id,
                        }),
                      );
                    } else {
                      toggleMember(m.id);
                    }
                  }}
                  disabled={pending}
                  className="hover:bg-accent transition-ios flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left disabled:opacity-50"
                >
                  <Avatar size="sm">
                    <AvatarImage src={m.image ?? undefined} alt="" />
                    <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {label}
                  </span>
                  {tab === "group" && (
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border text-xs",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected && "✓"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {tab === "group" && (
          <button
            onClick={() =>
              startTransition(() =>
                createGroupConversationAction({
                  workspaceId,
                  memberIds: selected,
                  name,
                }),
              )
            }
            disabled={pending || !name.trim() || selected.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios flex items-center justify-center gap-1.5 self-end rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Users className="size-4" />
            Crear grupo
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
