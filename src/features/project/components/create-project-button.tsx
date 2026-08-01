"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FolderPlus } from "lucide-react";
import { createProjectAction } from "@/server/actions/project";
import { ProgressTimerPolicy } from "@/generated/prisma/enums";
import { PROGRESS_POLICY_HINT } from "@/features/time/timer-rules";

// Botón que se expande a un pequeño formulario: nombre del proyecto y qué hace
// el cronómetro del equipo mientras alguien documenta un avance (se puede
// cambiar después, y afinar tarea por tarea).
export function CreateProjectButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState<ProgressTimerPolicy>(
    ProgressTimerPolicy.PAUSE,
  );
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(() =>
      createProjectAction({
        workspaceId,
        name,
        progressTimerPolicy: policy,
      }),
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm"
      >
        <FolderPlus className="size-4" />
        Nuevo proyecto
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 px-2 py-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del proyecto…"
        disabled={pending}
        className="border-input bg-background focus:ring-ring transition-ios w-full rounded-full border px-3 py-1.5 text-sm outline-none focus:ring-2"
      />

      <fieldset className="space-y-1">
        <legend className="text-muted-foreground px-1 text-[11px] font-medium">
          Al documentar un avance, el cronómetro…
        </legend>
        <div className="flex gap-1">
          {([ProgressTimerPolicy.PAUSE, ProgressTimerPolicy.HALF] as const).map(
            (p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPolicy(p)}
                className={`transition-ios flex-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                  policy === p
                    ? "bg-primary text-primary-foreground"
                    : "glass hover:bg-accent"
                }`}
              >
                {p === ProgressTimerPolicy.PAUSE
                  ? "Se pausa"
                  : "Cuenta la mitad"}
              </button>
            ),
          )}
        </div>
        <p className="text-muted-foreground px-1 text-[11px]">
          {PROGRESS_POLICY_HINT[policy]}
        </p>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:bg-accent transition-ios flex-1 rounded-full px-3 py-1.5 text-xs font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios flex-1 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Crear
        </button>
      </div>
    </form>
  );
}
