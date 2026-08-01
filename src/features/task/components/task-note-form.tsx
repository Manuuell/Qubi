"use client";

import { useRouter } from "next/navigation";
import { ProgressComposer } from "@/features/time/components/progress-composer";
import { useOptionalTimerWidget } from "@/features/time/timer-widget-context";
import type { MentionMember } from "@/features/mentions/mentions";

// Formulario reutilizado para comentarios normales, avances (kind PROGRESS) y
// feedback del manager (kind REVIEW_FEEDBACK) — solo cambia la server action.
// Admite texto con menciones y enlaces, y evidencia pegada, arrastrada o
// elegida del disco (cualquier tipo de archivo).
//
// Si la persona tiene el cronómetro corriendo SOBRE ESTA MISMA TAREA, escribir
// aquí entra en modo "documentando": según la política del proyecto/tarea el
// reloj se pausa o pasa a contar la mitad, y vuelve a la normalidad al guardar.
export function TaskNoteForm({
  taskId,
  workspaceId,
  projectId,
  action,
  placeholder,
  submitLabel,
  members,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  submitLabel: string;
  members: MentionMember[];
}) {
  const router = useRouter();
  const timerCtx = useOptionalTimerWidget();
  const timingThisTask = timerCtx?.timer?.issueId === taskId;

  return (
    <ProgressComposer
      members={members}
      placeholder={placeholder}
      submitLabel={submitLabel}
      onDirty={() => {
        if (timingThisTask) void timerCtx?.beginProgress();
      }}
      onSubmit={async (body, files) => {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("workspaceId", workspaceId);
        fd.set("projectId", projectId);
        fd.set("body", body);
        for (const file of files) fd.append("files", file);
        await action(fd);
        if (timingThisTask) await timerCtx?.endProgress();
        router.refresh();
      }}
    />
  );
}
