"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction } from "@/server/actions/auth";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, submit, pending] = useActionState(changePasswordAction, {
    error: undefined,
  });

  return (
    <form action={submit} className="max-w-sm space-y-3">
      {hasPassword && (
        <PasswordInput
          name="currentPassword"
          placeholder="Contraseña actual"
          autoComplete="current-password"
          required
        />
      )}
      <PasswordInput
        name="newPassword"
        placeholder="Nueva contraseña"
        autoComplete="new-password"
        required
      />
      {state?.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}
      {state?.info && (
        <p className="text-sm text-green-600 dark:text-green-500">
          {state.info}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
