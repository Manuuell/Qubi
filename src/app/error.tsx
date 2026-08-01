"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-board bg-background flex min-h-screen items-center justify-center p-4">
      <div className="glass-strong w-full max-w-sm space-y-4 rounded-3xl p-8 text-center">
        <span className="bg-destructive/10 text-destructive mx-auto grid size-14 place-items-center rounded-full">
          <AlertTriangle className="size-6" />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ocurrió un error inesperado. Puedes intentarlo de nuevo; si
            persiste, dinos qué estabas haciendo.
          </p>
        </div>
        <Button onClick={() => reset()} className="w-full gap-2">
          <RotateCw className="size-4" />
          Intentar de nuevo
        </Button>
      </div>
    </div>
  );
}
