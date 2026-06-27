"use client";

import { useState, useTransition, type FormEvent } from "react";
import { MailQuestion, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
} from "@/server/actions/member";

type Member = {
  userId: string;
  role: string;
  email: string;
  name: string | null;
  isOwner: boolean;
};

type Invite = {
  id: string;
  email: string;
  role: string;
};

export function MembersManager({
  workspaceId,
  members,
  invites,
}: {
  workspaceId: string;
  members: Member[];
  invites: Invite[];
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      try {
        await inviteMemberAction({ workspaceId, email: value });
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo invitar");
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={pending}>
            Invitar
          </Button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </form>

      {invites.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Invitaciones pendientes
          </p>
          <ul className="divide-y rounded-md border">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <MailQuestion className="text-muted-foreground size-4 shrink-0" />
                  <p className="truncate text-sm">{i.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="bg-muted rounded px-2 py-0.5 text-xs">
                    Pendiente
                  </span>
                  <button
                    onClick={() =>
                      startTransition(() =>
                        revokeInviteAction({ workspaceId, inviteId: i.id }),
                      )
                    }
                    disabled={pending}
                    aria-label={`Revocar invitación a ${i.email}`}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
          Miembros
        </p>
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.name || m.email}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {m.email}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="bg-muted rounded px-2 py-0.5 text-xs">
                  {m.role}
                </span>
                {!m.isOwner && (
                  <button
                    onClick={() =>
                      startTransition(() =>
                        removeMemberAction({
                          workspaceId,
                          memberUserId: m.userId,
                        }),
                      )
                    }
                    disabled={pending}
                    aria-label="Quitar miembro"
                    className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
