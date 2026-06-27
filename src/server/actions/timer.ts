"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { startTimer, stopTimer, cancelTimer } from "@/server/services/time";

export async function startTimerAction(input: {
  workspaceId: string;
  projectId: string;
}) {
  const user = await getCurrentUser();
  await startTimer(input.workspaceId, user.id, input.projectId);
  revalidatePath(`/w/${input.workspaceId}/hours`);
}

export async function stopTimerAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  await stopTimer(user.id);
  revalidatePath(`/w/${input.workspaceId}/hours`);
}

export async function cancelTimerAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  await cancelTimer(user.id);
  revalidatePath(`/w/${input.workspaceId}/hours`);
}
