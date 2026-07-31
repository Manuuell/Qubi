"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hoursToMinutes, keyToDbDate } from "@/features/time/week";
import * as timeService from "@/server/services/time";

export async function setHoursAction(input: {
  workspaceId: string;
  projectId: string;
  dateKey: string;
  hours: number | null;
}) {
  const user = await getCurrentUser();
  const minutes =
    input.hours && input.hours > 0 ? hoursToMinutes(input.hours) : 0;
  await timeService.setTimesheetHours(
    input.workspaceId,
    user.id,
    user.email,
    input.projectId,
    keyToDbDate(input.dateKey),
    minutes,
  );
  revalidatePath(`/w/${input.workspaceId}/hours`);
}

// Minutos por día de la semana actual (para el mini-gráfico del widget del
// cronómetro flotante).
export async function getMyWeekChartAction(workspaceId: string) {
  const user = await getCurrentUser();
  const sheet = await timeService.getWeekTimesheet(workspaceId, user.id);
  return { dayKeys: sheet.dayKeys, dayTotals: sheet.dayTotals };
}
