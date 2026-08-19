"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
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

// Una sola puerta para llevarse las tareas al calendario, con las dos vías que
// existen: Google, que las escribe en el calendario propio de cada quien al
// instante, y la suscripción por URL para Apple Calendar, Outlook y demás,
// que Google monta como calendario aparte y refresca cuando le parece.
export function CalendarSyncDialog({
  compact = false,
  googleEmail = null,
}: {
  compact?: boolean;
  googleEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // La URL solo se pide (y el token solo se crea) si de verdad la piden: a
  // quien use Google no le hace falta.
  function loadUrl(fetchUrl: () => Promise<{ url: string }>) {
    setError(null);
    setShowFeed(true);
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
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>Sincronizar calendario</DialogTitle>
          <DialogDescription>
            Tus tareas con fecha, en el calendario que ya usas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Google Calendar</h3>
          {googleEmail ? (
            <p className="text-muted-foreground text-sm">
              Conectado como{" "}
              <span className="text-foreground font-medium">{googleEmail}</span>
              . Tus tareas se crean en tu calendario y se actualizan cuando
              cambian.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Las tareas se crean en tu propio calendario, al momento.
              </p>
              <Button
                size="sm"
                render={<a href="/api/google-calendar/connect" />}
              >
                Conectar Google Calendar
              </Button>
            </>
          )}
        </div>

        <div className="border-border space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">
            Apple Calendar, Outlook u otros
          </h3>

          {!showFeed ? (
            <>
              <p className="text-muted-foreground text-sm">
                Se suscriben por URL. Aparecen como un calendario aparte y
                tardan entre varias horas y un día en reflejar los cambios.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUrl(getCalendarFeedUrlAction)}
              >
                Ver el enlace de suscripción
              </Button>
            </>
          ) : error !== null ? (
            <div className="space-y-2">
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
            <p className="text-muted-foreground text-sm">
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
              <p className="text-muted-foreground text-xs">
                Añádelo en tu calendario como suscripción por URL. Es personal y
                secreto: no lo compartas.
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
        </div>

        <a
          href="/account#calendar"
          className="text-muted-foreground hover:text-foreground transition-ios inline-flex items-center gap-1 text-xs"
        >
          Gestionar la conexión en tu cuenta
          <ExternalLink className="size-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
