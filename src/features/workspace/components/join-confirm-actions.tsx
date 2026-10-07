"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  dismissJoinAction,
  joinWorkspaceViaLinkAction,
  switchAccountForJoinAction,
  type JoinFormState,
} from "@/server/actions/invite-link";

export function JoinConfirmActions({
  token,
  expectedUserId,
}: {
  token: string;
  expectedUserId: string;
}) {
  const [state, formAction, pending] = useActionState(
    joinWorkspaceViaLinkAction,
    {} as JoinFormState,
  );

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="expectedUserId" value={expectedUserId} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Uniéndote…" : "Unirme"}
        </Button>
        {state.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}
      </form>

      <form action={switchAccountForJoinAction}>
        <input type="hidden" name="token" value={token} />
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={pending}
        >
          Usar otra cuenta
        </Button>
      </form>

      <form action={dismissJoinAction}>
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>
          Ahora no
        </Button>
      </form>
    </div>
  );
}
