"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck, User } from "lucide-react";
import {
  GUEST_ADMIN_EMAIL,
  GUEST_MEMBER_EMAIL,
  GUEST_PASSWORD,
} from "@/lib/guest-accounts";

const ACCOUNTS = [
  {
    label: "Admin (creó el espacio)",
    email: GUEST_ADMIN_EMAIL,
    icon: ShieldCheck,
  },
  { label: "Miembro (trabajador)", email: GUEST_MEMBER_EMAIL, icon: User },
];

// Credenciales de demo visibles en el login, para que cualquiera pueda
// probar la app sin tener que pedir acceso.
export function GuestAccountsCard() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="glass w-full max-w-sm space-y-3 rounded-3xl p-5">
      <p className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
        Cuenta de invitado
      </p>
      {ACCOUNTS.map((a) => (
        <div key={a.email} className="bg-card/60 space-y-1 rounded-2xl p-3">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <a.icon className="size-3.5" />
            {a.label}
          </p>
          <button
            onClick={() => copy(a.email, a.email)}
            className="hover:bg-accent transition-ios flex w-full items-center justify-between gap-2 rounded-full px-2.5 py-1 text-left"
          >
            <span className="truncate font-mono text-xs">{a.email}</span>
            {copied === a.email ? (
              <Check className="size-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="text-muted-foreground size-3.5 shrink-0" />
            )}
          </button>
          <button
            onClick={() => copy(GUEST_PASSWORD, `${a.email}-pw`)}
            className="hover:bg-accent transition-ios flex w-full items-center justify-between gap-2 rounded-full px-2.5 py-1 text-left"
          >
            <span className="truncate font-mono text-xs">{GUEST_PASSWORD}</span>
            {copied === `${a.email}-pw` ? (
              <Check className="size-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="text-muted-foreground size-3.5 shrink-0" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
