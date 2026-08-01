"use client";

import { useTransition } from "react";
import { ProgressTimerPolicy } from "@/generated/prisma/enums";
import {
  PROGRESS_POLICY_HINT,
  PROGRESS_POLICY_LABEL,
} from "@/features/time/timer-rules";
import { setTaskProgressPolicyAction } from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INHERIT = "INHERIT";

// Solo el manager: qué hace el cronómetro mientras se documenta un avance de
// esta tarea. Por defecto hereda lo que se decidió al crear el proyecto.
export function TaskProgressPolicySelect({
  taskId,
  workspaceId,
  projectId,
  policy,
  projectPolicy,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  policy: ProgressTimerPolicy | null;
  projectPolicy: ProgressTimerPolicy;
}) {
  const [pending, startTransition] = useTransition();
  const value = policy ?? INHERIT;
  const effective = policy ?? projectPolicy;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Select
        value={value}
        disabled={pending}
        onValueChange={(v) =>
          v &&
          startTransition(() =>
            setTaskProgressPolicyAction({
              taskId,
              workspaceId,
              projectId,
              policy: v === INHERIT ? null : (v as ProgressTimerPolicy),
            }),
          )
        }
      >
        <SelectTrigger
          aria-label="Cronómetro al documentar avances"
          className="text-xs"
        >
          <SelectValue>
            {(v: string) =>
              v === INHERIT
                ? `Como el proyecto (${PROGRESS_POLICY_LABEL[projectPolicy].toLowerCase()})`
                : PROGRESS_POLICY_LABEL[v as ProgressTimerPolicy]
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INHERIT}>
            Como el proyecto ({PROGRESS_POLICY_LABEL[projectPolicy]})
          </SelectItem>
          <SelectItem value={ProgressTimerPolicy.PAUSE}>
            {PROGRESS_POLICY_LABEL.PAUSE}
          </SelectItem>
          <SelectItem value={ProgressTimerPolicy.HALF}>
            {PROGRESS_POLICY_LABEL.HALF}
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-[11px]">
        {PROGRESS_POLICY_HINT[effective]}
      </p>
    </div>
  );
}
