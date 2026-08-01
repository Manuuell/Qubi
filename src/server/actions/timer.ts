"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  addSessionProgress,
  beginTimerProgress,
  cancelTimer,
  endTimerProgress,
  getRunningTimer,
  listTimeableTasks,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  type ProgressUpload,
} from "@/server/services/time";
import { uploadFile } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_FILES_PER_PROGRESS = 5;

// Devuelve el temporizador ya montado (con la tarea y la política que aplica)
// para que el widget no tenga que adivinar nada.
export async function startTimerAction(input: {
  workspaceId: string;
  projectId: string;
  issueId: string;
}) {
  const user = await getCurrentUser();
  await startTimer(input.workspaceId, user.id, input.projectId, input.issueId);
  revalidatePath(`/w/${input.workspaceId}/hours`);
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
  return getRunningTimer(user.id);
}

// Tareas cronometrables de un proyecto (pendientes o en marcha), para el
// selector "¿en qué vas a trabajar?".
export async function listTimeableTasksAction(input: {
  workspaceId: string;
  projectId: string;
}) {
  const user = await getCurrentUser();
  return listTimeableTasks(input.workspaceId, user.id, input.projectId);
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

// Entra/sale del modo "documentando avance": según la política del proyecto o
// de la tarea, el reloj se pausa o sigue contando la mitad del tiempo.
export async function beginTimerProgressAction() {
  const user = await getCurrentUser();
  return beginTimerProgress(user.id);
}

export async function endTimerProgressAction(input: { wasPaused: boolean }) {
  const user = await getCurrentUser();
  return endTimerProgress(user.id, input.wasPaused);
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

// Avance desde el widget del cronómetro: texto + archivos (capturas pegadas
// desde el portapapeles, imágenes, documentos…). Se guarda como evidencia de
// la tarea que se está cronometrando.
export async function addSessionProgressAction(formData: FormData) {
  const user = await getCurrentUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const body = String(formData.get("body") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES_PER_PROGRESS) {
    throw new Error(
      `Puedes adjuntar hasta ${MAX_FILES_PER_PROGRESS} archivos por avance.`,
    );
  }

  const uploads: ProgressUpload[] = [];
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`"${file.name}" supera los 8 MB.`);
    }
    uploads.push({
      url: await uploadFile(file),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  await addSessionProgress(sessionId, user.id, body, uploads);
  if (workspaceId) revalidatePath(`/w/${workspaceId}/hours`);
}
