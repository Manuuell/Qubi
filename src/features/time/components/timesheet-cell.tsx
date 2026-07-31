"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { minutesToHours, hoursToMinutes } from "@/features/time/week";
import { setHoursAction } from "@/server/actions/time";

export function TimesheetCell({
  workspaceId,
  projectId,
  dateKey,
  minutes,
  editable,
}: {
  workspaceId: string;
  projectId: string;
  dateKey: string;
  minutes: number;
  editable: boolean;
}) {
  const [value, setValue] = useState(minutesToHours(minutes));
  const [pending, startTransition] = useTransition();

  if (!editable) {
    return (
      <span className="text-muted-foreground inline-flex w-12 items-center justify-center py-1.5 text-center text-sm tabular-nums">
        {value || "–"}
      </span>
    );
  }

  function commit() {
    const raw = value.trim().replace(",", ".");
    const parsed = raw === "" ? null : parseFloat(raw);
    const hours =
      parsed != null && !isNaN(parsed) && parsed >= 0 ? parsed : null;
    // Normaliza lo que se muestra (p. ej. "1.50" -> "1.5", basura -> "").
    setValue(hours ? minutesToHours(hoursToMinutes(hours)) : "");
    startTransition(() =>
      setHoursAction({ workspaceId, projectId, dateKey, hours }),
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.currentTarget.blur();
  }

  return (
    <input
      inputMode="decimal"
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label="Horas"
      placeholder="–"
      className="hover:bg-accent focus:ring-ring transition-ios w-12 rounded-full bg-transparent px-1 py-1.5 text-center text-sm outline-none focus:ring-2 disabled:opacity-50"
    />
  );
}
