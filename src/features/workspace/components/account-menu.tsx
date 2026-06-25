"use client";

import { useState } from "react";
import { LogOut, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { logoutAction, switchAccountAction } from "@/server/actions/auth";

// Menú de la cuenta (esquina inferior). Permite cambiar de cuenta, agregar otra
// o cerrar sesión. La sesión es única: "cambiar" y "agregar" llevan al login
// tras cerrar la sesión actual, para entrar/registrarse con otra cuenta.
export function AccountMenu({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Opciones de cuenta"
        className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="bg-popover absolute right-0 bottom-full z-20 mb-1 w-56 rounded-lg border p-1 shadow-lg">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="text-muted-foreground truncate text-xs">
                {userEmail}
              </p>
            </div>
            <div className="my-1 border-t" />

            <form action={switchAccountAction}>
              <button
                type="submit"
                className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
              >
                <Users className="size-4" />
                Cambiar de cuenta
              </button>
            </form>
            <form action={switchAccountAction}>
              <button
                type="submit"
                className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
              >
                <UserPlus className="size-4" />
                Agregar otra cuenta
              </button>
            </form>

            <div className="my-1 border-t" />

            <form action={logoutAction}>
              <button
                type="submit"
                className="hover:bg-accent text-destructive flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
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
