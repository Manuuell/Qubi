"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getCalendarFeedUrlAction,
  regenerateCalendarTokenAction,
} from "@/server/actions/account";

// Sincronización con Google Calendar (y cualquier calendario que acepte
// suscripción por URL): muestra el feed ICS personal del usuario con su
// token secreto. Al abrir, pide (o crea) la URL; "Regenerar" la revoca.
export function CalendarSyncDialog({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // Sin esto, un fallo del servidor dejaba el diálogo en "Preparando tu
  // enlace…" para siempre, sin manera de reintentar.
  function loadUrl(fetchUrl: () => Promise<{ url: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const { url: next } = await fetchUrl();
        setUrl(next);
      } catch {
        setError("No se pudo preparar el enlace. Inténtalo de nuevo.");
      }
    });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && url === null) loadUrl(getCalendarFeedUrlAction);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size={compact ? "icon" : "default"}>
            <CalendarDays />
            {!compact && "Sincronizar calendario"}
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Google Calendar</DialogTitle>
          <DialogDescription>
            Tus tareas con fecha aparecerán en Google Calendar y se actualizarán
            solas. Cópialas como calendario por URL.
          </DialogDescription>
        </DialogHeader>

        {error !== null ? (
          <div className="space-y-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => loadUrl(getCalendarFeedUrlAction)}
            >
              Reintentar
            </Button>
          </div>
        ) : url === null ? (
          <p className="text-muted-foreground py-2 text-sm">
            Preparando tu enlace…
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label="Copiar enlace"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>

            <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
              <li>
                En Google Calendar, junto a “Otros calendarios”, pulsa{" "}
                <span className="text-foreground font-medium">+</span>.
              </li>
              <li>
                Elige{" "}
                <span className="text-foreground font-medium">Desde URL</span> y
                pega este enlace.
              </li>
              <li>Pulsa “Añadir calendario”.</li>
            </ol>
            <p className="text-muted-foreground text-xs">
              Google decide cuándo releer el calendario y suele tardar entre
              varias horas y un día en reflejar los cambios; no es inmediato. El
              enlace es personal y secreto: no lo compartas.
            </p>

            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => loadUrl(regenerateCalendarTokenAction)}
            >
              <RefreshCw className="size-3.5" />
              Regenerar enlace (revoca el anterior)
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
