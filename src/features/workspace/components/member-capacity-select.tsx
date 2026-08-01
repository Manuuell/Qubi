"use client";

import { useTransition } from "react";
import {
  CAPACITY_OPTIONS,
  WEEKLY_CAPACITY_MINUTES,
} from "@/features/time/capacity";
import { setMemberCapacityAction } from "@/server/actions/member";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT = "DEFAULT";

// Jornada semanal de una persona del equipo. Solo la ve y la cambia el
// manager; es la referencia contra la que se mide su carga.
export function MemberCapacitySelect({
  workspaceId,
  targetUserId,
  weeklyCapacityMinutes,
  hasOwnCapacity,
}: {
  workspaceId: string;
  targetUserId: string;
  weeklyCapacityMinutes: number;
  hasOwnCapacity: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const value = hasOwnCapacity ? String(weeklyCapacityMinutes) : DEFAULT;

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) =>
        v &&
        startTransition(() =>
          setMemberCapacityAction({
            workspaceId,
            targetUserId,
            weeklyCapacityMinutes: v === DEFAULT ? null : Number(v),
          }),
        )
      }
    >
      <SelectTrigger aria-label="Jornada semanal" className="text-xs">
        <SelectValue>
          {(v: string) =>
            v === DEFAULT
              ? `${WEEKLY_CAPACITY_MINUTES / 60} h/semana (por defecto)`
              : `${Number(v) / 60} h/semana`
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT}>
          Por defecto ({WEEKLY_CAPACITY_MINUTES / 60} h/semana)
        </SelectItem>
        {CAPACITY_OPTIONS.map((o) => (
          <SelectItem key={o.minutes} value={String(o.minutes)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
