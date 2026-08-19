"use client";

import { useTransition } from "react";
import { CalendarCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disconnectGoogleCalendarAction } from "@/server/actions/google-calendar";

// Conectar/desconectar el Google Calendar personal. Conectar no es una server
// action: es una navegación de verdad a /api/google-calendar/connect, porque
// el flujo OAuth necesita sacar al navegador de la app y traerlo de vuelta.
export function GoogleCalendarSection({
  connection,
  configured,
}: {
  connection: { googleEmail: string } | null;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!configured) {
    return (
      <p className="text-muted-foreground px-6 pb-6 text-sm">
        La conexión con Google no está configurada en este servidor.
      </p>
    );
  }

  if (!connection) {
    return (
      <div className="space-y-3 px-6 pb-6">
        <Button render={<a href="/api/google-calendar/connect" />}>
          <CalendarCheck />
          Conectar Google Calendar
        </Button>
        <p className="text-muted-foreground text-xs">
          Google te pedirá permiso para gestionar eventos. La primera vez puede
          avisarte de que la aplicación no está verificada: entra en
          “Configuración avanzada” para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-6 pb-6">
      <p className="text-sm">
        Conectado como{" "}
        <span className="font-medium">{connection.googleEmail}</span>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(disconnectGoogleCalendarAction)}
        >
          {pending ? "Desconectando…" : "Desconectar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Ver permisos en Google
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
