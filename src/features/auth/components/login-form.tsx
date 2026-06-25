"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  googleSignInAction,
  loginAction,
  registerAction,
  resendVerificationAction,
} from "@/server/actions/auth";

export function LoginForm({
  googleEnabled,
  addMode = false,
  notice,
}: {
  googleEnabled: boolean;
  addMode?: boolean;
  notice?: string;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginSubmit, loginPending] = useActionState(loginAction, {
    error: undefined,
  });
  const [regState, regSubmit, regPending] = useActionState(registerAction, {
    error: undefined,
  });

  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  const isLogin = mode === "login";
  const state = isLogin ? loginState : regState;
  const action = isLogin ? loginSubmit : regSubmit;
  const pending = isLogin ? loginPending : regPending;

  function resend(email: string) {
    startResend(async () => {
      const res = await resendVerificationAction({ email });
      setResendInfo(res.info ?? null);
    });
  }

  return (
    <div className="bg-background w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <div
          aria-hidden
          className="chess-pattern border-border mx-auto size-9 rounded-md border"
        />
        <div className="font-display text-3xl font-bold tracking-tight">
          Qubi
        </div>
        <p className="text-muted-foreground text-sm">
          {addMode
            ? "Entra con otra cuenta para añadirla"
            : isLogin
              ? "Inicia sesión en tu espacio"
              : "Crea tu cuenta gratis"}
        </p>
      </div>

      {notice && (
        <p className="bg-muted/50 rounded-md border px-3 py-2 text-center text-sm">
          {notice}
        </p>
      )}

      {addMode && (
        <div className="bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-center text-xs">
          Tu sesión actual sigue abierta. Podrás cambiar entre cuentas desde el
          menú.{" "}
          <Link href="/" className="text-foreground underline">
            Cancelar
          </Link>
        </div>
      )}

      {/* Registro completado: confirma por correo antes de entrar. */}
      {state?.info ? (
        <p className="bg-muted/50 rounded-md border px-3 py-3 text-center text-sm">
          {state.info}
        </p>
      ) : (
        <>
          {googleEnabled && (
            <>
              <form action={googleSignInAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Continuar con Google
                </Button>
              </form>
              <div className="relative text-center">
                <span className="bg-background text-muted-foreground px-2 text-xs">
                  o con tu email
                </span>
              </div>
            </>
          )}

          <form action={action} className="space-y-3">
            {!isLogin && (
              <Input
                name="name"
                type="text"
                placeholder="Tu nombre"
                autoComplete="name"
              />
            )}
            <Input
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Contraseña"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />

            {state?.error && (
              <p className="text-destructive text-sm">{state.error}</p>
            )}

            {/* Credenciales correctas pero correo sin verificar. */}
            {isLogin && loginState?.needsVerification && (
              <div className="bg-muted/50 space-y-2 rounded-md border px-3 py-2 text-sm">
                <p>Confirma tu correo para poder entrar.</p>
                {resendInfo ? (
                  <p className="text-muted-foreground text-xs">{resendInfo}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => resend(loginState.email ?? "")}
                    disabled={resending}
                    className="text-foreground font-medium underline disabled:opacity-50"
                  >
                    {resending
                      ? "Enviando…"
                      : "Reenviar correo de confirmación"}
                  </button>
                )}
              </div>
            )}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          {isLogin && (
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground block text-center text-sm"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMode(isLogin ? "register" : "login")}
            className="text-muted-foreground hover:text-foreground w-full text-center text-sm"
          >
            {isLogin
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </>
      )}
    </div>
  );
}
