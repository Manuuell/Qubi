"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemberAction, removeMemberAction } from "@/server/actions/member";

type Member = {
  userId: string;
  role: string;
  email: string;
  name: string | null;
  isOwner: boolean;
};

export function MembersManager({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: Member[];
}) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function invite(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    startTransition(async () => {
      await addMemberAction({ workspaceId, email: value });
      setEmail("");
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="flex gap-2">
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={pending}>
          Invitar
        </Button>
      </form>

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
  );
}
