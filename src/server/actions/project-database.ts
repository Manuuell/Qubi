"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import * as projectDb from "@/server/services/project-database";

export async function createProjectDatabaseAction(input: {
  workspaceId: string;
  projectId: string;
  name: string;
}) {
  const user = await getCurrentUser();
  const page = await projectDb.createProjectDatabase(
    input.projectId,
    user.id,
    input.name,
  );
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
  redirect(`/w/${input.workspaceId}/${page.id}`);
}

export async function linkExistingDatabaseAction(input: {
  workspaceId: string;
  projectId: string;
  pageId: string;
}) {
  const user = await getCurrentUser();
  await projectDb.linkExistingDatabase(
    input.projectId,
    input.workspaceId,
    user.id,
    input.pageId,
  );
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
}

export async function unlinkDatabaseAction(input: {
  workspaceId: string;
  projectId: string;
  pageId: string;
}) {
  const user = await getCurrentUser();
  await projectDb.unlinkDatabase(input.projectId, user.id, input.pageId);
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
}
