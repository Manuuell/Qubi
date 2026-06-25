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
    input.projectId,
    keyToDbDate(input.dateKey),
    minutes,
  );
  revalidatePath(`/w/${input.workspaceId}/hours`);
}
