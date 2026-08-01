"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Aviso flotante que aparece cuando el cronómetro se detiene: dice cuánto se
// guardó o, si la sesión fue demasiado corta, que ese tiempo no se registra.
// Vive fuera del widget porque el widget desaparece al parar.
export function TimerNotice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 9000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div
      role="status"
      className="glass-strong animate-in fade-in-0 slide-in-from-bottom-2 fixed bottom-6 left-1/2 z-50 flex max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-3xl px-4 py-3 shadow-2xl"
    >
      <p className="text-xs leading-relaxed">{message}</p>
      <button
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="hover:bg-accent transition-ios grid size-6 shrink-0 place-items-center rounded-full"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
