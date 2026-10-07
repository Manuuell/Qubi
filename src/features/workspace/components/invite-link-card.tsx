"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy, Link2, Link2Off, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  disableInviteLinkAction,
  enableInviteLinkAction,
  regenerateInviteLinkAction,
} from "@/server/actions/invite-link";

const UPDATE_ERROR = "No se pudo actualizar el enlace. Inténtalo de nuevo.";

export function InviteLinkCard({
  workspaceId,
  workspaceName,
  inviteUrl,
}: {
  workspaceId: string;
  workspaceName: string;
  inviteUrl: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<"regenerate" | "disable" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    if (!inviteUrl) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  async function share() {
    if (!inviteUrl) return;
    setError(null);
    try {
      await navigator.share({
        title: `Únete a ${workspaceName} en Qubi`,
        text: `Te invito a unirte a ${workspaceName} en Qubi.`,
        url: inviteUrl,
      });
    } catch (shareError) {
      if ((shareError as Error).name !== "AbortError") {
        setError(UPDATE_ERROR);
      }
    }
  }

  function mutate(action: (input: { workspaceId: string }) => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action({ workspaceId });
      } catch (mutationError) {
        setError(
          mutationError instanceof Error ? mutationError.message : UPDATE_ERROR,
        );
      } finally {
        // También ante un error: el mensaje se pinta en la tarjeta, y con el
        // diálogo abierto encima el admin no lo vería.
        setConfirm(null);
      }
    });
  }

  return (
    <div>
      <p className="text-muted-foreground mb-2 px-1 text-[11px] font-medium tracking-wide uppercase">
        Enlace de invitación
      </p>
      <Card variant="glass" className="p-4">
        {!inviteUrl ? (
          <>
            <p className="text-muted-foreground text-sm">
              Crea un enlace para que tu equipo se una a {workspaceName} sin
              esperar una invitación por email. Quien entre con él será Miembro.
            </p>
            <Button
              type="button"
              disabled={pending}
              onClick={() => mutate(enableInviteLinkAction)}
              className="self-start"
            >
              <Link2 />
              {pending ? "Creando…" : "Crear enlace"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                readOnly
                value={inviteUrl}
                className="font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label={copied ? "Copiado" : "Copiar enlace"}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
              {canShare && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={share}
                  aria-label="Compartir"
                >
                  <Share2 />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Cualquiera con este enlace puede unirse como Miembro. Compártelo
              solo con tu equipo.
            </p>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setConfirm("regenerate")}
              >
                <RefreshCw />
                Regenerar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setConfirm("disable")}
              >
                <Link2Off />
                Desactivar
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Si quitas a alguien que tenía el enlace, regéneralo para que no
              pueda volver a entrar.
            </p>
          </>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}
      </Card>

      <ConfirmDialog
        open={confirm === "regenerate"}
        onOpenChange={(open) => setConfirm(open ? "regenerate" : null)}
        title="¿Regenerar el enlace?"
        description="El enlace actual dejará de funcionar al instante. Quienes ya se unieron siguen en el espacio; a los demás tendrás que mandarles el nuevo."
        confirmLabel="Regenerar"
        pendingLabel="Regenerando…"
        destructive
        pending={pending}
        onConfirm={() => mutate(regenerateInviteLinkAction)}
      />
      <ConfirmDialog
        open={confirm === "disable"}
        onOpenChange={(open) => setConfirm(open ? "disable" : null)}
        title="¿Desactivar el enlace?"
        description="Nadie más podrá unirse con él. Quienes ya se unieron siguen en el espacio. Puedes crear uno nuevo cuando quieras."
        confirmLabel="Desactivar"
        pendingLabel="Desactivando…"
        destructive
        pending={pending}
        onConfirm={() => mutate(disableInviteLinkAction)}
      />
    </div>
  );
}
