"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as labelService from "@/server/services/label";

export async function createLabelAction(input: {
  workspaceId: string;
  name: string;
  color?: string;
}) {
  const user = await getCurrentUser();
  const label = await labelService.createLabel(
    input.workspaceId,
    user.id,
    input.name,
    input.color,
  );
  revalidatePath(`/w/${input.workspaceId}`, "layout");
  return label;
}

export async function deleteLabelAction(input: {
  labelId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await labelService.deleteLabel(input.labelId, input.workspaceId, user.id);
  revalidatePath(`/w/${input.workspaceId}`, "layout");
}
