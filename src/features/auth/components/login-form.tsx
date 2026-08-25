"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { QubiMark } from "@/components/qubi-mark";
import {
  googleSignInAction,
  loginAction,
  registerAction,
  resendVerificationAction,
} from "@/server/actions/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function LoginForm({
  googleEnabled,
  addMode = false,
  notice,
  errorNotice,
  showEmailLogin = false,
}: {
  googleEnabled: boolean;
  addMode?: boolean;
  notice?: string;
  // Fallo al entrar con Google (viene de ?error=... en la URL).
  errorNotice?: string;
  // Abre el formulario de correo de entrada, en vez de dejarlo plegado tras
  // el enlace de "Iniciar sesión de otra forma".
  showEmailLogin?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [emailOpen, setEmailOpen] = useState(showEmailLogin);
  const [loginState, loginSubmit, loginPending] = useActionState(loginAction, {
    error: undefined,
  });
  const [regState, regSubmit, regPending] = useActionState(registerAction, {
    error: undefined,
  });

  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  // Sin Google configurado se muestra siempre: dejar la puerta cerrada sin
  // llave sería peor que enseñar un formulario de más.
  const emailVisible = emailOpen || !googleEnabled;

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
    <div className="glass-strong w-full max-w-sm space-y-6 rounded-3xl p-8">
      <div className="space-y-2 text-center">
        <QubiMark size={40} className="mx-auto" />
        <div className="font-heading text-3xl font-bold tracking-tight">
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
        <p className="bg-muted/50 rounded-2xl border px-3 py-2 text-center text-sm">
          {notice}
        </p>
      )}

      {errorNotice && (
        <p className="bg-destructive/10 text-destructive rounded-2xl px-3 py-2 text-center text-sm">
          {errorNotice}
        </p>
      )}

      {addMode && (
        <div className="bg-muted/50 text-muted-foreground rounded-2xl border px-3 py-2 text-center text-xs">
          Tu sesión actual sigue abierta. Podrás cambiar entre cuentas desde el
          menú.{" "}
          <Link href="/" className="text-foreground underline">
            Cancelar
          </Link>
        </div>
      )}

      {/* Registro completado: confirma por correo antes de entrar. */}
      {state?.info ? (
        <p className="bg-muted/50 rounded-2xl border px-3 py-3 text-center text-sm">
          {state.info}
        </p>
      ) : (
        <>
          {googleEnabled && (
            <>
              <form action={googleSignInAction}>
                {/* Avisa a la acción de que esto es "agregar otra cuenta":
                    tiene que cerrar la sesión actual antes de ir a Google. */}
                {addMode && <input type="hidden" name="add" value="1" />}
                <Button type="submit" variant="outline" className="w-full">
                  <GoogleIcon />
                  Continuar con Google
                </Button>
              </form>
              {emailVisible ? (
                <div className="relative text-center">
                  <span className="bg-background text-muted-foreground px-2 text-xs">
                    o con tu email
                  </span>
                </div>
              ) : (
                // Alternativa discreta para quien tiene cuenta con contraseña
                // de antes de que Google fuera la vía principal.
                <button
                  type="button"
                  onClick={() => setEmailOpen(true)}
                  className="text-muted-foreground hover:text-foreground w-full text-center text-xs underline"
                >
                  Iniciar sesión de otra forma
                </button>
              )}
            </>
          )}

          {emailVisible && (
            <>
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
                <PasswordInput
                  name="password"
                  placeholder="Contraseña"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />

                {state?.error && (
                  <p className="text-destructive text-sm">{state.error}</p>
                )}

                {/* Credenciales correctas pero correo sin verificar. */}
                {isLogin && loginState?.needsVerification && (
                  <div className="bg-muted/50 space-y-2 rounded-2xl border px-3 py-2 text-sm">
                    <p>Confirma tu correo para poder entrar.</p>
                    {resendInfo ? (
                      <p className="text-muted-foreground text-xs">
                        {resendInfo}
                      </p>
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
                  {pending
                    ? "Un momento…"
                    : isLogin
                      ? "Entrar"
                      : "Crear cuenta"}
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
        </>
      )}
    </div>
  );
}
