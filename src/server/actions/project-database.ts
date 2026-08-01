"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import * as projectDb from "@/server/services/project-database";
import * as pageService from "@/server/services/page";

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

export async function renameProjectDatabaseAction(input: {
  workspaceId: string;
  projectId: string;
  pageId: string;
  title: string;
}) {
  const user = await getCurrentUser();
  await pageService.renamePage(input.pageId, user.id, input.title);
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
}

// A diferencia de archivePageAction (pensada para cuando estás viendo la
// página misma y redirige al salir), esta no navega: se llama desde la
// tarjeta de la base de datos dentro del proyecto, así que solo refresca
// esa lista.
export async function deleteProjectDatabaseAction(input: {
  workspaceId: string;
  projectId: string;
  pageId: string;
}) {
  const user = await getCurrentUser();
  await pageService.archivePage(input.pageId, user.id);
  revalidatePath(`/w/${input.workspaceId}/projects/${input.projectId}`);
}
