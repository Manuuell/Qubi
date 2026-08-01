"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import * as projectService from "@/server/services/project";
import { assertWorkspaceAdmin } from "@/server/lib/permissions";
import { ProgressTimerPolicy } from "@/generated/prisma/enums";

export async function createProjectAction(input: {
  workspaceId: string;
  name: string;
  progressTimerPolicy?: ProgressTimerPolicy;
}) {
  const user = await getCurrentUser();
  const project = await projectService.createProject(
    input.workspaceId,
    user.id,
    input.name,
    input.progressTimerPolicy,
  );
  revalidatePath(`/w/${input.workspaceId}`);
  redirect(`/w/${input.workspaceId}/projects/${project.id}`);
}

// Política por defecto del cronómetro del proyecto (solo owner/admin).
export async function setProjectProgressPolicyAction(input: {
  projectId: string;
  workspaceId: string;
  progressTimerPolicy: ProgressTimerPolicy;
}) {
  const user = await getCurrentUser();
  await assertWorkspaceAdmin(input.workspaceId, user.id);
  await projectService.setProjectProgressPolicy(
    input.projectId,
    user.id,
    input.progressTimerPolicy,
  );
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
}

export async function renameProjectAction(input: {
  projectId: string;
  workspaceId: string;
  name: string;
}) {
  const user = await getCurrentUser();
  await projectService.renameProject(input.projectId, user.id, input.name);
  revalidatePath(`/w/${input.workspaceId}`);
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
}

export async function archiveProjectAction(input: {
  projectId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await projectService.archiveProject(input.projectId, user.id);
  revalidatePath(`/w/${input.workspaceId}`);
  redirect(`/w/${input.workspaceId}`);
}
