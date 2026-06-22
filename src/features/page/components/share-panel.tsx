"use client";

import { useState, useTransition } from "react";
import { Check, Globe, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPagePublicAction } from "@/server/actions/page";

type Member = { name: string; email: string; role: string };

export function SharePanel({
  pageId,
  workspaceId,
  isPublic,
  members,
}: {
  pageId: string;
  workspaceId: string;
  isPublic: boolean;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${pageId}`
      : "";

  function copy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Share2 className="size-4" />
        Compartir
      </Button>

      {open && (
        <div className="bg-background absolute right-0 z-20 mt-2 w-80 rounded-lg border p-4 text-left shadow-lg">
          <div className="flex items-start gap-3">
            {isPublic ? (
              <Globe className="text-primary mt-0.5 size-5" />
            ) : (
              <Lock className="text-muted-foreground mt-0.5 size-5" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Acceso público</p>
              <p className="text-muted-foreground text-xs">
                {isPublic
                  ? "Cualquiera con el enlace puede ver (solo lectura)"
                  : "Solo los miembros del espacio"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={isPublic}
              aria-label="Alternar acceso público"
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  setPagePublicAction({
                    pageId,
                    workspaceId,
                    isPublic: !isPublic,
                  }),
                )
              }
              className={
                "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 " +
                (isPublic ? "bg-primary" : "bg-muted-foreground/30")
              }
            >
              <span
                className={
                  "bg-background absolute top-0.5 size-4 rounded-full transition-all " +
                  (isPublic ? "left-[18px]" : "left-0.5")
                }
              />
            </button>
          </div>

          {isPublic && (
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={publicUrl}
                className="bg-muted/40 min-w-0 flex-1 rounded border px-2 py-1 text-xs outline-none"
              />
              <Button size="sm" variant="secondary" onClick={copy}>
                {copied ? <Check className="size-4" /> : "Copiar"}
              </Button>
            </div>
          )}

          <div className="mt-4">
            <p className="text-muted-foreground mb-1 text-xs font-medium">
              Con acceso
            </p>
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.email}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 truncate">{m.name}</span>
                  <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px]">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
