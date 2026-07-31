"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Confirmación previa a iniciar el cronómetro: "¿listo para iniciar
// producción?", con una animación tipo "en vivo" (punto pulsante + cuenta
// regresiva) antes de arrancar.
export function StartTimerDialog({
  projectName,
  onConfirm,
  trigger,
}: {
  projectName: string;
  onConfirm: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="items-center text-center">
        <span className="relative grid size-16 place-items-center">
          <span className="bg-destructive/20 absolute inline-flex size-full animate-ping rounded-full" />
          <span className="bg-destructive/10 text-destructive relative grid size-16 place-items-center rounded-full">
            <Radio className="size-7" />
          </span>
        </span>
        <DialogHeader className="items-center">
          <DialogTitle>¿Listo para iniciar producción?</DialogTitle>
          <DialogDescription>
            Vas a empezar a cronometrar tiempo en{" "}
            <span className="text-foreground font-medium">{projectName}</span>.
            El widget flotante te acompañará mientras trabajas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Countdown
            active={open}
            onDone={() => {
              setOpen(false);
              onConfirm();
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Botón que, al pulsarlo, cuenta 3-2-1 con una animación breve y luego confirma.
function Countdown({
  active,
  onDone,
  onCancel,
}: {
  active: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia la cuenta al cerrar el dialog
    if (!active) setN(null);
  }, [active]);

  useEffect(() => {
    if (n === null) return;
    if (n === 0) {
      const t = setTimeout(onDone, 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => (v ?? 1) - 1), 500);
    return () => clearTimeout(t);
  }, [n, onDone]);

  if (n !== null) {
    return (
      <span className="font-mono text-3xl font-bold tabular-nums">
        {n === 0 ? "¡Vamos!" : n}
      </span>
    );
  }

  return (
    <>
      <button
        onClick={onCancel}
        className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium"
      >
        Cancelar
      </button>
      <button
        onClick={() => setN(3)}
        className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95"
      >
        Sí, empezar
      </button>
    </>
  );
}
