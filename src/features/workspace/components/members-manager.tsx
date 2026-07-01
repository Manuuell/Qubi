"use client";

import { useState, useTransition, type FormEvent } from "react";
import { MailQuestion, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceRole } from "@/generated/prisma/enums";
import {
  RoleBadge,
  ROLE_LABEL,
} from "@/features/workspace/components/role-badge";
import {
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
} from "@/server/actions/member";

type Member = {
  userId: string;
  role: WorkspaceRole;
  email: string;
  name: string | null;
};

type Invite = {
  id: string;
  email: string;
  role: WorkspaceRole;
};

// Roles que se pueden asignar (OWNER no se transfiere desde aquí).
const ASSIGNABLE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
  WorkspaceRole.GUEST,
];

export function MembersManager({
  workspaceId,
  currentUserId,
  currentUserRole,
  members,
  invites,
}: {
  workspaceId: string;
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  members: Member[];
  invites: Invite[];
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOwner = currentUserRole === WorkspaceRole.OWNER;
  const isAdmin = isOwner || currentUserRole === WorkspaceRole.ADMIN;

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

  function handleRoleChange(targetUserId: string, newRole: WorkspaceRole) {
    startTransition(async () => {
      try {
        await changeMemberRoleAction({ workspaceId, targetUserId, newRole });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cambiar el rol",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
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
      )}

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
                  <RoleBadge role={i.role} />
                </div>
                {isAdmin && (
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
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
          Miembros ({members.length})
        </p>
        <ul className="divide-y rounded-md border">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const isTargetOwner = m.role === WorkspaceRole.OWNER;
            const canChangeRole = isOwner && !isSelf && !isTargetOwner;
            const canRemove = isAdmin && !isSelf && !isTargetOwner;

            return (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {m.name || m.email}
                    </p>
                    {isSelf && (
                      <span className="text-muted-foreground text-[11px]">
                        (tú)
                      </span>
                    )}
                  </div>
                  {m.name && (
                    <p className="text-muted-foreground truncate text-xs">
                      {m.email}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {canChangeRole ? (
                    <select
                      value={m.role}
                      disabled={pending}
                      aria-label={`Rol de ${m.name || m.email}`}
                      onChange={(e) =>
                        handleRoleChange(
                          m.userId,
                          e.target.value as WorkspaceRole,
                        )
                      }
                      className="border-input bg-background hover:bg-accent cursor-pointer rounded border px-1.5 py-0.5 text-xs outline-none disabled:opacity-50"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}

                  {canRemove && (
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
                      aria-label={`Quitar a ${m.name || m.email}`}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
