"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import * as pageService from "@/server/services/page";

export async function createPageAction(input: {
  workspaceId: string;
  parentId?: string | null;
}) {
  const user = await getCurrentUser();
  const page = await pageService.createPage({
    workspaceId: input.workspaceId,
    userId: user.id,
    parentId: input.parentId ?? null,
  });
  revalidatePath(`/w/${input.workspaceId}`);
  redirect(`/w/${input.workspaceId}/${page.id}`);
}

export async function renamePageAction(input: {
  pageId: string;
  workspaceId: string;
  title: string;
}) {
  const user = await getCurrentUser();
  await pageService.renamePage(input.pageId, user.id, input.title);
  revalidatePath(`/w/${input.workspaceId}`);
}

export async function archivePageAction(input: {
  pageId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await pageService.archivePage(input.pageId, user.id);
  revalidatePath(`/w/${input.workspaceId}`);
  redirect(`/w/${input.workspaceId}`);
}

// Autoguardado del documento de bloques. No revalida ni redirige: el editor
// es la fuente de verdad en el cliente mientras se escribe.
export async function savePageContentAction(input: {
  pageId: string;
  content: unknown;
}) {
  const user = await getCurrentUser();
  await pageService.savePageContent(
    input.pageId,
    user.id,
    input.content as Prisma.InputJsonValue,
  );
}

export async function restorePageAction(input: {
  pageId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await pageService.restorePage(input.pageId, user.id);
  revalidatePath(`/w/${input.workspaceId}`);
  revalidatePath(`/w/${input.workspaceId}/trash`);
}

export async function deletePageForeverAction(input: {
  pageId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await pageService.deletePageForever(input.pageId, user.id);
  revalidatePath(`/w/${input.workspaceId}/trash`);
}

export async function setPagePublicAction(input: {
  pageId: string;
  workspaceId: string;
  isPublic: boolean;
}) {
  const user = await getCurrentUser();
  await pageService.setPagePublic(input.pageId, user.id, input.isPublic);
  revalidatePath(`/w/${input.workspaceId}/${input.pageId}`);
}

export async function toggleFavoriteAction(input: {
  pageId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await pageService.toggleFavorite(user.id, input.pageId);
  revalidatePath(`/w/${input.workspaceId}`);
}
