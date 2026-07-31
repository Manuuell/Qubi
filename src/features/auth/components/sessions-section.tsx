"use client";

import { useTransition } from "react";
import { LogOut, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { logoutAction } from "@/server/actions/auth";
import {
  prepareAddAccountAction,
  removeAccountAction,
  switchToAccountAction,
} from "@/server/actions/account";

type Account = { userId: string; name: string | null; email: string };

export function SessionsSection({
  current,
  accounts,
}: {
  current: { name: string; email: string };
  accounts: Account[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Card variant="glass" className="divide-border/60 gap-0 divide-y p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar>
            <AvatarFallback>
              {current.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{current.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {current.email}
            </p>
          </div>
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[11px] font-medium">
            Activa
          </span>
        </div>

        {accounts.map((a) => (
          <div
            key={a.userId}
            className="group flex items-center gap-3 px-4 py-3"
          >
            <Avatar>
              <AvatarFallback>
                {(a.name || a.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() =>
                startTransition(() =>
                  switchToAccountAction({ userId: a.userId }),
                )
              }
              disabled={pending}
              className="min-w-0 flex-1 text-left disabled:opacity-50"
            >
              <p className="truncate text-sm">{a.name || a.email}</p>
              <p className="text-muted-foreground truncate text-xs">
                {a.email}
              </p>
            </button>
            <button
              onClick={() =>
                startTransition(() => removeAccountAction({ userId: a.userId }))
              }
              disabled={pending}
              aria-label={`Quitar ${a.email} de este navegador`}
              className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-8 shrink-0 place-items-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </Card>

      <div className="flex gap-2">
        <form action={prepareAddAccountAction} className="flex-1">
          <button
            type="submit"
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm"
          >
            <Plus className="size-4" />
            Agregar otra cuenta
          </button>
        </form>
        <form action={logoutAction} className="flex-1">
          <button
            type="submit"
            className="text-destructive hover:bg-destructive/10 transition-ios flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
