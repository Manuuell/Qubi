"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [state, submit, pending] = useActionState(requestPasswordResetAction, {
    error: undefined,
  });

  return (
    <div className="bg-background w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <div className="font-display text-3xl font-bold tracking-tight">
          Qubi
        </div>
        <p className="text-muted-foreground text-sm">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      {state?.info ? (
        <p className="bg-muted/50 rounded-md border px-3 py-2 text-center text-sm">
          {state.info}
        </p>
      ) : (
        <form action={submit} className="space-y-3">
          <Input
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            required
          />
          {state?.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
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
