"use client";

import { useState, useTransition } from "react";
import { setTaskEstimateAction } from "@/server/actions/task";

// Estimación de esfuerzo en horas. Se escribe en horas porque es como se
// habla ("esto son dos horas"), y se guarda en minutos.
export function TaskEstimateInput({
  taskId,
  workspaceId,
  projectId,
  estimateMinutes,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  estimateMinutes: number | null;
}) {
  const [value, setValue] = useState(
    estimateMinutes ? String(estimateMinutes / 60) : "",
  );
  const [pending, startTransition] = useTransition();

  function save() {
    const hours = value.trim() === "" ? null : Number(value.replace(",", "."));
    if (hours != null && (Number.isNaN(hours) || hours < 0)) return;
    startTransition(() =>
      setTaskEstimateAction({
        taskId,
        workspaceId,
        projectId,
        estimateMinutes: hours == null ? null : Math.round(hours * 60),
      }),
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        inputMode="decimal"
        placeholder="Sin estimar"
        disabled={pending}
        aria-label="Estimación en horas"
        className="border-input bg-background focus:ring-ring transition-ios w-24 rounded-full border px-3 py-1 text-sm outline-none focus:ring-2 disabled:opacity-50"
      />
      <span className="text-muted-foreground text-xs">h</span>
    </div>
  );
}
