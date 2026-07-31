"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  addWorkSessionNote,
  cancelTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
} from "@/server/services/time";
import { uploadFile } from "@/lib/storage";

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

export async function startTimerAction(input: {
  workspaceId: string;
  projectId: string;
}) {
  const user = await getCurrentUser();
  const sessionId = await startTimer(
    input.workspaceId,
    user.id,
    input.projectId,
  );
  revalidatePath(`/w/${input.workspaceId}/hours`);
  return { sessionId };
}

export async function pauseTimerAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  await pauseTimer(user.id);
  revalidatePath(`/w/${input.workspaceId}/hours`);
}

export async function resumeTimerAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  await resumeTimer(user.id);
  revalidatePath(`/w/${input.workspaceId}/hours`);
}

export async function stopTimerAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  const result = await stopTimer(user.id);
  revalidatePath(`/w/${input.workspaceId}/hours`);
  return result;
}

export async function cancelTimerAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  await cancelTimer(user.id);
  revalidatePath(`/w/${input.workspaceId}/hours`);
}

export async function addWorkSessionNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const body = String(formData.get("body") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const file = formData.get("file");

  let screenshotUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      throw new Error("La captura debe ser una imagen.");
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      throw new Error("La captura no puede superar 8 MB.");
    }
    screenshotUrl = await uploadFile(file);
  }

  await addWorkSessionNote(sessionId, user.id, body, screenshotUrl);
  if (workspaceId) revalidatePath(`/w/${workspaceId}/hours`);
}
