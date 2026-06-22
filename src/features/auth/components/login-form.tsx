"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  googleSignInAction,
  loginAction,
  registerAction,
} from "@/server/actions/auth";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginSubmit, loginPending] = useActionState(loginAction, {
    error: undefined,
  });
  const [regState, regSubmit, regPending] = useActionState(registerAction, {
    error: undefined,
  });

  const isLogin = mode === "login";
  const state = isLogin ? loginState : regState;
  const action = isLogin ? loginSubmit : regSubmit;
  const pending = isLogin ? loginPending : regPending;

  return (
    <div className="bg-background w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-1 text-center">
        <div className="text-2xl font-bold tracking-tight">Qubi</div>
        <p className="text-muted-foreground text-sm">
          {isLogin ? "Inicia sesión en tu espacio" : "Crea tu cuenta gratis"}
        </p>
      </div>

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
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isLogin ? "register" : "login")}
        className="text-muted-foreground hover:text-foreground w-full text-center text-sm"
      >
        {isLogin
          ? "¿No tienes cuenta? Regístrate"
          : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </div>
  );
}
