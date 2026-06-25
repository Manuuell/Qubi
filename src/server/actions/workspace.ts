"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as workspaceService from "@/server/services/workspace";

export async function createWorkspaceAction(input: { name: string }) {
  const user = await getCurrentUser();
  const name = input.name.trim() || "Nuevo espacio";
  const workspace = await workspaceService.createWorkspace(user.id, name);
  redirect(`/w/${workspace.id}`);
}

export async function renameWorkspaceAction(input: {
  workspaceId: string;
  name: string;
}) {
  const user = await getCurrentUser();
  await workspaceService.renameWorkspace(
    input.workspaceId,
    user.id,
    input.name,
  );
  revalidatePath("/", "layout");
}

export async function deleteWorkspaceAction(input: { workspaceId: string }) {
  const user = await getCurrentUser();
  await workspaceService.deleteWorkspace(input.workspaceId, user.id);
  // "/" siempre resuelve a un espacio válido (o crea uno por defecto).
  redirect("/");
}
