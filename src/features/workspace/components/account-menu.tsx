"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import {
  prepareAddAccountAction,
  removeAccountAction,
  switchToAccountAction,
} from "@/server/actions/account";

type Account = {
  userId: string;
  name: string | null;
  email: string;
};

// Conmutador de cuentas: muestra la cuenta activa y las demás recordadas en
// este navegador, permite cambiar entre ellas sin contraseña, agregar otra o
// cerrar sesión.
export function AccountMenu({
  current,
  accounts,
  onNavigate,
}: {
  current: { name: string; email: string };
  accounts: Account[];
  /** Se llama al navegar desde el menú: cierra también el cajón en móvil. */
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
  }

  // Al ir a otra pantalla hay que cerrar el desplegable Y el menú lateral de
  // móvil: si el cajón se queda abierto, tapa la página y parece que el clic
  // no hizo nada.
  function closeAndNavigate() {
    close();
    onNavigate?.();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Opciones de cuenta"
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-7 place-items-center rounded-full"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute right-0 bottom-full z-20 mb-2 w-60 rounded-2xl p-1.5 duration-150">
            {/* Cuenta activa */}
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              <span className="bg-primary/10 text-primary grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium">
                {current.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{current.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {current.email}
                </p>
              </div>
              <Check className="text-primary size-4 shrink-0" />
            </div>

            {/* Otras cuentas recordadas */}
            {accounts.length > 0 && (
              <>
                <div className="border-border/60 my-1 border-t" />
                <p className="text-muted-foreground px-2.5 py-1 text-[11px]">
                  Cambiar de cuenta
                </p>
                {accounts.map((a) => (
                  <div
                    key={a.userId}
                    className="group hover:bg-accent transition-ios flex items-center gap-2 rounded-xl pr-1"
                  >
                    <button
                      onClick={() =>
                        startTransition(() =>
                          switchToAccountAction({ userId: a.userId }),
                        )
                      }
                      disabled={pending}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left disabled:opacity-50"
                    >
                      <span className="bg-muted grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium">
                        {(a.name || a.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{a.name || a.email}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {a.email}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        startTransition(() =>
                          removeAccountAction({ userId: a.userId }),
                        )
                      }
                      disabled={pending}
                      aria-label={`Quitar ${a.email} de este navegador`}
                      className="text-muted-foreground hover:bg-accent-foreground/10 hover:text-foreground transition-ios grid size-6 shrink-0 place-items-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}

            <div className="border-border/60 my-1 border-t" />

            <Link
              href="/account"
              onClick={closeAndNavigate}
              className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
            >
              <UserRound className="size-4" />
              Tu perfil
            </Link>
            <Link
              href="/account"
              onClick={closeAndNavigate}
              className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
            >
              <KeyRound className="size-4" />
              Cambiar contraseña
            </Link>
            <form action={prepareAddAccountAction}>
              <button
                type="submit"
                className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
              >
                <Plus className="size-4" />
                Agregar otra cuenta
              </button>
            </form>
            <form action={logoutAction}>
              <button
                type="submit"
                className="hover:bg-accent text-destructive transition-ios flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
