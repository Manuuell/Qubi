"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPasswordAction } from "@/server/actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, submit, pending] = useActionState(resetPasswordAction, {
    error: undefined,
  });

  return (
    <div className="bg-background w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <div className="font-display text-3xl font-bold tracking-tight">
          Qubi
        </div>
        <p className="text-muted-foreground text-sm">
          Elige una nueva contraseña.
        </p>
      </div>

      {token ? (
        <form action={submit} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <PasswordInput
            name="password"
            placeholder="Nueva contraseña"
            autoComplete="new-password"
            required
          />
          {state?.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
      ) : (
        <p className="text-destructive text-center text-sm">
          El enlace no incluye un token válido. Solicita uno nuevo.
        </p>
      )}

      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground block text-center text-sm"
      >
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
