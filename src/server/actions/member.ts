"use server";

import { revalidatePath } from "next/cache";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import * as memberService from "@/server/services/member";
import * as inviteService from "@/server/services/invite";

export async function inviteMemberAction(input: {
  workspaceId: string;
  email: string;
  role?: WorkspaceRole;
}) {
  const user = await getCurrentUser();
  await inviteService.inviteToWorkspace(
    input.workspaceId,
    user.id,
    input.email,
    input.role ?? WorkspaceRole.MEMBER,
  );
  revalidatePath(`/w/${input.workspaceId}/members`);
}

export async function removeMemberAction(input: {
  workspaceId: string;
  memberUserId: string;
}) {
  const user = await getCurrentUser();
  await memberService.removeMember(
    input.workspaceId,
    user.id,
    input.memberUserId,
  );
  revalidatePath(`/w/${input.workspaceId}/members`);
}

// Revoca una invitación pendiente (solo OWNER/ADMIN del espacio).
export async function revokeInviteAction(input: {
  workspaceId: string;
  inviteId: string;
}) {
  const user = await getCurrentUser();
  await inviteService.revokeInvite(input.inviteId, user.id);
  revalidatePath(`/w/${input.workspaceId}/members`);
}
