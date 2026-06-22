"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import * as workspaceService from "@/server/services/workspace";

export async function createWorkspaceAction(input: { name: string }) {
  const user = await getCurrentUser();
  const name = input.name.trim() || "Nuevo espacio";
  const workspace = await workspaceService.createWorkspace(user.id, name);
  redirect(`/w/${workspace.id}`);
}
