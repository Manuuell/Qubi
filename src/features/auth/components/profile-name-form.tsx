"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileNameAction } from "@/server/actions/account";

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const [state, submit, pending] = useActionState(updateProfileNameAction, {
    error: undefined,
  });

  return (
    <form action={submit} className="flex items-start gap-2">
      <div className="flex-1 space-y-1.5">
        <Input name="name" defaultValue={initialName} placeholder="Tu nombre" />
        {state?.error && (
          <p className="text-destructive text-xs">{state.error}</p>
        )}
        {state?.info && (
          <p className="text-xs text-green-600 dark:text-green-500">
            {state.info}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
